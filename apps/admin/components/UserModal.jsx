import { useState, useEffect } from 'react';
import BaseModal from './BaseModal';

export default function UserModal({ isOpen, user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'RECRUITER',
    is_active: true,
    must_reset_password: true,
    password: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'RECRUITER',
        is_active: user.is_active !== undefined ? user.is_active : true,
        must_reset_password: user.must_reset_password !== undefined ? user.must_reset_password : false,
        password: '' // Don't populate password
      });
    } else {
      setFormData({
        username: '',
        email: '',
        role: 'RECRUITER',
        is_active: true,
        must_reset_password: true,
        password: ''
      });
    }
  }, [user, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSave(formData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={user ? 'Edit User' : 'Add New User'}
      description={user ? 'Update account details and permissions for this team member.' : 'Create a new team member account with recruiter or administrator access.'}
      icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-700"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
      submitLabel="Save User"
      cancelLabel="Cancel"
      loading={loading}
      size="md"
      formId="user-form"
    >
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
        <input 
          type="text" 
          required
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
        <input 
          type="email" 
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({...formData, role: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white"
        >
          <option value="RECRUITER">Recruiter</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {user ? 'Reset Password (leave blank to keep current)' : 'Temporary Password'}
        </label>
        <input 
          type="password" 
          required={!user}
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          placeholder={user ? "Enter new password" : "Required"}
        />
        {formData.password && (
          <p className="text-xs text-red-650 mt-1 font-semibold">This will force a logout from all devices for this user.</p>
        )}
      </div>

      <div className="flex items-center mt-4">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
          className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded animate-none"
        />
        <label htmlFor="is_active" className="ml-2 block text-sm font-semibold text-gray-750">
          Account Active
        </label>
      </div>

      <div className="flex items-center mt-2">
        <input
          type="checkbox"
          id="must_reset_password"
          checked={formData.must_reset_password}
          onChange={(e) => setFormData({...formData, must_reset_password: e.target.checked})}
          className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded animate-none"
        />
        <label htmlFor="must_reset_password" className="ml-2 block text-sm font-semibold text-gray-755">
          Force Password Reset on Next Login
        </label>
      </div>
    </BaseModal>
  );
}
