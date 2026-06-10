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
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_prospects');
    if (authError) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const matchId = params.id;
    const body = await req.json();
    const { changedBy, reason } = body;

    if (!matchId) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
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

    if (!currentProspect || !currentProspect.linkedin_url) {
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

    console.log(`[Profile Refresh] Rescraping candidate "${currentProspect.name}" via ${scraperChoice} | URL: ${linkedinUrl}`);

    // 3. Rescrape profile using the selected provider
    const enrichedData = await enrichLinkedInProfile(linkedinUrl, '', scraperChoice);

    // 4. Update the Prospects table with fresh details
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

    if (allMatchesError || !allMatches) {
      console.error('[Profile Refresh] Failed to fetch other matches:', allMatchesError);
    }

    // 6. Rerun Gemini scoring for ALL matches of this prospect
    const matchesToUpdate = allMatches || [currentMatch];

    for (const matchRow of matchesToUpdate) {
      if (!matchRow.job) {
        console.warn(`[Profile Refresh] Match ${matchRow.id} does not have a valid job associated. Skipping scoring.`);
        continue;
      }

      console.log(`[Profile Refresh] Rerunning AI scoring for Candidate "${enrichedData.name}" on Job "${matchRow.job.title}"`);
      const evaluation = await scoreAndEvaluateProspect(matchRow.job, enrichedData);

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
        console.error(`[Profile Refresh] Failed to update match scoring for match ID ${matchRow.id}:`, matchUpdateErr);
      }
    }

    // 7. Log CANDIDATE_REFRESHED activity (shows on global timeline and candidate details)
    await logActivityEvent({
      user: authUser,
      event_type: 'UPDATE_CANDIDATE',
      entity_type: 'prospect',
      entity_id: prospectId,
      title: `Refreshed candidate profile details`,
      description: reason || `Completely refreshed profile via ${scraperChoice} and updated AI scoring/reasoning.`,
      metadata: { 
        job_id: currentMatch.job_id,
        scraper: scraperChoice,
        changed_by: changedBy || authUser?.username || 'System'
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
        metadata: { field: 'profile_refresh', reason: reason || 'Manual refresh' },
        environment
      }]);

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
    console.error('[Profile Refresh] ❌ Candidate refresh failed:', err.message, err.stack);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
