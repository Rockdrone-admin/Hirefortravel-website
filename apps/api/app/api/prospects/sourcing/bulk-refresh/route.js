import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../lib/cors';
import { requireAuth, logActivityEvent } from '../../../../../lib/auth';
import { enrichLinkedInProfile } from '../../../../../lib/enrichment/index.js';
import { scoreAndEvaluateProspect } from '../../../../../lib/gemini';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_prospects');
    if (authError) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const body = await req.json();
    const { matchIds, reason, changedBy } = body;

    if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
      return NextResponse.json({ success: false, error: 'matchIds array is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Recruiter remarks are mandatory to refresh profile details' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // 1. Fetch enrichment scraper setting
    const { data: scraperSetting } = await supabase
      .from('sourcing_prompts')
      .select('instructions')
      .eq('prompt_type', 'enrichment_scraper')
      .eq('environment', environment)
      .maybeSingle();

    const scraperChoice = (scraperSetting && scraperSetting.instructions && scraperSetting.instructions[0]) || 'apify';

    console.log(`[Profile Refresh Saga: Init] 🚀 Bulk refresh triggered for ${matchIds.length} candidate(s) | Environment: ${environment}`);
    console.log(`[Profile Refresh Saga: Init] Selected scraper configuration: "${scraperChoice}"`);

    // Loop through each match ID and process refresh
    for (const matchId of matchIds) {
      const idx = matchIds.indexOf(matchId);
      console.log(`[Profile Refresh Saga: Init] 👤 Processing candidate refresh ${idx + 1} of ${matchIds.length} | Match ID: ${matchId}`);
      try {
        const { data: matchRow, error: matchError } = await supabase
          .from('prospect_matches')
          .select('*, prospect:prospect_id(*)')
          .eq('id', matchId)
          .eq('environment', environment)
          .single();

        if (matchError || !matchRow) {
          console.error(`[Profile Refresh Saga: Dedupe] ❌ Match ID ${matchId} not found in database. Skipping.`);
          continue;
        }

        const prospectId = matchRow.prospect_id;
        const currentProspect = matchRow.prospect;
        console.log(`[Profile Refresh Saga: Dedupe] 👤 Candidate profile found in CRM: "${currentProspect?.name || 'Unknown'}"`);

        if (!currentProspect || !currentProspect.linkedin_url) {
          console.warn(`[Profile Refresh Saga: Dedupe] ⚠️ Candidate "${currentProspect?.name || 'Unknown'}" lacks LinkedIn URL. Skipping.`);
          continue;
        }

        const linkedinUrl = currentProspect.linkedin_url;

        // Scrape
        const enrichedData = await enrichLinkedInProfile(linkedinUrl, '', scraperChoice, 'Profile Refresh Saga');

        // Update prospects table
        console.log(`[Profile Refresh Saga: Enrich] 🚀 Updating CRM profile for candidate "${enrichedData.name}" with fresh details.`);
        const { error: updateError } = await supabase
          .from('prospects')
          .update({
            name: enrichedData.name,
            email: enrichedData.email || currentProspect.email,
            phone: enrichedData.phone || currentProspect.phone,
            city: enrichedData.city,
            latest_title: enrichedData.latest_title,
            latest_company: enrichedData.latest_company,
            total_experience: enrichedData.total_experience || currentProspect.total_experience,
            enrichment_confidence: enrichedData.enrichment_confidence,
            raw_enrichment_payload: enrichedData.raw_payload,
            created_at: new Date().toISOString()
          })
          .eq('id', prospectId)
          .eq('environment', environment);

        if (updateError) {
          console.error(`[Profile Refresh Saga: Enrich] ❌ Failed to update candidate profile in prospects table for candidate ID ${prospectId}:`, updateError);
          continue;
        }

        const { data: allMatches } = await supabase
          .from('prospect_matches')
          .select('*, job:job_id(*)')
          .eq('prospect_id', prospectId)
          .eq('environment', environment);

        console.log(`[Profile Refresh Saga: CRM] Found ${allMatches?.length || 1} position match(es) associated with candidate "${enrichedData.name}"`);

        const matchesToUpdate = allMatches || [matchRow];

        for (const mRow of matchesToUpdate) {
          if (!mRow.job) continue;

          console.log(`[Profile Refresh Saga: CRM] Rerunning AI scoring for candidate "${enrichedData.name}" on Job "${mRow.job.title}"`);
          const evaluation = await scoreAndEvaluateProspect(mRow.job, enrichedData, 'Profile Refresh Saga');

          if (mRow.id === matchId) {
            await supabase
              .from('prospects')
              .update({ functional_field: evaluation.functionalField })
              .eq('id', prospectId)
              .eq('environment', environment);

            enrichedData.functional_field = evaluation.functionalField;
          }

          const currentTimestamps = { ...(mRow.lifecycle_timestamps || {}) };
          currentTimestamps.ai_score_breakdown = evaluation.factorScores;

          await supabase
            .from('prospect_matches')
            .update({
              ai_score: evaluation.matchScore,
              ai_reasoning: evaluation.aiReasoning,
              lifecycle_timestamps: currentTimestamps
            })
            .eq('id', mRow.id);

          console.log(`[Profile Refresh Saga: CRM] ✅ Successfully finished pipeline for candidate "${enrichedData.name}" on Job "${mRow.job.title}"! AI score: ${evaluation.matchScore} / 100`);
        }

        // Log candidate timeline event:
        // "Charchit refreshed profile for candidate JOURAWAR SINGH" (name is UPPERCASE)
        const displayCandidateName = enrichedData.name.toUpperCase();

        await logActivityEvent({
          user: authUser,
          event_type: 'UPDATE_CANDIDATE_BULK_CHILD',
          entity_type: 'prospect',
          entity_id: prospectId,
          title: `refreshed profile for candidate ${displayCandidateName}`,
          description: reason.trim(), // User provided remarks only
          metadata: { 
            job_id: matchRow.job_id,
            scraper: scraperChoice
          },
          environment
        });

        // Write to prospect_activities (legacy)
        await supabase
          .from('prospect_activities')
          .insert([{
            prospect_id: prospectId,
            job_id: matchRow.job_id,
            changed_by: changedBy || authUser?.username || 'Admin',
            activity_type: 'override',
            previous_value: currentProspect.name,
            new_value: enrichedData.name,
            metadata: { field: 'profile_refresh', reason: reason },
            environment
          }]);

        console.log(`[Profile Refresh Saga: Init] 👤 Finished processing candidate ${idx + 1} of ${matchIds.length}: "${enrichedData.name}"`);

      } catch (err) {
        console.error(`[Profile Refresh Saga: Enrich] ❌ Candidate refresh pipeline step failed for match ID ${matchId}:`, err.message);
      }
    }

    // Log a single consolidated batch event on the global activity timeline
    // "Charchit refreshed profiles for 46 prospects"
    await logActivityEvent({
      user: authUser,
      event_type: 'UPDATE_CANDIDATE',
      entity_type: 'prospect', // keeps category as Prospects
      entity_id: null, // this makes it hide from candidate timelines, but show on global timeline
      title: `refreshed profiles for ${matchIds.length} prospects`,
      description: reason.trim(), // User provided remarks only
      metadata: { 
        scraper: scraperChoice
      },
      environment
    });

    console.log(`[Profile Refresh Saga: Init] ✅ Bulk refresh completed successfully for ${matchIds.length} candidate(s).`);

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('[Profile Refresh Saga: Init] ❌ Bulk refresh pipeline failed:', err.message, err.stack);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
