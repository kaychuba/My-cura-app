import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('training_records')
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'expiresAt'])
export class TrainingRecordEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @Column({ default: 'assigned' })
  status: 'assigned' | 'completed' | 'expired';

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'certificate_key', nullable: true })
  certificateKey?: string;
}
