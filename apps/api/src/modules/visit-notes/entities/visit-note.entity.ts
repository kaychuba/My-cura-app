import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { EscalationLevel } from '@my-cura/shared-types';

@Entity('visit_notes')
@Index(['shiftId'])
@Index(['serviceUserId', 'createdAt'])
export class VisitNoteEntity extends BaseEntity {
  @Column({ name: 'shift_id', type: 'uuid' })
  shiftId: string;

  @Column({ name: 'care_worker_id', type: 'uuid' })
  careWorkerId: string;

  @Column({ name: 'service_user_id', type: 'uuid' })
  serviceUserId: string;

  @Column({ type: 'text', nullable: true })
  narrative?: string;

  @Column({ nullable: true })
  mood?: 'happy' | 'content' | 'neutral' | 'anxious' | 'distressed' | 'agitated';

  @Column({ nullable: true })
  appetite?: 'good' | 'fair' | 'poor' | 'refused';

  @Column({ name: 'fluid_intake_ml', nullable: true })
  fluidIntakeMl?: number;

  @Column({ nullable: true })
  continence?: 'dry' | 'continent' | 'incontinent';

  @Column({ name: 'pain_level', type: 'int', nullable: true })
  painLevel?: number;

  @Column({ name: 'sleep_quality', nullable: true })
  sleepQuality?: 'good' | 'fair' | 'poor';

  @Column({ name: 'mobility_notes', type: 'text', nullable: true })
  mobilityNotes?: string;

  @Column({ name: 'attachment_keys', type: 'simple-array', nullable: true })
  attachmentKeys?: string[];

  @Column({ name: 'escalation_level', type: 'enum', enum: EscalationLevel, default: EscalationLevel.NONE })
  escalationLevel: EscalationLevel;

  @Column({ name: 'escalation_status', default: 'none' })
  escalationStatus: 'none' | 'raised' | 'acknowledged' | 'resolved' | 'closed';

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt?: Date;

  @Column({ name: 'escalation_notes', type: 'text', nullable: true })
  escalationNotes?: string;
}
