"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ActivityTimeline from '../../components/ActivityTimeline';

export default function ProspectsLayout({ children }) {
  const pathname = usePathname();

  const isTabActive = (path) => {
    return pathname.startsWith(path);
  };

  const tabClasses = (path) => {
    return `pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
      isTabActive(path)
        ? 'border-green-800 text-green-800'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Prospect Sourcing & Outreach</h1>
          <p className="text-gray-500 mt-2">AI-driven LinkedIn talent pipeline discovery and CRM outreach workflow.</p>
        </div>
      </div>

      {/* Horizontal Tabs sub-navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <Link href="/prospects/sourcing" className={tabClasses('/prospects/sourcing')}>
            AI Sourcing
          </Link>
          <Link href="/prospects/crm" className={tabClasses('/prospects/crm')}>
            Prospects CRM
          </Link>
          <Link href="/prospects/archive" className={tabClasses('/prospects/archive')}>
            Archive
          </Link>
          <Link href="/prospects/settings" className={tabClasses('/prospects/settings')}>
            AI Settings
          </Link>
        </nav>
      </div>

      {/* Page Content */}
      <main className="min-h-[500px]">
        {children}
      </main>

      <div className="mt-12 pt-8 border-t border-gray-200">
        <ActivityTimeline title="Prospects & Sourcing Activity" entityType="PROSPECT" limit={20} />
      </div>
    </div>
  );
}
