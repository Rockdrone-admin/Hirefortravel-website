import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../lib/supabase';
import { getCorsHeaders } from '../../../../lib/cors';
import { SESSION_COOKIE_NAME, clearSessionCookie } from '../../../../lib/session-cookie';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }
    const session_token = req.cookies.get(SESSION_COOKIE_NAME)?.value || body.session_token;
    const environment = getEnvironment();

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (session_token) {
      // Invalidate the session
      await supabase
        .from('admin_sessions')
        .update({ is_active: false })
        .eq('session_token', session_token)
        .eq('environment', environment);

      // Get user info for logging
      const { data: session } = await supabase
        .from('admin_sessions')
        .select('user_id, admin_users(username, role)')
        .eq('session_token', session_token)
        .eq('environment', environment)
        .single();
        
      if (session && session.admin_users) {
        await supabase.from('activity_events').insert({
          user_id: session.user_id,
          user_name: session.admin_users.username,
          role: session.admin_users.role,
          event_type: 'USER_LOGOUT',
          entity_type: 'SESSION',
          entity_id: session_token,
          title: 'Logged out',
          metadata: {},
          environment
        });
      }
    }

    const response = NextResponse.json({ success: true, message: 'Logout successful' }, { headers: getCorsHeaders(req.headers.get('origin')) });
    return clearSessionCookie(response, req);
  } catch (err) {
    console.error('Logout API error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
