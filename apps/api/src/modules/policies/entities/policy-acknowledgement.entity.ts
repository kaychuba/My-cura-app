import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('policy_acknowledgements')
@Index(['policyId', 'userId'], { unique: true })
export class PolicyAcknowledgementEntity extends BaseEntity {
  @Column({ name: 'policy_id', type: 'uuid' })
  policyId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'acknowledged_at', type: 'timestamptz' })
  acknowledgedAt: Date;
}
