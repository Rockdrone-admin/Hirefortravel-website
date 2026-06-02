"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsLayout({ children }) {
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
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">System Settings & Controls</h1>
          <p className="text-gray-500 mt-2">Manage user credentials, configure role access permissions, and fine-tune AI prompts.</p>
        </div>
      </div>

      {/* Horizontal Tabs sub-navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <Link href="/settings/users" className={tabClasses('/settings/users')}>
            Users & Roles
          </Link>
          <Link href="/settings/roles" className={tabClasses('/settings/roles')}>
            Role Permissions
          </Link>
          <Link href="/settings/ai-settings" className={tabClasses('/settings/ai-settings')}>
            AI Settings
          </Link>
        </nav>
      </div>

      {/* Page Content */}
      <main className="min-h-[500px]">
        {children}
      </main>
    </div>
  );
}
