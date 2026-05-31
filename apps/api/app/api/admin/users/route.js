import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../lib/supabase';
import { getCorsHeaders } from '../../../../lib/cors';
import bcrypt from 'bcryptjs';
import { requireAuth, logActivityEvent } from '../../../../lib/auth';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function GET(req) {
  try {
    const environment = getEnvironment();
    const { user, error: authError, status: authStatus } = await requireAuth('can_manage_users');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, username, email, role, is_active, must_reset_password, last_login_at, created_at, permissions')
      .eq('environment', environment)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: users }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Fetch users error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_manage_users');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const data = await req.json();

    const newPassword = data.password || 'Temporary123!';
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { data: user, error } = await supabase
      .from('admin_users')
      .insert({
        username: data.username,
        email: data.email || null,
        password_hash: passwordHash,
        role: data.role || 'RECRUITER',
        must_reset_password: data.must_reset_password !== undefined ? data.must_reset_password : true,
        is_active: data.is_active !== undefined ? data.is_active : true,
        permissions: data.permissions || {},
        environment
      })
      .select('id, username, role')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: 'Username or Email already exists' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
      }
      throw error;
    }
    
    // Log Activity
    await logActivityEvent({
      user: authUser,
      event_type: 'USER_CREATED',
      entity_type: 'USER',
      entity_id: user.id,
      title: `Created user ${user.username}`,
      metadata: { role: user.role },
      environment
    });

    return NextResponse.json({ success: true, data: user }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Create user error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function PATCH(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_manage_users');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const data = await req.json();
    
    if (!data.id) {
      return NextResponse.json({ success: false, error: 'Missing user ID' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const updates = {};
    if (data.username) updates.username = data.username;
    if (data.email !== undefined) updates.email = data.email || null;
    if (data.role) updates.role = data.role;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    if (data.permissions) updates.permissions = data.permissions;
    if (data.must_reset_password !== undefined) updates.must_reset_password = data.must_reset_password;
    
    if (data.password) {
      updates.password_hash = await bcrypt.hash(data.password, 10);
      updates.must_reset_password = true; // Force reset if admin changes it
      
      // Force logout from all active sessions
      await supabase
        .from('admin_sessions')
        .update({ is_active: false })
        .eq('user_id', data.id)
        .eq('environment', environment);
    }

    updates.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('admin_users')
      .update(updates)
      .eq('id', data.id)
      .eq('environment', environment)
      .select('id, username')
      .single();

    if (error) throw error;
    
    // Log Activity
    await logActivityEvent({
      user: authUser,
      event_type: 'USER_UPDATED',
      entity_type: 'USER',
      entity_id: user.id,
      title: `Updated user ${user.username}`,
      metadata: { updates: Object.keys(updates).filter(k => k !== 'password_hash') },
      environment
    });

    return NextResponse.json({ success: true, data: user }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Update user error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
