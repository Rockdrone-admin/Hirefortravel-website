import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

import { logCritical } from '@repo/logger';

// The environment variable MUST be prefixed correctly or just passed from Vercel config.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  if (process.env.NODE_ENV === 'production') {
    logCritical('Supabase environment variables missing in production', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }
  console.error('Supabase credentials missing. Check environment variables.');
}

// Resilient initialization for build-time safety
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export function getEnvironment() {
  // 1. Explicit environment variable check (takes precedence)
  if (process.env.SUPABASE_ENVIRONMENT) {
    return process.env.SUPABASE_ENVIRONMENT;
  }

  // 2. Dynamic host check from request headers (highly reliable at runtime)
  try {
    const headersList = headers();
    const host = headersList.get('host') || '';
    if (host.toLowerCase().includes('dev') || host.toLowerCase().includes('localhost') || host.toLowerCase().includes('127.0.0.1')) {
      return 'development';
    }
  } catch (e) {
    // Dynamic headers not available (e.g. during build or static generation)
  }

  // 3. Vercel deployment URL checks (e.g. dev branch or preview domains containing 'dev')
  if (process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL.toLowerCase();
    if (url.includes('dev') || url.includes('preview')) {
      return 'development';
    }
  }

  // 4. Vercel environment status checks
  if (process.env.VERCEL_ENV === 'preview') {
    return 'development';
  }
  if (process.env.VERCEL_GIT_COMMIT_REF === 'dev') {
    return 'development';
  }

  // 4. Default fallback based on NODE_ENV
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}
