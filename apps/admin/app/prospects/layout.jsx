"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export const ProspectsContext = createContext(null);

export default function ProspectsLayout({ children }) {
  const pathname = usePathname();
  const [prospects, setProspects] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  // 1. Fetch initial shared data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [jobsRes, prospectsRes] = await Promise.all([
          fetch(`${API_URL}/api/jobs?status=active&admin=true`, { credentials: 'include', cache: 'no-store' }),
          fetch(`${API_URL}/api/prospects`, { credentials: 'include', cache: 'no-store' })
        ]);

        const jobsResult = await jobsRes.json();
        if (jobsResult.success && jobsResult.data) {
          setActiveJobs(jobsResult.data);
        }

        const prospectsResult = await prospectsRes.json();
        if (prospectsResult.success && prospectsResult.data) {
          setProspects(prospectsResult.data);
        }
      } catch (err) {
        console.error("Failed to load global prospects context:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Helper function to force full refetch of prospects
  const refreshProspects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/prospects`, { credentials: 'include', cache: 'no-store' });
      const result = await res.json();
      if (result.success && result.data) {
        setProspects(result.data);
      }
    } catch (err) {
      console.error("Failed to refresh prospects context:", err);
    }
  };

  // 2. Persistent Supabase Realtime Subscription (Single channel listener)
  const prospectsRef = useRef(prospects);
  const activeJobsRef = useRef(activeJobs);

  useEffect(() => {
    prospectsRef.current = prospects;
  }, [prospects]);

  useEffect(() => {
    activeJobsRef.current = activeJobs;
  }, [activeJobs]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('global-prospects-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prospect_matches' },
        async (payload) => {
          console.log('Realtime prospect_matches event:', payload);
          
          // Determine environment dynamically from loaded prospects
          const currentProspects = prospectsRef.current;
          const activeEnv = currentProspects.length > 0 ? currentProspects[0].environment : null;
          const itemEnv = payload.new?.environment || payload.old?.environment;
          
          const currentEnv = activeEnv || (typeof window !== 'undefined' && (window.location.host.includes('dev') || window.location.host.includes('localhost') || window.location.host.includes('127.0.0.1')) ? 'development' : 'production');
          
          if (itemEnv && itemEnv !== currentEnv) return;

          if (payload.eventType === 'DELETE') {
            setProspects(prev => prev.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === 'INSERT') {
            try {
              const res = await fetch(`${API_URL}/api/prospects/sourcing/${payload.new.id}`, { credentials: 'include', cache: 'no-store' });
              const result = await res.json();
              if (result.success && result.data) {
                const newMatch = result.data;
                setProspects(prev => {
                  if (prev.some(p => p.id === newMatch.id)) return prev;
                  return [...prev, newMatch];
                });
              }
            } catch (err) {
              console.error('Failed to fetch new realtime prospect match:', err);
            }
          } else if (payload.eventType === 'UPDATE') {
            const matchId = payload.new.id;
            let exists = false;
            setProspects(prev => {
              const index = prev.findIndex(p => p.id === matchId);
              if (index !== -1) {
                exists = true;
                return prev.map(p => p.id === matchId ? {
                  ...p,
                  ...payload.new,
                  job: activeJobsRef.current.find(j => j.id === payload.new.job_id) || p.job
                } : p);
              }
              return prev;
            });

            if (!exists) {
              try {
                const res = await fetch(`${API_URL}/api/prospects/sourcing/${matchId}`, { credentials: 'include', cache: 'no-store' });
                const result = await res.json();
                if (result.success && result.data) {
                  setProspects(prev => {
                    if (prev.some(p => p.id === matchId)) return prev;
                    return [...prev, result.data];
                  });
                }
              } catch (err) {
                console.error('Failed to fetch updated realtime prospect match:', err);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'prospects' },
        (payload) => {
          console.log('Realtime prospects event:', payload);
          setProspects(prev => prev.map(p => {
            if (p.prospect?.id === payload.new.id) {
              return {
                ...p,
                prospect: {
                  ...p.prospect,
                  ...payload.new
                }
              };
            }
            return p;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isTabActive = (path) => pathname.startsWith(path);

  const tabClasses = (path) => {
    return `pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
      isTabActive(path)
        ? 'border-green-800 text-green-800'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;
  };

  return (
    <ProspectsContext.Provider value={{ prospects, setProspects, refreshProspects, activeJobs, loading, API_URL }}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Prospect Sourcing</h1>
            <p className="text-gray-500 mt-2">AI-driven talent discovery and CRM outreach workflow.</p>
          </div>
        </div>

        {/* Horizontal Tabs sub-navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-none pb-px" aria-label="Tabs">
            <Link href="/prospects/sourcing" className={`${tabClasses('/prospects/sourcing')} flex-shrink-0`}>
              AI Sourcing
            </Link>
            <Link href="/prospects/crm" className={`${tabClasses('/prospects/crm')} flex-shrink-0`}>
              Active Prospects
            </Link>
            <Link href="/prospects/all" className={`${tabClasses('/prospects/all')} flex-shrink-0`}>
              All Prospects
            </Link>
          </nav>
        </div>

        {/* Page Content */}
        <main className="min-h-[500px]">
          {children}
        </main>
      </div>
    </ProspectsContext.Provider>
  );
}
