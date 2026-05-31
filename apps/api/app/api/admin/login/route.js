import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../lib/supabase';
import { getCorsHeaders } from '../../../../lib/cors';
import bcrypt from 'bcryptjs';
import { setSessionCookie } from '../../../../lib/session-cookie';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const environment = getEnvironment();

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Check the admin_users table
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .ilike('email', email) // Case-insensitive match on email
      .eq('environment', environment)
      .single();

    if (error || !user) {
      console.log(`Login failed for email: ${email} in ${environment} environment (User not found)`);
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!user.is_active) {
      return NextResponse.json({ success: false, error: 'User account is deactivated' }, { status: 403, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    let passwordIsValid = false;
    
    // Check if it's a legacy SHA-256 hash or plaintext hash transition
    if (!user.password_hash.startsWith('$2a$') && !user.password_hash.startsWith('$2b$')) {
      const hashHex = await sha256(password);
      if (user.password_hash === hashHex || user.password_hash === password) {
        passwordIsValid = true;
        // Upgrade to bcrypt
        const newHash = await bcrypt.hash(password, 10);
        await supabase.from('admin_users').update({ password_hash: newHash }).eq('id', user.id).eq('environment', environment);
      }
    } else {
      // Standard bcrypt check
      passwordIsValid = await bcrypt.compare(password, user.password_hash);
    }

    if (!passwordIsValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Update last_login
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    await supabase.from('admin_users').update({ 
      last_login_at: new Date().toISOString(),
      last_login_ip: ip
    }).eq('id', user.id).eq('environment', environment);

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 24 hours

    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
        environment
      })
      .select('session_token')
      .single();

    if (sessionError || !session) {
      throw new Error('Failed to create session');
    }

    // Fire Activity Event
    await supabase.from('activity_events').insert({
      user_id: user.id,
      user_name: user.username,
      role: user.role,
      event_type: 'USER_LOGIN',
      entity_type: 'SESSION',
      entity_id: session.session_token,
      title: 'Logged in',
      metadata: { device: userAgent, ip },
      environment
    });

    // Login successful. The session token is server-owned and stored in an HttpOnly cookie.
    const response = NextResponse.json({ 
      success: true, 
      message: 'Login successful',
      must_reset_password: user.must_reset_password
    }, { headers: getCorsHeaders(req.headers.get('origin')) });
    return setSessionCookie(response, session.session_token, req);

  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
