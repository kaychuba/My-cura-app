import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('conversations')
@Index(['tenantId', 'lastMessageAt'])
export class ConversationEntity extends BaseEntity {
  @Column({ nullable: true })
  title?: string;

  /** All members, including the creator. */
  @Column({ name: 'participant_ids', type: 'jsonb' })
  participantIds: string[];

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt?: Date;
}
