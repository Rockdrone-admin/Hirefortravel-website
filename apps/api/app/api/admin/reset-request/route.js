import { NextResponse } from 'next/server';
import { getCorsHeaders } from '../../../../lib/cors';

// Dynamic CORS handled inside functions

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // In a real application, you would use a service like SendGrid, Resend, or Mailgun here.
    console.log(`[AUTH] Password reset request received for: ${email}`);
    console.log(`[AUTH] Notifying administrator at Contact@hirefortravel.com`);

    // We simulate a successful request
    return NextResponse.json({ 
      success: true, 
      message: 'Reset request logged and administrator notified.' 
    }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('Reset request error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
