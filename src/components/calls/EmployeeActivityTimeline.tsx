'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Clock, Phone } from 'lucide-react';
import { getActivityTimeline } from '@/lib/services/calls';
import {
  ActivityCallDto,
  CallStatus,
  EmployeeActivityTimelineDto,
} from '@/types/api';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

const EGYPT_TIMEZONE = 'Africa/Cairo';
const GAP_OPTIONS = [5, 10, 15, 20, 30].map((value) => ({
  value: String(value),
  label: `${value} minutes`,
}));

function egyptDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: EGYPT_TIMEZONE });
}

function formatTime(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('en-GB', {
    timeZone: EGYPT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-GB', {
    timeZone: EGYPT_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function intervalStyle(startedAt: string, endedAt: string, rangeStart: number, rangeEnd: number): CSSProperties {
  const duration = Math.max(1, rangeEnd - rangeStart);
  const start = Math.max(0, Math.min(100, ((new Date(startedAt).getTime() - rangeStart) / duration) * 100));
  const end = Math.max(0, Math.min(100, ((new Date(endedAt).getTime() - rangeStart) / duration) * 100));
  return {
    left: `${start}%`,
    width: `${Math.max(end - start, 0.35)}%`,
    minWidth: '4px',
  };
}

function callClassName(call: ActivityCallDto): string {
  if (call.isActive) return 'bg-blue-500 animate-pulse border-blue-700';
  if (call.isHistorical && !call.countsTowardGaps) {
    return 'bg-yellow-300 border-yellow-700 border-dashed opacity-90';
  }
  return call.callStatus === CallStatus.ANSWERED
    ? 'bg-green-500 border-green-700'
    : 'bg-orange-400 border-orange-600';
}

function callLabel(call: ActivityCallDto): string {
  const status = call.isActive
    ? 'Active call'
    : call.callStatus === CallStatus.ANSWERED
      ? 'Answered'
      : 'Not answered';
  return `${status}, ${call.clientPhoneNumber}, ${formatTime(call.startedAt)}`;
}

function EmployeeTimelineBar({
  employee,
  rangeStart,
  rangeEnd,
  onSelectCall,
}: {
  employee: EmployeeActivityTimelineDto;
  rangeStart: number;
  rangeEnd: number;
  onSelectCall: (call: ActivityCallDto) => void;
}) {
  return (
    <div className="relative h-11 min-w-[720px] overflow-hidden rounded-md border border-gray-200 bg-white">
      {employee.attendanceSessions.map((session) => (
        <div
          key={session.id}
          className="absolute inset-y-0 bg-gray-100"
          style={intervalStyle(session.clockIn, session.clockOut, rangeStart, rangeEnd)}
          title={`Attendance ${formatTime(session.clockIn)} - ${formatTime(session.clockOut)}`}
        />
      ))}
      {employee.gaps.map((gap) => (
        <div
          key={`${gap.startedAt}-${gap.endedAt}`}
          className={`absolute inset-y-1 rounded-sm ${gap.exceedsThreshold ? 'bg-red-200' : 'bg-gray-100'}`}
          style={intervalStyle(gap.startedAt, gap.endedAt, rangeStart, rangeEnd)}
          title={`Gap without a recorded call: ${formatMinutes(gap.durationMinutes)}`}
        />
      ))}
      {employee.calls.map((call) => (
        <button
          key={call.id}
          type="button"
          aria-label={callLabel(call)}
          title={callLabel(call)}
          className={`absolute inset-y-1 z-10 rounded-sm border ${callClassName(call)} focus:outline-none focus:ring-2 focus:ring-blue-600`}
          style={intervalStyle(call.startedAt!, call.endedAt!, rangeStart, rangeEnd)}
          onClick={() => onSelectCall(call)}
        />
      ))}
    </div>
  );
}

function MobileActivityList({ employee }: { employee: EmployeeActivityTimelineDto }) {
  return (
    <div className="space-y-2 md:hidden">
      {employee.calls.map((call) => (
        <div key={call.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
          <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${callClassName(call)}`} />
          <div>
            <p className="font-medium text-gray-900">{call.clientPhoneNumber}</p>
            <p className="text-gray-500">
              {formatTime(call.startedAt)} · {call.isActive ? 'Active now' : call.isHistorical ? 'Historical' : 'Current'}
              {call.isHistorical && !call.countsTowardGaps ? ' · Pending approval' : ''}
            </p>
          </div>
        </div>
      ))}
      {employee.gaps.filter((gap) => gap.exceedsThreshold).map((gap) => (
        <div key={`${gap.startedAt}-${gap.endedAt}`} className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Gap {formatTime(gap.startedAt)} - {formatTime(gap.endedAt)} ({formatMinutes(gap.durationMinutes)})
        </div>
      ))}
      {employee.calls.length === 0 && employee.gaps.length === 0 ? (
        <p className="text-sm text-gray-500">No activity recorded during attendance.</p>
      ) : null}
    </div>
  );
}

export function EmployeeActivityTimeline({ date }: { date: string }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [gapThresholdMinutes, setGapThresholdMinutes] = useState(10);
  const [selectedCall, setSelectedCall] = useState<{
    employee: EmployeeActivityTimelineDto;
    call: ActivityCallDto;
  } | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['calls', 'activity-timeline', date, gapThresholdMinutes],
    queryFn: () => getActivityTimeline({ date, gapThresholdMinutes }),
    enabled: Boolean(date),
    refetchInterval: date === egyptDateString() ? 30_000 : false,
  });

  const visibleEmployees = useMemo(
    () => data?.employees.filter((employee) => !selectedUserId || employee.userId === selectedUserId) || [],
    [data?.employees, selectedUserId],
  );
  const employeeOptions = useMemo(
    () => [
      { value: '', label: 'All Employees' },
      ...(data?.employees.map((employee) => ({ value: employee.userId, label: employee.email })) || []),
    ],
    [data?.employees],
  );
  const rangeStart = data ? new Date(data.rangeStart).getTime() : 0;
  const rangeEnd = data ? new Date(data.rangeEnd).getTime() : 1;
  const ticks = data
    ? [0, 0.25, 0.5, 0.75, 1].map((ratio) => new Date(rangeStart + (rangeEnd - rangeStart) * ratio).toISOString())
    : [];

  return (
    <div data-testid="employee-activity-timeline" className="space-y-5">
      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            id="activity-employee"
            name="employee"
            label="Employee"
            options={employeeOptions}
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          />
          <Select
            id="activity-gap-threshold"
            name="gapThresholdMinutes"
            label="Highlight gaps at"
            options={GAP_OPTIONS}
            value={String(gapThresholdMinutes)}
            onChange={(event) => setGapThresholdMinutes(Number(event.target.value))}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-500" /> Answered</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-orange-400" /> Not answered</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-500" /> Active</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-yellow-700 bg-yellow-300" /> Historical pending</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-200" /> Gap over threshold</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-gray-200" /> Attendance / short gap</span>
        </div>
      </Card>

      {isError ? (
        <ErrorState message="Unable to load employee activity" onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <CardSkeleton key={item} />)}</div>
      ) : !data || visibleEmployees.length === 0 ? (
        <Card><EmptyState title="No activity data" description="No employees match the selected filters." /></Card>
      ) : (
        <>
          <div className="hidden min-w-[720px] justify-between text-xs text-gray-500 md:flex">
            {ticks.map((tick) => <span key={tick}>{formatTime(tick)}</span>)}
          </div>
          <div className="space-y-4">
            {visibleEmployees.map((employee) => (
              <Card key={employee.userId} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{employee.email}</h3>
                    <p className="text-xs text-gray-500">
                      {employee.currentStatus === 'ON_CALL' ? 'On call now' : employee.attendanceSessions.length ? 'Attendance recorded' : 'No attendance recorded'}
                      {isFetching ? ' · Updating…' : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-5">
                    <span><strong className="text-gray-900">{employee.summary.totalCalls}</strong> calls</span>
                    <span><strong className="text-gray-900">{formatMinutes(employee.summary.totalTalkMinutes)}</strong> talk</span>
                    <span><strong className="text-gray-900">{formatMinutes(employee.summary.totalCycleMinutes)}</strong> cycles</span>
                    <span><strong className="text-red-700">{employee.summary.longGapCount}</strong> long gaps</span>
                    <span><strong className="text-red-700">{formatMinutes(employee.summary.totalLongGapMinutes)}</strong> gap time</span>
                  </div>
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <EmployeeTimelineBar
                    employee={employee}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    onSelectCall={(call) => setSelectedCall({ employee, call })}
                  />
                </div>
                <MobileActivityList employee={employee} />
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        isOpen={Boolean(selectedCall)}
        onClose={() => setSelectedCall(null)}
        title="Call Activity Details"
        size="lg"
      >
        {selectedCall ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Phone className="h-5 w-5" /></span>
              <div>
                <p className="font-semibold text-gray-900">{selectedCall.call.clientPhoneNumber}</p>
                <p className="text-sm text-gray-500">{selectedCall.employee.email}</p>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-gray-500">Source</dt><dd className="font-medium">{selectedCall.call.isHistorical ? 'Historical / outside system' : 'Current system call'}</dd></div>
              <div><dt className="text-gray-500">Status</dt><dd className="font-medium">{selectedCall.call.isActive ? 'Active' : selectedCall.call.callStatus}</dd></div>
              <div><dt className="text-gray-500">Approval</dt><dd className="font-medium">{selectedCall.call.approvalStatus || 'Not submitted yet'}</dd></div>
              <div><dt className="text-gray-500">Counted toward gaps</dt><dd className="font-medium">{selectedCall.call.countsTowardGaps ? 'Yes' : 'No'}</dd></div>
              <div><dt className="text-gray-500">Started</dt><dd className="font-medium">{formatDateTime(selectedCall.call.startedAt)}</dd></div>
              <div><dt className="text-gray-500">{selectedCall.call.isHistorical ? 'Actual end' : 'Report submitted / now'}</dt><dd className="font-medium">{formatDateTime(selectedCall.call.endedAt)}</dd></div>
              <div><dt className="text-gray-500">Talk duration</dt><dd className="font-medium">{selectedCall.call.durationMinutes ? `${selectedCall.call.durationMinutes} min` : '-'}</dd></div>
              <div><dt className="text-gray-500">Cycle duration</dt><dd className="font-medium">{formatMinutes(selectedCall.call.cycleMinutes)}</dd></div>
            </dl>
            {!selectedCall.call.hasRecordedStart ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Start time is unavailable. This legacy record is shown at its report submission time.
              </p>
            ) : null}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3.5 w-3.5" /> Egypt time</span>
              <Link className="text-sm font-medium text-blue-600 hover:underline" href={`/calls?userId=${selectedCall.employee.userId}&date=${date}`}>
                Open call log
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
