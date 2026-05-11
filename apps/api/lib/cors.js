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
  
  // If the origin is in our allowed list, return it, otherwise return the first allowed origin as a default (or null)
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Robots-Tag': 'noindex, nofollow',
  };
}
