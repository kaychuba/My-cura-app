import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('payroll_records')
@Index(['periodId', 'careWorkerId'], { unique: true })
export class PayrollRecordEntity extends BaseEntity {
  @Column({ name: 'period_id', type: 'uuid' })
  periodId: string;

  @Column({ name: 'care_worker_id', type: 'uuid' })
  careWorkerId: string;

  @Column({ name: 'hours_regular', type: 'decimal', precision: 8, scale: 2, default: 0 })
  hoursRegular: number;

  @Column({ name: 'hours_overtime', type: 'decimal', precision: 8, scale: 2, default: 0 })
  hoursOvertime: number;

  @Column({ name: 'hours_bank_holiday', type: 'decimal', precision: 8, scale: 2, default: 0 })
  hoursBankHoliday: number;

  @Column({ name: 'hours_sleep_in', type: 'decimal', precision: 8, scale: 2, default: 0 })
  hoursSleepIn: number;

  @Column({ name: 'gross_pay', type: 'decimal', precision: 12, scale: 2 })
  grossPay: number;

  // UK fields
  @Column({ name: 'paye_tax', type: 'decimal', precision: 12, scale: 2, nullable: true })
  payeTax?: number;

  @Column({ name: 'employee_ni', type: 'decimal', precision: 12, scale: 2, nullable: true })
  employeeNI?: number;

  @Column({ name: 'employer_ni', type: 'decimal', precision: 12, scale: 2, nullable: true })
  employerNI?: number;

  @Column({ name: 'employee_pension', type: 'decimal', precision: 12, scale: 2, nullable: true })
  employeePension?: number;

  @Column({ name: 'employer_pension', type: 'decimal', precision: 12, scale: 2, nullable: true })
  employerPension?: number;

  @Column({ name: 'ssp_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  sspAmount?: number;

  @Column({ name: 'smp_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  smpAmount?: number;

  @Column({ name: 'student_loan', type: 'decimal', precision: 12, scale: 2, nullable: true })
  studentLoan?: number;

  // US fields
  @Column({ name: 'federal_income_tax', type: 'decimal', precision: 12, scale: 2, nullable: true })
  federalIncomeTax?: number;

  @Column({ name: 'state_income_tax', type: 'decimal', precision: 12, scale: 2, nullable: true })
  stateIncomeTax?: number;

  @Column({ name: 'social_security_ee', type: 'decimal', precision: 12, scale: 2, nullable: true })
  socialSecurityEE?: number;

  @Column({ name: 'social_security_er', type: 'decimal', precision: 12, scale: 2, nullable: true })
  socialSecurityER?: number;

  @Column({ name: 'medicare_ee', type: 'decimal', precision: 12, scale: 2, nullable: true })
  medicareEE?: number;

  @Column({ name: 'medicare_er', type: 'decimal', precision: 12, scale: 2, nullable: true })
  medicareER?: number;

  @Column({ name: 'futa', type: 'decimal', precision: 12, scale: 2, nullable: true })
  futa?: number;

  // Common
  @Column({ name: 'expenses_reimbursed', type: 'decimal', precision: 12, scale: 2, default: 0 })
  expensesReimbursed: number;

  @Column({ name: 'other_additions', type: 'jsonb', default: '[]' })
  otherAdditions: Array<{ label: string; amount: number }>;

  @Column({ name: 'other_deductions', type: 'jsonb', default: '[]' })
  otherDeductions: Array<{ label: string; amount: number }>;

  @Column({ name: 'net_pay', type: 'decimal', precision: 12, scale: 2 })
  netPay: number;

  @Column({ name: 'payslip_s3_key', nullable: true })
  payslipS3Key?: string;

  @Column({ name: 'payslip_sent_at', type: 'timestamptz', nullable: true })
  payslipSentAt?: Date;

  @Column({ default: 'draft' })
  status: 'draft' | 'approved' | 'paid';
}
