"use client";
import { useState, useEffect, useMemo } from 'react';
import ProspectDrawer from '../../../components/ProspectDrawer';

const ACTIVE_STAGES = [
  { id: 'MATCHED', name: 'Matched', color: 'slate', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { id: 'CONTACTED', name: 'Outreach Sent', color: 'blue', icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
  { id: 'RESPONDED', name: 'Connected / Responded', color: 'indigo', icon: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' },
  { id: 'FOLLOWUP', name: 'Follow Up', color: 'purple', icon: 'M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { id: 'INTERESTED', name: 'Interested', color: 'emerald', icon: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3' },
  { id: 'APPLIED', name: 'Applied', color: 'amber', icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3' }
];

const TERMINAL_STAGES = [
  { id: 'ARCHIVED', name: 'Req. Not Accepted', color: 'rose', icon: 'M18.36 6.64a9 9 0 1 1-12.73 0M12 2v4' },
  { id: 'NO RESPONSE', name: 'No Response', color: 'gray', icon: 'M2 12h4l2-3 4 6 2-3h4' },
  { id: 'NOT INTERESTED', name: 'Not Interested', color: 'orange', icon: 'M10 14L21 3M18 21a9 9 0 0 1-15-6.7L22 3' },
  { id: 'REJECTED', name: 'Rejected', color: 'red', icon: 'M18 6L6 18M6 6l12 12' }
];

const ALL_STAGES = [...ACTIVE_STAGES, ...TERMINAL_STAGES];

const getOutreachDraft = (prospect = {}, job = {}) => {
  const firstName = prospect.name ? prospect.name.split(' ')[0] : 'there';
  const field = prospect.functional_field || 'your field';
  const company = prospect.latest_company || 'your company';
  const companyType = job.company_name || 'a top travel operator';
  const city = job.location || 'your city';

  return `Hey ${firstName}, came across your background in ${field} at ${company}. We're currently hiring for a similar profile for a ${companyType} in ${city}. Should I share more details?`;
};

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

export default function ProspectsCRMBoard() {
  const [prospects, setProspects] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMatchId, setActiveMatchId] = useState(null);

  // New Navigation State
  const [activeStageTab, setActiveStageTab] = useState('MATCHED');

  // Filters
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedProspects, setSelectedProspects] = useState([]);
  
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });

  // Load saved sorting preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSort = localStorage.getItem('hirefortravel_crm_sortConfig');
      if (savedSort) {
        try {
          setSortConfig(JSON.parse(savedSort));
        } catch (e) {
          console.error("Failed to parse saved CRM sortConfig", e);
        }
      }
    }
  }, []);

  // Inline remarks editor states
  const [editingNotesMatchId, setEditingNotesMatchId] = useState(null);
  const [tempNotes, setTempNotes] = useState('');

  // Stage transition modal states
  const [transitionDetails, setTransitionDetails] = useState(null);
  const [actionRemarks, setActionRemarks] = useState('');

  // Manual Add Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingProspect, setAddingProspect] = useState(false);
  const [newProspect, setNewProspect] = useState({
    name: '', email: '', phone: '', city: '', linkedinUrl: '',
    latestTitle: '', latestCompany: '', totalExperience: '',
    jobId: '', stage: 'MATCHED', score: '', remarks: '', owner: ''
  });

  // Bulk operation states
  const [bulkAction, setBulkAction] = useState('');
  const [bulkStage, setBulkStage] = useState('MATCHED');
  const [bulkOwner, setBulkOwner] = useState('');
  const [bulkTags, setBulkTags] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [executingBulk, setExecutingBulk] = useState(false);
  const [users, setUsers] = useState([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const jobsRes = await fetch(`${API_URL}/api/jobs?status=active&admin=true`, { credentials: 'include' });
        const jobsResult = await jobsRes.json();
        if (jobsResult.success && jobsResult.data) {
          setActiveJobs(jobsResult.data);
          if (jobsResult.data.length > 0) {
            setNewProspect(prev => ({ ...prev, jobId: jobsResult.data[0].id }));
          }
        }
        
        // Fetch active admin users list for owner dropdowns
        try {
          const usersRes = await fetch(`${API_URL}/api/admin/users`, { credentials: 'include' });
          const usersResult = await usersRes.json();
          if (usersResult.success && usersResult.data) {
            const sortedUsers = usersResult.data
              .filter(u => u.is_active)
              .sort((a, b) => a.username.localeCompare(b.username));
            setUsers(sortedUsers);
          }
        } catch (e) {
          console.error("Failed to load admin users list in CRM:", e);
        }

        await fetchCRMProspects();
      } catch (err) {
        console.error("Error loading CRM board data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const fetchCRMProspects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/prospects?active=true`, { credentials: 'include' });
      const result = await res.json();
      if (result.success && result.data) {
        // Exclude IDENTIFIED from the crm board (as it represents Discovered Prospects stage).
        const crmCandidates = result.data.filter(item => item.stage !== 'IDENTIFIED');
        setProspects(crmCandidates);
      }
    } catch (err) {
      console.error("Error loading CRM prospects:", err);
    }
  };

  const updateProspectStage = async (matchId, newStage, reasonText) => {
    try {
      const matchUpdates = { stage: newStage };
      if (reasonText) {
        matchUpdates.human_notes = reasonText; // Save the transition remarks as candidate's active notes!
      }

      const res = await fetch(`${API_URL}/api/prospects/sourcing/${matchId}`, { credentials: 'include',  method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchUpdates,
          changedBy: 'Admin Recruiter',
          reason: reasonText || null
        })
      });
      const result = await res.json();
      if (result.success) {
        setProspects(prev => prev.map(p => p.id === matchId ? { 
          ...p, 
          stage: newStage, 
          human_notes: reasonText || p.human_notes,
          lifecycle_timestamps: { ...p.lifecycle_timestamps, [newStage]: new Date().toISOString() } 
        } : p));
        setSelectedProspects(prev => prev.filter(id => id !== matchId));
      } else {
        alert(result.error || 'Failed to update stage');
      }
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleUpdateNotes = async (matchId, notesText) => {
    try {
      const res = await fetch(`${API_URL}/api/prospects/sourcing/${matchId}`, { credentials: 'include',  method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchUpdates: { human_notes: notesText },
          changedBy: 'Admin Recruiter',
          reason: notesText
        })
      });
      const result = await res.json();
      if (result.success) {
        setProspects(prev => prev.map(p => p.id === matchId ? { ...p, human_notes: notesText } : p));
      } else {
        alert(result.error || 'Failed to save notes');
      }
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  };

  const triggerStageTransition = (matchId, newStage, candidateName, currentStageId) => {
    const currentStageName = ALL_STAGES.find(s => s.id === currentStageId)?.name || 'Unknown';
    const newStageName = ALL_STAGES.find(s => s.id === newStage)?.name || 'Unknown';
    setTransitionDetails({ matchId, newStage, candidateName, currentStageName, newStageName });
    setActionRemarks(''); // reset remarks
  };

  const handleAddManualProspect = async (e) => {
    e.preventDefault();
    if (!newProspect.name || !newProspect.jobId) return alert("Name and Job Position are mandatory fields.");
    try {
      setAddingProspect(true);
      const payload = {
        ...newProspect,
        score: newProspect.score === '' ? null : Number(newProspect.score)
      };
      const res = await fetch(`${API_URL}/api/prospects`, { credentials: 'include',  method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        setIsAddModalOpen(false);
        setNewProspect({
          name: '', email: '', phone: '', city: '', linkedinUrl: '',
          latestTitle: '', latestCompany: '', totalExperience: '',
          jobId: activeJobs.length > 0 ? activeJobs[0].id : '', stage: 'MATCHED', score: '', remarks: '', owner: ''
        });
        setLoading(true);
        await fetchCRMProspects();
        setLoading(false);
      } else alert(result.error || "Failed to create prospect manually.");
    } catch (err) {
      alert("Error creating prospect: " + err.message);
    } finally {
      setAddingProspect(false);
    }
  };

  const handleExecuteBulkAction = async () => {
    if (selectedProspects.length === 0) return;
    if (!bulkAction) return alert("Please select a bulk action to perform.");
    if (!bulkReason) return alert("Justification reason is required for compliance audit logs.");

    try {
      setExecutingBulk(true);
      const payloadUpdates = {};
      if (bulkAction === 'stage') payloadUpdates.stage = bulkStage;
      if (bulkAction === 'owner') payloadUpdates.owner = bulkOwner;
      if (bulkAction === 'tags') payloadUpdates.tags = bulkTags.split(',').map(t => t.trim()).filter(Boolean);

      const promises = selectedProspects.map(matchId => {
        let currentMatch = prospects.find(p => p.id === matchId);
        let finalMatchUpdates = { ...payloadUpdates };
        if (bulkAction === 'tags' && currentMatch) {
          const originalTags = Array.isArray(currentMatch.tags) ? currentMatch.tags : [];
          finalMatchUpdates.tags = Array.from(new Set([...originalTags, ...payloadUpdates.tags]));
        }
        return fetch(`${API_URL}/api/prospects/sourcing/${matchId}`, { credentials: 'include',  method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchUpdates: finalMatchUpdates,
            changedBy: 'Admin Recruiter',
            reason: `Bulk action [${bulkAction}] update: ${bulkReason}`
          })
        });
      });

      await Promise.all(promises);
      alert(`Bulk update complete!`);
      setSelectedProspects([]);
      setBulkAction(''); setBulkReason(''); setBulkOwner(''); setBulkTags('');
      setLoading(true); await fetchCRMProspects(); setLoading(false);
    } catch (err) {
      alert("Bulk update failed.");
    } finally {
      setExecutingBulk(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    const newConfig = { key, direction };
    setSortConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hirefortravel_crm_sortConfig', JSON.stringify(newConfig));
    }
  };

  // 1. Filter prospects globally based on all search criteria
  const globallyFilteredProspects = useMemo(() => {
    return prospects.filter(item => {
      const matchesJob = selectedJobId === 'all' || item.job_id === selectedJobId || item.job?.id === selectedJobId;
      const matchesOwner = selectedOwner === 'all' || item.owner === selectedOwner;
      
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
          item.prospect?.phone?.toLowerCase().includes(q) ||
          (Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q)))
        );

        if (matchesProfile) {
          matchesSearch = true;
        } else {
          // 2. Search past remarks (human_notes on ANY match for the same prospect)
          const prospectId = item.prospect?.id;
          matchesSearch = prospectId ? prospects.some(otherMatch => 
            otherMatch.prospect?.id === prospectId && 
            otherMatch.human_notes?.toLowerCase().includes(q)
          ) : false;
        }
      }

      return matchesJob && matchesOwner && matchesSearch;
    });
  }, [prospects, selectedJobId, selectedOwner, searchQuery]);

  // 2. Stage Counts from globally filtered prospects
  const stageCounts = useMemo(() => {
    const counts = {};
    ALL_STAGES.forEach(s => counts[s.id] = 0);
    globallyFilteredProspects.forEach(p => {
      if (counts[p.stage] !== undefined) counts[p.stage]++;
    });
    return counts;
  }, [globallyFilteredProspects]);

  // 3. Tab-filtered and Sorted Prospects
  const displayProspects = useMemo(() => {
    const inStage = globallyFilteredProspects.filter(p => p.stage === activeStageTab);
    
    return inStage.sort((a, b) => {
      const aName = a.prospect?.name || '';
      const bName = b.prospect?.name || '';
      const aCompany = a.prospect?.latest_company || '';
      const bCompany = b.prospect?.latest_company || '';
      const aScore = a.manual_score || a.ai_score || 0;
      const bScore = b.manual_score || b.ai_score || 0;
      const aDate = new Date(a.lifecycle_timestamps?.[a.stage] || a.created_at).getTime();
      const bDate = new Date(b.lifecycle_timestamps?.[b.stage] || b.created_at).getTime();

      let comparison = 0;
      switch (sortConfig.key) {
        case 'name': comparison = aName.localeCompare(bName); break;
        case 'company': comparison = aCompany.localeCompare(bCompany); break;
        case 'score': comparison = aScore - bScore; break;
        case 'identified': {
          const aIdentified = new Date(a.created_at || 0).getTime();
          const bIdentified = new Date(b.created_at || 0).getTime();
          comparison = aIdentified - bIdentified;
          break;
        }
        case 'duration': comparison = aDate - bDate; break;
        default: comparison = 0;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [globallyFilteredProspects, activeStageTab, sortConfig]);

  const uniqueOwners = Array.from(new Set(prospects.map(p => p.owner).filter(Boolean)));

  const handleCardSelectionToggle = (matchId) => {
    if (selectedProspects.includes(matchId)) setSelectedProspects(selectedProspects.filter(id => id !== matchId));
    else setSelectedProspects([...selectedProspects, matchId]);
  };

  const getStageDurationString = (matchItem) => {
    const timestampStr = matchItem.lifecycle_timestamps?.[matchItem.stage] || matchItem.created_at;
    if (!timestampStr) return '';
    const diffMs = new Date() - new Date(timestampStr);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${Math.max(1, diffMins)}m`;
    }
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      const remainingMins = diffMins % 60;
      return remainingMins > 0 ? `${diffHours}h ${remainingMins}m` : `${diffHours}h`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    return remainingHours > 0 ? `${diffDays}d ${remainingHours}h` : `${diffDays}d`;
  };

  const activeStageDetails = ALL_STAGES.find(s => s.id === activeStageTab) || ALL_STAGES[0];

  return (
    <div className="space-y-6 pb-20">
      
      {/* Search and Filters Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Advanced Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* General Search */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-3 text-gray-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" placeholder="Search name, title, company, tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-green-700 focus:border-green-700 bg-white placeholder-gray-400 font-semibold"
            />
          </div>

          {/* Job Target filter */}
          <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className="text-xs border-gray-200 rounded-md focus:ring-green-700 bg-white pr-8 py-1.5 font-semibold text-gray-600 max-w-[200px]">
            <option value="all">All Jobs</option>
            {activeJobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>

          {/* Owner filter */}
          <select value={selectedOwner} onChange={(e) => setSelectedOwner(e.target.value)} className="text-xs border-gray-200 rounded-md focus:ring-green-700 bg-white pr-8 py-1.5 font-semibold text-gray-600">
            <option value="all">All Owners</option>
            {uniqueOwners.map(owner => <option key={owner} value={owner}>{owner}</option>)}
          </select>

          {/* Mobile Only Sort Dropdown */}
          <select 
            value={`${sortConfig.key}:${sortConfig.direction}`} 
            onChange={(e) => {
              const [key, direction] = e.target.value.split(':');
              const newConfig = { key, direction };
              setSortConfig(newConfig);
              localStorage.setItem('hirefortravel_crm_sortConfig', JSON.stringify(newConfig));
            }} 
            className="text-xs border-gray-200 rounded-md focus:ring-green-700 bg-white pr-8 py-1.5 font-semibold text-gray-600 md:hidden"
          >
            <option value="score:desc">Sort: Score (High-Low)</option>
            <option value="score:asc">Sort: Score (Low-High)</option>
            <option value="name:asc">Sort: Name (A-Z)</option>
            <option value="name:desc">Sort: Name (Z-A)</option>
            <option value="identified:desc">Sort: Newest Sourced</option>
            <option value="identified:asc">Sort: Oldest Sourced</option>
            <option value="duration:desc">Sort: In Stage (Longest)</option>
            <option value="duration:asc">Sort: In Stage (Shortest)</option>
          </select>

          {(selectedProspects.length > 0 || searchQuery) && (
            <button onClick={() => { setSelectedProspects([]); setSearchQuery(''); }} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">Clear All</button>
          )}
        </div>

        {/* Add Modal trigger */}
        <button onClick={() => setIsAddModalOpen(true)} className="bg-green-700 text-white px-4 py-1.5 rounded-md text-xs font-bold hover:bg-green-800 transition-colors shadow-sm flex items-center gap-1 w-full md:w-auto justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Profile
        </button>
      </div>

      {/* Stage Chips Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
        
        {/* Active Journey */}
        <div>
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Active Pipeline Journey</h4>
          <div className="flex items-center overflow-x-auto scrollbar-none pb-2 gap-1">
            {ACTIVE_STAGES.map((stage, idx) => {
              const isActive = activeStageTab === stage.id;
              const count = stageCounts[stage.id];
              return (
                <div key={stage.id} className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => { setActiveStageTab(stage.id); setSelectedProspects([]); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 ${
                      isActive 
                        ? `border-${stage.color}-500 bg-${stage.color}-50 text-${stage.color}-800 shadow-sm` 
                        : `border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-200`
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html: `<path d="${stage.icon}"/>`}} />
                    {stage.name}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? `bg-${stage.color}-200 text-${stage.color}-900` : 'bg-gray-200 text-gray-700'}`}>
                      {count}
                    </span>
                  </button>
                  {idx < ACTIVE_STAGES.length - 1 && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mx-1"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Terminal Outcomes */}
        <div className="pt-3 border-t border-gray-100">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Closed / Terminal Outcomes</h4>
          <div className="flex items-center overflow-x-auto scrollbar-none pb-2 gap-2">
            {TERMINAL_STAGES.map(stage => {
              const isActive = activeStageTab === stage.id;
              const count = stageCounts[stage.id];
              return (
                <button
                  key={stage.id}
                  onClick={() => { setActiveStageTab(stage.id); setSelectedProspects([]); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 flex-shrink-0 ${
                    isActive 
                      ? `border-${stage.color}-500 bg-${stage.color}-50 text-${stage.color}-800 shadow-sm` 
                      : `border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-200`
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html: `<path d="${stage.icon}"/>`}} />
                  {stage.name}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? `bg-${stage.color}-200 text-${stage.color}-900` : 'bg-gray-200 text-gray-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bulk Operations Panel */}
      {selectedProspects.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs shadow-sm animate-slide-down">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-green-800 font-bold mb-3">
            <span className="flex items-center gap-1.5 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
              Bulk Action: {selectedProspects.length} selected
            </span>
            <div className="flex items-center gap-2">
              <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="bg-white border border-green-300 rounded text-xs px-2 py-1 text-gray-700 font-semibold focus:ring-green-800">
                <option value="">-- Select operation --</option>
                <option value="stage">Update Pipeline Stage</option>
                <option value="owner">Assign Recruiter</option>
                <option value="tags">Add Tags</option>
              </select>
              <button
                type="button"
                onClick={() => { setSelectedProspects([]); setBulkAction(''); }}
                className="bg-white border border-gray-300 text-gray-750 hover:text-gray-900 rounded text-xs px-2.5 py-1 font-semibold transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>

          {bulkAction && (
            <div className="bg-white border border-green-100 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                {bulkAction === 'stage' && (
                  <select value={bulkStage} onChange={(e) => setBulkStage(e.target.value)} className="w-full border-gray-300 rounded text-xs">
                    {ALL_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                {bulkAction === 'owner' && (
                  <select 
                    value={bulkOwner} 
                    onChange={(e) => setBulkOwner(e.target.value)} 
                    className="w-full border-gray-300 rounded text-xs bg-white focus:ring-green-700"
                  >
                    <option value="">-- Select Recruiter --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.username}>{u.username}</option>
                    ))}
                  </select>
                )}
                {bulkAction === 'tags' && <input type="text" placeholder="e.g. star, top-tier" value={bulkTags} onChange={(e) => setBulkTags(e.target.value)} className="w-full border-gray-300 rounded text-xs" />}
              </div>
              <div className="md:col-span-1">
                <input type="text" required placeholder="Justification..." value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} className="w-full border-yellow-300 bg-yellow-50/20 focus:ring-yellow-500 rounded text-xs" />
              </div>
              <div className="md:col-span-1 flex items-end">
                <button onClick={handleExecuteBulkAction} disabled={executingBulk || !bulkReason} className={`w-full py-1.5 rounded text-xs font-bold text-white shadow-sm transition-colors ${executingBulk || !bulkReason ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-700 hover:bg-green-800'}`}>
                  {executingBulk ? 'Processing...' : 'Commit Batch'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Table Header / Title */}
        <div className={`px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-${activeStageDetails.color}-50/30`}>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-${activeStageDetails.color}-600`} dangerouslySetInnerHTML={{__html: `<path d="${activeStageDetails.icon}"/>`}} />
            <h3 className="text-sm font-black text-gray-800">{activeStageDetails.name} <span className="text-gray-400 font-medium text-xs ml-1">({displayProspects.length} candidates)</span></h3>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-green-800 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-xs italic">Loading candidates...</p>
          </div>
        ) : displayProspects.length === 0 ? (
          <div className="py-20 text-center text-gray-500 text-sm italic">
            No candidates found in {activeStageDetails.name}.
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500 font-black">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" onChange={(e) => setSelectedProspects(e.target.checked ? displayProspects.map(p => p.id) : [])} checked={displayProspects.length > 0 && selectedProspects.length === displayProspects.length} className="rounded text-green-700 border-gray-300" />
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>Candidate {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('company')}>Experience {sortConfig.key === 'company' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 text-center" onClick={() => handleSort('score')}>Score {sortConfig.key === 'score' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('identified')}>Time Sourced {sortConfig.key === 'identified' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('duration')}>In Stage {sortConfig.key === 'duration' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-4 py-3 w-[280px] min-w-[280px]">Latest Remarks</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {displayProspects.map(matchItem => {
                    const prospect = matchItem.prospect || {};
                    const job = matchItem.job || {};
                    const finalScore = matchItem.manual_score || matchItem.ai_score || 0;
                    const isSelected = selectedProspects.includes(matchItem.id);
                    
                    // Logic to find next/prev active stage
                    const currentIdx = ACTIVE_STAGES.findIndex(s => s.id === matchItem.stage);
                    const isTerminal = currentIdx === -1;
                    
                    return (
                      <tr key={matchItem.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-green-50/50' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={isSelected} onChange={() => handleCardSelectionToggle(matchItem.id)} className="rounded text-green-700 border-gray-300" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-800 hover:text-green-800 cursor-pointer text-xs" onClick={() => setActiveMatchId(matchItem.id)}>
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
                                className="w-6 h-6 flex items-center justify-center rounded bg-green-50 border border-green-200 text-green-700 hover:bg-green-700 hover:text-white transition-all shadow-xs"
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
                        <td className="px-4 py-3 text-gray-500 text-[11px] font-semibold">
                          {getStageDurationString(matchItem)}
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
                            <div className="bg-green-50/40 border border-green-100/60 rounded px-2 py-1.5 text-green-700 w-full group/notes relative" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-green-800">Auto Outreach Draft</span>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setEditingNotesMatchId(matchItem.id); 
                                      setTempNotes(''); 
                                    }}
                                    className="text-green-800 hover:text-green-950 p-0.5 rounded hover:bg-green-200 transition-colors animate-pulse"
                                    title="Add Custom Remark"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(getOutreachDraft(prospect, job));
                                      alert('Outreach draft copied to clipboard!');
                                    }}
                                    className="text-green-800 hover:text-green-950 p-0.5 rounded hover:bg-green-200 transition-colors"
                                    title="Copy Outreach Draft"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                  </button>
                                </div>
                              </div>
                              <p 
                                className="text-[10px] italic leading-normal pr-4" 
                                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                title={getOutreachDraft(prospect, job)}
                              >
                                {getOutreachDraft(prospect, job)}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Actions for Active Stages */}
                            {!isTerminal && currentIdx > 0 && (
                              <button onClick={() => triggerStageTransition(matchItem.id, ACTIVE_STAGES[currentIdx - 1].id, prospect.name, matchItem.stage)} className="p-1.5 border border-gray-200 bg-white text-gray-500 rounded hover:bg-gray-100 hover:text-gray-800 transition-colors shadow-sm" title="Regress Stage">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                              </button>
                            )}
                            {!isTerminal && currentIdx < ACTIVE_STAGES.length - 1 && (
                              <div className="relative group inline-block">
                                <button className="p-1.5 border border-green-600 bg-green-50 text-green-700 rounded hover:bg-green-600 hover:text-white transition-colors shadow-sm flex items-center justify-center" title="Advance / Skip Stages">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                </button>
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 shadow-xl rounded-md z-50 hidden group-hover:block group-focus-within:block text-left text-[11px] font-bold overflow-hidden">
                                  {ACTIVE_STAGES.slice(currentIdx + 1).map(s => (
                                    <button key={s.id} onClick={() => triggerStageTransition(matchItem.id, s.id, prospect.name, matchItem.stage)} className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700 border-b border-gray-50 last:border-0 transition-colors">
                                      {s.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Dropdown for explicitly rejecting */}
                            {!isTerminal && (
                              <div className="relative group inline-block">
                                <button className="p-1.5 border border-rose-200 bg-white text-rose-500 rounded hover:bg-rose-50 transition-colors shadow-sm" title="Mark as Negative Outcome">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 shadow-xl rounded-md z-50 hidden group-hover:block group-focus-within:block text-left text-[11px] font-bold overflow-hidden">
                                  {TERMINAL_STAGES.map(t => (
                                    <button key={t.id} onClick={() => triggerStageTransition(matchItem.id, t.id, prospect.name, matchItem.stage)} className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-rose-50 hover:text-rose-700 border-b border-gray-50 last:border-0 transition-colors">
                                      {t.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isTerminal && (
                              <button onClick={() => triggerStageTransition(matchItem.id, 'MATCHED', prospect.name, matchItem.stage)} className="px-2 py-1 border border-gray-200 bg-white text-gray-600 rounded hover:bg-gray-100 text-[10px] font-bold shadow-sm transition-colors" title="Re-engage candidate">
                                Re-activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-gray-100">
              {displayProspects.map(matchItem => {
                const prospect = matchItem.prospect || {};
                const job = matchItem.job || {};
                const finalScore = matchItem.manual_score || matchItem.ai_score || 0;
                const isSelected = selectedProspects.includes(matchItem.id);
                const currentIdx = ACTIVE_STAGES.findIndex(s => s.id === matchItem.stage);
                const isTerminal = currentIdx === -1;

                return (
                  <div key={matchItem.id} className={`p-4 space-y-3.5 relative ${isSelected ? 'bg-green-50/20' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      {/* Checkbox and Name */}
                      <div className="flex items-start gap-3 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => handleCardSelectionToggle(matchItem.id)} 
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
                              <span>Owner: {matchItem.owner}</span>
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
                      {getStageDurationString(matchItem) && (
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          Time in Stage: {getStageDurationString(matchItem)}
                        </div>
                      )}
                    </div>

                    {/* Meta and Contact Row */}
                    <div className="flex items-center justify-between gap-3 text-xs text-gray-505">
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
                          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-150 text-gray-300">
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
                          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-150 text-gray-300">
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
                          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-150 text-gray-300">
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
                            className="w-full text-xs p-1.5 border border-gray-300 rounded focus:ring-green-700 focus:border-green-700 bg-white font-semibold text-gray-750"
                            rows="2"
                            placeholder="Enter remarks..."
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => setEditingNotesMatchId(null)}
                              className="px-2 py-0.5 bg-gray-100 text-gray-505 rounded font-bold text-[10px] hover:bg-gray-200 transition-colors"
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
                        <div className="bg-gray-50 border border-gray-200 rounded px-2.5 py-2 text-gray-700 w-full group/notes relative shadow-xs" onClick={(e) => e.stopPropagation()}>
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
                        <div className="bg-green-50/40 border border-green-100/60 rounded px-2 py-1.5 text-green-700 w-full group/notes relative" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-green-800">Auto Outreach Draft</span>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setEditingNotesMatchId(matchItem.id); 
                                  setTempNotes(''); 
                                }}
                                className="text-green-800 hover:text-green-950 p-0.5 rounded hover:bg-green-200 transition-colors animate-pulse"
                                title="Add Custom Remark"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(getOutreachDraft(prospect, job));
                                  alert('Outreach draft copied to clipboard!');
                                }}
                                className="text-green-800 hover:text-green-950 p-0.5 rounded hover:bg-green-200 transition-colors"
                                title="Copy Outreach Draft"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              </button>
                            </div>
                          </div>
                          <p 
                            className="text-[10px] italic leading-normal pr-4" 
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            title={getOutreachDraft(prospect, job)}
                          >
                            {getOutreachDraft(prospect, job)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100">
                      {isTerminal ? (
                        <button 
                          onClick={() => triggerStageTransition(matchItem.id, 'MATCHED', prospect.name, matchItem.stage)} 
                          className="flex-1 py-2 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold text-center transition-colors active:scale-95 shadow-xs"
                        >
                          Re-activate
                        </button>
                      ) : (
                        <>
                          {currentIdx > 0 && (
                            <button 
                              onClick={() => triggerStageTransition(matchItem.id, ACTIVE_STAGES[currentIdx - 1].id, prospect.name, matchItem.stage)} 
                              className="px-3 py-2 border border-gray-200 bg-white text-gray-500 rounded-lg hover:bg-gray-100 transition-colors shadow-xs flex items-center justify-center active:scale-95"
                              title="Regress Stage"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                            </button>
                          )}
                          
                          {/* Reject outcome */}
                          <div className="relative group flex-1">
                            <button className="w-full py-2 border border-rose-200 bg-white hover:bg-rose-50 text-rose-500 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1 transition-colors active:scale-95 shadow-xs">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              Reject
                            </button>
                            <div className="absolute left-0 bottom-full mb-1.5 w-44 bg-white border border-gray-200 shadow-xl rounded-lg z-30 hidden group-hover:block group-focus-within:block text-left text-[11px] font-bold overflow-hidden">
                              {TERMINAL_STAGES.map(t => (
                                <button key={t.id} onClick={() => triggerStageTransition(matchItem.id, t.id, prospect.name, matchItem.stage)} className="block w-full text-left px-3 py-2.5 text-gray-700 hover:bg-rose-50 hover:text-rose-700 border-b border-gray-50 last:border-0 transition-colors">
                                  {t.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {currentIdx < ACTIVE_STAGES.length - 1 && (
                            <div className="relative group flex-1">
                              <button className="w-full py-2 border border-green-600 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1 transition-colors active:scale-95 shadow-xs">
                                Advance
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                              </button>
                              <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-white border border-gray-200 shadow-xl rounded-lg z-30 hidden group-hover:block group-focus-within:block text-left text-[11px] font-bold overflow-hidden">
                                {ACTIVE_STAGES.slice(currentIdx + 1).map(s => (
                                  <button key={s.id} onClick={() => triggerStageTransition(matchItem.id, s.id, prospect.name, matchItem.stage)} className="block w-full text-left px-3 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-700 border-b border-gray-50 last:border-0 transition-colors">
                                    {s.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Manual Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden">
            <div className="bg-green-800 px-4 py-3 flex justify-between items-center text-white">
              <h3 className="font-bold text-sm">Add Prospect</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="hover:text-green-200"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <form onSubmit={handleAddManualProspect} className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Row 1 */}
                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Job Position *</label>
                  <select required value={newProspect.jobId} onChange={e => setNewProspect({...newProspect, jobId: e.target.value})} className="w-full border-gray-300 rounded focus:ring-green-700">
                    {activeJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Stage</label>
                  <select value={newProspect.stage} onChange={e => setNewProspect({...newProspect, stage: e.target.value})} className="w-full border-gray-300 rounded focus:ring-green-700">
                    {ALL_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Row 2 */}
                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Name *</label>
                  <input required type="text" value={newProspect.name} onChange={e => setNewProspect({...newProspect, name: e.target.value})} className="w-full border-gray-300 rounded focus:ring-green-700" placeholder="e.g. Rahul Sharma" />
                </div>
                <div>
                  <label className="font-bold text-gray-500 mb-1 block">LinkedIn Profile URL</label>
                  <input type="url" value={newProspect.linkedinUrl} onChange={e => setNewProspect({...newProspect, linkedinUrl: e.target.value})} className="w-full border-gray-300 rounded focus:ring-green-700" placeholder="e.g. https://linkedin.com/in/username" />
                </div>

                {/* Row 3 */}
                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Current Title</label>
                  <input type="text" value={newProspect.latestTitle} onChange={e => setNewProspect({...newProspect, latestTitle: e.target.value})} className="w-full border-gray-300 rounded focus:ring-green-700" placeholder="e.g. Senior Visa Consultant" />
                </div>
                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Current Company</label>
                  <input type="text" value={newProspect.latestCompany} onChange={e => setNewProspect({...newProspect, latestCompany: e.target.value})} className="w-full border-gray-300 rounded focus:ring-green-700" placeholder="e.g. Atlys" />
                </div>

                {/* Row 4 */}
                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Email Address</label>
                  <input type="email" value={newProspect.email} onChange={e => setNewProspect({...newProspect, email: e.target.value})} className="w-full border-gray-300 rounded focus:ring-green-700" placeholder="e.g. rahul@example.com" />
                </div>
                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Phone Number</label>
                  <input type="tel" value={newProspect.phone} onChange={e => setNewProspect({...newProspect, phone: e.target.value})} className="w-full border-gray-300 rounded focus:ring-green-700" placeholder="e.g. +91 98765 43210" />
                </div>

                {/* Row 5 */}
                <div>
                  <label className="font-bold text-gray-500 mb-1 block">City / Location</label>
                  <input type="text" value={newProspect.city} onChange={e => setNewProspect({...newProspect, city: e.target.value})} className="w-full border-gray-300 rounded focus:ring-green-700" placeholder="e.g. New Delhi" />
                </div>
                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Manual Match Score (0-100)</label>
                  <input type="number" min="0" max="100" value={newProspect.score} onChange={e => setNewProspect({...newProspect, score: e.target.value === '' ? '' : parseInt(e.target.value)})} className="w-full border-gray-300 rounded focus:ring-green-700" placeholder="e.g. 85" />
                </div>

                {/* Row 6 */}
                <div className="col-span-2">
                  <label className="font-bold text-gray-500 mb-1 block">Assigned Recruiter / Owner (Optional)</label>
                  <select 
                    value={newProspect.owner} 
                    onChange={e => setNewProspect({...newProspect, owner: e.target.value})} 
                    className="w-full border-gray-300 rounded focus:ring-green-700 bg-white"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.username}>{u.username}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-gray-500 mb-1 block">Justification Notes *</label>
                  <textarea required value={newProspect.remarks} onChange={e => setNewProspect({...newProspect, remarks: e.target.value})} className="w-full border-gray-300 rounded focus:ring-green-700" rows="3" placeholder="Enter justification or recruitment remarks for adding this candidate manually..."></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-3 py-1.5 border border-gray-300 rounded font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={addingProspect} className="px-3 py-1.5 bg-green-700 text-white rounded font-bold hover:bg-green-800 disabled:opacity-50 transition-colors">Save Prospect</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage Transition Remarks Modal */}
      {transitionDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTransitionDetails(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="bg-green-800 px-4 py-3 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Update Pipeline Stage</h3>
              <button onClick={() => setTransitionDetails(null)} className="hover:text-green-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <div>
                <p className="text-gray-500 font-semibold mb-1">Candidate:</p>
                <p className="font-bold text-gray-800 text-sm">{transitionDetails.candidateName}</p>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-2.5 rounded-lg">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Current Stage</p>
                  <p className="font-bold text-gray-600 mt-0.5">{transitionDetails.currentStageName}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                <div className="flex-1 text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">New Stage</p>
                  <p className="font-bold text-green-700 mt-0.5">{transitionDetails.newStageName}</p>
                </div>
              </div>
              <div>
                <label className="block text-gray-500 font-bold mb-1">Recruiter Remarks / Justification (Optional)</label>
                <textarea 
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Enter remarks or justification for this stage change..."
                  className="w-full border-gray-300 rounded focus:ring-green-700 text-xs p-2"
                  rows="3"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setTransitionDetails(null)} className="px-3 py-1.5 border border-gray-300 rounded font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button 
                  onClick={async () => {
                    await updateProspectStage(transitionDetails.matchId, transitionDetails.newStage, actionRemarks);
                    setTransitionDetails(null);
                  }}
                  className="px-4 py-1.5 bg-green-700 text-white rounded font-bold hover:bg-green-800 transition-colors shadow-sm"
                >
                  Confirm Change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ProspectDrawer matchId={activeMatchId} onClose={() => setActiveMatchId(null)} onSaveSuccess={fetchCRMProspects} />
    </div>
  );
}
