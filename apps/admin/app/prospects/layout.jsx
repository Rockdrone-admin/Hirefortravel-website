"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useState, useEffect } from 'react';

export const ProspectsContext = createContext(null);

export default function ProspectsLayout({ children }) {
  const pathname = usePathname();
  const [activeJobs, setActiveJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  // Fetch shared static metadata (active jobs & admin users)
  useEffect(() => {
    async function loadSharedData() {
      try {
        setLoading(true);
        const [jobsRes, usersRes] = await Promise.all([
          fetch(`${API_URL}/api/jobs?status=active&admin=true`, { credentials: 'include', cache: 'no-store' }),
          fetch(`${API_URL}/api/admin/users`, { credentials: 'include', cache: 'no-store' }).catch(e => {
            console.error("Failed to load admin users in layout:", e);
            return null;
          })
        ]);

        const jobsResult = await jobsRes.json();
        if (jobsResult.success && jobsResult.data) {
          setActiveJobs(jobsResult.data);
        }

        if (usersRes) {
          const usersResult = await usersRes.json();
          if (usersResult.success && usersResult.data) {
            const sortedUsers = usersResult.data
              .filter(u => u.is_active)
              .sort((a, b) => a.username.localeCompare(b.username));
            setUsers(sortedUsers);
          }
        }
      } catch (err) {
        console.error("Failed to load global prospects layout context:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSharedData();
  }, [API_URL]);

  const isTabActive = (path) => pathname.startsWith(path);

  const tabClasses = (path) => {
    return `pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
      isTabActive(path)
        ? 'border-green-800 text-green-800'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;
  };

  return (
    <ProspectsContext.Provider value={{ activeJobs, setActiveJobs, users, loading, API_URL }}>
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
