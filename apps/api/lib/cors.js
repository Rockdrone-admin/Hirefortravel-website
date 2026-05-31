import { headers } from 'next/headers';
import { getEnvironment } from './supabase';

const ALLOWED_ORIGINS = {
  development: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://dev.hirefortravel.com',
    'https://dev-admin.hirefortravel.com'
  ],
  production: [
    'https://hirefortravel.com',
    'https://www.hirefortravel.com',
    'https://admin.hirefortravel.com'
  ]
};

export function getCorsHeaders(origin) {
  let environment = getEnvironment();
  
  // Detect if the API server itself is running in a dev/local context
  let isDevServer = false;
  try {
    const headersList = headers();
    const host = headersList.get('host') || '';
    if (host.toLowerCase().includes('dev') || host.toLowerCase().includes('localhost') || host.toLowerCase().includes('127.0.0.1')) {
      isDevServer = true;
    }
  } catch (e) {
    // Dynamic headers not available (e.g. during build)
  }

  if (!isDevServer) {
    isDevServer = process.env.NODE_ENV !== 'production' || 
      (process.env.VERCEL_URL && (process.env.VERCEL_URL.toLowerCase().includes('dev') || process.env.VERCEL_URL.toLowerCase().includes('preview'))) ||
      process.env.VERCEL_ENV === 'preview' ||
      process.env.VERCEL_GIT_COMMIT_REF === 'dev';
  }

  // Extra safety: only apply the fallback to 'development' allowed origins
  // if the server itself is a dev server AND the origin is a recognized dev domain/localhost.
  if (isDevServer && origin && (
    origin.includes('dev.hirefortravel.com') ||
    origin.includes('dev-admin.hirefortravel.com') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  )) {
    environment = 'development';
  }

  const allowed = ALLOWED_ORIGINS[environment] || [];
  
  // If no origin is provided (server-side fetch), or origin is allowed, 
  // we return that specific origin. Otherwise, we default to the first allowed one.
  let allowedOrigin = '*';
  if (!origin) {
    allowedOrigin = '*'; // Allow server-side/no-origin calls
  } else if (allowed.includes(origin)) {
    allowedOrigin = origin;
  } else {
    allowedOrigin = allowed[0] || '*';
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With, Cache-Control',
    'Access-Control-Allow-Credentials': 'true',
    'X-Robots-Tag': 'noindex, nofollow',
  };
}
