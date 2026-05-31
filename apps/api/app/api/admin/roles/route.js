import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../lib/supabase';
import { getCorsHeaders } from '../../../../lib/cors';
import { requireAuth, logActivityEvent } from '../../../../lib/auth';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function GET(req) {
  try {
    const environment = getEnvironment();
    // Allow any admin to view role permissions (or we could restrict to can_manage_users)
    // We will restrict to can_manage_users so only people who can manage users can view/edit role permissions
    const { error: authError, status: authStatus } = await requireAuth('can_manage_users');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const { data: roles, error } = await supabase
      .from('role_permissions')
      .select('role, permissions, updated_at')
      .eq('environment', environment)
      .order('role', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: roles }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Fetch roles error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function PATCH(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_manage_users');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const data = await req.json();
    
    if (!data.role) {
      return NextResponse.json({ success: false, error: 'Missing role identifier' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!data.permissions) {
      return NextResponse.json({ success: false, error: 'Missing permissions payload' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // SUPER_ADMIN permissions should generally not be stripped, but we allow it if the SUPER_ADMIN wants to.
    
    const { data: updatedRole, error } = await supabase
      .from('role_permissions')
      .update({
        permissions: data.permissions,
        updated_at: new Date().toISOString()
      })
      .eq('role', data.role)
      .eq('environment', environment)
      .select('role, permissions')
      .single();

    if (error) throw error;
    
    // Log Activity
    await logActivityEvent({
      user: authUser,
      event_type: 'ROLE_PERMISSIONS_UPDATED',
      entity_type: 'ROLE',
      entity_id: data.role,
      title: `Updated global permissions for role ${data.role}`,
      metadata: { new_permissions: data.permissions },
      environment
    });

    return NextResponse.json({ success: true, data: updatedRole }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Update role error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
