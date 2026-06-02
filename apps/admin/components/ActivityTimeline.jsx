"use client";
import { useState, useEffect } from 'react';
import { logCritical } from '@repo/logger';

export default function ActivityTimeline({ 
  entityType = null, 
  entityId = null, 
  userId = null,
  title = "Activity Timeline",
  limit = 50,
  enableControls = false
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ipLocations, setIpLocations] = useState({});

  // Controller states for controls
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(limit);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (events.length === 0) return;

    const resolveIps = async () => {
      const publicIps = events
        .map(e => e.metadata?.ip)
        .filter(ip => ip && ip !== '::1' && ip !== '127.0.0.1' && ip !== 'unknown');
      
      const uniqueIps = [...new Set(publicIps)];
      
      for (const ip of uniqueIps) {
        if (ipLocations[ip]) continue;
        
        try {
          const response = await fetch(`https://ipapi.co/${ip}/json/`);
          const data = await response.json();
          if (data && data.city) {
            setIpLocations(prev => ({ 
              ...prev, 
              [ip]: data.region ? `${data.city}, ${data.region}` : data.city 
            }));
          }
        } catch (e) {
          console.warn(`Failed to lookup location for IP ${ip}:`, e);
        }
      }
    };

    resolveIps();
  }, [events]);

  const getBrowserFromUserAgent = (userAgent) => {
    if (!userAgent) return 'Web Browser';
    const ua = userAgent.toLowerCase();
    if (ua.includes('edg/')) return 'Edge';
    if (ua.includes('chrome') && ua.includes('safari')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('trident') || ua.includes('msie')) return 'Internet Explorer';
    return 'Web Browser';
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  useEffect(() => {
    fetchEvents();
  }, [page, pageSize, category, sortBy, sortOrder, debouncedSearch, entityType, entityId, userId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      let queryUrl = `${API_URL}/api/admin/events?`;
      
      if (enableControls) {
        queryUrl += `page=${page}&limit=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
        if (category) {
          queryUrl += `&category=${category}`;
        }
        if (debouncedSearch) {
          queryUrl += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
        }
      } else {
        queryUrl += `limit=${limit}`;
        if (entityType) queryUrl += `&entity_type=${entityType}`;
      }
      
      if (entityId) queryUrl += `&entity_id=${entityId}`;
      if (userId) queryUrl += `&user_id=${userId}`;

      const response = await fetch(queryUrl, { cache: 'no-store' });
      const result = await response.json();
      
      if (result.success) {
        setEvents(result.data);
        if (result.pagination) {
          setTotalCount(result.pagination.total);
          setTotalPages(result.pagination.totalPages);
        } else {
          setTotalCount(result.data.length);
          setTotalPages(1);
        }
      } else {
        logCritical('Admin: API returned success:false when fetching events', { result });
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (val) => {
    setCategory(val);
    setPage(1);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisible = 5;
    
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    if (start > 1) {
      buttons.push(
        <button
          key={1}
          type="button"
          onClick={() => setPage(1)}
          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border border-gray-200 bg-white text-gray-600 hover:bg-gray-50`}
        >
          1
        </button>
      );
      if (start > 2) {
        buttons.push(<span key="dots-start" className="px-1 text-gray-400">...</span>);
      }
    }
    
    for (let i = start; i <= end; i++) {
      buttons.push(
        <button
          key={i}
          type="button"
          onClick={() => setPage(i)}
          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
            page === i
              ? 'bg-green-700 text-white shadow-xs'
              : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }
    
    if (end < totalPages) {
      if (end < totalPages - 1) {
        buttons.push(<span key="dots-end" className="px-1 text-gray-400">...</span>);
      }
      buttons.push(
        <button
          key={totalPages}
          type="button"
          onClick={() => setPage(totalPages)}
          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border border-gray-200 bg-white text-gray-600 hover:bg-gray-50`}
        >
          {totalPages}
        </button>
      );
    }
    
    return buttons;
  };

  const getEventIcon = (type) => {
    switch (true) {
      case type.includes('LOGIN'):
      case type.includes('LOGOUT'):
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ring-4 ring-white">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
        );
      case type.includes('USER'):
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center ring-4 ring-white">
            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        );
      case type.includes('JOB'):
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center ring-4 ring-white">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case type.includes('PROSPECT') || type.includes('CANDIDATE'):
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center ring-4 ring-white">
            <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        );
      case type.includes('NOTE'):
        return (
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center ring-4 ring-white">
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case type.includes('AI'):
        return (
          <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center ring-4 ring-white">
            <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ring-4 ring-white">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
          </div>
        );
    }
  };

  const isAutoGeneratedRemark = (desc) => {
    if (!desc) return true;
    const d = desc.trim();
    if (d === '') return true;
    
    const autoPatterns = [
      /^Moved to [A-Z_]+$/i,
      /^Moved to [A-Z_]+ from Sourcing dashboard$/i,
      /^Bulk move to [A-Z_]+ from (AI )?Sourcing dashboard$/i,
      /^Updated candidate notes from CRM table inline editor$/i
    ];
    
    return autoPatterns.some(regex => regex.test(d));
  };

  const sanitizeMetadata = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeMetadata);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      // Skip keys containing sensitive information or raw URLs
      if (
        lowerKey === 'logo_url' || 
        lowerKey === 'logourl' || 
        lowerKey === 'password' || 
        lowerKey === 'password_hash' ||
        lowerKey === 'reset_token' ||
        lowerKey === 'session_token'
      ) {
        continue;
      }
      
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  const formatMetadata = (rawMetadata, eventType = null) => {
    if (!rawMetadata || Object.keys(rawMetadata).length === 0) return null;

    const metadata = sanitizeMetadata(rawMetadata);
    if (!metadata || Object.keys(metadata).length === 0) return null;

    if (eventType === 'SOURCING_COMPLETED') {
      const sourced = metadata.candidates_sourced || 0;
      const high = metadata.high_scoring_sourced || 0;
      return (
        <div className="mt-1.5 text-xs text-gray-500 flex items-center gap-1.5 pl-1">
          <span>Candidates sourced: <span className="text-gray-900 font-bold">{sourced}</span></span>
          <span className="text-gray-300 font-normal">|</span>
          <span>High Scoring: <span className="text-green-700 font-bold">{high}</span></span>
        </div>
      );
    }

    const fieldLabels = {
      name: 'Candidate Name',
      email: 'Email Address',
      phone: 'Phone Number',
      city: 'Location/City',
      linkedin_url: 'LinkedIn URL',
      latest_title: 'Job Title',
      latest_company: 'Current Company',
      total_experience: 'Years of Experience',
      functional_field: 'Functional Field',
      stage: 'Pipeline Stage',
      manual_score: 'Manual Fit Score',
      human_notes: 'Recruiter Notes',
      active_flag: 'Active Status',
      primary_flag: 'Primary Job Match',
      owner: 'Assigned Owner',
      tags: 'Tags',
      followup_due_at: 'Follow-up Date',
      last_contacted_at: 'Last Contacted Date',
      username: 'Username',
      role: 'User Role',
      is_active: 'Account Status',
      must_reset_password: 'Password Reset Required',
      password: 'Password',
      can_access_dashboard: 'Dashboard Access',
      can_access_jobs: 'Jobs Access',
      can_access_companies: 'Companies Access',
      can_access_prospects: 'Prospects Access',
      can_access_activity: 'Activity Access',
      can_access_settings: 'Settings Access'
    };

    let changesNode = null;
    let permissionsNode = null;
    let customPropsNode = null;

    // 1. Render visual field changes
    if (metadata.changes && Array.isArray(metadata.changes)) {
      const filteredChanges = metadata.changes.filter(change => {
        if (change.field === 'human_notes') return false;
        if (change.field === 'stage' && eventType === 'CHANGE_STAGE') return false;
        return true;
      });
      
      if (filteredChanges.length > 0) {
        changesNode = (
          <div className="mt-2 space-y-1.5 pl-1.5">
            {filteredChanges.map((change, index) => {
              const label = fieldLabels[change.field] || change.field;
              
              const formatVal = (val, fieldName) => {
                if (val === 'null' || val === null || val === undefined || val === '') return 'None';
                if (fieldName === 'manual_score') return `${val}%`;
                
                const str = String(val);
                if (str.length > 80) return `${str.substring(0, 80)}...`;
                return str;
              };

              const prevVal = formatVal(change.prev, change.field);
              const nextVal = formatVal(change.next, change.field);

              return (
                <div key={index} className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                  <span className="font-semibold text-gray-700">{label}</span>
                  <span>Changed from</span>
                  <span className="line-through text-gray-400 bg-gray-100 px-1 py-0.2 rounded font-mono text-[10.5px]">{prevVal}</span>
                  <span className="text-gray-400 font-bold">&gt;</span>
                  <span className="font-bold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.2 rounded text-[10.5px]">{nextVal}</span>
                </div>
              );
            })}
          </div>
        );
      }
    }

    // 2. Custom render for permissions objects (if present)
    const perms = metadata.new_permissions || metadata.permissions;
    if (perms && typeof perms === 'object') {
      const permLabels = {
        can_access_dashboard: 'Dashboard',
        can_access_jobs: 'Jobs',
        can_access_companies: 'Companies',
        can_access_prospects: 'Prospects',
        can_access_activity: 'Activity',
        can_access_settings: 'Settings'
      };

      const enabled = [];
      const disabled = [];

      Object.entries(perms).forEach(([key, val]) => {
        const label = permLabels[key] || key.replace('can_access_', '').replace(/_/g, ' ');
        if (val === true) {
          enabled.push(label);
        } else {
          disabled.push(label);
        }
      });

      permissionsNode = (
        <div className="mt-2.5 bg-gray-50/50 border border-gray-100 rounded-xl p-3 space-y-2 max-w-lg">
          {enabled.length > 0 && (
            <div className="text-xs text-gray-600 flex items-start gap-2">
              <span className="font-semibold text-green-700 uppercase tracking-wider text-[9px] w-24 block mt-0.5">ENABLED ACCESS:</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {enabled.map(label => (
                  <span key={label} className="bg-green-50 border border-green-100 text-green-800 px-2 py-0.5 rounded-md font-semibold text-[10.5px]">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {disabled.length > 0 && (
            <div className="text-xs text-gray-600 flex items-start gap-2">
              <span className="font-semibold text-red-700 uppercase tracking-wider text-[9px] w-24 block mt-0.5">RESTRICTED:</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {disabled.map(label => (
                  <span key={label} className="bg-red-50 border border-red-100 text-red-800 px-2 py-0.5 rounded-md font-semibold text-[10.5px]">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 3. Render other premium properties
    const ignoredKeys = [
      'changes', 'job_id', 'run_id', 'job_ids', 'triggered_by', 'sourced_at', 'candidate_name',
      'ip', 'device', 'user_agent', 'userAgent', 'session_id', 'sessionId',
      'company_name', 'companyName', 'logo_url', 'logoUrl', 'new_permissions', 'permissions'
    ];
    const visibleEntries = Object.entries(metadata).filter(([key]) => !ignoredKeys.includes(key));

    if (visibleEntries.length > 0) {
      customPropsNode = (
        <div className="mt-3 bg-gray-50/50 border border-gray-100 rounded-xl p-3 space-y-1.5">
          {visibleEntries.map(([key, value]) => {
            const label = key.replace(/_/g, ' ');
            let renderedValue = '';

            if (Array.isArray(value)) {
              renderedValue = value.join(', ');
            } else if (typeof value === 'object') {
              renderedValue = JSON.stringify(value);
            } else {
              renderedValue = String(value);
              if (key === 'ai_score') renderedValue = `${renderedValue}%`;
            }

            return (
              <div key={key} className="text-xs text-gray-600 flex items-center gap-2">
                <span className="font-semibold text-gray-400 uppercase tracking-wider text-[9px] w-28 block capitalize">{label}:</span>
                <span className="text-gray-800 font-semibold">{renderedValue}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Combined rendering
    if (changesNode) {
      return changesNode;
    }

    if (permissionsNode) {
      return permissionsNode;
    }

    if (customPropsNode) {
      return customPropsNode;
    }

    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <button onClick={fetchEvents} className="text-gray-400 hover:text-green-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {enableControls && (
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between border-b border-gray-100 pb-5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by title, remark, user..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-hidden bg-gray-50/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Select Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Section Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter:</span>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-semibold text-gray-700 outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
              >
                <option value="">All Sections</option>
                <option value="Jobs">Jobs</option>
                <option value="Companies">Companies</option>
                <option value="Prospects">Prospects</option>
                <option value="Settings">Settings</option>
              </select>
            </div>

            {/* Limit Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setPage(1);
                }}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-semibold text-gray-700 outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Loading activity...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No recent activity.</div>
      ) : (
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {events.map((event, eventIdx) => {
              const isLoginLogout = event.event_type === 'USER_LOGIN' || event.event_type === 'USER_LOGOUT';
              
              return (
                <li key={event.id}>
                  <div className="relative pb-8">
                    {eventIdx !== events.length - 1 ? (
                      <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>{getEventIcon(event.event_type)}</div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        {isLoginLogout ? (
                          <div>
                            <p className="text-sm text-gray-900">
                              <span className="font-semibold text-gray-900">{event.user_name || 'System'}</span>{' '}
                              {event.event_type === 'USER_LOGIN' ? 'Logged in' : 'Logged out'}{' '}
                              {getBrowserFromUserAgent(event.metadata?.device)} at{' '}
                              <span className="font-semibold text-green-800 bg-green-50 border border-green-100 px-1.5 py-0.2 rounded text-[11px]">
                                {ipLocations[event.metadata?.ip] || (event.metadata?.ip === '::1' || event.metadata?.ip === '127.0.0.1' ? 'Localhost' : 'Jaipur')}
                              </span>
                            </p>
                            {event.metadata?.ip && (
                              <div className="mt-1 text-xs text-gray-500 font-mono">
                                Ip Address: {event.metadata.ip}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-900">
                              <span className="font-semibold text-gray-900">{event.user_name || 'System'}</span> {event.title}
                            </p>
                            {formatMetadata(event.metadata, event.event_type)}
                            {event.description && event.description.trim() && !isAutoGeneratedRemark(event.description) && (
                              <div className="mt-2 text-xs italic text-gray-600 bg-green-50/30 border-l-2 border-green-600 px-3.5 py-2 rounded-r-lg shadow-sm/50">
                                <span className="text-[10px] uppercase font-bold text-green-800/70 block not-italic mb-0.5 tracking-wider">Recruiter Remarks</span>
                                "{event.description}"
                              </div>
                            )}
                          </div>
                        )}
                        <div className="whitespace-nowrap text-right text-xs text-gray-500">
                          {new Date(event.created_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {enableControls && totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-gray-150 pt-5 text-sm text-gray-500">
              <div>
                Showing <span className="font-semibold text-gray-800">{Math.min((page - 1) * pageSize + 1, totalCount)}</span> to{' '}
                <span className="font-semibold text-gray-800">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                <span className="font-semibold text-gray-800">{totalCount}</span> entries
              </div>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className={`px-3 py-1.5 border rounded-lg font-medium text-xs transition-colors ${
                    page === 1
                      ? 'border-gray-150 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 bg-white hover:bg-gray-50 hover:text-green-700 text-gray-600'
                  }`}
                >
                  Previous
                </button>
                
                {renderPageButtons()}

                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className={`px-3 py-1.5 border rounded-lg font-medium text-xs transition-colors ${
                    page === totalPages
                      ? 'border-gray-150 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 bg-white hover:bg-gray-50 hover:text-green-700 text-gray-600'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
