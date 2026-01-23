'use client';

import { useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { FullPageLoading } from '@/components/ui/Loading';

interface AppLayoutProps {
  children: ReactNode;
  pendingCount?: number;
}

export function AppLayout({ children, pendingCount }: AppLayoutProps) {
  const { user, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track online/offline status with notifications
  useOnlineStatus();

  if (isLoading) {
    return <FullPageLoading text="Loading..." />;
  }

  if (!user) {
    return null; // Will be redirected by middleware
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        userRole={user.role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />

      <div>
        <Navbar
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={logout}
        />

        <main className="px-4 pt-2 pb-4 md:px-6 md:pt-4 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
