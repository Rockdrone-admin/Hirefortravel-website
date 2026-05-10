import { createClient } from '@supabase/supabase-js';

// The environment variable MUST be prefixed correctly or just passed from Vercel config.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export function getEnvironment() {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}
