import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { LeaveType, LeaveStatus } from '@my-cura/shared-types';

@Entity('leave_requests')
@Index(['tenantId', 'careWorkerId', 'startDate'])
@Index(['tenantId', 'status'])
export class LeaveRequestEntity extends BaseEntity {
  /** User id of the care worker requesting leave (matches shifts.care_worker_id). */
  @Column({ name: 'care_worker_id', type: 'uuid' })
  careWorkerId: string;

  @Column({ name: 'leave_type', type: 'enum', enum: LeaveType })
  leaveType: LeaveType;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  /** Working days requested; supports half days. */
  @Column({ name: 'days_requested', type: 'decimal', precision: 5, scale: 2 })
  daysRequested: number;

  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.PENDING })
  status: LeaveStatus;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'is_paid', default: true })
  isPaid: boolean;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes?: string;
}
