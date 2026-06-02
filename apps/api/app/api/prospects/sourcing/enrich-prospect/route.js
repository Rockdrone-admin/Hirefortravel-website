import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../lib/cors';
import { enrichLinkedInProfile } from '../../../../../lib/enrichment/index.js';
import { scoreAndEvaluateProspect } from '../../../../../lib/gemini';
import { logActivityEvent } from '../../../../../lib/auth';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const body = await req.json();
    const { runId, jobId, strategyId, linkedinUrl, serpSnippet } = body;

    if (!runId || !jobId || !linkedinUrl) {
      return NextResponse.json({ success: false, error: 'Missing parameters: runId, jobId, and linkedinUrl are required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    console.log(`[Sourcing Saga: Enrich] 👤 Triggered candidate profile enrichment | URL: ${linkedinUrl} | Job: ${jobId}`);

    // Set operational phase & progress: Phase 3 (Analyzing Profiles)
    global.sourcingRunPhases = global.sourcingRunPhases || {};
    global.sourcingRunProgress = global.sourcingRunProgress || {};
    global.sourcingRunPhases[runId] = "Evaluating candidates for the best fit...";
    global.sourcingRunProgress[runId] = 75;

    // Update updated_at in DB to register activity and reset idle timer before starting slow scraper/AI calls
    if (supabase) {
      await supabase
        .from('sourcing_runs')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', runId)
        .eq('environment', environment);
    }

    // Fetch Job details for matching
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('environment', environment)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // 1. DEDUPE LOGIC: Check if this prospect already exists
    const { data: existingProspect, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('linkedin_url', linkedinUrl)
      .eq('environment', environment)
      .maybeSingle();

    let prospectId = existingProspect?.id;
    let isNewProspect = !existingProspect;

    // Sourcing Freshness Threshold: 90 days
    const PROFILE_STALENESS_THRESHOLD_DAYS = 90;
    const profileAgeDays = existingProspect?.created_at
      ? (new Date() - new Date(existingProspect.created_at)) / (1000 * 60 * 60 * 24)
      : 999;
    const isStale = existingProspect && (profileAgeDays > PROFILE_STALENESS_THRESHOLD_DAYS);

    if (existingProspect) {
      console.log(`[Sourcing Saga: Dedupe] 👤 Candidate profile already exists in CRM: "${existingProspect.name}" | Profile Age: ${Math.round(profileAgeDays)} days | Stale: ${isStale}`);
      
      // Check if they already matched this job
      const { data: existingMatch } = await supabase
        .from('prospect_matches')
        .select('*')
        .eq('prospect_id', existingProspect.id)
        .eq('job_id', jobId)
        .eq('environment', environment)
        .maybeSingle();

      if (existingMatch) {
        console.log(`[Sourcing Saga: Dedupe] [Skip] 👤 Candidate "${existingProspect.name}" already matched to Job ${jobId}. Skipping enrichment process.`);
        return NextResponse.json({ success: true, duplicated: true, message: 'Prospect already matched to this job' }, { headers: getCorsHeaders(req.headers.get('origin')) });
      }
    }

    // 2. ENRICH PROFILE (if candidate doesn't exist or is stale, scrape profile)
    let enrichedData;
    if (existingProspect && !isStale) {
      // Reuse existing prospect profile data
      enrichedData = {
        name: existingProspect.name,
        email: existingProspect.email,
        phone: existingProspect.phone,
        city: existingProspect.city,
        latest_title: existingProspect.latest_title,
        latest_company: existingProspect.latest_company,
        total_experience: existingProspect.total_experience,
        skills: existingProspect.raw_enrichment_payload?.skills?.join(', ') || '',
        experience: existingProspect.raw_enrichment_payload?.experience?.map(e => `${e.title} at ${e.company}`).join(', ') || '',
        raw_payload: {
          comprehensive_profile: existingProspect.raw_enrichment_payload?.comprehensive_profile || null
        }
      };
    } else {
      // Determine which scraper to use from settings
      const { data: scraperSetting } = await supabase
        .from('sourcing_prompts')
        .select('instructions')
        .eq('prompt_type', 'enrichment_scraper')
        .eq('environment', environment)
        .maybeSingle();

      const scraperChoice = (scraperSetting && scraperSetting.instructions && scraperSetting.instructions[0]) || 'apify';

      // Enrich fresh profile using the selected provider / Snippet fallback
      enrichedData = await enrichLinkedInProfile(linkedinUrl, serpSnippet, scraperChoice);
      
      // Insert or Update in Prospects table
      const dedupeHash = `${enrichedData.name.toLowerCase().replace(/\s/g, '')}-${enrichedData.latest_company.toLowerCase().replace(/\s/g, '')}`;
      
      // If we don't have existingProspect by URL, check if they exist by dedupe_hash (under a different URL)
      let dbProspect = existingProspect;
      if (!dbProspect) {
        const { data: matchedDedupeProspect } = await supabase
          .from('prospects')
          .select('*')
          .eq('dedupe_hash', dedupeHash)
          .eq('environment', environment)
          .maybeSingle();
        dbProspect = matchedDedupeProspect;
      }

      if (dbProspect) {
        // Candidate profile already exists (either they were stale by URL, or we matched them by dedupe_hash)
        prospectId = dbProspect.id;
        isNewProspect = false;

        console.log(`[Sourcing Saga: Staleness/Dedupe] 🔄 CRM profile for candidate "${enrichedData.name}" is being reused and updated (ID: ${prospectId}).`);

        // Check if they already matched this job
        const { data: existingMatch } = await supabase
          .from('prospect_matches')
          .select('*')
          .eq('prospect_id', prospectId)
          .eq('job_id', jobId)
          .eq('environment', environment)
          .maybeSingle();

        if (existingMatch) {
          console.log(`[Sourcing Saga: Dedupe] [Skip] 👤 Candidate "${enrichedData.name}" already matched to Job ${jobId}. Skipping duplicate match.`);
          return NextResponse.json({ success: true, duplicated: true, message: 'Prospect already matched to this job' }, { headers: getCorsHeaders(req.headers.get('origin')) });
        }

        // Update existing stale/matched CRM profile with fresh scraping details and reset the staleness timer clock
        console.log(`[Sourcing Saga: Enrich] 🚀 Updating existing CRM profile for candidate "${enrichedData.name}" with fresh details.`);
        await supabase
          .from('prospects')
          .update({
            name: enrichedData.name,
            email: enrichedData.email,
            phone: enrichedData.phone,
            city: enrichedData.city,
            latest_title: enrichedData.latest_title,
            latest_company: enrichedData.latest_company,
            total_experience: enrichedData.total_experience,
            enrichment_confidence: enrichedData.enrichment_confidence,
            raw_enrichment_payload: enrichedData.raw_payload,
            created_at: new Date().toISOString() // reset staleness clock
          })
          .eq('id', prospectId)
          .eq('environment', environment);
      } else {
        // Insert new prospect
        const { data: newProspect, error: insertError } = await supabase
          .from('prospects')
          .insert([{
            name: enrichedData.name,
            email: enrichedData.email,
            phone: enrichedData.phone,
            city: enrichedData.city,
            latest_title: enrichedData.latest_title,
            latest_company: enrichedData.latest_company,
            functional_field: '', // will be inferred by Gemini
            total_experience: enrichedData.total_experience,
            linkedin_url: linkedinUrl,
            source: 'AI Sourcing',
            dedupe_hash: dedupeHash,
            enrichment_confidence: enrichedData.enrichment_confidence,
            raw_enrichment_payload: enrichedData.raw_payload,
            environment
          }])
          .select()
          .single();

        if (insertError) {
          console.error('[Sourcing Saga: CRM] ❌ Failed to insert fresh candidate profile into prospects table:', insertError);
          return NextResponse.json({ success: false, error: 'Failed to create prospect' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
        }
        
        prospectId = newProspect.id;
      }
    }

    // 3. RUN GEMINI SCORE & EVALUATION
    const evaluation = await scoreAndEvaluateProspect(job, enrichedData);

    // If new prospect, update their functional field with the AI's inference
    if (isNewProspect) {
      await supabase
        .from('prospects')
        .update({ functional_field: evaluation.functionalField })
        .eq('id', prospectId)
        .eq('environment', environment);
    }

    // 4. CREATE PROSPECT MATCH ROW
    const { error: matchError } = await supabase
      .from('prospect_matches')
      .insert([{
        prospect_id: prospectId,
        job_id: jobId,
        stage: 'IDENTIFIED',
        ai_score: evaluation.matchScore,
        ai_reasoning: evaluation.aiReasoning,
        active_flag: true,
        primary_flag: true,
        discovered_by_strategy_id: strategyId || null,
        environment,
        lifecycle_timestamps: {
          IDENTIFIED: new Date().toISOString(),
          ai_score_breakdown: evaluation.factorScores
        }
      }]);

    if (matchError) {
      console.error('[Sourcing Saga: CRM] ❌ Failed to insert candidate match record into prospect_matches table:', matchError);
      return NextResponse.json({ success: false, error: 'Failed to record prospect match' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // 4.5 LOG CANDIDATE_MATCHED ACTIVITY
    let triggeredBy = 'System';
    let runStartedAt = new Date().toISOString();
    try {
      const { data: runEvent } = await supabase
        .from('activity_events')
        .select('user_name, created_at')
        .eq('entity_type', 'SOURCING_RUN')
        .eq('entity_id', runId)
        .eq('event_type', 'RUN_AI_SOURCING')
        .maybeSingle();
      if (runEvent) {
        triggeredBy = runEvent.user_name || 'System';
        runStartedAt = runEvent.created_at || runStartedAt;
      }
    } catch (e) {
      console.warn('Failed to find run trigger event:', e);
    }

    const formattedTime = new Date(runStartedAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    await logActivityEvent({
      user: 'SYSTEM',
      event_type: 'CANDIDATE_MATCHED',
      entity_type: 'prospect',
      entity_id: prospectId,
      title: `Discovered by AI Sourcing`,
      description: `Sourced via Sourcing Run triggered by ${triggeredBy} at ${formattedTime} (AI Score: ${evaluation.matchScore}%)`,
      metadata: { 
        job_id: jobId, 
        run_id: runId, 
        triggered_by: triggeredBy, 
        sourced_at: runStartedAt, 
        ai_score: evaluation.matchScore 
      },
      environment
    });

    // 5. LOG AUDIT ACTIVITY
    await supabase
      .from('prospect_activities')
      .insert([{
        prospect_id: prospectId,
        job_id: jobId,
        changed_by: 'AI Sourcing',
        activity_type: 'created',
        new_value: 'IDENTIFIED',
        metadata: {
          ai_score: evaluation.matchScore,
          ai_reasoning: evaluation.aiReasoning
        },
        environment
      }]);

    // 5.5 UPDATE SOURCING STRATEGY METRICS
    if (strategyId) {
      try {
        const { data: matches } = await supabase
          .from('prospect_matches')
          .select('ai_score')
          .eq('discovered_by_strategy_id', strategyId)
          .eq('environment', environment);

        if (matches) {
          const total = matches.length;
          const high = matches.filter(m => (m.ai_score || 0) >= 50).length;

          await supabase
            .from('sourcing_strategies')
            .update({
              total_discovered: total,
              high_score_count: high
            })
            .eq('id', strategyId);
            
          console.log(`[Sourcing Saga: CRM] [Strategy Metrics] Synced strategy ID ${strategyId} | Total matched: ${total} | High scoring: ${high}`);
        }
      } catch (e) {
        console.warn('[Sourcing Saga: CRM] [Strategy Metrics] ⚠️ Failed to update sourcing_strategies:', e.message);
      }
    }

    // 6. INCREMENT DISCOVERED COUNT IN SOURCING RUN
    const { data: run } = await supabase
      .from('sourcing_runs')
      .select('total_discovered, positions_targeted, status')
      .eq('id', runId)
      .eq('environment', environment)
      .single();

    if (run) {
      const nextCount = (run.total_discovered || 0) + 1;
      // Mark sourcing runs completed if we successfully finished our discovery loop
      const nextStatus = nextCount >= 50 ? 'completed' : 'running';

      await supabase
        .from('sourcing_runs')
        .update({ 
          total_discovered: nextCount,
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', runId)
        .eq('environment', environment);

      // Log completion if transitioning to completed
      if (nextStatus === 'completed' && run.status === 'running') {
        let triggeredBy = 'System';
        try {
          const { data: runEvent } = await supabase
            .from('activity_events')
            .select('user_name')
            .eq('entity_type', 'SOURCING_RUN')
            .eq('entity_id', runId)
            .eq('event_type', 'RUN_AI_SOURCING')
            .maybeSingle();
          if (runEvent) {
            triggeredBy = runEvent.user_name || 'System';
          }
        } catch (e) {
          console.warn('Failed to find run trigger event for completion:', e);
        }

        let highScoringCount = 0;
        try {
          const { data: strats } = await supabase
            .from('sourcing_strategies')
            .select('high_score_count')
            .eq('run_id', runId);
          if (strats) {
            highScoringCount = strats.reduce((sum, s) => sum + (s.high_score_count || 0), 0);
          }
        } catch (e) {
          console.warn('Failed to query sourcing_strategies for completed count:', e);
        }

        const positionIds = run.positions_targeted || [];
        const mockAuthUser = { username: triggeredBy, role: 'RECRUITER' };

        await logActivityEvent({
          user: mockAuthUser,
          event_type: 'SOURCING_COMPLETED',
          entity_type: 'SOURCING_RUN',
          entity_id: runId,
          title: `AI Sourcing Completed: Sourced ${nextCount} candidates`,
          metadata: { 
            job_ids: positionIds, 
            candidates_sourced: nextCount,
            high_scoring_sourced: highScoringCount
          },
          environment
        });
      }
    }

    console.log(`[Sourcing Saga: CRM] ✅ Successfully finished pipeline for candidate "${enrichedData.name}"! AI score: ${evaluation.matchScore} / 100`);

    return NextResponse.json({ 
      success: true, 
      prospectId, 
      score: evaluation.matchScore 
    }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('[Sourcing Saga: Enrich] ❌ Candidate enrichment pipeline failed:', err.message, err.stack);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
