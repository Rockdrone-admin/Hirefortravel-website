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
    const { user, error: authError, status: authStatus } = await requireAuth();
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
      title: `Created user account ${user.username}`,
      metadata: { role: user.role, email: data.email || 'None' },
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

    // Fetch previous user state for activity logging changes
    const { data: prevUser } = await supabase
      .from('admin_users')
      .select('username, email, role, is_active, permissions, must_reset_password')
      .eq('id', data.id)
      .eq('environment', environment)
      .single();

    const updates = {};
    if (data.username) updates.username = data.username;
    if (data.email !== undefined) updates.email = data.email || null;
    if (data.role) updates.role = data.role;
    if (data.is_active !== undefined) {
      if (data.is_active === false && authUser.id === data.id) {
        return NextResponse.json({ success: false, error: 'You cannot deactivate your own account' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
      }
      updates.is_active = data.is_active;
    }
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

    // Force logout from all active sessions when user is deactivated
    if (data.is_active === false) {
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
    
    // Construct changes list for visual timeline diff rendering
    const changes = [];
    if (prevUser) {
      if (data.username && data.username !== prevUser.username) {
        changes.push({ field: 'username', prev: prevUser.username, next: data.username });
      }
      if (data.email !== undefined && (data.email || null) !== prevUser.email) {
        changes.push({ field: 'email', prev: prevUser.email || 'None', next: data.email || 'None' });
      }
      if (data.role && data.role !== prevUser.role) {
        changes.push({ field: 'role', prev: prevUser.role, next: data.role });
      }
      if (data.is_active !== undefined && data.is_active !== prevUser.is_active) {
        changes.push({ field: 'is_active', prev: prevUser.is_active ? 'Active' : 'Deactivated', next: data.is_active ? 'Active' : 'Deactivated' });
      }
      if (data.must_reset_password !== undefined && data.must_reset_password !== prevUser.must_reset_password) {
        changes.push({ field: 'must_reset_password', prev: prevUser.must_reset_password ? 'Yes' : 'No', next: data.must_reset_password ? 'Yes' : 'No' });
      }
    }
    if (data.password) {
      changes.push({ field: 'password', prev: '********', next: 'Reset by Admin' });
    }

    // Choose descriptive title based on exact action
    let eventTitle = `Updated settings for user account ${user.username}`;
    if (data.is_active === false) {
      eventTitle = `Deactivated user account ${user.username}`;
    } else if (data.is_active === true) {
      eventTitle = `Activated user account ${user.username}`;
    } else if (data.password) {
      eventTitle = `Reset password for user ${user.username}`;
    }

    // Log Activity
    await logActivityEvent({
      user: authUser,
      event_type: 'USER_UPDATED',
      entity_type: 'USER',
      entity_id: user.id,
      title: eventTitle,
      metadata: { changes },
      environment
    });

    return NextResponse.json({ success: true, data: user }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Update user error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function DELETE(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_manage_users');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (authUser.id === id) {
      return NextResponse.json({ success: false, error: 'You cannot delete your own account' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Fetch user to check status
    const { data: userToDel, error: fetchError } = await supabase
      .from('admin_users')
      .select('id, username, email, role, is_active')
      .eq('id', id)
      .eq('environment', environment)
      .single();

    if (fetchError || !userToDel) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Only deactivated users can be deleted
    if (userToDel.is_active) {
      return NextResponse.json({ success: false, error: 'Only deactivated users can be deleted. Please deactivate the user first.' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { error: deleteError } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id)
      .eq('environment', environment);

    if (deleteError) throw deleteError;

    // Log Activity
    await logActivityEvent({
      user: authUser,
      event_type: 'USER_DELETED',
      entity_type: 'USER',
      entity_id: id,
      title: `Deleted user account ${userToDel.username}`,
      metadata: { username: userToDel.username, email: userToDel.email || 'None', role: userToDel.role },
      environment
    });

    return NextResponse.json({ success: true, message: `User ${userToDel.username} successfully deleted.` }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Delete user error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
