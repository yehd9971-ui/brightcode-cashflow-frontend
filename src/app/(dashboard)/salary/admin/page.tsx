'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAllEmployeesSummary, getEmployeeSalarySummary, addDeduction, overrideDayRecord, waiveDeduction, editDeduction } from '@/lib/services/salary';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatAmount } from '@/utils/formatters';
import { DayStatus, DeductionType } from '@/types/api';
import type { EmployeeSalaryOverviewDto, MonthlySalaryResponseDto } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Role } from '@/types/api';

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

function getDayStatusColor(status: DayStatus): string {
  switch (status) {
    case DayStatus.FULL: return 'bg-green-100 text-green-800';
    case DayStatus.PARTIAL: return 'bg-yellow-100 text-yellow-800';
    case DayStatus.LEAVE_PAID: return 'bg-blue-100 text-blue-800';
    case DayStatus.LEAVE_UNPAID: return 'bg-orange-100 text-orange-800';
    case DayStatus.ABSENT_UNEXCUSED: return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default function SalaryAdminPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [deductionForm, setDeductionForm] = useState({ userId: '', amount: '', description: '', dateEgypt: '' });
  const [overrideForm, setOverrideForm] = useState({ recordId: '', dayPercentage: '', adminNotes: '' });
  const [showEditDeductionModal, setShowEditDeductionModal] = useState(false);
  const [editDeductionForm, setEditDeductionForm] = useState({ id: '', amount: '' });

  const { data: employees, isLoading, isError, refetch } = useQuery({
    queryKey: ['salary', 'all', month, year],
    queryFn: () => getAllEmployeesSummary(month, year),
  });

  const { data: employeeDetail } = useQuery({
    queryKey: ['salary', 'employee', selectedUserId, month, year],
    queryFn: () => getEmployeeSalarySummary(selectedUserId!, month, year),
    enabled: !!selectedUserId,
  });

  const deductionMutation = useMutation({
    mutationFn: () => addDeduction({ userId: deductionForm.userId, amount: Number(deductionForm.amount), description: deductionForm.description, dateEgypt: deductionForm.dateEgypt }),
    onSuccess: () => { toast.success('Deduction added'); setShowDeductionModal(false); queryClient.invalidateQueries({ queryKey: ['salary'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add deduction'),
  });

  const overrideMutation = useMutation({
    mutationFn: () => overrideDayRecord(overrideForm.recordId, { dayPercentage: Number(overrideForm.dayPercentage), adminNotes: overrideForm.adminNotes || undefined }),
    onSuccess: () => { toast.success('Day record overridden'); setShowOverrideModal(false); queryClient.invalidateQueries({ queryKey: ['salary'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to override'),
  });

  const editDeductionMutation = useMutation({
    mutationFn: () => editDeduction(editDeductionForm.id, Number(editDeductionForm.amount)),
    onSuccess: () => { toast.success('Deduction updated'); setShowEditDeductionModal(false); queryClient.invalidateQueries({ queryKey: ['salary'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to edit'),
  });

  const waiveMutation = useMutation({
    mutationFn: (deductionId: string) => waiveDeduction(deductionId),
    onSuccess: () => { toast.success('Deduction waived'); queryClient.invalidateQueries({ queryKey: ['salary'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to waive'),
  });

  if (isError) return <ErrorState message="Unable to load data" onRetry={refetch} />;

  return (
    <ProtectedRoute requiredRole={Role.ADMIN}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Salary Management</h1>
        <Button onClick={() => setShowDeductionModal(true)}>Add Deduction</Button>
      </div>

      <div className="flex gap-3">
        <Select label="Month" value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} options={MONTHS} />
        <Select label="Year" value={String(year)} onChange={(e) => setYear(Number(e.target.value))} options={[
          { value: String(now.getFullYear() - 1), label: String(now.getFullYear() - 1) },
          { value: String(now.getFullYear()), label: String(now.getFullYear()) },
        ]} />
      </div>

      {isLoading ? <CardSkeleton /> : (<>
      {/* Employee List */}
      <Card title="All Employees">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earned</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonuses</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees?.map((emp: EmployeeSalaryOverviewDto) => (
                <tr key={emp.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{emp.email}</td>
                  <td className="px-4 py-3 text-sm">{formatAmount(emp.baseSalary)}</td>
                  <td className="px-4 py-3 text-sm text-green-600">{formatAmount(emp.totalEarned)}</td>
                  <td className="px-4 py-3 text-sm text-red-600">-{formatAmount(emp.totalDeductions)}</td>
                  <td className="px-4 py-3 text-sm text-green-600">+{formatAmount(emp.totalBonuses)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{formatAmount(emp.netSalary)}</td>
                  <td className="px-4 py-3 text-sm">{emp.daysWorked}</td>
                  <td className="px-4 py-3"><Button variant="outline" size="sm" onClick={() => setSelectedUserId(emp.userId)}>View</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Employee Detail */}
      {selectedUserId && employeeDetail && (
        <Card title={`Details - ${employeeDetail.userId}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earned</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employeeDetail.dailyRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 text-sm">{record.dateEgypt}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${getDayStatusColor(record.dayStatus)}`}>{record.dayStatus.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 text-sm">{Math.floor(record.totalMinutes / 60)}h {record.totalMinutes % 60}m</td>
                    <td className="px-4 py-3 text-sm">{record.dayPercentage}%</td>
                    <td className="px-4 py-3 text-sm text-green-600">{formatAmount(record.salaryEarned)}</td>
                    <td className="px-4 py-3"><Button variant="outline" size="sm" onClick={() => { setOverrideForm({ recordId: record.id, dayPercentage: String(record.dayPercentage), adminNotes: '' }); setShowOverrideModal(true); }}>Override</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Deductions for this employee */}
          {employeeDetail.deductions && employeeDetail.deductions.length > 0 && (
            <div className="border-t border-gray-200 mt-4 pt-4 px-4 pb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Deductions</h3>
              <div className="space-y-2">
                {employeeDetail.deductions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={d.type === DeductionType.LATE_REPORT ? 'error' : d.type === DeductionType.MANUAL ? 'info' : 'warning'}>
                        {d.type.replace(/_/g, ' ')}
                      </Badge>
                      <div>
                        <p className="text-sm text-gray-700">{d.description}</p>
                        <p className="text-xs text-gray-500">{d.dateEgypt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-red-600">-{Number(d.amount).toFixed(2)} EGP</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditDeductionForm({ id: d.id, amount: String(Number(d.amount)) }); setShowEditDeductionModal(true); }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => waiveMutation.mutate(d.id)}
                        loading={waiveMutation.isPending}
                      >
                        Waive
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      </>)}

      {/* Add Deduction Modal */}
      <Modal isOpen={showDeductionModal} onClose={() => setShowDeductionModal(false)} title="Add Manual Deduction">
        <div className="space-y-4">
          <Select label="Employee" value={deductionForm.userId} onChange={(e) => setDeductionForm({ ...deductionForm, userId: e.target.value })} options={[{ value: '', label: 'Select employee...' }, ...(employees?.map((emp: EmployeeSalaryOverviewDto) => ({ value: emp.userId, label: emp.email })) ?? [])]} />
          <Input label="Amount (EGP)" type="number" value={deductionForm.amount} onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })} min={0} required />
          <Input label="Date (YYYY-MM-DD)" value={deductionForm.dateEgypt} onChange={(e) => setDeductionForm({ ...deductionForm, dateEgypt: e.target.value })} required />
          <Textarea label="Description" value={deductionForm.description} onChange={(e) => setDeductionForm({ ...deductionForm, description: e.target.value })} required />
          <Button onClick={() => { if (!deductionForm.userId) { toast.error('Employee is required'); return; } if (!deductionForm.amount || Number(deductionForm.amount) <= 0) { toast.error('Amount must be greater than 0'); return; } if (!deductionForm.dateEgypt) { toast.error('Date is required'); return; } if (!deductionForm.description.trim()) { toast.error('Description is required'); return; } deductionMutation.mutate(); }} loading={deductionMutation.isPending} fullWidth>Add Deduction</Button>
        </div>
      </Modal>

      {/* Edit Deduction Modal */}
      <Modal isOpen={showEditDeductionModal} onClose={() => setShowEditDeductionModal(false)} title="Edit Deduction Amount">
        <div className="space-y-4">
          <Input label="New Amount (EGP)" type="number" value={editDeductionForm.amount} onChange={(e) => setEditDeductionForm({ ...editDeductionForm, amount: e.target.value })} min={0} required />
          <Button onClick={() => { if (!editDeductionForm.amount || Number(editDeductionForm.amount) <= 0) { toast.error('Amount must be greater than 0'); return; } editDeductionMutation.mutate(); }} loading={editDeductionMutation.isPending} fullWidth>Update Amount</Button>
        </div>
      </Modal>

      {/* Override Day Record Modal */}
      <Modal isOpen={showOverrideModal} onClose={() => setShowOverrideModal(false)} title="Override Day Record">
        <div className="space-y-4">
          <Input label="Day Percentage (0-100)" type="number" value={overrideForm.dayPercentage} onChange={(e) => setOverrideForm({ ...overrideForm, dayPercentage: e.target.value })} min={0} max={100} required />
          <Textarea label="Admin Notes" value={overrideForm.adminNotes} onChange={(e) => setOverrideForm({ ...overrideForm, adminNotes: e.target.value })} />
          <Button onClick={() => { const pct = Number(overrideForm.dayPercentage); if (isNaN(pct) || pct < 0 || pct > 100) { toast.error('Percentage must be between 0 and 100'); return; } overrideMutation.mutate(); }} loading={overrideMutation.isPending} fullWidth>Override</Button>
        </div>
      </Modal>
    </div>
    </ProtectedRoute>
  );
}
