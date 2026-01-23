'use client';

import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions } from '@/lib/services/transactions';
import { TransactionStatus } from '@/types/api';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAdmin } = useAuth();

  // Fetch pending count for admin users
  const { data: pendingData } = useQuery({
    queryKey: ['transactions', 'pending-count'],
    queryFn: () => getTransactions({ status: TransactionStatus.PENDING, limit: 1 }),
    enabled: isAdmin,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const pendingCount = pendingData?.total || 0;

  return (
    <ProtectedRoute>
      <AppLayout pendingCount={pendingCount}>{children}</AppLayout>
    </ProtectedRoute>
  );
}
