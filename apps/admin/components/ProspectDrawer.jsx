"use client";
import { useState, useEffect } from 'react';
import ActivityTimeline from './ActivityTimeline';

export default function ProspectDrawer({ matchId, onClose, onSaveSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeWeights, setActiveWeights] = useState({}); // Dynamic active weights state

  // Form states
  const [profile, setProfile] = useState({});
  const [match, setMatch] = useState({});
  const [outreachDraft, setOutreachDraft] = useState('');
  const [users, setUsers] = useState([]);
  const [recruiterRemarks, setRecruiterRemarks] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  // Load admin users list for recruiter owner assignment dropdown
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`${API_URL}/api/admin/users`, { credentials: 'include' });
        const result = await res.json();
        if (result.success && result.data) {
          const sortedUsers = result.data
            .filter(u => u.is_active)
            .sort((a, b) => a.username.localeCompare(b.username));
          setUsers(sortedUsers);
        }
      } catch (err) {
        console.error("Failed to load admin users inside ProspectDrawer:", err);
      }
    }
    fetchUsers();
  }, []);

  // Load dynamic weighting configuration factors
  useEffect(() => {
    async function loadActiveWeights() {
      try {
        const res = await fetch(`${API_URL}/api/prospects/sourcing/prompts`, { credentials: 'include' });
        const result = await res.json();
        if (result.success && result.data) {
          const scoringPrompt = result.data.find(p => p.prompt_type === 'candidate_scoring');
          if (scoringPrompt && scoringPrompt.instructions) {
            let weights = { "Location": 30, "Title": 30, "Experience": 20, "Skills": 20 };
            scoringPrompt.instructions.forEach(inst => {
              if (inst.startsWith('SCORING_WEIGHTS:')) {
                try {
                  weights = JSON.parse(inst.substring('SCORING_WEIGHTS:'.length));
                } catch (e) {
                  console.error("Failed to parse dynamic weights JSON:", e);
                }
              }
            });
            setActiveWeights(weights);
          }
        }
      } catch (err) {
        console.error("Failed to load active scoring factors:", err);
      }
    }
    loadActiveWeights();
  }, []);

  useEffect(() => {
    if (!matchId) return;
    setRecruiterRemarks(''); // Reset remarks textarea to blank every time a new drawer is opened

    async function fetchProspectDetails() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/prospects/sourcing/${matchId}`, { credentials: 'include' });
        const result = await res.json();
        if (result.success && result.data) {
          setData(result.data);
          setProfile(result.data.prospect || {});
          setMatch(result.data);
          
          // Pre-generate outreach draft
          generateOutreachMessage(result.data.prospect || {}, result.data.job || {});
        }
      } catch (err) {
        console.error("Failed to load prospect details:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProspectDetails();
  }, [matchId]);

  const generateOutreachMessage = (prospect, job) => {
    const firstName = prospect.name ? prospect.name.split(' ')[0] : 'there';
    const field = prospect.functional_field || 'your field';
    const company = prospect.latest_company || 'your company';
    const companyType = job.company_name || 'a top travel operator';
    const city = job.location || 'your city';

    const message = `Hey ${firstName}, came across your background in ${field} at ${company}. We're currently hiring for a similar profile for a ${companyType} in ${city}. Should I share more details?`;
    setOutreachDraft(message);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      const matchUpdates = {
        stage: match.stage,
        manual_score: match.manual_score ? Number(match.manual_score) : null,
        owner: match.owner,
        tags: Array.isArray(match.tags) ? match.tags : typeof match.tags === 'string' ? match.tags.split(',').map(t => t.trim()) : []
      };

      if (recruiterRemarks.trim()) {
        matchUpdates.human_notes = recruiterRemarks.trim();
      }

      const payload = {
        profileUpdates: profile,
        matchUpdates,
        changedBy: 'Admin Recruiter', // fallback to session
        reason: recruiterRemarks.trim() || null
      };

      const res = await fetch(`${API_URL}/api/prospects/sourcing/${matchId}`, { credentials: 'include',  method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), credentials: 'include' });
      const result = await res.json();
      
      if (result.success) {
        setRecruiterRemarks('');
        onSaveSuccess && onSaveSuccess(result.data);
        onClose();
      } else {
        alert(result.error || 'Failed to save changes');
      }
    } catch (err) {
      console.error('Error saving prospect updates:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!matchId) return null;

  // Dynamically map factor scores to align with active settings weights and calculate exact points!
  const defaultWeights = { "Location": 30, "Title": 30, "Experience": 20, "Skills": 20 };
  const weightsToUse = Object.keys(activeWeights).length > 0 ? activeWeights : defaultWeights;
  const factorsToUse = Object.keys(weightsToUse);
  const dbScores = match.lifecycle_timestamps?.ai_score_breakdown || [];
  
  const dbScoresMap = {};
  dbScores.forEach(s => {
    if (s && s.factorName) {
      dbScoresMap[s.factorName.toLowerCase()] = s.score;
    }
  });

  const finalAIScore = match.ai_score || 0;

  // Cross-job calculations for UI warning alert and history timeline
  const otherMatches = (data?.allMatches || []).filter(m => m.id !== matchId);
  const activeMatchWithOtherOwner = otherMatches.find(m => 
    ['OUTREACH', 'CONTACTED', 'FOLLOWUP', 'RESPONDED', 'INTERESTED', 'APPLIED', 'MATCHED'].includes(m.stage) &&
    m.owner && m.owner !== match.owner
  );

  // 1. Calculate raw and rounded points for each factor based on its weight
  const factorScores = factorsToUse.map(f => {
    const lowercaseName = f.toLowerCase();
    const scoreVal = typeof dbScoresMap[lowercaseName] === 'number' 
      ? dbScoresMap[lowercaseName] 
      : (match.ai_score || 70);
    const weight = weightsToUse[f] || 0;
    const rawPoints = (scoreVal * weight) / 100;
    
    return {
      factorName: f,
      score: scoreVal,
      weight: weight,
      rawPoints: rawPoints,
      roundedPoints: Math.round(rawPoints)
    };
  });

  // 2. Adjust dynamic rounding drift so that all factor points sum EXACTLY to the overall finalAIScore
  const sumOfRounded = factorScores.reduce((sum, item) => sum + item.roundedPoints, 0);
  const diff = finalAIScore - sumOfRounded;
  
  if (diff !== 0 && factorScores.length > 0) {
    // Find the factor with the highest weight to absorb the minor rounding adjustment
    let maxItemIdx = 0;
    let maxWeight = -1;
    factorScores.forEach((item, idx) => {
      if (item.weight > maxWeight) {
        maxWeight = item.weight;
        maxItemIdx = idx;
      }
    });
    factorScores[maxItemIdx].roundedPoints += diff;
  }

  // 3. Dynamic audit justification logic
  const hasProfileChanged = data?.prospect && (
    (profile.name || '') !== (data.prospect.name || '') ||
    (profile.email || '') !== (data.prospect.email || '') ||
    (profile.phone || '') !== (data.prospect.phone || '') ||
    (profile.city || '') !== (data.prospect.city || '') ||
    (profile.linkedin_url || '') !== (data.prospect.linkedin_url || '') ||
    (profile.latest_title || '') !== (data.prospect.latest_title || '') ||
    (profile.latest_company || '') !== (data.prospect.latest_company || '') ||
    (profile.total_experience || '') !== (data.prospect.total_experience || '') ||
    (profile.functional_field || '') !== (data.prospect.functional_field || '')
  );

  const hasMatchFieldsChanged = data && (
    (match.stage || 'IDENTIFIED') !== (data.stage || 'IDENTIFIED') ||
    (match.manual_score || '') !== (data.manual_score || '')
  );

  const isJustificationRequired = hasProfileChanged || hasMatchFieldsChanged;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Overlay backdrop */}
        <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={onClose} />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-2 sm:pl-10 md:pl-16">
          <div className="pointer-events-auto w-screen max-w-2xl">
            <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl">
              
              {/* Header */}
              <div className="bg-green-800 px-6 py-6 sm:px-8 flex justify-between items-center text-white">
                <div>
                  <h2 className="text-xl font-bold" id="slide-over-title">
                    {loading ? 'Fetching Details...' : profile.name}
                  </h2>
                  <p className="text-sm text-green-200 mt-1">
                    {!loading && `Matched Position: ${data?.job?.title || 'Unknown'}`}
                  </p>
                </div>
                <button onClick={onClose} className="text-green-100 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-10 h-10 border-4 border-green-800 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-400 text-sm italic">Loading candidate profile & timeline history...</p>
                </div>
              ) : (
                <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between">
                  <div className="px-6 py-6 sm:px-8 space-y-8">

                    {activeMatchWithOtherOwner && (
                      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Recruiter Collaboration Warning</h3>
                            <div className="mt-1 text-xs text-amber-700 font-semibold leading-relaxed">
                              This candidate is currently active on another position and is being managed by <span className="font-extrabold text-amber-900">{activeMatchWithOtherOwner.owner}</span> for the <span className="font-extrabold text-amber-900">"{activeMatchWithOtherOwner.job?.title}"</span> role. Please coordinate internally before initiating any candidate contact.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* PROFILE DETAILS (MUTABLE OVERRIDES) */}
                    <div>
                      <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-700"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Profile Overrides
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">Full Name</label>
                          <input 
                            type="text" 
                            value={profile.name || ''} 
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">Email Address</label>
                          <input 
                            type="email" 
                            value={profile.email || ''} 
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">Phone Number</label>
                          <input 
                            type="text" 
                            value={profile.phone || ''} 
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">City / Location</label>
                          <input 
                            type="text" 
                            value={profile.city || ''} 
                            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">Latest Job Title</label>
                          <input 
                            type="text" 
                            value={profile.latest_title || ''} 
                            onChange={(e) => setProfile({ ...profile, latest_title: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">Latest Company</label>
                          <input 
                            type="text" 
                            value={profile.latest_company || ''} 
                            onChange={(e) => setProfile({ ...profile, latest_company: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">Experience (Yrs / Text)</label>
                          <input 
                            type="text" 
                            value={profile.total_experience || ''} 
                            onChange={(e) => setProfile({ ...profile, total_experience: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">Inferred Field</label>
                          <input 
                            type="text" 
                            value={profile.functional_field || ''} 
                            onChange={(e) => setProfile({ ...profile, functional_field: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase">LinkedIn Profile URL</label>
                        <input 
                          type="url" 
                          value={profile.linkedin_url || ''} 
                          onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                          className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                        />
                      </div>
                    </div>

                    {/* CROSS-JOB APPLICATION TIMELINE */}
                    <div>
                      <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-700"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        Job Match & Sourcing History
                      </h3>
                      
                      <div className="space-y-3">
                        {/* Current matched job */}
                        <div className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50/10 shadow-2xs">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-xs text-gray-800">{data?.job?.title || 'Unknown Position'}</span>
                            <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
                              Owner: {match.owner || 'Unassigned'} &bull; Current Session Match
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-green-100 text-green-800 uppercase tracking-wider">
                            {match.stage || 'IDENTIFIED'}
                          </span>
                        </div>

                        {/* Other matched jobs */}
                        {otherMatches.length === 0 ? (
                          <div className="text-center py-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                            <span className="text-xs text-gray-400 font-medium italic">No active or historical matches for other jobs.</span>
                          </div>
                        ) : (
                          otherMatches.map((m, idx) => {
                            const isContactActive = ['OUTREACH', 'CONTACTED', 'FOLLOWUP', 'RESPONDED', 'INTERESTED', 'APPLIED', 'MATCHED'].includes(m.stage);
                            const badgeColor = isContactActive 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200/50' 
                              : 'bg-gray-100 text-gray-500 border border-gray-200';
                            
                            return (
                              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white shadow-2xs">
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs text-gray-700">{m.job?.title || 'Unknown Position'}</span>
                                  <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                    Owner: {m.owner || 'Unassigned'} &bull; Sourced: {new Date(m.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor} uppercase tracking-wider`}>
                                  {m.stage}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* MATCH PARAMETERS & FIT */}
                    <div>
                      <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-700"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Fit & Match Overrides
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">Pipeline Stage</label>
                          <select
                            value={match.stage || 'IDENTIFIED'}
                            onChange={(e) => setMatch({ ...match, stage: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                          >
                            <option value="IDENTIFIED">IDENTIFIED</option>
                            <option value="MATCHED">MATCHED</option>
                            <option value="CONTACTED">CONTACTED</option>
                            <option value="RESPONDED">RESPONDED</option>
                            <option value="FOLLOWUP">FOLLOWUP</option>
                            <option value="INTERESTED">INTERESTED</option>
                            <option value="NOT INTERESTED">NOT INTERESTED</option>
                            <option value="NO RESPONSE">NO RESPONSE</option>
                            <option value="APPLIED">APPLIED</option>
                            <option value="REJECTED">REJECTED</option>
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">
                            Manual Match Score ({match.manual_score ? 'Overridden' : 'AI Default: ' + match.ai_score + '%'})
                          </label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            placeholder={match.ai_score || 'Score'} 
                            value={match.manual_score || ''} 
                            onChange={(e) => setMatch({ ...match, manual_score: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">Assigned Owner</label>
                          <select
                            value={match.owner || ''} 
                            onChange={(e) => setMatch({ ...match, owner: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm bg-white"
                          >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                              <option key={u.id} value={u.username}>{u.username}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase">Tags (comma separated)</label>
                          <input 
                            type="text" 
                            placeholder="e.g. visa ops, executive, star" 
                            value={Array.isArray(match.tags) ? match.tags.join(', ') : match.tags || ''} 
                            onChange={(e) => setMatch({ ...match, tags: e.target.value })}
                            className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm"
                          />
                        </div>
                      </div>

                      {/* Recruiter Notes & Change Remarks (Unified Input) */}
                      <div className="mt-6">
                        <label className={`block text-xs font-bold uppercase transition-colors duration-250 ${isJustificationRequired ? 'text-rose-600' : 'text-gray-500'}`}>
                          Recruiter Notes & Change Remarks{' '}
                          {isJustificationRequired ? (
                            <span className="text-rose-600 font-extrabold">* (Required for Audit Trail)</span>
                          ) : (
                            <span className="text-gray-400 font-medium">(Optional)</span>
                          )}
                        </label>
                         <textarea
                          rows="4"
                          value={recruiterRemarks}
                          onChange={(e) => setRecruiterRemarks(e.target.value)}
                          className={`mt-1.5 w-full border rounded-md shadow-sm text-sm focus:ring-green-800 focus:border-green-800 transition-all duration-250 ${
                            isJustificationRequired 
                              ? 'border-rose-300 bg-rose-50/15 focus:ring-rose-500 focus:border-rose-500' 
                              : 'border-gray-300 bg-white'
                          }`}
                          placeholder={
                            isJustificationRequired 
                              ? "You have modified critical candidate data. A brief override justification/remark is required to log changes..." 
                              : "Add any recruitment remarks or call summaries here..."
                          }
                          required={isJustificationRequired}
                        />
                      </div>
                    </div>

                    {/* AI SOURCING & FIT INSIGHTS (Grouped below overrides) */}
                    {match.ai_reasoning && (
                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-700"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M21 12H3M12 3v18"/></svg>
                          AI Sourcing & Fit Insights
                        </h3>
                        
                        {/* AI Score Breakdown Dashboard Widget */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-xs shadow-sm">
                          <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-700"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                            AI Sourcing Score Breakdown
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {factorScores.map((f, idx) => {
                              const score = f.score || 50;
                              const barColor = score >= 90 ? 'bg-emerald-600' : score >= 80 ? 'bg-blue-600' : score >= 70 ? 'bg-amber-500' : 'bg-rose-500';
                              const badgeColor = score >= 90 ? 'bg-emerald-100 text-emerald-800' : score >= 80 ? 'bg-blue-100 text-blue-800' : score >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';
                              
                              return (
                                <div key={idx} className="space-y-1.5 bg-white border border-gray-100 p-3 rounded-lg shadow-2xs">
                                  <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-gray-700 capitalize text-[11px] truncate max-w-[155px]" title={f.factorName}>{f.factorName}</span>
                                      <span className="text-[9px] text-gray-400 font-semibold mt-0.5">
                                        Weight: {f.weight}% &bull; Grade: {score}%
                                      </span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${badgeColor} whitespace-nowrap`}>
                                      {f.roundedPoints} / {f.weight} pts
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden shadow-inner border border-gray-200/20">
                                    <div 
                                      style={{ width: `${f.weight > 0 ? (f.roundedPoints / f.weight) * 100 : 0}%` }}
                                      className={`${barColor} h-full rounded-full transition-all duration-500`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Fit Reasoning Text */}
                        <div className="bg-green-50/20 border border-green-100/50 rounded-xl p-5 text-xs shadow-sm">
                          <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-700"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            AI Sourcing Fit Analysis
                          </h4>
                          <p className="text-gray-600 leading-relaxed font-semibold italic">"{match.ai_reasoning}"</p>
                        </div>
                      </div>
                    )}
  
                    {/* OUTREACH COPY SECTION */}
                    <div className="bg-green-50/50 border border-green-200 rounded-lg p-5">
                      <h3 className="text-sm font-bold text-green-800 mb-2 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Generate Outreach Draft
                      </h3>
                      <p className="text-xs text-green-700 mb-3">Copy-paste this template or customize it to contact the prospect.</p>
                      <textarea
                        rows="3"
                        value={outreachDraft}
                        onChange={(e) => setOutreachDraft(e.target.value)}
                        className="w-full border-green-300 rounded-md shadow-sm focus:ring-green-800 focus:border-green-800 text-sm bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(outreachDraft);
                          alert('Outreach copy copied to clipboard!');
                        }}
                        className="mt-2 text-xs font-bold text-green-800 hover:text-green-950 flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy outreach template
                      </button>
                    </div>
  
                    {/* ACTIVITY TIMELINE HISTORY (Unified View) */}
                    <div>
                      <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-2 mb-6 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-700"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Prospect Activity & Audit Trail
                      </h3>
                      <ActivityTimeline entityType="prospect" entityId={profile.id} title="Recent Candidate Timeline" />
                    </div>

                  </div>

                  {/* Actions Footer */}
                  <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 sm:px-8 flex justify-end gap-3 sticky bottom-0 z-10">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || (isJustificationRequired && !recruiterRemarks.trim())}
                      className={`px-5 py-2 rounded-md shadow-sm text-sm font-bold text-white transition-colors ${
                        saving || (isJustificationRequired && !recruiterRemarks.trim())
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-700 hover:bg-green-800'
                      }`}
                    >
                      {saving ? 'Saving...' : 'Save & Log Changes'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
