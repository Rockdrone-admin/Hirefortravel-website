import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../lib/supabase';
import { getCorsHeaders } from '../../../../lib/cors';
import bcrypt from 'bcryptjs';
import { SESSION_COOKIE_NAME } from '../../../../lib/session-cookie';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const session_token = req.cookies.get(SESSION_COOKIE_NAME)?.value || body.session_token;
    const { new_password } = body;
    const environment = getEnvironment();

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!session_token || !new_password) {
      return NextResponse.json({ success: false, error: 'Missing token or password' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Verify session
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('user_id, is_active, admin_users(must_reset_password, username, role)')
      .eq('session_token', session_token)
      .eq('environment', environment)
      .single();

    if (!session || !session.is_active || !session.admin_users?.must_reset_password) {
      return NextResponse.json({ success: false, error: 'Invalid session or no reset required' }, { status: 403, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Hash new password
    const newHash = await bcrypt.hash(new_password, 10);

    // Update user
    await supabase
      .from('admin_users')
      .update({ 
        password_hash: newHash,
        must_reset_password: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user_id)
      .eq('environment', environment);

    // Log Event
    await supabase.from('activity_events').insert({
      user_id: session.user_id,
      user_name: session.admin_users.username,
      role: session.admin_users.role,
      event_type: 'USER_PASSWORD_RESET',
      entity_type: 'USER',
      entity_id: session.user_id,
      title: 'Completed forced password reset',
      metadata: {},
      environment
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully' }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Reset password API error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
