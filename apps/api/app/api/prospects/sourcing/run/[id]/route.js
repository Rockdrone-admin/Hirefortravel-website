import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../../lib/cors';

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

      if (idleSeconds > 60) {
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
        }
      }
    }

    let current_phase = 'Analyzing job requirements and mapping search parameters...';
    let progress_percent = 10;

    if (finalRun.status === 'completed') {
      current_phase = 'Sourcing completed successfully!';
      progress_percent = 100;
    } else if (finalRun.status === 'failed') {
      current_phase = 'Sourcing process failed.';
      progress_percent = 100;
    } else {
      if (global.sourcingRunPhases && global.sourcingRunPhases[runId]) {
        current_phase = global.sourcingRunPhases[runId];
      }
      if (global.sourcingRunProgress && typeof global.sourcingRunProgress[runId] === 'number') {
        progress_percent = global.sourcingRunProgress[runId];
      }
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
