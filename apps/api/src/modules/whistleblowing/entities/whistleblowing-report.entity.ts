import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

export type WhistleblowingCategory =
  | 'abuse_or_neglect'
  | 'medication_practice'
  | 'health_and_safety'
  | 'fraud_or_theft'
  | 'management_conduct'
  | 'discrimination'
  | 'other';

export type WhistleblowingStatus = 'submitted' | 'under_review' | 'investigating' | 'closed';

@Entity('whistleblowing_reports')
@Index(['tenantId', 'status'])
export class WhistleblowingReportEntity extends BaseEntity {
  /** NULL when the report was submitted anonymously — deliberately never recorded. */
  @Column({ name: 'reporter_id', type: 'uuid', nullable: true })
  reporterId?: string | null;

  @Column({ type: 'varchar' })
  category: WhistleblowingCategory;

  @Column({ type: 'text' })
  description: string;

  /** Free-text: when/where it happened, who was involved (as the reporter chooses to say). */
  @Column({ type: 'text', nullable: true })
  context?: string;

  @Column({ type: 'varchar', default: 'submitted' })
  status: WhistleblowingStatus;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes?: string;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date;
}
