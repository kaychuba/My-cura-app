import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

export type CareExecution = 'executed' | 'partially_executed' | 'not_executed' | 'other';

/**
 * One written care-documentation entry per allocated hour. The admin sets
 * how many hours a service user gets; the carer documents each one.
 */
@Entity('care_doc_entries')
@Index(['tenantId', 'serviceUserId', 'slotAt'], { unique: true })
@Index(['tenantId', 'careWorkerId', 'slotAt'])
export class CareDocEntryEntity extends BaseEntity {
  @Column({ name: 'service_user_id', type: 'uuid' })
  serviceUserId: string;

  @Column({ name: 'care_worker_id', type: 'uuid' })
  careWorkerId: string;

  /** The hour this entry documents (start of the hour). */
  @Column({ name: 'slot_at', type: 'timestamptz' })
  slotAt: Date;

  @Column({ type: 'text' })
  documentation: string;

  @Column()
  execution: CareExecution;

  @Column()
  reason: string;
}
