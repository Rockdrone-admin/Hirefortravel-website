"use client";
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex">
      {!isLoginPage && <Sidebar />}
      
      {/* Main Content Area */}
      <div className={`flex-1 ${!isLoginPage ? 'ml-64 p-10' : ''}`}>
        {children}
      </div>
    </body>
  );
}
