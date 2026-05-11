import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Only initialize if we have the required credentials
// This prevents build-time crashes when environment variables are not available
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export function getEnvironment() {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}
