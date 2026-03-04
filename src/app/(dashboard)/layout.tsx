'use client';

import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions } from '@/lib/services/transactions';
import { TransactionStatus } from '@/types/api';
import api from '@/lib/api';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAdmin, isSalesManager } = useAuth();

  // Fetch pending count for admin users
  const { data: pendingData } = useQuery({
    queryKey: ['transactions', 'pending-count'],
    queryFn: () => getTransactions({ status: TransactionStatus.PENDING, limit: 1 }),
    enabled: isAdmin,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: callPendingData } = useQuery({
    queryKey: ['calls', 'pending-count'],
    queryFn: async () => {
      const res = await api.get<{ count: number }>('/calls/pending-count');
      return res.data;
    },
    enabled: isAdmin || isSalesManager,
    refetchInterval: 30000,
  });

  const pendingCount = (pendingData?.total || 0) + (callPendingData?.count || 0);

  return (
    <ProtectedRoute>
      <AppLayout pendingCount={pendingCount}>{children}</AppLayout>
    </ProtectedRoute>
  );
}
