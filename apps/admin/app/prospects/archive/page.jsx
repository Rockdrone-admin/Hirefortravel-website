"use client";
import { useState, useEffect } from 'react';
import ProspectDrawer from '../../../components/ProspectDrawer';

const renderTimeIdentified = (dateStr) => {
  if (!dateStr) return <span className="text-gray-400 font-semibold">N/A</span>;
  const dateObj = new Date(dateStr);
  const datePart = dateObj.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const timePart = dateObj.toLocaleTimeString(undefined, { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
  return (
    <div className="flex flex-col text-left">
      <span className="font-bold text-gray-700 text-[11px] leading-tight">{datePart}</span>
      <span className="text-[10px] text-gray-400 font-semibold mt-0.5 leading-none">{timePart}</span>
    </div>
  );
};


export default function ProspectsArchive() {
  const [archivedProspects, setArchivedProspects] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);
  const [activeMatchId, setActiveMatchId] = useState(null);

  // Filters & Sorting Config
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProspects, setSelectedProspects] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'identified', direction: 'desc' });

  // Load saved sorting preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSort = localStorage.getItem('hirefortravel_archive_sortConfig');
      if (savedSort) {
        try {
          setSortConfig(JSON.parse(savedSort));
        } catch (e) {
          console.error("Failed to parse saved archive sortConfig", e);
        }
      }
    }
  }, []);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    const newConfig = { key, direction };
    setSortConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hirefortravel_archive_sortConfig', JSON.stringify(newConfig));
    }
  };

  // Bulk restore states
  const [executingBulk, setExecutingBulk] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingNotesMatchId, setEditingNotesMatchId] = useState(null);
  const [tempNotes, setTempNotes] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  // 1. Fetch initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        // Load Active Jobs
        const jobsRes = await fetch(`${API_URL}/api/jobs?status=active&admin=true`, { credentials: 'include' });
        const jobsResult = await jobsRes.json();
        if (jobsResult.success && jobsResult.data) {
          setActiveJobs(jobsResult.data);
        }

        await fetchArchivedProspects();
      } catch (err) {
        console.error("Error loading Archive page data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const fetchArchivedProspects = async () => {
    try {
      // Fetch all prospects (including inactive ones)
      const res = await fetch(`${API_URL}/api/prospects`, { credentials: 'include' });
      const result = await res.json();
      if (result.success && result.data) {
        // Archived prospects are those with stage = 'ARCHIVED' OR active_flag = false
        const archived = result.data.filter(item => item.stage === 'ARCHIVED' || item.active_flag === false);
        setArchivedProspects(archived);
      }
    } catch (err) {
      console.error("Error loading archived prospects:", err);
    }
  };

  const handleUpdateNotes = async (matchId, notesText) => {
    try {
      const res = await fetch(`${API_URL}/api/prospects/sourcing/${matchId}`, { credentials: 'include',  method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchUpdates: { human_notes: notesText },
          changedBy: 'Admin Recruiter',
          reason: notesText })
      });
      const result = await res.json();
      if (result.success) {
        setArchivedProspects(prev => prev.map(p => p.id === matchId ? { ...p, human_notes: notesText } : p));
      } else {
        alert(result.error || 'Failed to save notes');
      }
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  };

  // 2. Restore/Retract single candidate
  const handleRestoreProspect = async (matchId, name) => {
    const reasonText = prompt(`Please provide a reason for restoring ${name} back to the active pipeline:`, "Candidate has updated experience / re-engaged recruiter");
    if (reasonText === null) return; // Cancelled
    if (!reasonText.trim()) {
      alert("A restoration justification is required.");
      return;
    }

    try {
      setRestoringId(matchId);
      const res = await fetch(`${API_URL}/api/prospects/sourcing/${matchId}`, { credentials: 'include',  method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchUpdates: { 
            stage: 'MATCHED',
            active_flag: true 
          },
          changedBy: 'Admin Recruiter',
          reason: reasonText, credentials: 'include' })
      });
      const result = await res.json();
      if (result.success) {
        // Remove restored candidate from local list
        setArchivedProspects(prev => prev.filter(p => p.id !== matchId));
        setSelectedProspects(prev => prev.filter(id => id !== matchId));
        alert(`${name} has been successfully restored to MATCHED stage in CRM.`);
      } else {
        alert(result.error || 'Failed to restore candidate.');
      }
    } catch (err) {
      console.error('Failed to restore candidate:', err);
    } finally {
      setRestoringId(null);
    }
  };

  // 3. Bulk Restore Execution
  const handleBulkRestore = async (e) => {
    e.preventDefault();
    if (selectedProspects.length === 0) return;
    if (!bulkReason.trim()) {
      alert("A batch restoration compliance justification is mandatory.");
      return;
    }

    try {
      setExecutingBulk(true);
      const promises = selectedProspects.map(matchId => 
        fetch(`${API_URL}/api/prospects/sourcing/${matchId}`, { credentials: 'include',  method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchUpdates: { 
              stage: 'MATCHED',
              active_flag: true 
            },
            changedBy: 'Admin Recruiter',
            reason: `Bulk pipeline retraction: ${bulkReason}`, credentials: 'include' })
        })
      );

      await Promise.all(promises);
      alert(`Successfully restored ${selectedProspects.length} prospects to MATCHED stage!`);
      
      // Update local UI
      setArchivedProspects(prev => prev.filter(p => !selectedProspects.includes(p.id)));
      setSelectedProspects([]);
      setBulkReason('');
      setIsBulkOpen(false);
    } catch (err) {
      console.error('Bulk restore failed:', err);
      alert('Some candidates failed to restore. Please try again.');
    } finally {
      setExecutingBulk(false);
    }
  };

  // 4. Filters & Sorting Math
  const filteredProspects = archivedProspects.filter(item => {
    const matchesJob = selectedJobId === 'all' || item.job_id === selectedJobId || item.job?.id === selectedJobId;
    
    let matchesSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchesSearch = (
        item.prospect?.name?.toLowerCase().includes(q) ||
        item.prospect?.latest_company?.toLowerCase().includes(q) ||
        item.prospect?.latest_title?.toLowerCase().includes(q) ||
        item.prospect?.functional_field?.toLowerCase().includes(q)
      );
    }
    return matchesJob && matchesSearch;
  });

  filteredProspects.sort((a, b) => {
    let comparison = 0;
    if (sortConfig.key === 'score') {
      const scoreA = a.manual_score || a.ai_score || 0;
      const scoreB = b.manual_score || b.ai_score || 0;
      comparison = scoreA - scoreB;
    } else if (sortConfig.key === 'identified') {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      comparison = dateA - dateB;
    } else if (sortConfig.key === 'name') {
      const nameA = a.prospect?.name || '';
      const nameB = b.prospect?.name || '';
      comparison = nameA.localeCompare(nameB);
    }
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="space-y-6 pb-20">
      
      {/* Search and Filters Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search box */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-3 text-gray-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              placeholder="Search archived candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-green-700 focus:border-green-700 bg-white placeholder-gray-400 font-semibold text-gray-700"
            />
          </div>

          {/* Job Position filter */}
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="text-xs border-gray-250 rounded-md focus:ring-green-700 focus:border-green-700 bg-white pr-8 py-1.5 font-semibold text-gray-600 max-w-[200px]"
          >
            <option value="all">All Matched Positions</option>
            {activeJobs.map(job => (
              <option key={job.id} value={job.id}>{job.title} ({job.company_name})</option>
            ))}
          </select>

          {/* Top dropdown sort removed - replaced by column header clicking */}

          {(selectedProspects.length > 0 || searchQuery || selectedJobId !== 'all') && (
            <button 
              onClick={() => { setSelectedProspects([]); setSearchQuery(''); setSelectedJobId('all'); }} 
              className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Selected counts and quick actions */}
        {selectedProspects.length > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setIsBulkOpen(true)}
              className="bg-green-700 text-white px-4 py-1.5 rounded-md text-xs font-bold hover:bg-green-800 transition-colors shadow-sm w-full md:w-auto text-center"
            >
              Bulk Restore Selected ({selectedProspects.length})
            </button>
            <button 
              onClick={() => setSelectedProspects([])}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors"
            >
              Deselect All
            </button>
          </div>
        )}
      </div>

      {/* Bulk Restore Modal Overlay */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-gray-200 max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="text-gray-800 font-sans">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-800"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                Bulk Restore Confirmation
              </h3>
              <p className="text-xs text-gray-400 mt-1">You are restoring {selectedProspects.length} passive candidates back to MATCHED CRM pipelines.</p>
            </div>

            <form onSubmit={handleBulkRestore} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-yellow-800 uppercase mb-1">Restoration Justification Reason *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Compliance explanation for returning candidates to the CRM board..."
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full text-xs border-yellow-300 bg-yellow-50/10 focus:ring-yellow-500 rounded p-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsBulkOpen(false); setBulkReason(''); }}
                  className="px-3.5 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={executingBulk}
                  className={`px-4 py-1.5 rounded text-xs font-bold text-white shadow-sm transition-colors ${
                    executingBulk ? 'bg-gray-400' : 'bg-green-700 hover:bg-green-800'
                  }`}
                >
                  {executingBulk ? 'Restoring batch...' : 'Confirm Restore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive DataTable */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Table Title Block */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50/30">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-500"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <h3 className="text-sm font-black text-gray-800">Historical Archives <span className="text-gray-400 font-medium text-xs ml-1">({filteredProspects.length} candidates)</span></h3>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-green-800 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-xs italic">Syncing historical archives...</p>
          </div>
        ) : filteredProspects.length === 0 ? (
          <div className="py-20 text-center text-gray-500 text-sm italic">
            No archived or inactive candidates found in this view.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500 font-black">
                  <th className="px-4 py-3 w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedProspects.length === filteredProspects.length && filteredProspects.length > 0}
                      onChange={() => {
                        if (selectedProspects.length === filteredProspects.length) {
                          setSelectedProspects([]);
                        } else {
                          setSelectedProspects(filteredProspects.map(p => p.id));
                        }
                      }}
                      className="rounded text-green-700 border-gray-300"
                    />
                  </th>
                  <th 
                    className="px-4 py-3 cursor-pointer hover:bg-gray-150 transition-colors" 
                    onClick={() => handleSort('name')}
                  >
                    Candidate {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                  <th className="px-4 py-3">Experience</th>
                  <th 
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-150 transition-colors" 
                    onClick={() => handleSort('score')}
                  >
                    Score {sortConfig.key === 'score' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                  <th 
                    className="px-4 py-3 cursor-pointer hover:bg-gray-150 transition-colors" 
                    onClick={() => handleSort('identified')}
                  >
                    Time Archived {sortConfig.key === 'identified' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 w-[280px] min-w-[280px]">Latest Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredProspects.map(matchItem => {
                  const prospect = matchItem.prospect || {};
                  const job = matchItem.job || {};
                  const finalScore = matchItem.manual_score || matchItem.ai_score || 0;
                  const isSelected = selectedProspects.includes(matchItem.id);
                  
                  return (
                    <tr key={matchItem.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-green-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedProspects(selectedProspects.filter(id => id !== matchItem.id));
                            } else {
                              setSelectedProspects([...selectedProspects, matchItem.id]);
                            }
                          }}
                          className="rounded text-green-700 border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div 
                          onClick={() => setActiveMatchId(matchItem.id)}
                          className="font-bold text-gray-800 cursor-pointer hover:text-green-800 transition-colors text-xs"
                        >
                          {prospect.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {matchItem.owner && (
                            <span className="text-[9px] text-gray-400 font-semibold">
                              Recruiter: <span className="text-gray-500">{matchItem.owner}</span>
                            </span>
                          )}
                          <span className="inline-block bg-gray-50 border border-gray-200 px-1 py-0.2 rounded text-[8px] font-black text-gray-500 uppercase tracking-wider truncate max-w-[110px]" title={`Matched for Job: ${job.title}`}>
                            {job.title || 'Unknown Position'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <div className="font-semibold text-gray-700 truncate text-xs" title={prospect.latest_title}>{prospect.latest_title || 'No Title'}</div>
                        <div className="text-[10px] text-gray-400 truncate mt-0.5" title={`${prospect.latest_company || 'No Company'} • ${prospect.city || 'No Location'}`}>
                          {prospect.latest_company || 'No Company'}{prospect.city ? ` • ${prospect.city}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black shadow-sm ${
                          finalScore >= 90 ? 'bg-green-100 text-green-800' :
                          finalScore >= 80 ? 'bg-blue-100 text-blue-800' :
                          finalScore >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {finalScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderTimeIdentified(matchItem.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {prospect.linkedin_url ? (
                            <a 
                              href={prospect.linkedin_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-6 h-6 flex items-center justify-center rounded bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-xs"
                              title="View LinkedIn Profile"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                            </a>
                          ) : (
                            <div className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 border border-gray-150 text-gray-300 cursor-not-allowed" title="No LinkedIn URL">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                            </div>
                          )}

                          {prospect.email ? (
                            <a 
                              href={`mailto:${prospect.email}`}
                              className="w-6 h-6 flex items-center justify-center rounded bg-green-50 border border-green-200 text-green-700 hover:bg-green-700 hover:text-white transition-all shadow-xs"
                              title={`Email: ${prospect.email}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            </a>
                          ) : (
                            <div className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 border border-gray-150 text-gray-300 cursor-not-allowed" title="No Email available">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            </div>
                          )}

                          {prospect.phone ? (
                            <a 
                              href={`tel:${prospect.phone}`}
                              className="w-6 h-6 flex items-center justify-center rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white transition-all shadow-xs"
                              title={`Phone: ${prospect.phone}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </a>
                          ) : (
                            <div className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 border border-gray-150 text-gray-300 cursor-not-allowed" title="No Phone available">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 w-[280px] min-w-[280px] max-w-[280px]">
                        {editingNotesMatchId === matchItem.id ? (
                          <div className="flex flex-col gap-1.5 w-full font-semibold text-gray-700" onClick={(e) => e.stopPropagation()}>
                            <textarea 
                              value={tempNotes} 
                              onChange={(e) => setTempNotes(e.target.value)}
                              className="w-full text-[11px] p-1.5 border border-gray-300 rounded focus:ring-green-700 focus:border-green-700 bg-white font-semibold text-gray-700"
                              rows="2"
                              placeholder="Enter remarks..."
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <button 
                                onClick={() => setEditingNotesMatchId(null)}
                                className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold text-[9px] hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={async () => { 
                                  await handleUpdateNotes(matchItem.id, tempNotes); 
                                  setEditingNotesMatchId(null); 
                                }}
                                className="px-1.5 py-0.5 bg-green-700 text-white rounded font-bold text-[9px] hover:bg-green-800 transition-colors shadow-sm"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : matchItem.human_notes ? (
                          <div className="bg-gray-50 border border-gray-200 rounded px-2.5 py-2 text-gray-700 w-full group/notes relative shadow-sm" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditingNotesMatchId(matchItem.id); 
                                setTempNotes(''); 
                              }}
                              className="absolute right-2 top-2 text-gray-400 hover:text-green-700 p-0.5 rounded hover:bg-gray-200 transition-colors animate-pulse z-10"
                              title="Add Remark"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                            <p className="text-[11px] font-semibold leading-relaxed text-gray-800 whitespace-pre-wrap pr-6">
                              {matchItem.human_notes}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-gray-50/50 border border-gray-150 rounded px-2.5 py-2 text-gray-400 w-full group/notes relative shadow-xs" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditingNotesMatchId(matchItem.id); 
                                setTempNotes(''); 
                              }}
                              className="absolute right-2 top-2 text-gray-400 hover:text-green-700 p-0.5 rounded hover:bg-gray-200 transition-colors animate-pulse z-10"
                              title="Add Remark"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                            <p className="text-[11px] italic leading-relaxed pl-0.5 text-gray-400 pr-6">
                              No remarks
                            </p>
                          </div>
                        )}
                        <div className="text-[9px] text-red-700 font-semibold mt-1.5 flex items-center gap-0.5 pl-0.5 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-red-600 rounded-full inline-block" />
                          {!matchItem.active_flag ? 'Inactive' : matchItem.stage}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRestoreProspect(matchItem.id, prospect.name)}
                          disabled={restoringId === matchItem.id}
                          className="px-3 py-1.5 border border-green-700 bg-green-50 text-green-800 rounded hover:bg-green-700 hover:text-white text-xs font-bold transition-all inline-flex items-center gap-1 shadow-sm"
                        >
                          {restoringId === matchItem.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full animate-spin"></div>
                              Restoring...
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                              Restore
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Prospect Detail Drawer Component */}
      <ProspectDrawer 
        matchId={activeMatchId}
        onClose={() => setActiveMatchId(null)}
        onSaveSuccess={() => {
          fetchArchivedProspects(); // reload archive when drawer saves changes
        }}
      />

    </div>
  );
}
