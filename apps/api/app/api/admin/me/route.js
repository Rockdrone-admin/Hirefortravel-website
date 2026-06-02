import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { getCorsHeaders } from '../../../../lib/cors';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function GET(req) {
  try {
    const { user, error, status } = await requireAuth();
    if (error) {
      return NextResponse.json({ success: false, error }, { status, headers: getCorsHeaders(req.headers.get('origin')) });
    }
    return NextResponse.json({ success: true, data: user }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Fetch current user error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
