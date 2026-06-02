import { supabase } from './supabase';

/**
 * Updates the current phase and progress percentage of a sourcing run in the database.
 * If the database columns do not exist yet, it gracefully falls back to setting them in-memory
 * via global maps (so the application continues to run without errors).
 */
export async function updateSourcingProgress(runId, phase, progress, environment) {
  if (!supabase) {
    // Graceful fallback to global state if supabase client is not initialized
    fallbackToGlobal(runId, phase, progress);
    return;
  }

  try {
    const { error } = await supabase
      .from('sourcing_runs')
      .update({ 
        current_phase: phase, 
        progress_percent: progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', runId)
      .eq('environment', environment);

    if (error) {
      if (error.code === '42703') {
        // Postgres error code 42703 = undefined_column
        console.warn(`[Sourcing] Supabase table 'sourcing_runs' is missing columns 'current_phase' or 'progress_percent'. Falling back to in-memory global state.`);
        fallbackToGlobal(runId, phase, progress);
      } else {
        console.error(`[Sourcing] Failed to update sourcing progress in DB:`, error.message);
        fallbackToGlobal(runId, phase, progress);
      }
    }
  } catch (err) {
    console.error(`[Sourcing] Unexpected error updating sourcing progress:`, err.message);
    fallbackToGlobal(runId, phase, progress);
  }
}

function fallbackToGlobal(runId, phase, progress) {
  global.sourcingRunPhases = global.sourcingRunPhases || {};
  global.sourcingRunProgress = global.sourcingRunProgress || {};
  
  global.sourcingRunPhases[runId] = phase;
  global.sourcingRunProgress[runId] = progress;
}
