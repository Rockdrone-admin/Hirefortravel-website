"use client";
import React, { useState, useEffect } from 'react';

export default function StageTransitionModal({ 
  isOpen, 
  onClose, 
  candidateName, 
  currentStage, 
  targetStage, 
  stagesList, 
  onSubmit 
}) {
  const [selectedNewStage, setSelectedNewStage] = useState(targetStage || currentStage || '');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync selected stage with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedNewStage(targetStage || currentStage || '');
      setRemarks('');
    }
  }, [isOpen, currentStage, targetStage]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedNewStage) {
      alert("Please select a new pipeline stage.");
      return;
    }
    try {
      setLoading(true);
      await onSubmit(selectedNewStage, remarks);
      onClose();
    } catch (err) {
      console.error("Error submitting stage transition:", err);
      alert("Failed to update pipeline stage.");
    } finally {
      setLoading(false);
    }
  };

  // Filter out the 'all' option from stage dropdown list
  const filteredStages = stagesList.filter(s => s.id !== 'all');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container text-left" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-800"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8" cy="7" r="4"/><path d="m17 8 2 2 4-4"/></svg>
            Update Pipeline Stage
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Candidate</p>
            <p className="font-bold text-gray-800 text-sm">{candidateName}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-gray-50 border border-gray-200 p-2.5 rounded-lg items-center">
            <div>
              <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Current Stage</p>
              <p className="font-bold text-gray-600 mt-0.5 uppercase tracking-wide">
                {stagesList.find(s => s.id === currentStage)?.name || currentStage}
              </p>
            </div>
            <div className="border-l border-gray-200 pl-3">
              <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Target New Stage</p>
              <p className="font-bold text-green-700 mt-0.5 uppercase tracking-wide">
                {stagesList.find(s => s.id === selectedNewStage)?.name || selectedNewStage}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-gray-500 font-bold mb-1">New Stage Status *</label>
            <select
              value={selectedNewStage}
              onChange={(e) => setSelectedNewStage(e.target.value)}
              className="form-input-primary"
            >
              {filteredStages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-500 font-bold mb-1">Recruiter Remarks / Justification (Optional)</label>
            <textarea 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks or justification for this stage change..."
              className="form-input-primary"
              rows="3"
              autoFocus
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Updating...' : 'Confirm Stage Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
