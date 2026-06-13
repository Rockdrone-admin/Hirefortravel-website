"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

const DEFAULT_ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    can_access_dashboard: true,
    can_access_jobs: true,
    can_access_companies: true,
    can_access_prospects: true,
    can_access_activity: true,
    can_access_settings: true
  },
  ADMIN: {
    can_access_dashboard: true,
    can_access_jobs: true,
    can_access_companies: true,
    can_access_prospects: true,
    can_access_activity: true,
    can_access_settings: true
  },
  RECRUITER: {
    can_access_dashboard: true,
    can_access_jobs: true,
    can_access_companies: true,
    can_access_prospects: true,
    can_access_activity: true,
    can_access_settings: false
  }
};

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hirefortravel_admin_sidebar_collapsed', 'true');
      document.cookie = 'hirefortravel_admin_sidebar_collapsed=true; path=/; max-age=31536000; SameSite=Lax';
    }
  }, []);

  useEffect(() => {
    if (isLoginPage) {
      setLoadingUser(false);
      return;
    }

    const fetchUser = async () => {
      try {
        setLoadingUser(true);
        const response = await fetch(`${API_URL}/api/admin/me`, { credentials: 'include' });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setUser(result.data);
            if (typeof window !== 'undefined' && result.data) {
              localStorage.setItem('hirefortravel_admin_username', result.data.username || result.data.email || 'Admin');
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch user permissions:', err);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, [isLoginPage, API_URL]);

  const setCollapsedPreference = (newState) => {
    setIsCollapsed(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hirefortravel_admin_sidebar_collapsed', newState.toString());
      document.cookie = `hirefortravel_admin_sidebar_collapsed=${newState}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  const toggleCollapse = () => setCollapsedPreference(!isCollapsed);
  const collapseSidebar = () => setCollapsedPreference(true);

  const hasPermission = (permissionKey) => {
    if (!user) return false;
    const roleKey = user.role?.toUpperCase();
    const defaults = DEFAULT_ROLE_PERMISSIONS[roleKey] || {};
    const mergedPermissions = {
      ...defaults,
      ...user.permissions
    };
    return !!mergedPermissions[permissionKey];
  };

  const getRequiredPermission = (path) => {
    // Activity timeline is in Activity section
    if (path === '/settings/activity-timeline') return 'can_access_activity';
    // AI Settings, prompt configs are in Settings section
    if (path.startsWith('/settings') || 
        path.startsWith('/prospects/settings') || 
        path.startsWith('/prospects/ai-settings')) {
      return 'can_access_settings';
    }
    if (path.startsWith('/jobs')) return 'can_access_jobs';
    if (path.startsWith('/companies') || path.startsWith('/logos')) return 'can_access_companies';
    if (path.startsWith('/prospects')) return 'can_access_prospects';
    if (path === '/' || path.startsWith('/dashboard')) return 'can_access_dashboard';
    return null;
  };

  const requiredPermission = getRequiredPermission(pathname);
  const isAuthorized = !requiredPermission || hasPermission(requiredPermission);

  if (!isLoginPage && loadingUser) {
    return (
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-800 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">Verifying access...</p>
        </div>
      </body>
    );
  }

  if (!isLoginPage && !isAuthorized) {
    return (
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col md:flex-row relative">
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
          user={user}
          hasPermission={hasPermission}
        />
        
        {/* Mobile Top Nav */}
        <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4 sticky top-0 z-10 w-full">
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

        <div className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 md:p-10 md:pl-24 transition-all duration-300 items-center justify-center min-h-[80vh]">
          <div className="max-w-md w-full text-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-600 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0-6V9m0-6H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V9m-6-6h6a2 2 0 012 2v2M9 21h6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Restricted Access Section</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              We are sorry, but access to this section is restricted to authorized administrative roles. If you believe this is an error, please contact your systems administrator.
            </p>
            <Link href="/" className="inline-flex items-center justify-center px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white font-medium rounded-xl transition-colors shadow-sm text-sm">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </body>
    );
  }

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
            user={user}
            hasPermission={hasPermission}
          />
          
          {/* Mobile Top Nav */}
          <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4 sticky top-0 z-10 w-full">
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
