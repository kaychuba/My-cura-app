import React from 'react';
import { Badge } from './Badge';
import { ShiftStatus, MARStatus, LeaveStatus } from '@my-cura/shared-types';

const shiftStatusMap: Record<ShiftStatus, { color: 'blue' | 'green' | 'amber' | 'red' | 'gray'; label: string }> = {
  [ShiftStatus.SCHEDULED]: { color: 'blue', label: 'Scheduled' },
  [ShiftStatus.IN_PROGRESS]: { color: 'green', label: 'In Progress' },
  [ShiftStatus.COMPLETED]: { color: 'gray', label: 'Completed' },
  [ShiftStatus.MISSED]: { color: 'red', label: 'Missed' },
  [ShiftStatus.CANCELLED]: { color: 'amber', label: 'Cancelled' },
  [ShiftStatus.PUBLISHED]: { color: 'blue', label: 'Published' },
};

const marStatusMap: Record<MARStatus, { color: 'green' | 'red' | 'amber' | 'gray' | 'purple'; label: string }> = {
  [MARStatus.GIVEN]: { color: 'green', label: 'Given' },
  [MARStatus.REFUSED]: { color: 'red', label: 'Refused' },
  [MARStatus.NOT_AVAILABLE]: { color: 'amber', label: 'Not Available' },
  [MARStatus.OMITTED]: { color: 'amber', label: 'Omitted' },
  [MARStatus.PRN_NOT_REQUIRED]: { color: 'gray', label: 'PRN Not Required' },
  [MARStatus.PRN_GIVEN]: { color: 'green', label: 'PRN Given' },
};

export function ShiftStatusBadge({ status }: { status: ShiftStatus }) {
  const cfg = shiftStatusMap[status] ?? { color: 'gray' as const, label: status };
  return <Badge color={cfg.color} dot>{cfg.label}</Badge>;
}

export function MARStatusBadge({ status }: { status: MARStatus }) {
  const cfg = marStatusMap[status] ?? { color: 'gray' as const, label: status };
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
}
