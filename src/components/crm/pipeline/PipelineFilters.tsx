'use client';

import { Filter } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Role, UserResponseDto } from '@/types/api';

interface PipelineFiltersProps {
  users: UserResponseDto[];
  ownerId: string;
  priority: string;
  onOwnerChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
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
  ownerId,
  priority,
  onOwnerChange,
  onPriorityChange,
}: PipelineFiltersProps) {
  const employeeOptions = [
    { value: '', label: 'All employees' },
    ...users
      .filter((user) => user.role === Role.SALES || user.role === Role.SALES_MANAGER)
      .map((user) => ({ value: user.id, label: user.email })),
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-end">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 sm:pb-2">
        <Filter className="h-4 w-4" />
        Filters
      </div>
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <Select
          id="pipeline-employee-filter"
          data-testid="pipeline-employee-filter"
          aria-label="Employee filter"
          options={employeeOptions}
          value={ownerId}
          onChange={(event) => onOwnerChange(event.target.value)}
        />
        <Select
          id="pipeline-priority-filter"
          data-testid="pipeline-priority-filter"
          aria-label="Priority filter"
          options={priorityOptions}
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value)}
        />
      </div>
    </div>
  );
}
