"use client";
import { useState, useEffect } from 'react';
import { logCritical } from '@repo/logger';

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

export default function RolesManager() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // track which role is saving

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/admin/roles`, { credentials: 'include',  cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 403) {
           setRoles([]);
           setLoading(false);
           return;
        }
      }
      const result = await response.json();
      if (result.success) {
        const processedRoles = result.data.map(roleObj => {
          const roleKey = roleObj.role?.toUpperCase();
          const defaults = DEFAULT_ROLE_PERMISSIONS[roleKey] || {};
          return {
            ...roleObj,
            permissions: {
              ...defaults,
              ...roleObj.permissions
            }
          };
        });
        setRoles(processedRoles);
      } else {
        logCritical('Admin: API returned success:false when fetching roles', { result });
      }
    } catch (err) {
      logCritical('Admin: Failed to fetch roles', { error: err.message });
      console.error("Error fetching roles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (roleObj, permKey) => {
    const roleKey = roleObj.role?.toUpperCase();
    const defaults = DEFAULT_ROLE_PERMISSIONS[roleKey] || {};
    const currentPermissions = {
      ...defaults,
      ...roleObj.permissions
    };
    const updatedPermissions = {
      ...currentPermissions,
      [permKey]: !currentPermissions[permKey]
    };

    setSaving(roleObj.role);
    try {
      const response = await fetch(`${API_URL}/api/admin/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: roleObj.role, permissions: updatedPermissions }),
      });
      const result = await response.json();
      if (result.success) {
        const returnedRole = result.data;
        const processedReturned = {
          ...returnedRole,
          permissions: {
            ...defaults,
            ...returnedRole.permissions
          }
        };
        // Update local state
        setRoles(roles.map(r => r.role === roleObj.role ? processedReturned : r));
      } else {
        alert("Error saving permissions: " + result.error);
      }
    } catch (err) {
      console.error("Error toggling permission:", err);
      alert("Failed to save changes.");
    } finally {
      setSaving(null);
    }
  };

  if (!loading && roles.length === 0) {
    return (
      <main>
        <div className="flex flex-col mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Role Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage global access control</p>
        </div>
        <div className="p-10 text-center bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">You do not have permission to view or edit roles, or no roles exist.</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Role Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">Define what each role can do system-wide</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3 mb-10">
        {loading ? (
           <div className="p-10 text-center text-gray-400 italic col-span-3">Loading roles...</div>
        ) : (
          roles.map((roleObj) => (
            <div key={roleObj.role} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900">{roleObj.role.replace('_', ' ')}</h3>
                {saving === roleObj.role && <span className="text-xs text-blue-500 animate-pulse font-medium">Saving...</span>}
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                
                {/* Dashboard Section */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Dashboard</span>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${roleObj.permissions.can_access_dashboard ? 'bg-green-600' : 'bg-gray-200'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={roleObj.permissions.can_access_dashboard || false}
                      onChange={() => handleTogglePermission(roleObj, 'can_access_dashboard')}
                      disabled={saving === roleObj.role}
                    />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${roleObj.permissions.can_access_dashboard ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                {/* Jobs Section */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Jobs</span>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${roleObj.permissions.can_access_jobs ? 'bg-green-600' : 'bg-gray-200'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={roleObj.permissions.can_access_jobs || false}
                      onChange={() => handleTogglePermission(roleObj, 'can_access_jobs')}
                      disabled={saving === roleObj.role}
                    />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${roleObj.permissions.can_access_jobs ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                {/* Companies Section */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Companies</span>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${roleObj.permissions.can_access_companies ? 'bg-green-600' : 'bg-gray-200'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={roleObj.permissions.can_access_companies || false}
                      onChange={() => handleTogglePermission(roleObj, 'can_access_companies')}
                      disabled={saving === roleObj.role}
                    />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${roleObj.permissions.can_access_companies ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                {/* Prospects Section */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Prospects</span>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${roleObj.permissions.can_access_prospects ? 'bg-green-600' : 'bg-gray-200'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={roleObj.permissions.can_access_prospects || false}
                      onChange={() => handleTogglePermission(roleObj, 'can_access_prospects')}
                      disabled={saving === roleObj.role}
                    />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${roleObj.permissions.can_access_prospects ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                {/* Activity Section */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Activity</span>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${roleObj.permissions.can_access_activity ? 'bg-green-600' : 'bg-gray-200'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={roleObj.permissions.can_access_activity || false}
                      onChange={() => handleTogglePermission(roleObj, 'can_access_activity')}
                      disabled={saving === roleObj.role}
                    />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${roleObj.permissions.can_access_activity ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                {/* Settings Section */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Settings</span>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${roleObj.permissions.can_access_settings ? 'bg-green-600' : 'bg-gray-200'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={roleObj.permissions.can_access_settings || false}
                      onChange={() => handleTogglePermission(roleObj, 'can_access_settings')}
                      disabled={saving === roleObj.role}
                    />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${roleObj.permissions.can_access_settings ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

              </div>
              <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-center text-gray-500">
                Last updated: {new Date(roleObj.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
