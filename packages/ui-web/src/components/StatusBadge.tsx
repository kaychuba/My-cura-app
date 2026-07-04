import { Badge } from './Badge';
import { ShiftStatus, MARStatus } from '@my-cura/shared-types';

const shiftStatusMap: Record<ShiftStatus, { color: 'blue' | 'green' | 'amber' | 'red' | 'gray'; label: string }> = {
  [ShiftStatus.UNASSIGNED]: { color: 'gray', label: 'Unassigned' },
  [ShiftStatus.ASSIGNED]: { color: 'blue', label: 'Assigned' },
  [ShiftStatus.CONFIRMED]: { color: 'blue', label: 'Confirmed' },
  [ShiftStatus.IN_PROGRESS]: { color: 'green', label: 'In Progress' },
  [ShiftStatus.COMPLETED]: { color: 'gray', label: 'Completed' },
  [ShiftStatus.CANCELLED]: { color: 'amber', label: 'Cancelled' },
  [ShiftStatus.NO_SHOW]: { color: 'red', label: 'No Show' },
};

const marStatusMap: Record<MARStatus, { color: 'green' | 'red' | 'amber' | 'gray' | 'purple'; label: string }> = {
  [MARStatus.SCHEDULED]: { color: 'purple', label: 'Scheduled' },
  [MARStatus.GIVEN]: { color: 'green', label: 'Administered' },
  [MARStatus.PARENT_ADMINISTERED]: { color: 'green', label: 'Parent Administered' },
  [MARStatus.SELF_ADMINISTERED]: { color: 'green', label: 'Self-Administered' },
  [MARStatus.ADMINISTERED_BY_GP]: { color: 'green', label: 'Administered by GP' },
  [MARStatus.REFUSED]: { color: 'red', label: 'Refused' },
  [MARStatus.NOT_ADMINISTERED]: { color: 'amber', label: 'Not Administered' },
  [MARStatus.NOT_AVAILABLE]: { color: 'amber', label: 'Not Available' },
  [MARStatus.OTHER]: { color: 'purple', label: 'Other' },
  [MARStatus.WASTE]: { color: 'gray', label: 'Waste' },
};

export function ShiftStatusBadge({ status }: { status: ShiftStatus }) {
  const cfg = shiftStatusMap[status] ?? { color: 'gray' as const, label: status };
  return <Badge color={cfg.color} dot>{cfg.label}</Badge>;
}

export function MARStatusBadge({ status }: { status: MARStatus }) {
  const cfg = marStatusMap[status] ?? { color: 'gray' as const, label: status };
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
}
