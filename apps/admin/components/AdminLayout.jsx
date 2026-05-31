"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hirefortravel_admin_sidebar_collapsed', 'true');
      document.cookie = 'hirefortravel_admin_sidebar_collapsed=true; path=/; max-age=31536000; SameSite=Lax';
    }
  }, []);

  const setCollapsedPreference = (newState) => {
    setIsCollapsed(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hirefortravel_admin_sidebar_collapsed', newState.toString());
      document.cookie = `hirefortravel_admin_sidebar_collapsed=${newState}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  const toggleCollapse = () => setCollapsedPreference(!isCollapsed);
  const collapseSidebar = () => setCollapsedPreference(true);

  return (
    <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col md:flex-row relative">
      {!isLoginPage && (
        <>
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Desktop Overlay Backdrop */}
          {!isCollapsed && (
            <div 
              className="hidden md:block fixed inset-0 bg-black/20 z-20 transition-opacity"
              onClick={collapseSidebar}
            />
          )}

          <Sidebar 
            isMobileOpen={isSidebarOpen} 
            setIsMobileOpen={setIsSidebarOpen} 
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
            collapseSidebar={collapseSidebar}
          />
          
          {/* Mobile Top Nav */}
          <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
            <Link href="/" className="text-xl font-bold text-green-800 hover:opacity-80 transition-opacity">
              HireForTravel<span className="text-gray-400 font-normal">Admin</span>
            </Link>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -mr-2 text-gray-600 hover:text-green-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          </div>

          {/* Floating Desktop Menu Button (Only visible when collapsed) */}
          {isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="hidden md:flex fixed top-6 left-6 z-10 p-3 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-500 hover:text-green-700 hover:border-green-300 transition-all"
              title="Expand Sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          )}
        </>
      )}
      
      {/* Main Content Area (No static margin, allows full width expansion) */}
      <div className={`flex-1 flex flex-col min-w-0 ${!isLoginPage ? 'p-4 sm:p-6 md:p-10 md:pl-24' : ''} transition-all duration-300`}>
        {children}
      </div>
    </body>
  );
}
