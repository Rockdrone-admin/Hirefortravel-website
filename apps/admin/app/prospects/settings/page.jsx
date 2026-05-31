"use client";
import { useState, useEffect } from 'react';

const DEFAULT_SEARCH_INSTRUCTIONS = [
  "Extract the primary job title/role targeted.",
  "Identify key technical and functional skills required.",
  "Extract explicitly mentioned competitors or key similar companies from the job description.",
  "Suggest 3-5 similar industry competitors likely to have suitable talent.",
  "Generate up to 3 highly optimized Google X-Ray Search Queries for LinkedIn in the exact format: site:linkedin.com/in (\"role name\" OR \"alternative title\") (\"skill A\" OR \"skill B\") (\"Competitor A\" OR \"Competitor B\")."
];

const DEFAULT_SCORING_INSTRUCTIONS = [
  "Calculate a candidate fit score between 0 and 100 based strictly on experience alignment, title relevance, skills, and background.",
  "Assess the candidate's latest company stature and relevance to the targeted position.",
  "Evaluate chronological career gaps, career trajectory, and professional progression quality.",
  "Write a professional fit reasoning explaining why this candidate matches (or does not match), highlighting key strengths and gaps.",
  "Infer the candidate's core functional field (e.g. Visa Operations, Software Engineering, Sales) for proper CRM classification."
];

export default function AISettingsPage() {
  const [searchInstructions, setSearchInstructions] = useState([]);
  const [scoringInstructions, setScoringInstructions] = useState([]);
  const [weights, setWeights] = useState({ "Location": 30, "Title": 30, "Experience": 20, "Skills": 20 });
  const [scraperChoice, setScraperChoice] = useState('apify');
  const [newFactorName, setNewFactorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSearch, setSavingSearch] = useState(false);
  const [savingScoring, setSavingScoring] = useState(false);
  const [savingScraper, setSavingScraper] = useState(false);
  const [newSearchRule, setNewSearchRule] = useState("");
  const [newScoringRule, setNewScoringRule] = useState("");
  const [notification, setNotification] = useState(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyVersions, setHistoryVersions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  // Show status banner that auto-clears
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Fetch prompts
  useEffect(() => {
    async function loadPrompts() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/prospects/sourcing/prompts`, { credentials: 'include' });
        const result = await res.json();
        if (result.success && result.data) {
          const searchData = result.data.find(r => r.prompt_type === 'search_query_generation');
          const scoringData = result.data.find(r => r.prompt_type === 'candidate_scoring');
          const scraperData = result.data.find(r => r.prompt_type === 'enrichment_scraper');
          
          setSearchInstructions(searchData?.instructions || DEFAULT_SEARCH_INSTRUCTIONS);
          setScraperChoice(scraperData?.instructions?.[0] || 'apify');
          
          // Parse SCORING_WEIGHTS out from instructions
          const rawScoring = scoringData?.instructions || DEFAULT_SCORING_INSTRUCTIONS;
          let parsedWeights = { "Location": 30, "Title": 30, "Experience": 20, "Skills": 20 };
          let textInstructions = [];
          
          rawScoring.forEach(inst => {
            if (inst.startsWith('SCORING_WEIGHTS:')) {
              try {
                parsedWeights = JSON.parse(inst.substring('SCORING_WEIGHTS:'.length));
              } catch (e) {
                console.error("Failed to parse weights JSON:", e);
              }
            } else {
              textInstructions.push(inst);
            }
          });

          setWeights(parsedWeights);
          setScoringInstructions(textInstructions);
        } else {
          setSearchInstructions(DEFAULT_SEARCH_INSTRUCTIONS);
          setScoringInstructions(DEFAULT_SCORING_INSTRUCTIONS);
          setScraperChoice('apify');
        }
      } catch (err) {
        console.error("Failed to load sourcing prompts:", err);
        setSearchInstructions(DEFAULT_SEARCH_INSTRUCTIONS);
        setScoringInstructions(DEFAULT_SCORING_INSTRUCTIONS);
        setScraperChoice('apify');
        showToast("Connection failed. Loaded local fallback defaults.", "error");
      } finally {
        setLoading(false);
      }
    }
    loadPrompts();
  }, [API_URL]);

  // Save changes to API
  const handleSavePrompts = async (type, instructionsList, setSavingState) => {
    try {
      setSavingState(true);
      const res = await fetch(`${API_URL}/api/prospects/sourcing/prompts`, { credentials: 'include',  method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptType: type,
          instructions: instructionsList.filter(inst => inst.trim() !== ''), credentials: 'include' })
      });
      const result = await res.json();
      if (result.success) {
        let typeName = 'Settings';
        if (type === 'search_query_generation') typeName = 'Search Query';
        else if (type === 'candidate_scoring') typeName = 'Candidate Scoring';
        else if (type === 'enrichment_scraper') typeName = 'Enrichment Provider';
        
        showToast(`AI ${typeName} instructions saved successfully!`);
      } else {
        showToast(result.error || 'Failed to save instructions to database.', 'error');
      }
    } catch (err) {
      console.error(`Failed to save ${type}:`, err);
      showToast('Connection error. Failed to communicate with database.', 'error');
    } finally {
      setSavingState(false);
    }
  };

  // Search Instruction handlers
  const handleAddSearchRule = (e) => {
    e.preventDefault();
    if (!newSearchRule.trim()) return;
    setSearchInstructions([...searchInstructions, newSearchRule.trim()]);
    setNewSearchRule("");
  };

  const handleEditSearchRule = (index, value) => {
    const updated = [...searchInstructions];
    updated[index] = value;
    setSearchInstructions(updated);
  };

  const handleDeleteSearchRule = (index) => {
    const updated = searchInstructions.filter((_, idx) => idx !== index);
    setSearchInstructions(updated);
  };

  const handleResetSearchRules = () => {
    if (confirm("Are you sure you want to reset search query prompts to system defaults? Any unsaved edits will be lost.")) {
      setSearchInstructions(DEFAULT_SEARCH_INSTRUCTIONS);
      showToast("Reset search instructions to system defaults. Click 'Save Rules' to apply to the engine.");
    }
  };

  // Scoring Instruction handlers
  const handleAddScoringRule = (e) => {
    e.preventDefault();
    if (!newScoringRule.trim()) return;
    setScoringInstructions([...scoringInstructions, newScoringRule.trim()]);
    setNewScoringRule("");
  };

  const handleEditScoringRule = (index, value) => {
    const updated = [...scoringInstructions];
    updated[index] = value;
    setScoringInstructions(updated);
  };

  const handleDeleteScoringRule = (index) => {
    const updated = scoringInstructions.filter((_, idx) => idx !== index);
    setScoringInstructions(updated);
  };

  const handleResetScoringRules = () => {
    if (confirm("Are you sure you want to reset candidate scoring prompts to system defaults? Any unsaved edits will be lost.")) {
      setScoringInstructions(DEFAULT_SCORING_INSTRUCTIONS.filter(i => !i.startsWith('SCORING_WEIGHTS:')));
      setWeights({ "Location": 30, "Title": 30, "Experience": 20, "Skills": 20 });
      showToast("Reset scoring instructions and weights to defaults. Click 'Save Scoring Rules' to apply to the engine.");
    }
  };

  // Unified Save Scoring Rules with serialized custom weights
  const handleSaveScoringWithWeights = async () => {
    const totalSum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (totalSum !== 100) {
      showToast(`Scoring weights must total exactly 100% (currently ${totalSum}%). Please adjust sliders before saving.`, 'error');
      return;
    }

    const combinedInstructions = [
      ...scoringInstructions.filter(inst => inst.trim() !== '' && !inst.startsWith('SCORING_WEIGHTS:')),
      `SCORING_WEIGHTS:${JSON.stringify(weights)}`
    ];

    await handleSavePrompts('candidate_scoring', combinedInstructions, setSavingScoring);
  };

  // Dynamic factor handlers (Add / Remove customizable scoring factors)
  const handleAddFactor = (e) => {
    e.preventDefault();
    if (!newFactorName.trim()) return;
    const cleanName = newFactorName.trim();

    if (weights[cleanName] !== undefined) {
      showToast(`Factor "${cleanName}" already exists.`, 'error');
      return;
    }

    setWeights({
      ...weights,
      [cleanName]: 0
    });
    setNewFactorName("");
    showToast(`Added grading factor "${cleanName}". Adjust its weight below!`);
  };

  const handleRemoveFactor = (name) => {
    const updated = { ...weights };
    delete updated[name];
    setWeights(updated);
    showToast(`Removed factor "${name}". Re-balance remaining weights to equal 100%.`);
  };

  const handleWeightChange = (name, val) => {
    setWeights({
      ...weights,
      [name]: Number(val)
    });
  };

  const handleEditFactorName = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;
    const cleanNewName = newName.trim();
    if (weights[cleanNewName] !== undefined) {
      showToast(`Factor name "${cleanNewName}" already exists.`, 'error');
      return;
    }
    
    const updated = {};
    Object.keys(weights).forEach(key => {
      if (key === oldName) {
        updated[cleanNewName] = weights[oldName];
      } else {
        updated[key] = weights[key];
      }
    });
    setWeights(updated);
  };

  const fetchHistory = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/prospects/sourcing/prompts/versions`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        setHistoryVersions(result.data);
      } else {
        showToast("Failed to load version history.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Connection error fetching history.", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRestoreVersion = (version) => {
    if (confirm("Restore this full algorithm snapshot? Your current unsaved changes will be overwritten in the editor.")) {
      const config = version.config || {};
      
      // 1. Restore search instructions
      if (Array.isArray(config.searchRules)) {
        setSearchInstructions(config.searchRules);
      }

      // 2. Restore scoring instructions & weights
      if (Array.isArray(config.scoringRules)) {
        let parsedWeights = { "Location": 30, "Title": 30, "Experience": 20, "Skills": 20 };
        let textInstructions = [];
        
        config.scoringRules.forEach(inst => {
          if (inst.startsWith('SCORING_WEIGHTS:')) {
            try {
              parsedWeights = JSON.parse(inst.substring('SCORING_WEIGHTS:'.length));
            } catch (e) {}
          } else {
            textInstructions.push(inst);
          }
        });

        setWeights(parsedWeights);
        setScoringInstructions(textInstructions);
      }

      // 3. Restore scraper choice
      if (config.enrichmentScraper && config.enrichmentScraper[0]) {
        setScraperChoice(config.enrichmentScraper[0]);
      }

      showToast("Unified configuration loaded! Click Save on all cards to apply.");
      setShowHistoryModal(false);
    }
  };

  const handleDeleteVersion = async (id) => {
    if (confirm("Permanently delete this historical snapshot?")) {
      try {
        const res = await fetch(`${API_URL}/api/prospects/sourcing/prompts/versions?id=${id}`, { credentials: 'include',  method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
          setHistoryVersions(historyVersions.filter(v => v.id !== id));
          showToast("Snapshot deleted successfully.");
        } else {
          showToast("Failed to delete snapshot.", "error");
        }
      } catch (e) {
        console.error(e);
        showToast("Connection error deleting snapshot.", "error");
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Toast Notification Banner */}
      {notification && (
        <div 
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border transition-all duration-300 transform translate-y-0 ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-rose-600 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span className="text-sm font-bold tracking-wide">{notification.message}</span>
        </div>
      )}

      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-700 rounded-2xl shadow-md border border-green-700/20 p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="max-w-3xl space-y-3 relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-green-200 bg-white/15 px-3 py-1 rounded-full backdrop-blur-sm">Recruiter AI Settings</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Tailor Sourcing Prompt Instructions</h2>
          <p className="text-sm sm:text-base text-green-50 leading-relaxed font-medium">
            Fine-tune how the recruitment AI reads active Job Descriptions to formulate search parameters, design Google X-Ray dorks, scrape LinkedIn nodes, and evaluate candidate suitedness scores. Build highly targeted candidate filters by tweaking the bullet rules below.
          </p>
        </div>
      </div>

      {loading ? (
        // UI Skeleton Loader
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="space-y-3">
                <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded-md w-2/3 animate-pulse"></div>
                <div className="h-4 bg-gray-150 rounded-md w-5/6 animate-pulse"></div>
              </div>
              <div className="space-y-4 pt-4 border-t border-gray-100">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex gap-3 items-center">
                    <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse"></div>
                    <div className="h-9 bg-gray-100 rounded-lg flex-1 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Grid cards for editing
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* COLUMN 1: Search Query Generation Instructions */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 hover:shadow-md transition-shadow duration-300 flex flex-col space-y-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="bg-green-50 p-2 rounded-lg text-green-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-black text-gray-800">1. AI Search Query Rules</h3>
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  These rules control how the Gemini model parses Job Descriptions to generate LinkedIn search keywords, identify potential competitors, and synthesize optimized Google X-Ray search query combinations.
                </p>
              </div>

              {/* Bullet Points List */}
              <div className="space-y-3.5 pt-4 border-t border-gray-100 flex-1">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Target Prompts List</label>
                
                {searchInstructions.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No active instructions. Add one below or reset to defaults.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchInstructions.map((inst, index) => (
                      <div key={index} className="group flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50/70 border border-transparent hover:border-gray-100 transition-all duration-200">
                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black mt-2 shadow-xs border border-emerald-100">
                          {index + 1}
                        </span>
                        
                        <div className="flex-1 relative">
                          <textarea
                            value={inst}
                            onChange={(e) => handleEditSearchRule(index, e.target.value)}
                            rows={Math.max(1, Math.ceil(inst.length / 55))}
                            className="w-full text-xs font-semibold leading-relaxed text-gray-700 border border-gray-200 rounded-lg p-2.5 bg-gray-50/40 hover:bg-white focus:bg-white focus:border-green-600/55 focus:ring-2 focus:ring-green-600/10 focus:outline-none resize-none transition-all pr-8 shadow-xs"
                            placeholder="Type instruction bullet point rule..."
                          />
                          <div className="absolute right-2.5 top-3 opacity-0 group-hover:opacity-45 pointer-events-none transition-opacity">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 21.75a0.75 0 01-1.043 0.083L2.4 19.5a0.75 0 010.082-1.043l13.5-10.5z" />
                            </svg>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteSearchRule(index)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all mt-1.5"
                          title="Delete instruction rule"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Rule */}
              <form onSubmit={handleAddSearchRule} className="flex gap-2.5 pt-2">
                <input
                  type="text"
                  value={newSearchRule}
                  onChange={(e) => setNewSearchRule(e.target.value)}
                  placeholder="Add new search instruction rule..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 font-medium placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add</span>
                </button>
              </form>

              {/* Actions Panel */}
              <div className="flex justify-end items-center pt-5 border-t border-gray-100">
                <button
                  onClick={() => handleSavePrompts('search_query_generation', searchInstructions, setSavingSearch)}
                  disabled={savingSearch}
                  className="w-full sm:w-auto bg-green-800 hover:bg-green-900 disabled:bg-green-400 text-white text-xs font-black px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01] active:scale-95"
                >
                  {savingSearch ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Save Search Rules</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* COLUMN 2: Candidate Scoring & Weights */}
          <div className="space-y-8">
            {/* CARD 2: Candidate Scoring Instructions */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 hover:shadow-md transition-shadow duration-300 flex flex-col space-y-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="bg-green-50 p-2 rounded-lg text-green-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-black text-gray-800">2. AI Fit Evaluation Rules</h3>
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  These rules control how the deep reasoning Gemini model calculates candidate experience alignment, chronological career gaps, company context, and drafts the professional matchmaking evaluation reasoning.
                </p>
              </div>

              {/* Bullet Points List */}
              <div className="space-y-3.5 pt-4 border-t border-gray-100 flex-1">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Target Prompts List</label>
                
                {scoringInstructions.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No active instructions. Add one below or reset to defaults.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scoringInstructions.map((inst, index) => (
                      <div key={index} className="group flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50/70 border border-transparent hover:border-gray-100 transition-all duration-200">
                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black mt-2 shadow-xs border border-emerald-100">
                          {index + 1}
                        </span>
                        
                        <div className="flex-1 relative">
                          <textarea
                            value={inst}
                            onChange={(e) => handleEditScoringRule(index, e.target.value)}
                            rows={Math.max(1, Math.ceil(inst.length / 55))}
                            className="w-full text-xs font-semibold leading-relaxed text-gray-700 border border-gray-200 rounded-lg p-2.5 bg-gray-50/40 hover:bg-white focus:bg-white focus:border-green-600/55 focus:ring-2 focus:ring-green-600/10 focus:outline-none resize-none transition-all pr-8 shadow-xs"
                            placeholder="Type instruction bullet point rule..."
                          />
                          <div className="absolute right-2.5 top-3 opacity-0 group-hover:opacity-45 pointer-events-none transition-opacity">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 21.75a0.75 0 01-1.043 0.083L2.4 19.5a0.75 0 010.082-1.043l13.5-10.5z" />
                            </svg>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteScoringRule(index)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all mt-1.5"
                          title="Delete instruction rule"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Rule */}
              <form onSubmit={handleAddScoringRule} className="flex gap-2.5 pt-2">
                <input
                  type="text"
                  value={newScoringRule}
                  onChange={(e) => setNewScoringRule(e.target.value)}
                  placeholder="Add new scoring instruction rule..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 font-medium placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add</span>
                </button>
              </form>

              {/* Actions Panel */}
              <div className="flex justify-end items-center pt-4 border-t border-gray-100">
                <button
                  onClick={handleSaveScoringWithWeights}
                  disabled={savingScoring}
                  className="w-full sm:w-auto bg-green-800 hover:bg-green-900 disabled:bg-green-400 text-white text-xs font-black px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01] active:scale-95"
                >
                  {savingScoring ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Save Fit Rules</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* CARD 3: Dynamic Weights Sliders */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 hover:shadow-md transition-shadow duration-300 flex flex-col space-y-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="bg-green-50 p-2 rounded-lg text-green-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-black text-gray-800">3. AI Weighting Configuration</h3>
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Define your custom grading factors and assign their relative weights. Active factors must sum to exactly **100%** to save successfully.
                </p>
              </div>

              {/* Factors list with sliders */}
              <div className="space-y-5 pt-4 border-t border-gray-100 flex-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Active Grading Factors</label>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                    Object.values(weights).reduce((a, b) => a + b, 0) === 100 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800 animate-pulse'
                  }`}>
                    Sum: {Object.values(weights).reduce((a, b) => a + b, 0)}% (Target: 100%)
                  </span>
                </div>

                <div className="space-y-4">
                  {Object.keys(weights).map((factor) => (
                    <div key={factor} className="space-y-1.5 p-3.5 bg-gray-50/50 border border-gray-150 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className="flex justify-between items-center">
                        <div className="flex-1 max-w-[220px] relative">
                          <input
                            type="text"
                            value={factor}
                            onChange={(e) => handleEditFactorName(factor, e.target.value)}
                            className="w-full text-xs font-extrabold text-gray-700 border border-transparent rounded px-2 py-1 bg-transparent hover:bg-white/70 hover:border-gray-200 focus:bg-white focus:border-green-600/50 focus:ring-1 focus:ring-green-600/10 focus:outline-none transition-all"
                            title="Click to rename this grading factor"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-700">{weights[factor]}%</span>
                          <button
                            onClick={() => handleRemoveFactor(factor)}
                            className="text-gray-300 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50"
                            title={`Delete factor "${factor}"`}
                            type="button"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={weights[factor]}
                        onChange={(e) => handleWeightChange(factor, e.target.value)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-700"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Custom Factor Form */}
              <form onSubmit={handleAddFactor} className="flex gap-2.5 pt-2">
                <input
                  type="text"
                  value={newFactorName}
                  onChange={(e) => setNewFactorName(e.target.value)}
                  placeholder="New factor name (e.g. Pedigree, Certs)..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 font-medium placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Factor</span>
                </button>
              </form>

              {/* Save Scoring & Weights button */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={handleSaveScoringWithWeights}
                  disabled={savingScoring || Object.values(weights).reduce((a, b) => a + b, 0) !== 100}
                  className="w-full sm:w-auto bg-green-800 hover:bg-green-900 disabled:bg-green-400 text-white text-xs font-black px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01] active:scale-95"
                >
                  {savingScoring ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Save Scoring & Weights</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* COLUMN 3 (Span 2): Enrichment Provider Settings */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 hover:shadow-md transition-shadow duration-300 flex flex-col space-y-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="bg-green-50 p-2 rounded-lg text-green-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-black text-gray-800">4. Enrichment Provider Configuration</h3>
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Select which platform should be used to enrich LinkedIn profile data when discovering candidates.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100 flex-1">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-2 block">Active Provider</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${scraperChoice === 'apify' ? 'border-green-600 bg-green-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="scraper" 
                        value="apify" 
                        checked={scraperChoice === 'apify'}
                        onChange={(e) => setScraperChoice(e.target.value)}
                        className="w-4 h-4 text-green-600 accent-green-600"
                      />
                      <div>
                        <div className="font-bold text-gray-800 text-sm">Apify (Recommended)</div>
                        <div className="text-xs text-gray-500">Uses the harvestapi~linkedin-profile-scraper actor</div>
                      </div>
                    </div>
                  </label>
                  
                  <label className={`flex-1 flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${scraperChoice === 'brightdata' ? 'border-green-600 bg-green-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="scraper" 
                        value="brightdata" 
                        checked={scraperChoice === 'brightdata'}
                        onChange={(e) => setScraperChoice(e.target.value)}
                        className="w-4 h-4 text-green-600 accent-green-600"
                      />
                      <div>
                        <div className="font-bold text-gray-800 text-sm">Bright Data</div>
                        <div className="text-xs text-gray-500">Legacy direct scraping integration</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => handleSavePrompts('enrichment_scraper', [scraperChoice], setSavingScraper)}
                  disabled={savingScraper}
                  className="w-full sm:w-auto bg-green-800 hover:bg-green-900 disabled:bg-green-400 text-white text-xs font-black px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01] active:scale-95"
                >
                  {savingScraper ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Save Provider</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Center Bottom Option for Version History */}
      <div className="flex justify-center mt-6">
        <button
          onClick={fetchHistory}
          type="button"
          className="text-xs font-semibold text-gray-400 hover:text-green-800 hover:underline flex items-center gap-1.5 transition-all py-2 px-4 bg-gray-50/50 hover:bg-green-50/30 rounded-full border border-transparent hover:border-gray-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Restore or Delete Algorithm Snapshots</span>
        </button>
      </div>

      {/* Version History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg text-green-700 shadow-sm border border-gray-150">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-800">Algorithm History & Snapshots</h3>
                  <p className="text-xs text-gray-500 font-medium">Unified backups of all search queries, fit rules, and scoring weightings</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 p-2 rounded-xl transition-all border border-transparent hover:border-gray-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/30">
              {historyLoading ? (
                <div className="flex justify-center items-center py-16">
                  <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : historyVersions.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm font-semibold bg-white rounded-2xl border border-dashed border-gray-200 shadow-xs">
                  No historical snapshots found for this algorithm yet.
                </div>
              ) : (
                historyVersions.map((v) => (
                  <div key={v.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-green-300 transition-all shadow-sm">
                    <div className="bg-gray-50 px-5 py-3.5 border-b border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Snapshot: {new Date(v.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleRestoreVersion(v)}
                          className="bg-white hover:bg-green-50 text-green-700 text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border border-green-200 hover:border-green-300 transition-all shadow-sm"
                        >
                          Restore State
                        </button>
                        <button 
                          onClick={() => handleDeleteVersion(v.id)}
                          className="bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-600 p-1.5 rounded-xl border border-gray-200 hover:border-rose-200 transition-all shadow-sm"
                          title="Delete snapshot"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-5 space-y-4">
                      {/* Search Rules */}
                      {v.config?.searchRules && v.config.searchRules.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">1. AI Search Rules</h4>
                          <ul className="list-disc list-outside ml-4 text-xs font-semibold text-gray-600 leading-relaxed space-y-1">
                            {v.config.searchRules.map((line, idx) => (
                              <li key={idx} className="pl-1">{line}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Scoring Rules & Weights */}
                      {v.config?.scoringRules && v.config.scoringRules.length > 0 && (
                        <div className="pt-4 border-t border-gray-100">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">2. AI Fit Evaluation & Weightings</h4>
                          <ul className="list-disc list-outside ml-4 text-xs font-semibold text-gray-600 leading-relaxed space-y-1 mb-3">
                            {v.config.scoringRules.filter(i => !i.startsWith('SCORING_WEIGHTS:')).map((line, idx) => (
                              <li key={idx} className="pl-1">{line}</li>
                            ))}
                          </ul>
                          
                          {v.config.scoringRules.find(i => i.startsWith('SCORING_WEIGHTS:')) && (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-dashed border-gray-150">
                              {Object.entries(JSON.parse(v.config.scoringRules.find(i => i.startsWith('SCORING_WEIGHTS:')).substring('SCORING_WEIGHTS:'.length))).map(([k, val]) => (
                                <span key={k} className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-1 rounded border border-emerald-100">
                                  {k}: {val}%
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
