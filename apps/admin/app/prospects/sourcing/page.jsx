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

export default function AISourcingPage() {
  const [activeJobs, setActiveJobs] = useState([]);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  // Sourcing optimization inspection modal states
  const [inspectionJob, setInspectionJob] = useState(null);
  const [isSavingInspection, setIsSavingInspection] = useState(false);
  const [inspectionFormData, setInspectionFormData] = useState({
    real_company_name: '',
    competitors: '',
    alternative_titles: ''
  });

  useEffect(() => {
    if (inspectionJob) {
      setInspectionFormData({
        real_company_name: inspectionJob.real_company_name || '',
        competitors: inspectionJob.competitors ? inspectionJob.competitors.join(', ') : '',
        alternative_titles: inspectionJob.alternative_titles ? inspectionJob.alternative_titles.join(', ') : ''
      });
    }
  }, [inspectionJob]);

  const handleSaveInspection = async () => {
    if (!inspectionJob) return;
    try {
      setIsSavingInspection(true);
      const competitorsArr = inspectionFormData.competitors ? inspectionFormData.competitors.split(',').map(c => c.trim()).filter(Boolean) : [];
      const altTitlesArr = inspectionFormData.alternative_titles ? inspectionFormData.alternative_titles.split(',').map(t => t.trim()).filter(Boolean) : [];

      const res = await fetch(`${API_URL}/api/jobs`, { credentials: 'include',  method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: inspectionJob.id,
          real_company_name: inspectionFormData.real_company_name || '',
          competitors: competitorsArr,
          alternative_titles: altTitlesArr
        })
      });

      const result = await res.json();
      if (result.success && result.data) {
        const updatedJob = result.data[0];
        
        // Update activeJobs list in local state
        setActiveJobs(activeJobs.map(j => j.id === updatedJob.id ? { ...j, ...updatedJob } : j));
        setInspectionJob(null);
      } else {
        alert(result.error || "Failed to update job sourcing configurations.");
      }
    } catch (err) {
      console.error("Failed to update job sourcing details:", err);
      alert("Error saving configurations.");
    } finally {
      setIsSavingInspection(false);
    }
  };

  // Sourcing process states
  const [sourcingRun, setSourcingRun] = useState(null);
  const [sourcingLoading, setSourcingLoading] = useState(false);
  const [sourcingProgress, setSourcingProgress] = useState(0);
  const [sourcingTimeLeft, setSourcingTimeLeft] = useState(0);
  const [laymanMessage, setLaymanMessage] = useState("");

  const getLaymanMessage = (progress, totalDiscovered) => {
    if (progress >= 100) return "All done! Your candidates are ready.";
    if (progress >= 90) {
      return "Finishing up...";
    }
    if (progress >= 70) {
      return totalDiscovered > 0
        ? `Evaluating ${totalDiscovered} candidates for the best fit...`
        : "Evaluating candidates for the best fit...";
    }
    if (progress >= 45) {
      return totalDiscovered > 0
        ? `Found ${totalDiscovered} promising profiles. Looking deeper into their backgrounds...`
        : "Looking deeper into candidate backgrounds...";
    }
    if (progress >= 20) return "Scanning the talent market for matching profiles...";
    return "Understanding the role and preparing the search...";
  };

  useEffect(() => {
    if (sourcingRun?.current_phase) {
      setLaymanMessage(sourcingRun.current_phase);
    } else {
      setLaymanMessage(getLaymanMessage(sourcingProgress, sourcingRun?.total_discovered || 0));
    }
  }, [sourcingProgress, sourcingRun?.current_phase, sourcingRun?.total_discovered]);

  // Sourcing Progress interpolation & Live ETA Timer
  useEffect(() => {
    let timerId = null;
    if (sourcingLoading) {
      timerId = setInterval(() => {
        // Calculate the target progress from backend run state
        let target = 15; // baseline start
        if (sourcingRun) {
          if (sourcingRun.status === 'completed') {
            target = 100;
          } else if (sourcingRun.status === 'failed') {
            target = 100;
          } else if (typeof sourcingRun.progress_percent === 'number') {
            target = sourcingRun.progress_percent;
          }
        }

        setSourcingProgress(prev => {
          if (prev >= target) {
            // If we are at or above target, but it's not completed yet, let it slowly creep forward so it doesn't look stuck
            if (prev < 99) {
              const next = prev + 0.15 + (Math.random() * 0.1);
              return Math.min(99, Math.round(next * 100) / 100);
            }
            return prev;
          } else {
            // Interpolate smoothly towards the target
            const distance = target - prev;
            const step = Math.max(1.5, distance * 0.15 + (Math.random() * 0.5));
            const next = prev + step;
            return Math.min(target, Math.round(next * 100) / 100);
          }
        });
      }, 1000);
    } else {
      setSourcingProgress(0);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [sourcingLoading, sourcingRun]);

  // Synchronize Live ETA countdown directly with progress percentage
  useEffect(() => {
    if (sourcingLoading && sourcingProgress < 100) {
      // Estimate total duration: 80s base plus 45s per additional selected job
      const estimatedDuration = 80 + Math.max(0, selectedJobs.length - 1) * 45;
      
      if (sourcingProgress >= 95) {
        setSourcingTimeLeft("Finishing up...");
      } else {
        const remainingTime = Math.max(3, Math.round(estimatedDuration * ((100 - sourcingProgress) / 100)));
        setSourcingTimeLeft(remainingTime);
      }
    } else {
      setSourcingTimeLeft(0);
    }
  }, [sourcingProgress, sourcingLoading, selectedJobs.length]);

  // Prospects list states
  const [prospects, setProspects] = useState([]);
  const [prospectsLoading, setProspectsLoading] = useState(true);
  const [selectedProspects, setSelectedProspects] = useState([]);

  // Filters & Sorting Config
  const [minScore, setMinScore] = useState(0);
  const [filterJobId, setFilterJobId] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'identified', direction: 'desc' });

  // Load saved sorting preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSort = localStorage.getItem('hirefortravel_sourcing_sortConfig');
      if (savedSort) {
        try {
          setSortConfig(JSON.parse(savedSort));
        } catch (e) {
          console.error("Failed to parse saved sourcing sortConfig", e);
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
      localStorage.setItem('hirefortravel_sourcing_sortConfig', JSON.stringify(newConfig));
    }
  };

  // Detail Drawer state
  const [activeMatchId, setActiveMatchId] = useState(null);

  // Stage Transition Remarks Modal State
  const [transitionDetails, setTransitionDetails] = useState(null); // { matchId, newStage, candidateName }
  const [actionRemarks, setActionRemarks] = useState('');
  const [showBulkRefreshModal, setShowBulkRefreshModal] = useState(false);
  const [bulkRefreshRemarks, setBulkRefreshRemarks] = useState('');
  const [refreshSuccessCount, setRefreshSuccessCount] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  // 1. Fetch Active Jobs & Prospects
  useEffect(() => {
    async function loadData() {
      try {
        setJobsLoading(true);
        // Fetch Active Jobs
        const jobsRes = await fetch(`${API_URL}/api/jobs?status=active&admin=true`, { credentials: 'include' });
        const jobsResult = await jobsRes.json();
        if (jobsResult.success && jobsResult.data) {
          setActiveJobs(jobsResult.data);
          
          // Persistent selected jobs preference
          let savedSelected = null;
          try {
            const saved = localStorage.getItem('hirefortravel_sourcing_selectedJobs');
            if (saved) {
              savedSelected = JSON.parse(saved);
            }
          } catch (e) {
            console.error('Failed to parse saved selected jobs:', e);
          }

          const activeJobIds = jobsResult.data.map(j => j.id);

          if (savedSelected && Array.isArray(savedSelected)) {
            // Retrieve previously seen jobs to identify brand-new jobs
            let seenJobs = [];
            try {
              const seen = localStorage.getItem('hirefortravel_sourcing_seenJobs');
              if (seen) {
                seenJobs = JSON.parse(seen);
              }
            } catch (e) {}

            // Newly added active jobs that have never been seen are auto-selected by default
            const newJobsToSelect = activeJobIds.filter(id => !seenJobs.includes(id));
            
            // Keep previously selected jobs that are still active, combined with new jobs
            const finalSelection = [...new Set([...savedSelected.filter(id => activeJobIds.includes(id)), ...newJobsToSelect])];
            
            setSelectedJobs(finalSelection);
            
            // Update seen list and selection list in localStorage
            localStorage.setItem('hirefortravel_sourcing_seenJobs', JSON.stringify([...new Set([...seenJobs, ...activeJobIds])]));
            localStorage.setItem('hirefortravel_sourcing_selectedJobs', JSON.stringify(finalSelection));
          } else {
            // Default first-time load: select all active jobs
            setSelectedJobs(activeJobIds);
            localStorage.setItem('hirefortravel_sourcing_selectedJobs', JSON.stringify(activeJobIds));
            localStorage.setItem('hirefortravel_sourcing_seenJobs', JSON.stringify(activeJobIds));
          }
        }

        // Fetch Identified Prospects
        fetchIdentifiedProspects();
      } catch (err) {
        console.error("Failed to load initial sourcing page data:", err);
      } finally {
        setJobsLoading(false);
      }
    }
    loadData();
  }, []);

  async function fetchIdentifiedProspects() {
    try {
      setProspectsLoading(true);
      const res = await fetch(`${API_URL}/api/prospects?stage=IDENTIFIED`, { credentials: 'include' });
      const result = await res.json();
      if (result.success && result.data) {
        setProspects(result.data);
      }
    } catch (err) {
      console.error("Failed to load identified prospects:", err);
    } finally {
      setProspectsLoading(false);
    }
  }

  // 2. Poll sourcing run progress
  useEffect(() => {
    if (!sourcingRun || !sourcingRun.id || sourcingRun.status !== 'running') return;

    let intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/prospects/sourcing/run/${sourcingRun.id}`, { credentials: 'include' });
        const result = await res.json();
        
        if (result.success && result.data) {
          const run = result.data;
          setSourcingRun(run);

          if (run.status === 'completed' || run.status === 'failed') {
            clearInterval(intervalId);
            setSourcingProgress(100);
            setTimeout(() => {
              setSourcingLoading(false);
              fetchIdentifiedProspects(); // refresh candidates
            }, 800);
          }
        }
      } catch (err) {
        console.error("Error polling run progress:", err);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [sourcingRun]);

  const handleJobSelectToggle = (id) => {
    let nextSelection;
    if (selectedJobs.includes(id)) {
      nextSelection = selectedJobs.filter(item => item !== id);
    } else {
      nextSelection = [...selectedJobs, id];
    }
    setSelectedJobs(nextSelection);
    localStorage.setItem('hirefortravel_sourcing_selectedJobs', JSON.stringify(nextSelection));
  };

  const handleSelectAllJobs = () => {
    let nextSelection;
    if (selectedJobs.length === activeJobs.length) {
      nextSelection = [];
    } else {
      nextSelection = activeJobs.map(j => j.id);
    }
    setSelectedJobs(nextSelection);
    localStorage.setItem('hirefortravel_sourcing_selectedJobs', JSON.stringify(nextSelection));
  };

  // 3. Trigger sourcing run
  const handleTriggerSourcing = async () => {
    if (selectedJobs.length === 0) {
      alert("Please select at least one active job position to source for.");
      return;
    }

    try {
      setSourcingLoading(true);
      setSourcingProgress(0);
      setSourcingRun({ status: 'running', total_discovered: 0 });

      // Automatically force local sync in local dev environments to bypass QStash tunnels
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      const res = await fetch(`${API_URL}/api/prospects/sourcing/run?local=${isLocal}`, { credentials: 'include',  method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionIds: selectedJobs })
      });
      const result = await res.json();

      if (result.success && result.data) {
        const run = result.data;
        setSourcingRun(run);
        if (run.status === 'completed' || run.status === 'failed') {
          setSourcingProgress(100);
          setTimeout(() => {
            setSourcingLoading(false);
            fetchIdentifiedProspects(); // refresh candidates
          }, 800);
        }
      } else {
        alert(result.error || 'Failed to trigger AI Sourcing engine.');
        setSourcingLoading(false);
        setSourcingRun(null);
      }
    } catch (err) {
      console.error("Trigger sourcing failed:", err);
      setSourcingLoading(false);
      setSourcingRun(null);
    }
  };

  // 4. Update individual prospect state
  const handleUpdateStage = async (matchId, newStage, name, reasonText) => {
    try {
      const matchUpdates = { stage: newStage };
      if (reasonText) {
        matchUpdates.human_notes = reasonText; // Save matching/archiving remarks in the notes!
      }
      if (newStage === 'ARCHIVED') {
        matchUpdates.active_flag = false;
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
        setProspects(prospects.filter(p => p.id !== matchId));
        setSelectedProspects(selectedProspects.filter(id => id !== matchId));
      }
    } catch (err) {
      console.error(`Failed to move candidate ${name} to ${newStage}:`, err);
    }
  };

  const triggerStageTransition = (matchId, newStage, name) => {
    setTransitionDetails({ matchId, newStage, candidateName: name });
    setActionRemarks('');
  };

  // 5. Bulk Actions
  const handleBulkAction = async (newStage) => {
    if (selectedProspects.length === 0) return;
    
    if (!confirm(`Are you sure you want to bulk mark ${selectedProspects.length} candidates as ${newStage}?`)) return;

    try {
      const promises = selectedProspects.map(matchId => {
        const matchUpdates = { stage: newStage };
        if (newStage === 'ARCHIVED') {
          matchUpdates.active_flag = false;
        }
        return fetch(`${API_URL}/api/prospects/sourcing/${matchId}`, { credentials: 'include',  method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchUpdates,
            changedBy: 'Admin Recruiter',
            reason: null
          })
        });
      });
      await Promise.all(promises);
      
      // Update UI state
      setProspects(prospects.filter(p => !selectedProspects.includes(p.id)));
      setSelectedProspects([]);
      alert(`Successfully moved ${selectedProspects.length} prospects to ${newStage}!`);
    } catch (err) {
      console.error('Bulk action failed:', err);
    }
  };

  const handleBulkRefresh = () => {
    if (selectedProspects.length === 0) return;
    setBulkRefreshRemarks('');
    setShowBulkRefreshModal(true);
  };

  const submitBulkRefresh = async () => {
    if (!bulkRefreshRemarks.trim()) {
      alert("Recruiter remarks are mandatory to refresh profile details.");
      return;
    }

    try {
      setShowBulkRefreshModal(false);
      setProspectsLoading(true);
      const res = await fetch(`${API_URL}/api/prospects/sourcing/bulk-refresh`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchIds: selectedProspects,
          reason: bulkRefreshRemarks.trim(),
          changedBy: 'Admin Recruiter'
        })
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "Batch refresh API failed.");
      }
      const countRefreshed = selectedProspects.length;
      setSelectedProspects([]);
      setRefreshSuccessCount(countRefreshed);
      await fetchIdentifiedProspects();
    } catch (err) {
      alert("Bulk refresh failed: " + err.message);
    } finally {
      setProspectsLoading(false);
    }
  };

  // Filter & Sort math
  let filteredProspects = prospects.filter(p => {
    const matchesScore = (p.manual_score || p.ai_score || 0) >= minScore;
    const matchesJob = filterJobId === 'all' || p.job_id === filterJobId || p.job?.id === filterJobId;
    return matchesScore && matchesJob;
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
    <div className="space-y-6">
      
      {/* Active Jobs panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">1. Select Active Job Targets</h2>
            <p className="text-xs text-gray-400 mt-1">Sourcing processes are limited to 50 discoveries maximum distributed equally across selected jobs.</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedJobs.length > 0 && selectedJobs.length < activeJobs.length && (
              <button 
                type="button"
                onClick={() => {
                  setSelectedJobs([]);
                  localStorage.setItem('hirefortravel_sourcing_selectedJobs', JSON.stringify([]));
                }}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Deselect All
              </button>
            )}
            <button 
              type="button"
              onClick={handleSelectAllJobs}
              className="text-xs font-bold text-green-700 hover:text-green-900 transition-colors"
            >
              {selectedJobs.length === activeJobs.length ? 'Deselect All' : 'Select All Positions'}
            </button>
          </div>
        </div>

        {jobsLoading ? (
          <div className="py-6 flex justify-center text-gray-400 text-sm italic">Loading positions list...</div>
        ) : activeJobs.length === 0 ? (
          <div className="py-6 text-center text-gray-500 text-sm italic">
            No active jobs found. Create or activate a job inside the <span className="font-semibold text-green-800">Jobs Manager</span> first.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[220px] overflow-y-auto pr-2">
            {activeJobs.map(job => {
              const isSelected = selectedJobs.includes(job.id);
              // Check if private optimization fields are complete (all three fields must be filled)
              const hasConfig = job.real_company_name && (job.competitors && job.competitors.length > 0) && (job.alternative_titles && job.alternative_titles.length > 0);
              
              return (
                <div 
                  key={job.id}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? 'border-green-600 bg-green-50/20' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0 py-0.5">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => handleJobSelectToggle(job.id)}
                      className="mt-0.5 rounded text-green-700 focus:ring-green-700 border-gray-300 h-4 w-4 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{job.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{job.company_name} &bull; {job.location}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {hasConfig ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-800 border border-green-200/50">
                            AI Sourcing Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50">
                            Missing AI Sourcing Fields
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setInspectionJob(job);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-green-800 transition-all flex-shrink-0 ml-2"
                    title="View details & edit sourcing settings"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sourcing Run status and trigger */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex-1 space-y-2">
          <h2 className="text-base font-bold text-gray-800">2. Launch Sourcing Engine</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Upon triggering, the AI Sourcing Engine will start discovering passive candidates matching the selected job positions. The process can take several minutes as it gathers data from various sources and analyzes candidate fit using AI. You can monitor the progress below and review discovered candidates in real-time as they are identified.
          </p>

          {/* Progress bar */}
          {(sourcingLoading || (sourcingRun && sourcingRun.status === 'running')) && (
            <div className="space-y-3 pt-4 border-t border-gray-100 mt-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs font-bold text-gray-700 italic">
                    {laymanMessage}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4 text-xs font-semibold">
                  {sourcingTimeLeft && (
                    <span className="text-gray-400">
                      Est. time remaining: <span className="text-green-700 font-bold">
                        {typeof sourcingTimeLeft === 'number' ? (
                          sourcingTimeLeft >= 60 
                            ? `${Math.floor(sourcingTimeLeft / 60)}m${sourcingTimeLeft % 60 > 0 ? `${sourcingTimeLeft % 60}s` : ''}` 
                            : `${sourcingTimeLeft}s`
                        ) : sourcingTimeLeft}
                      </span>
                    </span>
                  )}
                  <span className="text-green-800 bg-green-50 px-2 py-0.5 rounded-full font-black">
                    {Math.round(sourcingProgress)}%
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner border border-gray-200/50">
                <div 
                  style={{ width: `${sourcingProgress}%` }}
                  className="bg-gradient-to-r from-emerald-600 to-green-500 h-full rounded-full transition-all duration-300 shadow-md relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 animate-[pulse_1.5s_infinite] mix-blend-overlay"></div>
                </div>
              </div>

              {sourcingRun && sourcingRun.total_discovered > 0 && (
                <p className="text-[11px] text-gray-400 font-medium">
                  Identified <span className="font-bold text-green-700">{sourcingRun.total_discovered}</span> high-potential profiles so far...
                </p>
              )}
            </div>
          )}

          {sourcingRun && sourcingRun.status === 'completed' && (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 mt-2 flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-bold text-emerald-950">Sourcing Complete!</p>
                <p className="text-xs text-emerald-700 mt-0.5">{sourcingRun.total_discovered} Candidates Found and successfully analyzed by AI.</p>
              </div>
            </div>
          )}

          {sourcingRun && sourcingRun.status === 'failed' && (
            <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 mt-2 flex items-center gap-3">
              <svg className="w-5 h-5 text-red-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-bold text-red-950">Sourcing Failed</p>
                <p className="text-xs text-red-700 mt-0.5">The AI sourcing pipeline encountered an issue. Check server logs for details.</p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleTriggerSourcing}
          disabled={sourcingLoading || selectedJobs.length === 0}
          className={`px-6 py-3.5 rounded-xl shadow font-bold text-sm text-white flex items-center gap-2 transition-colors md:self-end w-full md:w-auto justify-center ${
            sourcingLoading || selectedJobs.length === 0 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-700 hover:bg-green-800 shadow-green-700/20 shadow-md'
          }`}
        >
          {sourcingLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Running AI Sourcing Pipeline...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Find Candidates
            </>
          )}
        </button>
      </div>

      {/* Discovered candidates block */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Table Filters & Toolbar */}
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-50/50">
          <div>
            <h2 className="text-base font-bold text-gray-800">Discovered Prospects</h2>
            <p className="text-xs text-gray-400 mt-0.5">Below are passive candidates matching your job filters. Once reviewed and matched, they are moved to the CRM for outreach.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Min Score filter */}
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="text-xs border-gray-200 rounded-md focus:ring-green-700 focus:border-green-700 bg-white pr-8 py-1.5 font-semibold text-gray-600"
            >
              <option value="0">All Match Scores</option>
              <option value="90">&ge; 90% (Star Matches)</option>
              <option value="80">&ge; 80% (Great Matches)</option>
              <option value="70">&ge; 70% (Good Matches)</option>
            </select>

            {/* Position filter */}
            <select
              value={filterJobId}
              onChange={(e) => setFilterJobId(e.target.value)}
              className="text-xs border-gray-200 rounded-md focus:ring-green-700 focus:border-green-700 bg-white pr-8 py-1.5 font-semibold text-gray-600 max-w-[150px]"
            >
              <option value="all">All Matched Jobs</option>
              {activeJobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>

            {/* Mobile Only Sort Dropdown */}
            <select
              value={`${sortConfig.key}:${sortConfig.direction}`}
              onChange={(e) => {
                const [key, direction] = e.target.value.split(':');
                const newConfig = { key, direction };
                setSortConfig(newConfig);
                localStorage.setItem('hirefortravel_sourcing_sortConfig', JSON.stringify(newConfig));
              }}
              className="text-xs border-gray-200 rounded-md focus:ring-green-700 focus:border-green-700 bg-white pr-8 py-1.5 font-semibold text-gray-600 md:hidden"
            >
              <option value="identified:desc">Sort: Newest Sourced</option>
              <option value="identified:asc">Sort: Oldest Sourced</option>
              <option value="score:desc">Sort: Score (High-Low)</option>
              <option value="score:asc">Sort: Score (Low-High)</option>
              <option value="name:asc">Sort: Name (A-Z)</option>
              <option value="name:desc">Sort: Name (Z-A)</option>
            </select>

            {/* Top dropdown sort removed - replaced by column header clicking */}
          </div>
        </div>

        {/* Bulk Action Panel (Active when selectedProspects is populated) */}
        {selectedProspects.length > 0 && (
          <div className="bg-green-50 px-6 py-3 border-b border-green-200 flex items-center justify-between text-green-800 text-xs font-bold animate-slide-down">
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
              {selectedProspects.length} candidates selected
            </span>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setSelectedProspects([])}
                className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded transition-colors"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={handleBulkRefresh}
                className="px-3 py-1 bg-white border border-green-700 hover:bg-green-50 text-green-700 rounded transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                Bulk Refresh
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction('MATCHED')}
                className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 transition-colors shadow-sm"
              >
                Bulk Match
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction('ARCHIVED')}
                className="px-3 py-1 border border-green-700 hover:bg-green-100 text-green-700 rounded transition-colors"
              >
                Bulk Archive
              </button>
            </div>
          </div>
        )}

        {/* Candidate table */}
        {prospectsLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-green-800 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-xs italic">Syncing candidate database...</p>
          </div>
        ) : filteredProspects.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm italic">
            No identified candidates found. Run the Sourcing Engine above to discover new candidates!
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100 tracking-wider">
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedProspects.length === filteredProspects.length}
                        onChange={() => {
                          if (selectedProspects.length === filteredProspects.length) {
                            setSelectedProspects([]);
                          } else {
                            setSelectedProspects(filteredProspects.map(p => p.id));
                          }
                        }}
                        className="rounded text-green-700 focus:ring-green-700 border-gray-300 h-4 w-4"
                      />
                    </th>
                    <th 
                      className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" 
                      onClick={() => handleSort('name')}
                    >
                      Candidate / Matched Job {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                    </th>
                    <th className="p-4">Current Background</th>
                    <th 
                      className="p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" 
                      onClick={() => handleSort('score')}
                    >
                      Match Score {sortConfig.key === 'score' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                    </th>
                    <th 
                      className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" 
                      onClick={() => handleSort('identified')}
                    >
                      Date Identified {sortConfig.key === 'identified' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                    </th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4 text-right">Outreach Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProspects.map(matchItem => {
                    const prospect = matchItem.prospect || {};
                    const job = matchItem.job || {};
                    const finalScore = matchItem.manual_score || matchItem.ai_score || 0;
                    
                    return (
                      <tr key={matchItem.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-4 text-center">
                          <input 
                             type="checkbox" 
                             checked={selectedProspects.includes(matchItem.id)}
                             onChange={() => {
                               if (selectedProspects.includes(matchItem.id)) {
                                 setSelectedProspects(selectedProspects.filter(id => id !== matchItem.id));
                               } else {
                                 setSelectedProspects([...selectedProspects, matchItem.id]);
                               }
                             }}
                             className="rounded text-green-700 focus:ring-green-700 border-gray-300 h-4 w-4"
                          />
                        </td>
                        <td className="p-4 min-w-[200px]">
                          <div 
                             onClick={() => setActiveMatchId(matchItem.id)}
                             className="font-bold text-gray-800 cursor-pointer hover:text-green-800 transition-colors"
                          >
                            {prospect.name}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">Matched for: <span className="font-semibold text-gray-500">{job.title || 'Unknown Position'}</span></div>
                        </td>
                        <td className="p-4 min-w-[220px]">
                          <div className="text-xs text-gray-700 font-medium truncate max-w-[250px]">{prospect.latest_title || 'No Title'}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[250px]">{prospect.latest_company || 'No Company'} &bull; {prospect.city || 'No Location'}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black shadow-sm ${
                             finalScore >= 90 ? 'bg-green-100 text-green-800' :
                             finalScore >= 80 ? 'bg-blue-100 text-blue-800' :
                             finalScore >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {finalScore}%
                          </span>
                        </td>
                        <td className="p-4">
                          {renderTimeIdentified(matchItem.created_at)}
                        </td>
                        <td className="p-4">
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
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => triggerStageTransition(matchItem.id, 'MATCHED', prospect.name)}
                              className="px-2.5 py-1 bg-green-700 text-white rounded text-xs font-bold hover:bg-green-800 shadow-sm transition-colors"
                            >
                              Match
                            </button>
                            <button
                              onClick={() => triggerStageTransition(matchItem.id, 'ARCHIVED', prospect.name)}
                              className="px-2.5 py-1 border border-gray-200 hover:bg-gray-100 text-gray-500 rounded text-xs transition-colors"
                            >
                              Archive
                            </button>
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
              {filteredProspects.map(matchItem => {
                const prospect = matchItem.prospect || {};
                const job = matchItem.job || {};
                const finalScore = matchItem.manual_score || matchItem.ai_score || 0;
                const isSelected = selectedProspects.includes(matchItem.id);

                return (
                  <div key={matchItem.id} className={`p-4 space-y-3.5 transition-colors ${isSelected ? 'bg-green-50/20' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      {/* Checkbox and Name */}
                      <div className="flex items-start gap-3 min-w-0">
                        <input 
                           type="checkbox" 
                           checked={isSelected}
                           onChange={() => {
                             if (selectedProspects.includes(matchItem.id)) {
                               setSelectedProspects(selectedProspects.filter(id => id !== matchItem.id));
                             } else {
                               setSelectedProspects([...selectedProspects, matchItem.id]);
                             }
                           }}
                           className="mt-1 rounded text-green-700 focus:ring-green-700 border-gray-300 h-4.5 w-4.5 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div 
                             onClick={() => setActiveMatchId(matchItem.id)}
                             className="font-bold text-gray-900 cursor-pointer hover:text-green-800 text-sm leading-tight"
                          >
                            {prospect.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            Matched: <span className="font-semibold text-gray-700">{job.title || 'Unknown Position'}</span>
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
                      {prospect.total_experience && (
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Exp: {prospect.total_experience}</div>
                      )}
                    </div>

                    {/* Meta and Contact Row */}
                    <div className="flex items-center justify-between gap-3 text-xs text-gray-505">
                      <div className="text-xs text-gray-400 font-medium">
                        Identified: {new Date(matchItem.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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

                    {/* Action buttons */}
                    <div className="flex gap-2.5 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => triggerStageTransition(matchItem.id, 'MATCHED', prospect.name)}
                        className="flex-1 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors text-center active:scale-[0.98]"
                      >
                        Match
                      </button>
                      <button
                        onClick={() => triggerStageTransition(matchItem.id, 'ARCHIVED', prospect.name)}
                        className="flex-1 py-2 border border-gray-250 hover:bg-gray-50 text-gray-500 rounded-lg text-xs font-semibold transition-colors text-center active:scale-[0.98]"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sourcing Stage Action Remarks Modal */}
      {transitionDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTransitionDetails(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="bg-green-800 px-4 py-3 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {transitionDetails.newStage === 'MATCHED' ? 'Add Prospect to CRM Pipeline' : 'Archive Sourced Profile'}
              </h3>
              <button onClick={() => setTransitionDetails(null)} className="hover:text-green-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <div>
                <p className="text-gray-500 font-semibold mb-1">Candidate:</p>
                <p className="font-bold text-gray-800 text-sm">{transitionDetails.candidateName}</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-lg">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Sourcing Action</p>
                <p className="font-bold text-green-700 mt-0.5">
                  {transitionDetails.newStage === 'MATCHED' ? 'Promote to CRM (Connection Request Stage)' : 'Archive Sourced Lead'}
                </p>
              </div>
              <div>
                <label className="block text-gray-500 font-bold mb-1">Recruiter Remarks / Notes (Optional)</label>
                <textarea 
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder={
                    transitionDetails.newStage === 'MATCHED' 
                      ? "Add initial matching remarks, evaluation call notes, or recruiter overrides..." 
                      : "Add details or reason for archiving this lead..."
                  }
                  className="w-full border-gray-300 rounded focus:ring-green-700 text-xs p-2"
                  rows="3"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setTransitionDetails(null)} className="px-3 py-1.5 border border-gray-300 rounded font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button 
                  onClick={async () => {
                    await handleUpdateStage(transitionDetails.matchId, transitionDetails.newStage, transitionDetails.candidateName, actionRemarks);
                    setTransitionDetails(null);
                  }}
                  className="px-4 py-1.5 bg-green-700 text-white rounded font-bold hover:bg-green-800 transition-colors shadow-sm"
                >
                  {transitionDetails.newStage === 'MATCHED' ? 'Match' : 'Archive Lead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Refresh Justification Modal */}
      {showBulkRefreshModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowBulkRefreshModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden animate-scale-up text-left" onClick={(e) => e.stopPropagation()}>
            <div className="bg-green-800 px-4 py-3 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">
                Bulk Refresh Prospects
              </h3>
              <button onClick={() => setShowBulkRefreshModal(false)} className="hover:text-green-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <div>
                <p className="text-gray-500 font-semibold mb-1">Selected Prospects:</p>
                <p className="font-bold text-gray-800 text-sm">{selectedProspects.length} candidates</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-lg">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Bulk Action</p>
                <p className="font-bold text-green-700 mt-0.5">
                  Refresh Candidate Profile and AI Assesment
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-800">
                <div className="flex items-center gap-1.5 font-bold text-amber-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-600"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>Exercise Caution</span>
                </div>
                <p className="mt-1 leading-normal font-medium text-[10px] text-amber-800">
                  This operation initiates live talent network searches and deep-level AI evaluations for {selectedProspects.length} candidates. Doing so incurs heavy costs. Please verify details before executing.
                </p>
              </div>
              <div>
                <label className="block text-gray-500 font-bold mb-1">Recruiter Remarks / Reason (Mandatory)</label>
                <textarea 
                  value={bulkRefreshRemarks}
                  onChange={(e) => setBulkRefreshRemarks(e.target.value)}
                  placeholder="Provide a mandatory reason/justification for this bulk refresh..."
                  className="w-full border-gray-300 rounded focus:ring-green-700 text-xs p-2 bg-white"
                  rows="3"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowBulkRefreshModal(false)} className="px-3 py-1.5 border border-gray-300 rounded font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button 
                  type="button"
                  onClick={submitBulkRefresh}
                  disabled={!bulkRefreshRemarks.trim()}
                  className={`px-4 py-1.5 text-white rounded font-bold transition-colors shadow-sm ${!bulkRefreshRemarks.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-700 hover:bg-green-800'}`}
                >
                  Refresh Profiles
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Success Modal */}
      {refreshSuccessCount !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRefreshSuccessCount(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden animate-scale-up text-left p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-full border border-emerald-100 flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-950">Refresh Triggered!</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {refreshSuccessCount === 1 
                    ? "Candidate profile is being refreshed by AI in the background. The updated details and AI score will reflect shortly."
                    : `${refreshSuccessCount} Candidate profiles are being refreshed by AI in the background. Their updated details and AI scores will reflect shortly.`
                  }
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button 
                type="button" 
                onClick={() => setRefreshSuccessCount(null)} 
                className="px-4 py-1.5 bg-green-700 text-white rounded font-bold hover:bg-green-800 transition-colors shadow-sm text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prospect Detail Drawer Component */}
      <ProspectDrawer 
        matchId={activeMatchId}
        onClose={() => setActiveMatchId(null)}
        onSaveSuccess={() => {
          fetchIdentifiedProspects(); // reload identified prospects when edits occur
        }}
      />

      {/* Job Details & Sourcing Settings Modal */}
      {inspectionJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setInspectionJob(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 animate-scale-up" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-green-800 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base leading-tight">Job Sourcing Settings & JD</h3>
                <p className="text-xs text-green-200 mt-1 font-semibold">{inspectionJob.title} &bull; {inspectionJob.company_name}</p>
              </div>
              <button onClick={() => setInspectionJob(null)} className="hover:text-green-200 p-1.5 hover:bg-green-700/50 rounded-full transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              
              {/* Sourcing Optimization Panel (Editable) */}
              <div className="bg-green-50/50 p-4.5 rounded-xl border border-green-200/60 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-green-800 font-bold text-xs uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-700">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                  AI Sourcing Optimization Settings (Internal Use Only)
                </div>
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                  Fine-tune these internal configurations to get more accurate sourcing results.
                </p>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Actual Hiring Company Name</label>
                    <input 
                      type="text" 
                      value={inspectionFormData.real_company_name}
                      onChange={(e) => setInspectionFormData({...inspectionFormData, real_company_name: e.target.value})}
                      className="w-full px-3.5 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 bg-white font-medium text-gray-800 outline-none transition-all text-xs" 
                      placeholder="e.g. Travel Bullz (leave empty to omit)" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Target Competitor Companies</label>
                      <textarea 
                        value={inspectionFormData.competitors}
                        onChange={(e) => setInspectionFormData({...inspectionFormData, competitors: e.target.value})}
                        className="w-full px-3.5 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 bg-white font-medium text-gray-800 outline-none transition-all text-xs h-[52px]" 
                        placeholder="e.g. MakeMyTrip, Yatra, Thomas Cook (separated by commas)" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Alternative Job Titles</label>
                      <textarea 
                        value={inspectionFormData.alternative_titles}
                        onChange={(e) => setInspectionFormData({...inspectionFormData, alternative_titles: e.target.value})}
                        className="w-full px-3.5 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 bg-white font-medium text-gray-800 outline-none transition-all text-xs h-[52px]" 
                        placeholder="e.g. Visa Executive, Visa Officer, Visa Specialist (separated by commas)" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Read-Only Job Description (JD) View */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="font-bold text-gray-850 uppercase tracking-wider text-xs border-b border-gray-150 pb-2">Full Job Description (View Only)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Job Title</label>
                    <div className="w-full px-3.5 py-2 rounded-lg border border-gray-150 bg-gray-50/50 font-semibold text-gray-700 text-xs">
                      {inspectionJob.title}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Company Type</label>
                    <div className="w-full px-3.5 py-2 rounded-lg border border-gray-150 bg-gray-50/50 font-semibold text-gray-700 text-xs">
                      {inspectionJob.company_name}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Location</label>
                    <div className="w-full px-3.5 py-2 rounded-lg border border-gray-150 bg-gray-50/50 font-semibold text-gray-700 text-xs truncate" title={inspectionJob.location}>
                      {inspectionJob.location}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Experience</label>
                    <div className="w-full px-3.5 py-2 rounded-lg border border-gray-150 bg-gray-50/50 font-semibold text-gray-700 text-xs truncate" title={inspectionJob.experience}>
                      {inspectionJob.experience}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Salary Range</label>
                    <div className="w-full px-3.5 py-2 rounded-lg border border-gray-150 bg-gray-50/50 font-semibold text-gray-700 text-xs truncate" title={inspectionJob.salary || 'N/A'}>
                      {inspectionJob.salary || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Openings</label>
                    <div className="w-full px-3.5 py-2 rounded-lg border border-gray-150 bg-gray-50/50 font-semibold text-gray-700 text-xs">
                      {inspectionJob.number_of_openings !== undefined && inspectionJob.number_of_openings !== null ? inspectionJob.number_of_openings : 1}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">About the Role</label>
                  <div className="w-full px-3.5 py-2.5 rounded-lg border border-gray-150 bg-gray-50/50 text-gray-600 leading-relaxed font-medium text-xs whitespace-pre-wrap">
                    {inspectionJob.about_role || 'No details provided.'}
                  </div>
                </div>

                {inspectionJob.notes && inspectionJob.notes.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Special Notes</label>
                    <div className="w-full px-4 py-3 rounded-lg border border-gray-150 bg-gray-50/50 text-gray-600 text-xs">
                      <ul className="list-disc pl-4 space-y-1.5 font-medium leading-relaxed">
                        {inspectionJob.notes.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {inspectionJob.responsibilities && inspectionJob.responsibilities.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Key Responsibilities</label>
                    <div className="w-full px-4 py-3 rounded-lg border border-gray-150 bg-gray-50/50 text-gray-600 text-xs">
                      <ul className="list-disc pl-4 space-y-1.5 font-medium leading-relaxed">
                        {inspectionJob.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {inspectionJob.requirements && inspectionJob.requirements.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Key Requirements</label>
                    <div className="w-full px-4 py-3 rounded-lg border border-gray-150 bg-gray-50/50 text-gray-600 text-xs">
                      <ul className="list-disc pl-4 space-y-1.5 font-medium leading-relaxed">
                        {inspectionJob.requirements.map((req, i) => <li key={i}>{req}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {inspectionJob.benefits && inspectionJob.benefits.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Benefits</label>
                    <div className="w-full px-4 py-3 rounded-lg border border-gray-150 bg-gray-50/50 text-gray-600 text-xs">
                      <ul className="list-disc pl-4 space-y-1.5 font-medium leading-relaxed">
                        {inspectionJob.benefits.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50 text-xs">
              <button onClick={() => setInspectionJob(null)} className="px-4 py-2 border border-gray-300 rounded font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleSaveInspection}
                disabled={isSavingInspection}
                className="px-5 py-2 bg-green-700 text-white rounded font-bold hover:bg-green-800 transition-colors shadow-sm inline-flex items-center gap-1.5"
              >
                {isSavingInspection ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save & Optimize AI Sourcing'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
