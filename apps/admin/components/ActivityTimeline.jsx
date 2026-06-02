"use client";
import { useState, useEffect } from 'react';
import { logCritical } from '@repo/logger';

export default function ActivityTimeline({ 
  entityType = null, 
  entityId = null, 
  userId = null,
  title = "Activity Timeline",
  limit = 50
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ipLocations, setIpLocations] = useState({});

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
  }, [entityType, entityId, userId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let queryUrl = `${API_URL}/api/admin/events?limit=${limit}`;
      if (entityType) queryUrl += `&entity_type=${entityType}`;
      if (entityId) queryUrl += `&entity_id=${entityId}`;
      if (userId) queryUrl += `&user_id=${userId}`;

      const response = await fetch(queryUrl, { cache: 'no-store' });
      const result = await response.json();
      
      if (result.success) {
        setEvents(result.data);
      } else {
        logCritical('Admin: API returned success:false when fetching events', { result });
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
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

  const formatMetadata = (metadata, eventType = null) => {
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
      password: 'Password'
    };

    // 1. Render visual field changes
    if (metadata.changes && Array.isArray(metadata.changes)) {
      const filteredChanges = metadata.changes.filter(change => {
        if (change.field === 'human_notes') return false;
        if (change.field === 'stage' && eventType === 'CHANGE_STAGE') return false;
        return true;
      });
      
      if (filteredChanges.length > 0) {
        return (
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
                  <span>changed from</span>
                  <span className="line-through text-gray-400 bg-gray-100 px-1 py-0.2 rounded font-mono text-[10.5px]">{prevVal}</span>
                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-bold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.2 rounded text-[10.5px]">{nextVal}</span>
                </div>
              );
            })}
          </div>
        );
      }
      return null;
    }

    // 2. Render other premium properties
    const ignoredKeys = ['changes', 'job_id', 'run_id', 'job_ids', 'triggered_by', 'sourced_at', 'candidate_name', 'ip', 'device', 'user_agent', 'userAgent', 'session_id', 'sessionId'];
    const visibleEntries = Object.entries(metadata).filter(([key]) => !ignoredKeys.includes(key));

    if (visibleEntries.length === 0) return null;

    return (
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
        </div>
      )}
    </div>
  );
}
