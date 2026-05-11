import { createClient } from '@supabase/supabase-js';

// The environment variable MUST be prefixed correctly or just passed from Vercel config.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Resilient initialization for build-time safety
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export function getEnvironment() {
  // Use SUPABASE_ENVIRONMENT if set, otherwise fallback to NODE_ENV
  if (process.env.SUPABASE_ENVIRONMENT) {
    return process.env.SUPABASE_ENVIRONMENT;
  }
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}
