import { NextResponse } from 'next/server';
import { logCritical } from '@repo/logger';
import { getCorsHeaders } from '../../../lib/cors';

export async function GET(req) {
  try {
    await logCritical('Test Alert Triggered', { 
      source: 'API Test Route',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Critical test alert sent to BetterStack. Please check your dashboard and email.' 
    }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
