import { cookies } from 'next/headers';
import { supabase, getEnvironment } from './supabase';
import { SESSION_COOKIE_NAME } from './session-cookie';

const DEFAULT_ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    can_access_dashboard: true,
    can_access_jobs: true,
    can_access_companies: true,
    can_access_prospects: true,
    can_access_activity: true,
    can_access_settings: true
  },
  ADMIN: {
    can_access_dashboard: true,
    can_access_jobs: true,
    can_access_companies: true,
    can_access_prospects: true,
    can_access_activity: true,
    can_access_settings: true
  },
  RECRUITER: {
    can_access_dashboard: true,
    can_access_jobs: true,
    can_access_companies: true,
    can_access_prospects: true,
    can_access_activity: true,
    can_access_settings: false
  }
};

/**
 * Validates the session token from cookies and enforces role permissions.
 * @param {string} requiredPermission - Optional permission key required (e.g. 'can_manage_users'). If omitted, any authenticated user is allowed.
 * @returns {Promise<{ user: Object, session: Object, error: string, status: number }>}
 */
export async function requireAuth(requiredPermission = null) {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return { error: 'Authentication required', status: 401 };
  }

  try {
    const { data: session, error } = await supabase
      .from('admin_sessions')
      .select('session_token, ip_address, user_agent, is_active, expires_at, environment, admin_users(id, username, email, role, is_active, permissions)')
      .eq('session_token', token)
      .single();

    if (error || !session) {
      return { error: 'Invalid or expired session', status: 401 };
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (!session.is_active || now > expiresAt) {
      return { error: 'Session expired or revoked', status: 401 };
    }

    const user = session.admin_users;
    const environment = session.environment || 'development';
    const currentEnvironment = getEnvironment();

    if (environment !== currentEnvironment) {
      return { error: 'Session is not valid for this environment', status: 401 };
    }

    if (!user || !user.is_active) {
      return { error: 'User account is deactivated', status: 403 };
    }

    // Permission check
    if (requiredPermission) {
      const { data: roleData, error: roleError } = await supabase
        .from('role_permissions')
        .select('permissions')
        .eq('role', user.role)
        .eq('environment', environment)
        .maybeSingle();

      if (roleError) {
        console.error('Role permission lookup failed:', roleError);
      }

      const effectivePermissions = {
        ...(DEFAULT_ROLE_PERMISSIONS[user.role] || {}),
        ...(roleData?.permissions || {}),
        ...(user.permissions || {})
      };

      if (!effectivePermissions[requiredPermission]) {
        return { error: 'You do not have permission to perform this action', status: 403 };
      }
    }

    return { user, session, error: null };
  } catch (err) {
    console.error('Auth verification error:', err);
    return { error: 'Internal Server Error', status: 500 };
  }
}

/**
 * Standardized function to log events to the global timeline.
 */
export async function logActivityEvent(eventData) {
  const { user, event_type, entity_type, entity_id, title, description = null, metadata = {}, environment = 'development' } = eventData;
  
  // Allow system events if user is explicitly passed as 'SYSTEM' or missing, 
  // but fallback to a default system identity.
  const isSystem = !user || !user.id || user === 'SYSTEM';
  
  const userId = isSystem ? null : user.id;
  const userName = isSystem ? 'System (AI)' : (user.username || user.email);
  const userRole = isSystem ? 'SYSTEM' : user.role;
  try {
    await supabase.from('activity_events').insert({
      user_id: userId,
      user_name: userName,
      role: userRole,
      event_type,
      entity_type,
      entity_id: String(entity_id || ''),
      title,
      description,
      metadata,
      environment
    });
  } catch (err) {
    console.error('Failed to log activity event:', err);
    // Non-blocking, so we just swallow the error if logging fails
  }
}
