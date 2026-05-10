'use client';

import { Filter } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Role, UserResponseDto } from '@/types/api';

interface PipelineFiltersProps {
  users: UserResponseDto[];
  currentUser?: UserResponseDto | null;
  ownerId: string;
  priority: string;
  phoneSearch: string;
  allowAllEmployees?: boolean;
  onOwnerChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onPhoneSearchChange: (value: string) => void;
}

const priorityOptions = [
  { value: '', label: 'All priorities' },
  { value: '1', label: 'Low' },
  { value: '2', label: 'Normal' },
  { value: '3', label: 'High' },
  { value: '4', label: 'Urgent' },
];

export function PipelineFilters({
  users,
  currentUser,
  ownerId,
  priority,
  phoneSearch,
  allowAllEmployees = true,
  onOwnerChange,
  onPriorityChange,
  onPhoneSearchChange,
}: PipelineFiltersProps) {
  const phoneSearchDigits = phoneSearch.replace(/\D/g, '');
  const phoneSearchError =
    phoneSearchDigits.length > 0 && phoneSearchDigits.length < 5
      ? 'Enter at least 5 digits'
      : undefined;
  const employeeMap = new Map<string, UserResponseDto>();
  if (
    currentUser?.role === Role.ADMIN ||
    currentUser?.role === Role.SALES ||
    currentUser?.role === Role.SALES_MANAGER
  ) {
    employeeMap.set(currentUser.id, currentUser);
  }
  users
    .filter((user) => user.role === Role.SALES || user.role === Role.SALES_MANAGER)
    .forEach((user) => employeeMap.set(user.id, user));

  const employeeOptions = [
    ...(allowAllEmployees ? [{ value: '', label: 'All employees' }] : []),
    ...Array.from(employeeMap.values()).map((user) => ({ value: user.id, label: user.email })),
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-end">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 sm:pb-2">
        <Filter className="h-4 w-4" />
        Filters
      </div>
      <div className="grid flex-1 gap-3 lg:grid-cols-[1fr_1fr_1.2fr]">
        <Select
          id="pipeline-employee-filter"
          data-testid="pipeline-employee-filter"
          aria-label="Employee filter"
          options={employeeOptions}
          value={ownerId}
          className="min-h-11 text-base sm:min-h-0 sm:text-sm"
          onChange={(event) => onOwnerChange(event.target.value)}
        />
        <Select
          id="pipeline-priority-filter"
          data-testid="pipeline-priority-filter"
          aria-label="Priority filter"
          options={priorityOptions}
          value={priority}
          className="min-h-11 text-base sm:min-h-0 sm:text-sm"
          onChange={(event) => onPriorityChange(event.target.value)}
        />
        <Input
          id="pipeline-phone-search"
          data-testid="pipeline-phone-search"
          aria-label="Phone search"
          inputMode="numeric"
          placeholder="Search phone, min 5 digits"
          value={phoneSearch}
          error={phoneSearchError}
          className="min-h-11 text-base sm:min-h-0 sm:text-sm"
          onChange={(event) => onPhoneSearchChange(event.target.value)}
        />
      </div>
    </div>
  );
}
