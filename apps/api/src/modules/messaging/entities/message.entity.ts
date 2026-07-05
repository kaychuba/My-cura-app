import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('messages')
@Index(['tenantId', 'conversationId', 'createdAt'])
export class MessageEntity extends BaseEntity {
  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @Column({ type: 'text' })
  body: string;
}
