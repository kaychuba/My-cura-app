import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { ShiftType, ShiftStatus } from '@my-cura/shared-types';

@Entity('shifts')
@Index(['tenantId', 'careWorkerId', 'scheduledStart'])
@Index(['tenantId', 'serviceUserId', 'scheduledStart'])
@Index(['tenantId', 'status'])
@Index(['recurrenceGroupId'])
export class ShiftEntity extends BaseEntity {
  @Column({ name: 'service_user_id', type: 'uuid' })
  serviceUserId: string;

  @Column({ name: 'care_worker_id', type: 'uuid', nullable: true })
  careWorkerId?: string;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId?: string;

  @Column({ name: 'scheduled_start', type: 'timestamptz' })
  scheduledStart: Date;

  @Column({ name: 'scheduled_end', type: 'timestamptz' })
  scheduledEnd: Date;

  @Column({ name: 'shift_type', type: 'enum', enum: ShiftType })
  shiftType: ShiftType;

  @Column({ type: 'enum', enum: ShiftStatus, default: ShiftStatus.UNASSIGNED })
  status: ShiftStatus;

  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurrence_rule', nullable: true })
  recurrenceRule?: string;

  @Column({ name: 'recurrence_group_id', type: 'uuid', nullable: true })
  recurrenceGroupId?: string;

  @Column({ name: 'location_address', type: 'jsonb', nullable: true })
  locationAddress?: Record<string, unknown>;

  @Column({ name: 'location_lat', type: 'decimal', precision: 9, scale: 6, nullable: true })
  locationLat?: number;

  @Column({ name: 'location_lon', type: 'decimal', precision: 9, scale: 6, nullable: true })
  locationLon?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'pay_rate_override', type: 'decimal', precision: 10, scale: 4, nullable: true })
  payRateOverride?: number;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;
}
