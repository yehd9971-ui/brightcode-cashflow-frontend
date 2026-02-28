'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Plus,
  Clock,
  ArrowRight,
  LogIn,
  LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getBalance } from '@/lib/services/reports';
import { getTransactions } from '@/lib/services/transactions';
import { getAttendanceStatus, clockIn, clockOut } from '@/lib/services/attendance';
import { TransactionStatus } from '@/types/api';
import { formatAmount, formatDateShort } from '@/utils/formatters';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, TypeBadge } from '@/components/ui/StatusBadge';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';

function formatDuration(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diffMs = now - start;
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

export default function DashboardPage() {
  const { user, isAdmin, isSales, isSalesManager } = useAuth();
  const queryClient = useQueryClient();
  const [currentDuration, setCurrentDuration] = useState('');

  const canClock = isSales || isSalesManager;

  // Fetch balance (ADMIN only)
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['reports', 'balance'],
    queryFn: () => getBalance(),
    enabled: isAdmin,
  });

  // Fetch attendance status (SALES + SALES_MANAGER only)
  const { data: attendanceStatus, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', 'status'],
    queryFn: () => getAttendanceStatus(),
    enabled: canClock,
    refetchInterval: 60000,
  });

  // Update duration timer
  useEffect(() => {
    if (!attendanceStatus?.clockIn || attendanceStatus?.clockOut) {
      setCurrentDuration('');
      return;
    }

    setCurrentDuration(formatDuration(attendanceStatus.clockIn));

    const interval = setInterval(() => {
      setCurrentDuration(formatDuration(attendanceStatus.clockIn));
    }, 60000);

    return () => clearInterval(interval);
  }, [attendanceStatus]);

  // Fetch pending transactions count
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['transactions', 'pending', { limit: 1 }],
    queryFn: () => getTransactions({ status: TransactionStatus.PENDING, limit: 1 }),
  });

  // Fetch recent transactions
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['transactions', 'recent', { limit: 5 }],
    queryFn: () => getTransactions({ limit: 5 }),
  });

  const clockInMutation = useMutation({
    mutationFn: clockIn,
    onSuccess: () => {
      toast.success('Clocked in successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance', 'status'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to clock in');
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: clockOut,
    onSuccess: () => {
      toast.success('Clocked out successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance', 'status'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to clock out');
    },
  });

  const pendingCount = pendingData?.total || 0;
  const recentTransactions = recentData?.data || [];
  const isClockedIn = attendanceStatus && !attendanceStatus.clockOut;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.email.split('@')[0]}
          </h1>
          <p className="text-gray-500">
            {isAdmin ? 'Here\'s your financial overview' : 'Manage your transactions'}
          </p>
        </div>

        <Link href="/transactions/new">
          <Button>
            <Plus className="w-4 h-4 me-2" />
            New Transaction
          </Button>
        </Link>
      </div>

      {/* Attendance Clock Buttons (SALES + SALES_MANAGER) */}
      {canClock && (
        <Card title="Attendance">
          {attendanceLoading ? (
            <div className="h-16 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : isClockedIn ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-3 bg-green-100 rounded-full">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-700">Currently Clocked In</p>
                  <p className="text-sm text-gray-500">
                    Duration: {currentDuration || '0h 0m'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => clockOutMutation.mutate()}
                loading={clockOutMutation.isPending}
                disabled={clockOutMutation.isPending}
              >
                <LogOut className="w-4 h-4 me-2" />
                Clock Out
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Clock className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-700">Not Clocked In</p>
                  <p className="text-sm text-gray-500">Press to start your work session</p>
                </div>
              </div>
              <Button
                onClick={() => clockInMutation.mutate()}
                loading={clockInMutation.isPending}
                disabled={clockInMutation.isPending}
              >
                <LogIn className="w-4 h-4 me-2" />
                Com (Clock In)
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Balance Cards (ADMIN only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {balanceLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : balance ? (
            <>
              <StatCard
                title="Total Income"
                value={formatAmount(balance.totalIn)}
                subtitle="All approved IN transactions"
                icon={<ArrowDownCircle className="w-6 h-6" />}
              />
              <StatCard
                title="Total Expenses"
                value={formatAmount(balance.totalOut)}
                subtitle="All approved OUT transactions"
                icon={<ArrowUpCircle className="w-6 h-6" />}
              />
              <StatCard
                title="Net Balance"
                value={formatAmount(balance.netBalance)}
                subtitle={`As of ${formatDateShort(balance.asOf)}`}
                icon={<Wallet className="w-6 h-6" />}
              />
            </>
          ) : null}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Transactions */}
        <Card
          title={isAdmin ? 'Pending Approvals' : 'My Pending Transactions'}
          actions={
            <Link
              href={isAdmin ? '/approvals' : '/transactions?status=PENDING'}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          }
        >
          {pendingLoading ? (
            <div className="h-20 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-sm text-gray-500">
                  {pendingCount === 1 ? 'transaction' : 'transactions'} pending
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Quick Action for SALES and SALES_MANAGER */}
        {(isSales || isSalesManager) && (
          <Card title="Quick Actions">
            <div className="space-y-3">
              <Link href="/transactions/new" className="block">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Create Transaction</p>
                    <p className="text-sm text-gray-500">Add a new income or expense</p>
                  </div>
                </div>
              </Link>
            </div>
          </Card>
        )}

        {/* Recent Activity for ADMIN */}
        {isAdmin && (
          <Card
            title="Recent Activity"
            actions={
              <Link
                href="/transactions"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            }
          >
            {recentLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.slice(0, 3).map((tx) => (
                  <Link
                    key={tx.id}
                    href={`/transactions/${tx.id}`}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <TypeBadge type={tx.type} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {tx.transactionNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateShort(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-medium text-gray-900">
                        {formatAmount(tx.amount)}
                      </p>
                      <StatusBadge status={tx.status} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">
                No recent transactions
              </p>
            )}
          </Card>
        )}
      </div>

      {/* Recent Transactions Table (for SALES and SALES_MANAGER) */}
      {(isSales || isSalesManager) && (
        <Card
          title="My Recent Transactions"
          actions={
            <Link
              href="/transactions"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          }
        >
          {recentLoading ? (
            <TableSkeleton rows={3} />
          ) : recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-start text-sm font-medium text-gray-500 pb-3">
                      Transaction
                    </th>
                    <th className="text-start text-sm font-medium text-gray-500 pb-3">
                      Date
                    </th>
                    <th className="text-start text-sm font-medium text-gray-500 pb-3">
                      Type
                    </th>
                    <th className="text-end text-sm font-medium text-gray-500 pb-3">
                      Amount
                    </th>
                    <th className="text-end text-sm font-medium text-gray-500 pb-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <Link
                          href={`/transactions/${tx.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {tx.transactionNumber}
                        </Link>
                      </td>
                      <td className="py-3 text-sm text-gray-500">
                        {formatDateShort(tx.createdAt)}
                      </td>
                      <td className="py-3">
                        <TypeBadge type={tx.type} size="sm" />
                      </td>
                      <td className="py-3 text-end text-sm font-medium text-gray-900">
                        {formatAmount(tx.amount)}
                      </td>
                      <td className="py-3 text-end">
                        <StatusBadge status={tx.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No transactions yet"
              description="Create your first transaction to get started"
              action={
                <Link href="/transactions/new">
                  <Button size="sm">
                    <Plus className="w-4 h-4 me-2" />
                    New Transaction
                  </Button>
                </Link>
              }
            />
          )}
        </Card>
      )}
    </div>
  );
}
