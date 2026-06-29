import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { Country, PayrollStatus } from '@my-cura/shared-types';

@Entity('payroll_periods')
@Index(['tenantId', 'periodStart', 'periodEnd'], { unique: true })
export class PayrollPeriodEntity extends BaseEntity {
  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({ name: 'pay_date', type: 'date' })
  payDate: string;

  @Column({ type: 'enum', enum: Country })
  country: Country;

  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status: PayrollStatus;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date;

  @Column({ name: 'total_gross', type: 'decimal', precision: 14, scale: 2, nullable: true })
  totalGross?: number;

  @Column({ name: 'total_net', type: 'decimal', precision: 14, scale: 2, nullable: true })
  totalNet?: number;

  @Column({ name: 'worker_count', nullable: true })
  workerCount?: number;
}
