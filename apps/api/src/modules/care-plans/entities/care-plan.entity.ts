import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { CarePlanSection, RiskAssessment } from '@my-cura/shared-types';

@Entity('care_plans')
@Index(['serviceUserId', 'version'], { unique: true })
export class CarePlanEntity extends BaseEntity {
  @Column({ name: 'service_user_id', type: 'uuid' })
  serviceUserId: string;

  @Column({ default: 1 })
  version: number;

  @Column()
  title: string;

  @Column({ type: 'jsonb' })
  content: Partial<CarePlanSection>;

  @Column({ name: 'risk_assessments', type: 'jsonb', nullable: true })
  riskAssessments?: RiskAssessment[];

  @Column({ type: 'jsonb', nullable: true })
  goals?: string[];

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string;

  @Column({ name: 'next_review_at', type: 'timestamptz', nullable: true })
  nextReviewAt?: Date;

  @Column({ default: 'draft' })
  status: 'draft' | 'active' | 'archived';
}
