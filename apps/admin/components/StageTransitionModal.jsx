"use client";
import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';

export default function StageTransitionModal({ 
  isOpen, 
  onClose, 
  candidateName, 
  currentStage, 
  targetStage, 
  stagesList, 
  onSubmit,
  jobsList = [],
  currentJobId = ''
}) {
  const [selectedNewStage, setSelectedNewStage] = useState(targetStage || '');
  const [selectedJobId, setSelectedJobId] = useState(currentJobId || '');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync selected stage with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedNewStage(targetStage || '');
      setSelectedJobId(currentJobId || '');
      setRemarks('');
    }
  }, [isOpen, currentStage, targetStage, currentJobId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalStage = targetStage || selectedNewStage;
    if (!finalStage) {
      alert("Please select a new pipeline stage.");
      return;
    }
    if (!targetStage && !selectedJobId) {
      alert("Please select a job position.");
      return;
    }
    try {
      setLoading(true);
      await onSubmit(finalStage, remarks, selectedJobId || null);
      onClose();
    } catch (err) {
      console.error("Error submitting stage transition:", err);
      alert(err.message || "Failed to update candidate details.");
    } finally {
      setLoading(false);
    }
  };

  // Filter out the 'all' option from stage dropdown list
  const filteredStages = stagesList.filter(s => s.id !== 'all');

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Update Pipeline Stage"
      description="Modify the recruitment stage and log notes for this candidate."
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-800">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8" cy="7" r="4"/>
          <path d="m17 8 2 2 4-4"/>
        </svg>
      }
      submitLabel={loading ? 'Updating...' : 'Confirm'}
      cancelLabel="Cancel"
      loading={loading}
      size="lg"
      formId="stage-transition-form"
    >
      <div>
        <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-0.5">Candidate</p>
        <p className="font-bold text-gray-800 text-base">{candidateName}</p>
      </div>

      {targetStage ? (
        // Active Prospects mode: both current stage and target stage are fixed/read-only
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">Current Stage</label>
            <div className="px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg font-bold text-gray-500 text-sm uppercase tracking-wide whitespace-nowrap" title={stagesList.find(s => s.id === currentStage)?.name || currentStage}>
              {stagesList.find(s => s.id === currentStage)?.name || currentStage}
            </div>
          </div>
          <div>
            <label className="block text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">New Target Stage</label>
            <div className="px-4 py-3 border border-gray-200 bg-green-50/50 rounded-lg font-bold text-green-700 text-sm uppercase tracking-wide whitespace-nowrap" title={stagesList.find(s => s.id === targetStage)?.name || targetStage}>
              {stagesList.find(s => s.id === targetStage)?.name || targetStage}
            </div>
          </div>
        </div>
      ) : (
        // All Prospects mode: Current stage is read-only, New stage is editable via dropdown, Job is editable via dropdown
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">Current Stage</label>
            <div className="px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg font-bold text-gray-500 text-sm uppercase tracking-wide whitespace-nowrap" title={stagesList.find(s => s.id === currentStage)?.name || currentStage}>
              {stagesList.find(s => s.id === currentStage)?.name || currentStage}
            </div>
          </div>
          <div>
            <label className="block text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">Update Stage *</label>
            <select
              value={selectedNewStage}
              onChange={(e) => setSelectedNewStage(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none bg-white transition-all text-sm font-bold uppercase tracking-wide ${selectedNewStage ? 'text-green-700' : 'text-gray-400'}`}
              required
            >
              <option value="" disabled>Select Stage...</option>
              {filteredStages.map(s => (
                <option key={s.id} value={s.id} className="text-gray-800 font-semibold normal-case">{s.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">Job Position *</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none bg-white transition-all text-sm font-bold uppercase tracking-wide ${selectedJobId ? 'text-gray-700' : 'text-gray-400'}`}
              required
            >
              <option value="" disabled>Select Job...</option>
              {jobsList.map(j => (
                <option key={j.id} value={j.id} className="text-gray-800 font-semibold normal-case">{j.title} - {j.company_name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-gray-700 font-semibold text-sm mb-2">Recruiter Remarks (Optional)</label>
        <textarea 
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter remarks for this stage change..."
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all min-h-[100px] text-sm placeholder:text-sm"
          rows="3"
          autoFocus
        />
      </div>
    </BaseModal>
  );
}
