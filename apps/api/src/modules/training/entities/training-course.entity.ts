import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('training_courses')
export class TrainingCourseEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /** How long a completion stays valid; null = never expires. */
  @Column({ name: 'validity_months', type: 'int', nullable: true })
  validityMonths?: number;

  @Column({ default: false })
  mandatory: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
