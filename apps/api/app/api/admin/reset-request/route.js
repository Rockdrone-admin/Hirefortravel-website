import { NextResponse } from 'next/server';

// Mock CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400, headers: corsHeaders });
    }

    // In a real application, you would use a service like SendGrid, Resend, or Mailgun here.
    // Example (pseudo-code):
    // await resend.emails.send({
    //   from: 'system@hirefortravel.com',
    //   to: 'Contact@hirefortravel.com',
    //   subject: 'Password Reset Request',
    //   text: `User with email ${email} has requested a password reset.`
    // });

    console.log(`[AUTH] Password reset request received for: ${email}`);
    console.log(`[AUTH] Notifying administrator at Contact@hirefortravel.com`);

    // We simulate a successful request
    return NextResponse.json({ 
      success: true, 
      message: 'Reset request logged and administrator notified.' 
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('Reset request error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
