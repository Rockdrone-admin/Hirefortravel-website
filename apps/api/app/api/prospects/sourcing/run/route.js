import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../lib/cors';
import { parseJobDetailsAndGenerateDorks } from '../../../../../lib/gemini';
import { Client } from '@upstash/qstash';
import { requireAuth, logActivityEvent } from '../../../../../lib/auth';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_prospects');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const body = await req.json();
    const { positionIds } = body;
    console.log(`[Sourcing Saga: Init] 🚀 Sourcing run triggered for position IDs: [${positionIds.join(', ')}] | Environment: ${environment}`);
    const { searchParams } = new URL(req.url);
    const host = req.headers.get('host') || 'localhost:3002';
    const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');
    const local = searchParams.get('local') === 'true' || isLocalHost;

    if (!positionIds || !Array.isArray(positionIds) || positionIds.length === 0) {
      return NextResponse.json({ success: false, error: 'positionIds list is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // 1. Fetch Job details
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .in('id', positionIds)
      .eq('environment', environment);

    if (jobsError || !jobs || jobs.length === 0) {
      return NextResponse.json({ success: false, error: 'Failed to fetch selected active positions' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Determine limits per position (Max 50 prospects total)
    const totalMaxProspects = 50;
    const limitPerJob = Math.floor(totalMaxProspects / jobs.length);

    // 2. Initialize Sourcing Run
    const { data: run, error: runError } = await supabase
      .from('sourcing_runs')
      .insert([{
        status: 'running',
        positions_targeted: positionIds,
        total_discovered: 0,
        environment
      }])
      .select()
      .single();

    if (runError || !run) {
      return NextResponse.json({ success: false, error: 'Failed to initialize sourcing run record' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Log Global Activity
    await logActivityEvent({
      user: authUser,
      event_type: 'RUN_AI_SOURCING',
      entity_type: 'SOURCING_RUN',
      entity_id: run.id,
      title: `Initiated AI Sourcing for ${jobs.length} position(s)`,
      metadata: { job_ids: positionIds, jobs_titles: jobs.map(j => j.title) },
      environment
    });

    // 3. Process each job and trigger X-ray searches in the background (fire-and-forget)
    global.sourcingRunPhases = global.sourcingRunPhases || {};
    global.sourcingRunProgress = global.sourcingRunProgress || {};

    global.sourcingRunPhases[run.id] = "Analyzing job requirements and mapping search parameters...";
    global.sourcingRunProgress[run.id] = 10;

    const qstashToken = process.env.QSTASH_TOKEN;
    const qstashUrl = process.env.QSTASH_URL || 'https://qstash-eu-central-1.upstash.io';
    const qstash = qstashToken ? new Client({ token: qstashToken, baseUrl: qstashUrl }) : null;

    // Use current request headers to construct local/remote callback URL
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const apiBaseUrl = `${protocol}://${host}`;

    (async () => {
      try {
        for (const job of jobs) {
          try {
            // Fetch already discovered candidates for this job to generate fresh queries
            let existingTitles = [];
            let existingCompanies = [];
            
            const { data: matches } = await supabase
              .from('prospect_matches')
              .select('prospects(latest_title, latest_company)')
              .eq('job_id', job.id)
              .eq('environment', environment);

            if (matches && matches.length > 0) {
              matches.forEach(m => {
                const p = m.prospects;
                if (p) {
                  if (p.latest_title) existingTitles.push(p.latest_title);
                  if (p.latest_company) existingCompanies.push(p.latest_company);
                }
              });
            }

            existingTitles = [...new Set(existingTitles)].slice(0, 15);
            existingCompanies = [...new Set(existingCompanies)].slice(0, 15);

            // Dynamic Pivot Evaluation
            let shouldPivot = false;
            let lastStrategy = null;
            try {
              const { data: strategies, error: stratErr } = await supabase
                .from('sourcing_strategies')
                .select('*')
                .eq('job_id', job.id)
                .eq('environment', environment)
                .order('created_at', { ascending: false })
                .limit(1);
                
              if (!stratErr && strategies && strategies.length > 0) {
                lastStrategy = strategies[0];
                
                // Fetch actual matches from DB to prevent inaccurate/0 metrics due to async pipeline flow
                const { data: matches, error: matchesErr } = await supabase
                  .from('prospect_matches')
                  .select('ai_score')
                  .eq('discovered_by_strategy_id', lastStrategy.id)
                  .eq('environment', environment);

                let total = lastStrategy.total_discovered || 0;
                let high = lastStrategy.high_score_count || 0;

                if (!matchesErr && matches) {
                  total = matches.length;
                  high = matches.filter(m => (m.ai_score || 0) >= 50).length;
                }

                // Restore/maintain the intended original pivot logic threshold
                const pivotThreshold = Math.max(5, Math.round(0.20 * total));
                shouldPivot = high < pivotThreshold;
                
                console.log(`[Sourcing Saga: Init] [Pivot Logic] Job: "${job.title}" | Previous Discovered: ${total} | High Scoring: ${high} | Threshold: ${pivotThreshold} | Pivot Strategic Angle? ${shouldPivot ? 'YES (Triggering Orthogonal Search)' : 'NO (Triggering Primary Search)'}`);
              }
            } catch (e) {
              console.warn('[Sourcing Saga: Init] [Pivot Logic] ⚠️ Failed to query sourcing_strategies (table might not exist yet):', e.message);
            }

            // Parse JD & generate dorks using Gemini 2.5 Flash
            const parsedDetails = await parseJobDetailsAndGenerateDorks(job, existingTitles, existingCompanies, shouldPivot);
            const { booleanQueries } = parsedDetails;
            
            if (booleanQueries && booleanQueries.length > 0) {
              // Register new sourcing strategy
              let strategyRecord = null;
              try {
                const { data: newStrat, error: insertStratErr } = await supabase
                  .from('sourcing_strategies')
                  .insert([{
                    job_id: job.id,
                    run_id: run.id,
                    functional_field: parsedDetails.targetRole || '',
                    angle_name: shouldPivot ? 'Orthogonal Pivot Search' : 'Primary Target Search',
                    boolean_queries: booleanQueries || [],
                    targeted_competitors: parsedDetails.competitors || [],
                    targeted_keywords: parsedDetails.skills || [],
                    total_discovered: 0,
                    high_score_count: 0,
                    environment
                  }])
                  .select()
                  .single();
                
                if (!insertStratErr && newStrat) {
                  strategyRecord = newStrat;
                  console.log(`[Sourcing Saga: Init] [Strategy] Registered strategy: "${strategyRecord.angle_name}" (ID: ${strategyRecord.id})`);
                }
              } catch (e) {
                console.warn('[Sourcing Saga: Init] [Strategy] ⚠️ Failed to save sourcing_strategy record (table might not exist):', e.message);
              }

              // Use multiple distinct queries to fulfill candidate requirements
              const distinctQueries = [...new Set(booleanQueries)].slice(0, 3);
              
              for (const searchQuery of distinctQueries) {
                const payload = {
                  runId: run.id,
                  jobId: job.id,
                  strategyId: strategyRecord?.id || null,
                  searchQuery,
                  limit: limitPerJob,
                  countryCode: parsedDetails.countryCode || 'us',
                  citySynonyms: parsedDetails.citySynonyms || [],
                  nearbyCities: parsedDetails.nearbyCities || [],
                  countryName: parsedDetails.countryName || 'United States'
                };

                if (local || !qstash) {
                  // Local fallback: Trigger next step synchronously in the background thread
                  console.log(`[Sourcing Saga: Init] [LocalDev] Dispatching query locally for job "${job.title}": "${searchQuery}"`);
                  await fetch(`${apiBaseUrl}/api/prospects/sourcing/search-job?local=true`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  }).catch(err => console.error('[Sourcing Saga: Init] ❌ Local search trigger request failed:', err.message));
                } else {
                  // Production QStash publish
                  console.log(`[Sourcing Saga: Init] [QStash] Publishing search task for job "${job.title}" with query: "${searchQuery}"`);
                  await qstash.publishJSON({
                    url: `${apiBaseUrl}/api/prospects/sourcing/search-job`,
                    body: payload
                  }).catch(err => console.error('[Sourcing Saga: Init] ❌ QStash search publish failed:', err.message));
                }

                // Small delay between sequential search triggers to prevent rate limiting/overlapping
                await new Promise(resolve => setTimeout(resolve, 1500));
              }
            }
          } catch (err) {
            console.error(`[Sourcing Saga: Init] ❌ Failed to parse requirements or launch search for job ${job.id}:`, err.message, err.stack);
          }
        }

        // Once we arrive here, all background search and enrichment triggers have fully finished.
        // For local mode, this means everything is completely done. Let's mark it as completed!
        global.sourcingRunPhases[run.id] = "Compiling CRM profiles and preparing shortlists...";
        global.sourcingRunProgress[run.id] = 95;
        
        if (local || !qstash) {
          const { data: currentRun } = await supabase
            .from('sourcing_runs')
            .select('status')
            .eq('id', run.id)
            .single();
          
          if (currentRun && currentRun.status === 'running') {
            await supabase
              .from('sourcing_runs')
              .update({ 
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', run.id);

            // Fetch the completed run's final details (including total_discovered count)
            const { data: finalRun } = await supabase
              .from('sourcing_runs')
              .select('total_discovered')
              .eq('id', run.id)
              .single();

            const candidatesCount = finalRun ? finalRun.total_discovered : 0;

            let highScoringCount = 0;
            try {
              const { data: strats } = await supabase
                .from('sourcing_strategies')
                .select('high_score_count')
                .eq('run_id', run.id);
              if (strats) {
                highScoringCount = strats.reduce((sum, s) => sum + (s.high_score_count || 0), 0);
              }
            } catch (e) {
              console.warn('Failed to query sourcing_strategies for completed count:', e);
            }

            // Log Sourcing Completed Event
            await logActivityEvent({
              user: authUser,
              event_type: 'SOURCING_COMPLETED',
              entity_type: 'SOURCING_RUN',
              entity_id: run.id,
              title: `AI Sourcing Completed: Sourced ${candidatesCount} candidates`,
              metadata: { 
                job_ids: positionIds, 
                candidates_sourced: candidatesCount,
                high_scoring_sourced: highScoringCount
              },
              environment
            });
          }
          console.log(`[Sourcing Saga: Init] [LocalDev] ✅ Sourcing run ${run.id} finished successfully.`);
        }

        global.sourcingRunPhases[run.id] = "Sourcing completed successfully!";
        global.sourcingRunProgress[run.id] = 100;

      } catch (backgroundError) {
        console.error('[Sourcing Saga: Init] ❌ Background sourcing pipeline failed:', backgroundError.message, backgroundError.stack);
        await supabase
          .from('sourcing_runs')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', run.id);

        global.sourcingRunPhases[run.id] = "Sourcing process failed.";
        global.sourcingRunProgress[run.id] = 100;
      } finally {
        // Clean up global maps after 5 minutes
        setTimeout(() => {
          if (global.sourcingRunPhases) delete global.sourcingRunPhases[run.id];
          if (global.sourcingRunProgress) delete global.sourcingRunProgress[run.id];
        }, 300000);
      }
    })();

    return NextResponse.json({ 
      success: true, 
      data: { 
        id: run.id,
        runId: run.id,
        status: 'running',
        total_discovered: 0,
        limitPerJob
      } 
    }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('[Sourcing Saga: Init] ❌ Sourcing run initial trigger failed:', err.message, err.stack);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
