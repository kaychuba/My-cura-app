import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

export type ApplicantStage =
  | 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

@Entity('applicants')
@Index(['tenantId', 'stage'])
export class ApplicantEntity extends BaseEntity {
  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'role_applied_for' })
  roleAppliedFor: string;

  @Column({ default: 'applied' })
  stage: ApplicantStage;

  @Column({ name: 'cv_key', nullable: true })
  cvKey?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
