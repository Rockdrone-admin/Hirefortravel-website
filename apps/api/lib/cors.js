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
  const environment = getEnvironment();
  const allowed = ALLOWED_ORIGINS[environment] || [];
  
  // If no origin is provided (server-side fetch), or origin is allowed, 
  // we return that specific origin. Otherwise, we default to the first allowed one.
  let allowedOrigin = '*';
  if (!origin) {
    allowedOrigin = '*'; // Allow server-side/no-origin calls
  } else if (allowed.includes(origin)) {
    allowedOrigin = origin;
  } else {
    allowedOrigin = allowed[0];
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With, Cache-Control',
    'X-Robots-Tag': 'noindex, nofollow',
  };
}
