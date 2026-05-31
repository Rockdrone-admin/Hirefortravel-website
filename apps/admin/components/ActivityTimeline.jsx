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

  const formatMetadata = (metadata) => {
    if (!metadata || Object.keys(metadata).length === 0) return null;
    
    return (
      <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2 border border-gray-100">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key}>
            <span className="font-medium text-gray-600">{key.replace(/_/g, ' ')}:</span> {
              typeof value === 'object' ? JSON.stringify(value) : String(value)
            }
          </div>
        ))}
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
            {events.map((event, eventIdx) => (
              <li key={event.id}>
                <div className="relative pb-8">
                  {eventIdx !== events.length - 1 ? (
                    <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>{getEventIcon(event.event_type)}</div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-gray-900">
                          <span className="font-medium text-gray-900">{event.user_name || 'System'}</span> {event.title}
                        </p>
                        {event.description && (
                          <p className="mt-0.5 text-sm text-gray-500">{event.description}</p>
                        )}
                        {formatMetadata(event.metadata)}
                      </div>
                      <div className="whitespace-nowrap text-right text-xs text-gray-500">
                        {new Date(event.created_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
