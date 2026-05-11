"use client";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Sidebar({ isMobileOpen, setIsMobileOpen }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    // Clear the session cookie
    document.cookie = "hft_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 p-6 flex flex-col gap-6 h-screen transition-transform transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="text-xl font-bold text-green-800 flex justify-between items-center">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          HireForTravel<span className="text-gray-400 font-normal">Admin</span>
        </Link>
        <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setIsMobileOpen && setIsMobileOpen(false)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        <Link href="/" className={navClasses('/')} onClick={() => setIsMobileOpen && setIsMobileOpen(false)}>Dashboard</Link>
        <Link href="/jobs" className={navClasses('/jobs')} onClick={() => setIsMobileOpen && setIsMobileOpen(false)}>Jobs Manager</Link>
        <Link href="/logos" className={navClasses('/logos')} onClick={() => setIsMobileOpen && setIsMobileOpen(false)}>Client Logos</Link>
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
