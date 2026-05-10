"use client";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Sidebar() {
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
    <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col gap-6 fixed h-screen">
      <div className="text-xl font-bold text-green-800">
        HireForTravel<span className="text-gray-400 font-normal">Admin</span>
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        <Link href="/" className={navClasses('/')}>Dashboard</Link>
        <Link href="/jobs" className={navClasses('/jobs')}>Jobs Manager</Link>
        <Link href="/logos" className={navClasses('/logos')}>Client Logos</Link>
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
