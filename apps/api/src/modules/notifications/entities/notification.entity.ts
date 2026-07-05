import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('notifications')
@Index(['tenantId', 'userId', 'createdAt'])
export class NotificationEntity extends BaseEntity {
  /** Recipient. */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** e.g. medication_alert, escalation, expense_update, training_assigned */
  @Column()
  type: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  /** Optional payload for deep-linking (ids, routes). */
  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, unknown>;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date;
}
