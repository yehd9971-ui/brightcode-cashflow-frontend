'use client';

import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Role, UserResponseDto } from '@/types/api';
import { CRM_STAGE_OPTIONS } from '@/lib/crm-stages';

interface WorkbenchFiltersProps {
  canFilterEmployee: boolean;
  salesUsers?: UserResponseDto[];
  currentUser?: UserResponseDto | null;
  viewUserId: string;
  stage: string;
  priority: string;
  onViewUserChange: (value: string) => void;
  onStageChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onReset: () => void;
}

const stageOptions = [
  { value: '', label: 'All stages' },
  ...CRM_STAGE_OPTIONS,
];

const priorityOptions = [
  { value: '', label: 'All priorities' },
  { value: '1', label: 'Low' },
  { value: '2', label: 'Normal' },
  { value: '3', label: 'High' },
  { value: '4', label: 'Urgent' },
];

export function WorkbenchFilters({
  canFilterEmployee,
  salesUsers,
  currentUser,
  viewUserId,
  stage,
  priority,
  onViewUserChange,
  onStageChange,
  onPriorityChange,
  onReset,
}: WorkbenchFiltersProps) {
  const employeeMap = new Map<string, UserResponseDto>();
  if (currentUser?.role === Role.SALES || currentUser?.role === Role.SALES_MANAGER) {
    employeeMap.set(currentUser.id, currentUser);
  }
  (salesUsers ?? [])
    .filter((item) => item.role === Role.SALES || item.role === Role.SALES_MANAGER)
    .forEach((item) => employeeMap.set(item.id, item));

  const employeeOptions = [
    { value: '', label: 'All employees' },
    ...Array.from(employeeMap.values()).map((item) => ({ value: item.id, label: item.email })),
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm md:flex-row md:items-end">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 md:pb-2">
        <Filter className="h-4 w-4" />
        Filters
      </div>
      {canFilterEmployee && (
        <Select
          aria-label="Employee filter"
          value={viewUserId}
          onChange={(event) => onViewUserChange(event.target.value)}
          options={employeeOptions}
        />
      )}
      <Select
        aria-label="Stage filter"
        value={stage}
        onChange={(event) => onStageChange(event.target.value)}
        options={stageOptions}
      />
      <Select
        aria-label="Priority filter"
        value={priority}
        onChange={(event) => onPriorityChange(event.target.value)}
        options={priorityOptions}
      />
      <Button type="button" variant="outline" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}
