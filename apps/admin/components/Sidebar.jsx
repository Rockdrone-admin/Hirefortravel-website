"use client";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Sidebar({ isMobileOpen, setIsMobileOpen, isCollapsed, toggleCollapse, collapseSidebar }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    try {
      await fetch(`${API_URL}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.error('Logout error', e);
    }
    router.push('/login');
    router.refresh();
  };

  if (pathname === '/login') return null;

  const isActive = (path) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const navClasses = (path) => {
    return `px-3 py-2 rounded-md font-medium transition-colors ${
      isActive(path) 
        ? 'bg-green-50 text-green-700' 
        : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
    }`;
  };

  const handleNavClick = () => {
    setIsMobileOpen && setIsMobileOpen(false);
    collapseSidebar && collapseSidebar();
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 p-6 flex flex-col gap-6 h-screen transition-all duration-300 transform ${
      isMobileOpen ? 'translate-x-0' : '-translate-x-full'
    } ${isCollapsed ? 'md:-translate-x-full' : 'md:translate-x-0'}`}>
      <div className="text-xl font-bold text-green-800 flex justify-between items-center">
          <Link href="/" className="hover:opacity-80 transition-opacity" onClick={handleNavClick}>
            HireForTravel<span className="text-gray-400 font-normal">Admin</span>
          </Link>
        <div className="flex items-center gap-1.5">
          {/* Desktop collapse button */}
          <button 
            className="hidden md:flex text-gray-400 hover:text-green-700 p-1 rounded hover:bg-gray-100 transition-colors" 
            onClick={toggleCollapse}
            title="Collapse Sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          
          {/* Mobile close button */}
          <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setIsMobileOpen && setIsMobileOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        <Link href="/" className={navClasses('/')} onClick={handleNavClick}>Dashboard</Link>
        <Link href="/jobs" className={navClasses('/jobs')} onClick={handleNavClick}>Jobs Manager</Link>
        <Link href="/logos" className={navClasses('/logos')} onClick={handleNavClick}>Client Logos</Link>
        
        <div className="pt-4 pb-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3">AI & Prospects</p>
        </div>
        <Link href="/prospects/crm" className={navClasses('/prospects/crm')} onClick={handleNavClick}>Prospects CRM</Link>
        <Link href="/prospects/sourcing" className={navClasses('/prospects/sourcing')} onClick={handleNavClick}>AI Sourcing</Link>

        <div className="pt-4 pb-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3">Settings</p>
        </div>
        <Link href="/settings/users" className={navClasses('/settings/users')} onClick={handleNavClick}>Users & Roles</Link>
        <Link href="/settings/roles" className={navClasses('/settings/roles')} onClick={handleNavClick}>Role Permissions</Link>
        <Link href="/settings/activity-timeline" className={navClasses('/settings/activity-timeline')} onClick={handleNavClick}>Activity Timeline</Link>
      </nav>
      <div className="border-t border-gray-100 pt-4">
        <button 
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
