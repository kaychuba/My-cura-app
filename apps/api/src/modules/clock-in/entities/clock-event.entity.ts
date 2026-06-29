import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { ClockEventType } from '@my-cura/shared-types';

@Entity('clock_events')
@Index(['shiftId', 'eventType'])
@Index(['careWorkerId', 'recordedAt'])
export class ClockEventEntity extends BaseEntity {
  @Column({ name: 'shift_id', type: 'uuid' })
  shiftId: string;

  @Column({ name: 'care_worker_id', type: 'uuid' })
  careWorkerId: string;

  @Column({ name: 'event_type', type: 'enum', enum: ClockEventType })
  eventType: ClockEventType;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude?: number;

  @Column({ name: 'gps_accuracy', type: 'decimal', precision: 6, scale: 2, nullable: true })
  gpsAccuracy?: number;

  @Column({ name: 'gps_distance_m', type: 'decimal', precision: 8, scale: 2, nullable: true })
  gpsDistanceM?: number;

  @Column({ name: 'device_id', nullable: true })
  deviceId?: string;

  @Column({ name: 'app_version', nullable: true })
  appVersion?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'is_manual', default: false })
  isManual: boolean;

  @Column({ name: 'manual_reason', nullable: true })
  manualReason?: string;

  @Column({ name: 'manual_by', type: 'uuid', nullable: true })
  manualBy?: string;

  @Column({ name: 'fraud_flag', default: false })
  fraudFlag: boolean;

  @Column({ name: 'fraud_reasons', type: 'simple-array', nullable: true })
  fraudReasons?: string[];
}
