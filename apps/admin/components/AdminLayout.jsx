"use client";
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col md:flex-row">
      {!isLoginPage && (
        <>
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-20 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          <Sidebar isMobileOpen={isSidebarOpen} setIsMobileOpen={setIsSidebarOpen} />
          
          {/* Mobile Top Nav */}
          <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
            <div className="text-xl font-bold text-green-800">
              HireForTravel<span className="text-gray-400 font-normal">Admin</span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -mr-2 text-gray-600 hover:text-green-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          </div>
        </>
      )}
      
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${!isLoginPage ? 'md:ml-64 p-4 sm:p-6 md:p-10' : ''}`}>
        {children}
      </div>
    </body>
  );
}
