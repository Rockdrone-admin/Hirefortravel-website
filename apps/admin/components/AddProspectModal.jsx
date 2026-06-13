"use client";
import { useState, useEffect } from 'react';
import BaseModal from './BaseModal';

export default function AddProspectModal({
  isOpen,
  onClose,
  onSave,
  activeJobs = [],
  users = [],
  ALL_STAGES = [],
  loading = false
}) {
  const [formData, setFormData] = useState({
    jobId: '',
    stage: 'MATCHED',
    name: '',
    email: '',
    phone: '',
    city: '',
    linkedinUrl: '',
    latestTitle: '',
    latestCompany: '',
    score: '',
    owner: '',
    remarks: ''
  });

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        jobId: activeJobs[0]?.id || '',
        stage: 'MATCHED',
        name: '',
        email: '',
        phone: '',
        city: '',
        linkedinUrl: '',
        latestTitle: '',
        latestCompany: '',
        score: '',
        owner: '',
        remarks: ''
      });
    }
  }, [isOpen, activeJobs]);

  const handleSubmit = (e) => {
    if (!formData.name || !formData.jobId) {
      alert("Name and Job Position are mandatory fields.");
      return;
    }
    const payload = {
      ...formData,
      score: formData.score === '' ? null : Number(formData.score)
    };
    onSave(payload);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Add Prospect"
      description="Create a new candidate profile and place them in the recruitment pipeline manually."
      icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"></line><line x1="16" y1="11" x2="22" y2="11"></line></svg>}
      submitLabel="Save Prospect"
      cancelLabel="Cancel"
      loading={loading}
      size="2xl"
      formId="add-prospect-form"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Row 1 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Job Position *</label>
          <select 
            required 
            value={formData.jobId} 
            onChange={e => setFormData({...formData, jobId: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white"
          >
            {activeJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stage</label>
          <select 
            value={formData.stage} 
            onChange={e => setFormData({...formData, stage: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white"
          >
            {ALL_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Row 2 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name *</label>
          <input 
            required 
            type="text" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500" 
            placeholder="e.g. Rahul Sharma" 
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">LinkedIn Profile URL</label>
          <input 
            type="url" 
            value={formData.linkedinUrl} 
            onChange={e => setFormData({...formData, linkedinUrl: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500" 
            placeholder="e.g. https://linkedin.com/in/username" 
          />
        </div>

        {/* Row 3 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Title</label>
          <input 
            type="text" 
            value={formData.latestTitle} 
            onChange={e => setFormData({...formData, latestTitle: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500" 
            placeholder="e.g. Senior Visa Consultant" 
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Company</label>
          <input 
            type="text" 
            value={formData.latestCompany} 
            onChange={e => setFormData({...formData, latestCompany: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500" 
            placeholder="e.g. Atlys" 
          />
        </div>

        {/* Row 4 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
          <input 
            type="email" 
            value={formData.email} 
            onChange={e => setFormData({...formData, email: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500" 
            placeholder="e.g. rahul@example.com" 
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
          <input 
            type="tel" 
            value={formData.phone} 
            onChange={e => setFormData({...formData, phone: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500" 
            placeholder="e.g. +91 98765 43210" 
          />
        </div>

        {/* Row 5 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">City / Location</label>
          <input 
            type="text" 
            value={formData.city} 
            onChange={e => setFormData({...formData, city: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500" 
            placeholder="e.g. New Delhi" 
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Manual Match Score (0-100)</label>
          <input 
            type="number" 
            min="0" 
            max="100" 
            value={formData.score} 
            onChange={e => setFormData({...formData, score: e.target.value === '' ? '' : parseInt(e.target.value)})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500" 
            placeholder="e.g. 85" 
          />
        </div>

        {/* Row 6 */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assigned Recruiter / Owner (Optional)</label>
          <select 
            value={formData.owner} 
            onChange={e => setFormData({...formData, owner: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white"
          >
            <option value="">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.username}>{u.username}</option>
            ))}
          </select>
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Justification Notes *</label>
          <textarea 
            required 
            value={formData.remarks} 
            onChange={e => setFormData({...formData, remarks: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500" 
            rows="3" 
            placeholder="Enter justification or recruitment remarks for adding this candidate manually..."
          ></textarea>
        </div>
      </div>
    </BaseModal>
  );
}
