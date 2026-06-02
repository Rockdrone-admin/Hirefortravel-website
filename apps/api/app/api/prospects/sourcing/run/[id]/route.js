import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../../lib/cors';
import { logActivityEvent } from '../../../../../../lib/auth';


export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function GET(req, { params }) {
  try {
    const environment = getEnvironment();
    const runId = params.id;

    if (!runId) {
      return NextResponse.json({ success: false, error: 'Run ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { data: run, error } = await supabase
      .from('sourcing_runs')
      .select('*')
      .eq('id', runId)
      .eq('environment', environment)
      .single();

    if (error || !run) {
      return NextResponse.json({ success: false, error: 'Sourcing run not found' }, { status: 404, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    let finalRun = run;

    // Auto-complete runs that have gone quiet/idle (e.g. no discoveries for 60 seconds)
    if (run.status === 'running') {
      const now = new Date();
      const lastUpdate = new Date(run.updated_at || run.created_at);
      const idleSeconds = (now - lastUpdate) / 1000;

      if (idleSeconds > 120) {
        console.log(`[Sourcing] Run ${runId} has been idle for ${idleSeconds}s. Auto-completing to prevent infinite loading...`);
        const { data: completedRun, error: updateErr } = await supabase
          .from('sourcing_runs')
          .update({ 
            status: 'completed',
            updated_at: now.toISOString()
          })
          .eq('id', runId)
          .select()
          .single();

        if (!updateErr && completedRun) {
          finalRun = completedRun;

          // Log Sourcing Completed Event for Idle Run
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
            console.warn('Failed to find run trigger event for idle complete:', e);
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

          const mockAuthUser = { username: triggeredBy, role: 'RECRUITER' };

          await logActivityEvent({
            user: mockAuthUser,
            event_type: 'SOURCING_COMPLETED',
            entity_type: 'SOURCING_RUN',
            entity_id: runId,
            title: `AI Sourcing Completed: Sourced ${completedRun.total_discovered} candidates`,
            metadata: { 
              job_ids: completedRun.positions_targeted, 
              candidates_sourced: completedRun.total_discovered,
              high_scoring_sourced: highScoringCount
            },
            environment
          });
        }
      }
    }

    let current_phase = finalRun.current_phase;
    let progress_percent = finalRun.progress_percent;

    if (current_phase === undefined || current_phase === null) {
      if (global.sourcingRunPhases && global.sourcingRunPhases[runId]) {
        current_phase = global.sourcingRunPhases[runId];
      } else {
        current_phase = 'Understanding the role and preparing the search...';
      }
    }
    if (progress_percent === undefined || progress_percent === null) {
      if (global.sourcingRunProgress && typeof global.sourcingRunProgress[runId] === 'number') {
        progress_percent = global.sourcingRunProgress[runId];
      } else {
        progress_percent = 10;
      }
    }

    if (finalRun.status === 'completed') {
      current_phase = 'All done! Your candidates are ready.';
      progress_percent = 100;
    } else if (finalRun.status === 'failed') {
      current_phase = 'Sourcing process failed.';
      progress_percent = 100;
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...finalRun,
        current_phase,
        progress_percent
      }
    }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('Sourcing run GET status failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
