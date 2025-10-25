import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { sidebarOpen } = useUIStore();
  const { isAuthenticated } = useAuthStore();

  // Public pages that don't require sidebar
  const isPublicPage = location.pathname === '/' || location.pathname.startsWith('/auth');
  
  // Don't show sidebar on public pages or if not authenticated
  if (isPublicPage || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;