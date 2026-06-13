"use client";
import { useState, useEffect } from 'react';
import ProspectDrawer from '../../../components/ProspectDrawer';
import ResizableTable from '../../../components/ResizableTable';
import StageTransitionModal from '../../../components/StageTransitionModal';

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
    <div className="flex flex-col text-center items-center justify-center">
      <span className="font-bold text-gray-700 text-[11px] leading-tight">{datePart}</span>
      <span className="text-[10px] text-gray-400 font-semibold mt-0.5 leading-none">{timePart}</span>
    </div>
  );
};

const STAGES = [
  { id: 'all', name: 'All Stages' },
  { id: 'IDENTIFIED', name: 'Identified (Sourced)' },
  { id: 'MATCHED', name: 'Connection Request' },
  { id: 'CONTACTED', name: 'Outreach Sent' },
  { id: 'FOLLOWUP', name: 'Follow Up' },
  { id: 'INTERESTED', name: 'Interested' },
  { id: 'APPLIED', name: 'Applied' },
  { id: 'NO RESPONSE', name: 'No Response' },
  { id: 'NOT INTERESTED', name: 'Not Interested' },
  { id: 'REJECTED', name: 'Rejected' },
  { id: 'REQ_NOT_ACCEPTED', name: 'Req. Not Accepted' },
  { id: 'ARCHIVED', name: 'Archived' }
];

const getStageBadge = (stage) => {
  const stageMap = {
    'IDENTIFIED': { name: 'Identified', bg: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-500' },
    'MATCHED': { name: 'Connection Request', bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' },
    'CONTACTED': { name: 'Outreach Sent', bg: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
    'FOLLOWUP': { name: 'Follow Up', bg: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
    'INTERESTED': { name: 'Interested', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    'APPLIED': { name: 'Applied', bg: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    'NO RESPONSE': { name: 'No Response', bg: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
    'NOT INTERESTED': { name: 'Not Interested', bg: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
    'REJECTED': { name: 'Rejected', bg: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
    'REQ_NOT_ACCEPTED': { name: 'Req. Not Accepted', bg: 'bg-rose-100 text-rose-700 border-rose-200', dot: 'bg-rose-505' },
    'ARCHIVED': { name: 'Archived', bg: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-600' }
  };
  return stageMap[stage] || { name: stage || 'Unknown', bg: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' };
};

export default function ProspectsDirectory() {
  const [allProspects, setAllProspects] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMatchId, setActiveMatchId] = useState(null);

  // Filters & Sorting Config
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProspects, setSelectedProspects] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'identified', direction: 'desc' });

  // Columns for ResizableTable
  const columns = [
    { key: 'name', label: 'Candidate', sortable: true, sortKey: 'name', defaultWidth: 180 },
    { key: 'experience', label: 'Experience', sortable: false, defaultWidth: 180 },
    { key: 'score', label: 'Score', sortable: true, sortKey: 'score', defaultWidth: 80, headerClassName: 'text-center' },
    { key: 'identified', label: 'Time Identified', sortable: true, sortKey: 'identified', defaultWidth: 120, headerClassName: 'text-center' },
    { key: 'contact', label: 'Contact', sortable: false, defaultWidth: 110, headerClassName: 'text-center' },
    { key: 'remarks', label: 'Latest Remarks', sortable: false, defaultWidth: 280 },
    { key: 'stage', label: 'Current Stage', sortable: false, defaultWidth: 160, headerClassName: 'text-center' }
  ];

  // Load saved sorting preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSort = localStorage.getItem('hirefortravel_all_sortConfig');
      if (savedSort) {
        try {
          setSortConfig(JSON.parse(savedSort));
        } catch (e) {
          console.error("Failed to parse saved sorting config", e);
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
      localStorage.setItem('hirefortravel_all_sortConfig', JSON.stringify(newConfig));
    }
  };

  // Stage transition modal states
  const [transitionDetails, setTransitionDetails] = useState(null); // { matchId, currentStage, candidateName }

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

        await fetchAllProspects();
      } catch (err) {
        console.error("Error loading Prospects Directory data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const fetchAllProspects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/prospects`, { credentials: 'include' });
      const result = await res.json();
      if (result.success && result.data) {
        setAllProspects(result.data);
      }
    } catch (err) {
      console.error("Error loading prospects:", err);
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
        setAllProspects(prev => prev.map(p => p.id === matchId ? { ...p, human_notes: notesText } : p));
      } else {
        alert(result.error || 'Failed to save notes');
      }
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  };

  // 2. Click stage badge triggers transition popup
  const triggerStageTransition = (matchId, currentStage, candidateName) => {
    setTransitionDetails({ matchId, currentStage, candidateName });
  };

  const handleTransitionSubmit = async (selectedNewStage, remarks) => {
    const matchUpdates = { stage: selectedNewStage };
    if (remarks.trim()) {
      matchUpdates.human_notes = remarks.trim();
    }

    const res = await fetch(`${API_URL}/api/prospects/sourcing/${transitionDetails.matchId}`, {
      credentials: 'include',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchUpdates,
        changedBy: 'Admin Recruiter',
        reason: remarks.trim() || null
      })
    });
    const result = await res.json();
    if (result.success) {
      // Update local list
      setAllProspects(prev => prev.map(p => p.id === transitionDetails.matchId ? { 
        ...p, 
        stage: selectedNewStage,
        active_flag: selectedNewStage !== 'ARCHIVED',
        human_notes: remarks.trim() || p.human_notes
      } : p));
      setTransitionDetails(null);
    } else {
      throw new Error(result.error || 'Failed to update candidate pipeline stage.');
    }
  };

  // 3. Bulk Restore Execution (Only applies to selected archived candidates)
  const handleBulkRestore = async (e) => {
    e.preventDefault();
    if (selectedProspects.length === 0) return;
    if (!bulkReason.trim()) {
      alert("A batch restoration justification is mandatory.");
      return;
    }

    // Filter only those selected prospects that are in ARCHIVED stage
    const archivedSelected = selectedProspects.filter(id => {
      const p = allProspects.find(item => item.id === id);
      return p && p.stage === 'ARCHIVED';
    });

    if (archivedSelected.length === 0) {
      alert("None of the selected prospects are in Archived stage.");
      return;
    }

    try {
      setExecutingBulk(true);
      const promises = archivedSelected.map(matchId => 
        fetch(`${API_URL}/api/prospects/sourcing/${matchId}`, { credentials: 'include',  method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchUpdates: { 
              stage: 'MATCHED'
            },
            changedBy: 'Admin Recruiter',
            reason: `Bulk pipeline retraction: ${bulkReason}`
          })
        })
      );

      await Promise.all(promises);
      alert(`Successfully restored ${archivedSelected.length} prospects to Connection Request stage!`);
      
      // Update local UI
      setAllProspects(prev => prev.map(p => archivedSelected.includes(p.id) ? { ...p, stage: 'MATCHED', active_flag: true } : p));
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
  const filteredProspects = allProspects.filter(item => {
    const matchesJob = selectedJobId === 'all' || item.job_id === selectedJobId || item.job?.id === selectedJobId;
    const matchesStage = selectedStage === 'all' || item.stage === selectedStage;
    
    let matchesSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      
      // 1. Basic profile & contact fields
      const matchesProfile = (
        item.prospect?.name?.toLowerCase().includes(q) ||
        item.prospect?.latest_company?.toLowerCase().includes(q) ||
        item.prospect?.latest_title?.toLowerCase().includes(q) ||
        item.prospect?.functional_field?.toLowerCase().includes(q) ||
        item.prospect?.city?.toLowerCase().includes(q) ||
        item.prospect?.email?.toLowerCase().includes(q) ||
        item.prospect?.phone?.toLowerCase().includes(q)
      );

      if (matchesProfile) {
        matchesSearch = true;
      } else {
        // 2. Search remarks
        const prospectId = item.prospect?.id;
        matchesSearch = prospectId ? allProspects.some(otherMatch => 
          otherMatch.prospect?.id === prospectId && 
          otherMatch.human_notes?.toLowerCase().includes(q)
        ) : false;
      }
    }
    return matchesJob && matchesStage && matchesSearch;
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

  // Check if any selected prospects are archived to show the bulk restore option
  const selectedArchivedCount = selectedProspects.filter(id => {
    const p = allProspects.find(item => item.id === id);
    return p && p.stage === 'ARCHIVED';
  }).length;

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
              placeholder="Search prospects..."
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
            <option value="all">All Positions</option>
            {activeJobs.map(job => (
              <option key={job.id} value={job.id}>{job.title} ({job.company_name})</option>
            ))}
          </select>

          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="text-xs border-gray-250 rounded-md focus:ring-green-700 focus:border-green-700 bg-white pr-8 py-1.5 font-semibold text-gray-600 max-w-[200px]"
          >
            {STAGES.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            ))}
          </select>

          {/* Mobile Only Sort Dropdown */}
          <select
            value={`${sortConfig.key}:${sortConfig.direction}`}
            onChange={(e) => {
              const [key, direction] = e.target.value.split(':');
              const newConfig = { key, direction };
              setSortConfig(newConfig);
              localStorage.setItem('hirefortravel_all_sortConfig', JSON.stringify(newConfig));
            }}
            className="text-xs border-gray-250 rounded-md focus:ring-green-700 focus:border-green-700 bg-white pr-8 py-1.5 font-semibold text-gray-600 md:hidden"
          >
            <option value="identified:desc">Sort: Newest Sourced</option>
            <option value="identified:asc">Sort: Oldest Sourced</option>
            <option value="score:desc">Sort: Score (High-Low)</option>
            <option value="score:asc">Sort: Score (Low-High)</option>
            <option value="name:asc">Sort: Name (A-Z)</option>
            <option value="name:desc">Sort: Name (Z-A)</option>
          </select>

          {(selectedProspects.length > 0 || searchQuery || selectedJobId !== 'all' || selectedStage !== 'all') && (
            <button 
              onClick={() => { setSelectedProspects([]); setSearchQuery(''); setSelectedJobId('all'); setSelectedStage('all'); }} 
              className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Selected counts and quick actions */}
        {selectedProspects.length > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            {selectedArchivedCount > 0 && (
              <button
                onClick={() => setIsBulkOpen(true)}
                className="bg-green-700 text-white px-4 py-1.5 rounded-md text-xs font-bold hover:bg-green-800 transition-colors shadow-sm w-full md:w-auto text-center"
              >
                Bulk Restore Archived ({selectedArchivedCount})
              </button>
            )}
            <button 
              onClick={() => setSelectedProspects([])}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors"
            >
              Deselect All ({selectedProspects.length})
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
              <p className="text-xs text-gray-400 mt-1">You are restoring {selectedArchivedCount} archived candidates back to active pipelines.</p>
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

      {/* Reusable Stage Transition Modal */}
      <StageTransitionModal
        isOpen={!!transitionDetails}
        onClose={() => setTransitionDetails(null)}
        candidateName={transitionDetails?.candidateName}
        currentStage={transitionDetails?.currentStage}
        stagesList={STAGES}
        onSubmit={handleTransitionSubmit}
      />

      {/* Global Directory DataTable (Desktop) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Table Title Block */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50/30">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <h3 className="text-sm font-black text-gray-800">Global Prospects Directory <span className="text-gray-400 font-medium text-xs ml-1">({filteredProspects.length} candidates)</span></h3>
          </div>
          <span className="text-[10px] text-gray-400 italic hidden md:inline">Drag column borders to resize columns</span>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-green-800 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-xs italic">Syncing prospects directory...</p>
          </div>
        ) : filteredProspects.length === 0 ? (
          <div className="py-20 text-center text-gray-500 text-sm italic">
            No candidates found in this view.
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <ResizableTable
                columns={columns}
                data={filteredProspects}
                sortConfig={sortConfig}
                onSort={handleSort}
                onSelectAll={() => {
                  if (selectedProspects.length === filteredProspects.length) {
                    setSelectedProspects([]);
                  } else {
                    setSelectedProspects(filteredProspects.map(p => p.id));
                  }
                }}
                allSelected={selectedProspects.length === filteredProspects.length && filteredProspects.length > 0}
                hasCheckbox={true}
              >
                {(matchItem, idx) => {
                  const prospect = matchItem.prospect || {};
                  const job = matchItem.job || {};
                  const finalScore = matchItem.manual_score || matchItem.ai_score || 0;
                  const isSelected = selectedProspects.includes(matchItem.id);
                  const badge = getStageBadge(matchItem.stage);
                  
                  return (
                    <tr key={matchItem.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-green-50/50' : ''}`}>
                      <td className="px-1 py-3 text-center" style={{ width: '32px', minWidth: '32px', maxWidth: '32px' }}>
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
                           className="rounded text-green-700 focus:ring-green-700 border-gray-300 h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div 
                          onClick={() => setActiveMatchId(matchItem.id)}
                          className="font-bold text-gray-800 cursor-pointer hover:text-green-800 transition-colors text-xs truncate"
                          title={prospect.name}
                        >
                          {prospect.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 min-w-0">
                          {matchItem.owner && (
                            <span className="text-[9px] text-gray-400 font-semibold truncate">
                              Recruiter: <span className="text-gray-500">{matchItem.owner}</span>
                            </span>
                          )}
                          <span className="inline-block bg-gray-50 border border-gray-200 px-1 py-0.2 rounded text-[8px] font-black text-gray-500 uppercase tracking-wider truncate max-w-full" title={`Matched for Job: ${job.title}`}>
                            {job.title || 'Unknown Position'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {renderTimeIdentified(matchItem.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
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
                            <div className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 border border-gray-155 text-gray-350 cursor-not-allowed" title="No LinkedIn URL">
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
                            <div className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 border border-gray-155 text-gray-355 cursor-not-allowed" title="No Email available">
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
                            <div className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 border border-gray-155 text-gray-355 cursor-not-allowed" title="No Phone available">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {editingNotesMatchId === matchItem.id ? (
                          <div className="flex flex-col gap-1.5 w-full font-semibold text-gray-700" onClick={(e) => e.stopPropagation()}>
                            <textarea 
                              value={tempNotes} 
                              onChange={(e) => setTempNotes(e.target.value)}
                              className="w-full text-[11px] p-1.5 border border-gray-300 rounded focus:ring-green-700 focus:border-green-700 bg-white font-semibold text-gray-750"
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
                            <p className="text-[11px] font-semibold leading-relaxed text-gray-850 whitespace-pre-wrap pr-6">
                              {matchItem.human_notes}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-gray-50/50 border border-gray-200 rounded px-2.5 py-2 text-gray-400 w-full group/notes relative shadow-xs" onClick={(e) => e.stopPropagation()}>
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
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => triggerStageTransition(matchItem.id, matchItem.stage, prospect.name)}
                          className="inline-flex items-center gap-1.5 transition-all focus:outline-none text-center mx-auto"
                          title="Click to change pipeline stage"
                        >
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer hover:opacity-85 shadow-xs transition-opacity ${badge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} mr-1 inline-block`} />
                            {badge.name}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                }}
              </ResizableTable>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredProspects.map(matchItem => {
                const prospect = matchItem.prospect || {};
                const job = matchItem.job || {};
                const finalScore = matchItem.manual_score || matchItem.ai_score || 0;
                const isSelected = selectedProspects.includes(matchItem.id);
                const badge = getStageBadge(matchItem.stage);

                return (
                  <div key={matchItem.id} className={`p-4 space-y-3.5 relative ${isSelected ? 'bg-green-50/20' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      {/* Checkbox and Name */}
                      <div className="flex items-start gap-3 min-w-0">
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
                          className="mt-1 rounded text-green-700 focus:ring-green-700 border-gray-300 h-4.5 w-4.5 flex-shrink-0" 
                        />
                        <div className="min-w-0">
                          <div 
                            className="font-bold text-gray-900 hover:text-green-800 cursor-pointer text-sm leading-tight" 
                            onClick={() => setActiveMatchId(matchItem.id)}
                          >
                            {prospect.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-gray-500 font-semibold">
                            {matchItem.owner && (
                              <span>Recruiter: {matchItem.owner}</span>
                            )}
                            {matchItem.owner && job.title && <span>&bull;</span>}
                            <span className="truncate max-w-[130px]" title={job.title}>{job.title || 'Unknown Position'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs flex-shrink-0 ${
                        finalScore >= 90 ? 'bg-green-100 text-green-800' :
                        finalScore >= 80 ? 'bg-blue-100 text-blue-800' :
                        finalScore >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {finalScore}%
                      </span>
                    </div>

                    {/* Candidate Background Summary */}
                    <div className="text-xs bg-gray-50/50 border border-gray-100 rounded-lg p-2.5 space-y-1">
                      <div className="font-semibold text-gray-700 truncate">{prospect.latest_title || 'No Title'}</div>
                      <div className="text-gray-500 truncate">{prospect.latest_company || 'No Company'}{prospect.city ? ` • ${prospect.city}` : ''}</div>
                    </div>

                    {/* Meta and Contact Row */}
                    <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                      <div className="text-xs text-gray-400 font-medium">
                        Sourced: {new Date(matchItem.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>

                      {/* Contact Buttons */}
                      <div className="flex items-center gap-2">
                        {prospect.linkedin_url ? (
                          <a 
                            href={prospect.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-blue-600 active:bg-blue-600 active:text-white transition-colors"
                            title="View LinkedIn Profile"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                          </a>
                        ) : (
                          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                          </div>
                        )}
                        {prospect.email ? (
                          <a 
                            href={`mailto:${prospect.email}`}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-50 border border-green-200 text-green-700 active:bg-green-700 active:text-white transition-colors"
                            title={`Email: ${prospect.email}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                          </a>
                        ) : (
                          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                          </div>
                        )}
                        {prospect.phone ? (
                          <a 
                            href={`tel:${prospect.phone}`}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-50 border border-amber-200 text-amber-700 active:bg-amber-600 active:text-white transition-colors"
                            title={`Phone: ${prospect.phone}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          </a>
                        ) : (
                          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remarks/Notes block */}
                    <div className="pt-2 border-t border-gray-100">
                      {editingNotesMatchId === matchItem.id ? (
                        <div className="flex flex-col gap-1.5 w-full font-semibold text-gray-700" onClick={(e) => e.stopPropagation()}>
                          <textarea 
                            value={tempNotes} 
                            onChange={(e) => setTempNotes(e.target.value)}
                            className="w-full text-xs p-1.5 border border-gray-300 rounded focus:ring-green-700 focus:border-green-700 bg-white font-semibold text-gray-700"
                            rows="2"
                            placeholder="Enter remarks..."
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => setEditingNotesMatchId(null)}
                              className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded font-bold text-[10px] hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={async () => { 
                                await handleUpdateNotes(matchItem.id, tempNotes); 
                                setEditingNotesMatchId(null); 
                              }}
                              className="px-2 py-0.5 bg-green-700 text-white rounded font-bold text-[10px] hover:bg-green-800 transition-colors shadow-xs"
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
                        <div className="bg-gray-50/50 border border-gray-200 rounded px-2.5 py-2 text-gray-400 w-full group/notes relative shadow-xs" onClick={(e) => e.stopPropagation()}>
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
                      
                      <div className="flex items-center justify-between gap-1.5 mt-2.5">
                        <button
                          onClick={() => triggerStageTransition(matchItem.id, matchItem.stage, prospect.name)}
                          className="flex items-center gap-1.5 transition-all focus:outline-none"
                        >
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} mr-1 inline-block`} />
                            {badge.name}
                          </span>
                        </button>
                        <button
                          onClick={() => setActiveMatchId(matchItem.id)}
                          className="text-gray-400 hover:text-green-800 font-bold text-[10px] underline"
                        >
                          Edit Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Prospect Detail Drawer Component */}
      <ProspectDrawer 
        matchId={activeMatchId}
        onClose={() => setActiveMatchId(null)}
        onSaveSuccess={() => {
          fetchAllProspects(); // reload all prospects when drawer saves changes
        }}
      />

    </div>
  );
}
