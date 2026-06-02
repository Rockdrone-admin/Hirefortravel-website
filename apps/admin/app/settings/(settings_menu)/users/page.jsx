"use client";
import { useState, useEffect } from 'react';
import UserModal from '../../../../components/UserModal';
import { logCritical } from '@repo/logger';

export default function UsersManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/admin/users`, { credentials: 'include',  cache: 'no-store', credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      } else {
        logCritical('Admin: API returned success:false when fetching users', { result });
        alert('Error fetching users: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      logCritical('Admin: Failed to fetch users', { error: err.message });
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.is_active;
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, { credentials: 'include', 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: user.id, is_active: newStatus }),
      });
      const result = await response.json();
      if (result.success) {
        fetchUsers();
      } else {
        alert(`Error setting status: ` + result.error);
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`Are you absolutely sure you want to permanently delete user "${user.username}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/users?id=${user.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        alert(result.message || 'User successfully deleted.');
        fetchUsers();
      } else {
        alert(`Error deleting user: ` + result.error);
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user. Check console for details.");
    }
  };

  const handleSaveUser = async (userData) => {
    try {
      const method = editingUser ? 'PATCH' : 'POST';
      const body = editingUser ? { id: editingUser.id, ...userData } : userData;

      const response = await fetch(`${API_URL}/api/admin/users`, { credentials: 'include', 
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success) {
        setIsModalOpen(false);
        setEditingUser(null);
        fetchUsers(); 
      } else {
        alert("Error saving user: " + result.error);
      }
    } catch (err) {
      console.error("Error saving user:", err);
      alert("Failed to save user. Check console for details.");
    }
  };

  return (
    <main>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Users & Roles</h1>
          <p className="text-sm text-gray-500 mt-1">Manage admin access and roles</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="bg-green-700 text-white px-4 py-2 rounded-md font-medium hover:bg-green-800 transition-colors shadow-lg shadow-green-100 w-full sm:w-auto"
        >
          + Add New User
        </button>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-4 font-medium text-gray-500 text-sm">Username / Email</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Role</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Last Login</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">No users found.</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-gray-950 text-sm">{user.username}</div>
                    {user.email && (
                      <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600 text-sm">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Deactivated'}
                    </span>
                    {user.must_reset_password && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
                        Needs Reset
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => handleToggleStatus(user)}
                        className={`${user.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'} font-medium text-sm`}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button 
                        onClick={() => handleEditClick(user)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Edit / Reset Password
                      </button>
                      {!user.is_active && (
                        <button 
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm border-l pl-3 border-gray-200"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UserModal 
        isOpen={isModalOpen} 
        user={editingUser}
        onClose={() => { setIsModalOpen(false); setEditingUser(null); }} 
        onSave={handleSaveUser}
      />
    </main>
  );
}
