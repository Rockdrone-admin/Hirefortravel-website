import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../../lib/cors';
import { logActivityEvent } from '../../../../../../lib/auth';
import { enrichLinkedInProfile } from '../../../../../../lib/enrichment/index.js';
import { scoreAndEvaluateProspect } from '../../../../../../lib/gemini';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const body = await req.json();
    const { matchId, reason, changedBy, authUser, scraperChoice } = body;

    if (!matchId) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    console.log(`[Profile Refresh Saga: Init] 👤 Worker processing candidate refresh for Match ID: ${matchId}`);

    // Fetch match
    const { data: matchRow, error: matchError } = await supabase
      .from('prospect_matches')
      .select('*, prospect:prospect_id(*)')
      .eq('id', matchId)
      .eq('environment', environment)
      .single();

    if (matchError || !matchRow) {
      console.error(`[Profile Refresh Saga: Dedupe] ❌ Match ID ${matchId} not found in database. Skipping.`);
      return NextResponse.json({ success: false, error: 'Match record not found' }, { status: 404, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const prospectId = matchRow.prospect_id;
    const currentProspect = matchRow.prospect;
    console.log(`[Profile Refresh Saga: Dedupe] 👤 Candidate profile found in CRM: "${currentProspect?.name || 'Unknown'}"`);

    if (!currentProspect || !currentProspect.linkedin_url) {
      console.warn(`[Profile Refresh Saga: Dedupe] ⚠️ Candidate "${currentProspect?.name || 'Unknown'}" lacks LinkedIn URL. Skipping.`);
      return NextResponse.json({ success: false, error: 'Candidate lacks LinkedIn URL' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
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
      return NextResponse.json({ success: false, error: 'Failed to update prospects table' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
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

    // Log candidate timeline event
    const displayCandidateName = enrichedData.name.toUpperCase();

    await logActivityEvent({
      user: authUser || 'SYSTEM',
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

    console.log(`[Profile Refresh Saga: Init] ✅ Finished processing background candidate refresh: "${enrichedData.name}"`);

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error(`[Profile Refresh Saga: Enrich] ❌ Background candidate refresh worker failed:`, err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
