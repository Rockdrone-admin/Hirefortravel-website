import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../../lib/cors';
import { requireAuth, logActivityEvent } from '../../../../../../lib/auth';
import { enrichLinkedInProfile } from '../../../../../../lib/enrichment/index.js';
import { scoreAndEvaluateProspect } from '../../../../../../lib/gemini';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req, { params }) {
  try {
    const environment = getEnvironment();
    const matchId = params.id;
    console.log(`[Profile Refresh Saga: Init] 🚀 Profile refresh triggered for Match ID: ${matchId} | Environment: ${environment}`);
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_prospects');
    if (authError) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const body = await req.json();
    const { changedBy, reason } = body;

    if (!matchId) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Recruiter remarks are mandatory to refresh profile details' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // 1. Fetch current match details to get prospect_id, job_id, and environment
    const { data: currentMatch, error: matchError } = await supabase
      .from('prospect_matches')
      .select('*, prospect:prospect_id(*)')
      .eq('id', matchId)
      .eq('environment', environment)
      .single();

    if (matchError || !currentMatch) {
      return NextResponse.json({ success: false, error: 'Prospect match record not found' }, { status: 404, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const prospectId = currentMatch.prospect_id;
    const currentProspect = currentMatch.prospect;
    console.log(`[Profile Refresh Saga: Dedupe] 👤 Candidate profile found in CRM: "${currentProspect?.name || 'Unknown'}"`);

    if (!currentProspect || !currentProspect.linkedin_url) {
      console.warn(`[Profile Refresh Saga: Dedupe] ⚠️ Candidate lacks LinkedIn URL. Cannot refresh.`);
      return NextResponse.json({ success: false, error: 'LinkedIn URL is required to rescrape a candidate profile' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const linkedinUrl = currentProspect.linkedin_url;

    // 2. Fetch enrichment scraper setting
    const { data: scraperSetting } = await supabase
      .from('sourcing_prompts')
      .select('instructions')
      .eq('prompt_type', 'enrichment_scraper')
      .eq('environment', environment)
      .maybeSingle();

    const scraperChoice = (scraperSetting && scraperSetting.instructions && scraperSetting.instructions[0]) || 'apify';
    console.log(`[Profile Refresh Saga: Init] Selected scraper configuration: "${scraperChoice}"`);

    console.log(`[Profile Refresh Saga: Enrich] 👤 Triggered candidate profile enrichment | URL: ${linkedinUrl} | Scraper: ${scraperChoice}`);

    // 3. Rescrape profile using the selected provider
    const enrichedData = await enrichLinkedInProfile(linkedinUrl, '', scraperChoice, 'Profile Refresh Saga');

    // 4. Update the Prospects table with fresh details
    console.log(`[Profile Refresh Saga: Enrich] 🚀 Updating CRM profile for candidate "${enrichedData.name}" with fresh details.`);
    const { error: updateError } = await supabase
      .from('prospects')
      .update({
        name: enrichedData.name,
        email: enrichedData.email || currentProspect.email, // preserve existing if scraper returned null
        phone: enrichedData.phone || currentProspect.phone, // preserve existing if scraper returned null
        city: enrichedData.city,
        latest_title: enrichedData.latest_title,
        latest_company: enrichedData.latest_company,
        total_experience: enrichedData.total_experience || currentProspect.total_experience,
        enrichment_confidence: enrichedData.enrichment_confidence,
        raw_enrichment_payload: enrichedData.raw_payload,
        created_at: new Date().toISOString() // reset staleness clock
      })
      .eq('id', prospectId)
      .eq('environment', environment);

    if (updateError) {
      console.error('[Profile Refresh] Failed to update prospects table:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update candidate profile' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // 5. Fetch all matches of this prospect across all positions
    const { data: allMatches, error: allMatchesError } = await supabase
      .from('prospect_matches')
      .select('*, job:job_id(*)')
      .eq('prospect_id', prospectId)
      .eq('environment', environment);

    console.log(`[Profile Refresh Saga: CRM] Found ${allMatches?.length || 1} position match(es) associated with candidate "${enrichedData.name}"`);

    // 6. Rerun Gemini scoring for ALL matches of this prospect
    const matchesToUpdate = allMatches || [currentMatch];

    for (const matchRow of matchesToUpdate) {
      if (!matchRow.job) {
        console.warn(`[Profile Refresh] Match ${matchRow.id} does not have a valid job associated. Skipping scoring.`);
        continue;
      }

      console.log(`[Profile Refresh Saga: CRM] Rerunning AI scoring for candidate "${enrichedData.name}" on Job "${matchRow.job.title}"`);
      const evaluation = await scoreAndEvaluateProspect(matchRow.job, enrichedData, 'Profile Refresh Saga');

      // If this is the current match we are working on, we also update functional_field
      if (matchRow.id === matchId) {
        await supabase
          .from('prospects')
          .update({ functional_field: evaluation.functionalField })
          .eq('id', prospectId)
          .eq('environment', environment);
        
        // Update enrichedData's functional field for output
        enrichedData.functional_field = evaluation.functionalField;
      }

      // Update the match row with the new evaluation results
      const currentTimestamps = { ...(matchRow.lifecycle_timestamps || {}) };
      currentTimestamps.ai_score_breakdown = evaluation.factorScores;

      const { error: matchUpdateErr } = await supabase
        .from('prospect_matches')
        .update({
          ai_score: evaluation.matchScore,
          ai_reasoning: evaluation.aiReasoning,
          lifecycle_timestamps: currentTimestamps
        })
        .eq('id', matchRow.id);

      if (matchUpdateErr) {
        console.error(`[Profile Refresh Saga: CRM] ❌ Failed to update match scoring for match ID ${matchRow.id}:`, matchUpdateErr);
      }

      console.log(`[Profile Refresh Saga: CRM] ✅ Successfully finished pipeline for candidate "${enrichedData.name}" on Job "${matchRow.job.title}"! AI score: ${evaluation.matchScore} / 100`);
    }

    // 7. Log activity to candidate and global timeline:
    // "Charchit refreshed profile for candidate JOURAWAR SINGH" (name is UPPERCASE)
    const displayCandidateName = enrichedData.name.toUpperCase();
    
    await logActivityEvent({
      user: authUser,
      event_type: 'UPDATE_CANDIDATE',
      entity_type: 'prospect',
      entity_id: prospectId,
      title: `refreshed profile for candidate ${displayCandidateName}`,
      description: reason.trim(), // Use user remarks only
      metadata: { 
        job_id: currentMatch.job_id,
        scraper: scraperChoice
      },
      environment
    });

    // Write to prospect_activities (legacy)
    await supabase
      .from('prospect_activities')
      .insert([{
        prospect_id: prospectId,
        job_id: currentMatch.job_id,
        changed_by: changedBy || authUser?.username || 'Admin',
        activity_type: 'override',
        previous_value: currentProspect.name,
        new_value: enrichedData.name,
        metadata: { field: 'profile_refresh', reason: reason },
        environment
      }]);

    console.log(`[Profile Refresh Saga: CRM] ✅ Profile refresh pipeline finished successfully for candidate "${enrichedData.name}"`);

    // 8. Retrieve and return the updated match state for the current ID
    const { data: updatedMatch } = await supabase
      .from('prospect_matches')
      .select('*, prospect:prospect_id(*), job:job_id(*)')
      .eq('id', matchId)
      .single();

    // Fetch unified timeline to return
    const { data: activities } = await supabase
      .from('activity_events')
      .select('*')
      .eq('entity_type', 'prospect')
      .eq('entity_id', String(prospectId))
      .eq('environment', environment)
      .order('created_at', { ascending: false });

    // Fetch other matches to keep UI updated
    const { data: updatedAllMatches } = await supabase
      .from('prospect_matches')
      .select('*, job:job_id(*)')
      .eq('prospect_id', prospectId)
      .eq('environment', environment);

    return NextResponse.json({ 
      success: true, 
      data: {
        ...updatedMatch,
        timeline: activities || [],
        allMatches: updatedAllMatches || []
      }
    }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('[Profile Refresh Saga: Enrich] ❌ Candidate refresh pipeline failed:', err.message, err.stack);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
