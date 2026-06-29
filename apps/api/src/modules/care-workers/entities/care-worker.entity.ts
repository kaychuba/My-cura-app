import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { EmploymentType } from '@my-cura/shared-types';

@Entity('care_workers')
@Index(['userId'], { unique: true })
export class CareWorkerEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'employee_id', nullable: true })
  employeeId?: string;

  @Column({ name: 'employment_type', type: 'enum', enum: EmploymentType })
  employmentType: EmploymentType;

  @Column({ name: 'contract_start', type: 'date', nullable: true })
  contractStart?: string;

  @Column({ name: 'contract_end', type: 'date', nullable: true })
  contractEnd?: string;

  @Column({ name: 'hourly_rate', type: 'decimal', precision: 10, scale: 4 })
  hourlyRate: number;

  @Column({ name: 'weekend_rate', type: 'decimal', precision: 10, scale: 4, nullable: true })
  weekendRate?: number;

  @Column({ name: 'bank_holiday_rate', type: 'decimal', precision: 10, scale: 4, nullable: true })
  bankHolidayRate?: number;

  @Column({ name: 'sleep_in_rate', type: 'decimal', precision: 10, scale: 4, nullable: true })
  sleepInRate?: number;

  @Column({ name: 'live_in_daily_rate', type: 'decimal', precision: 10, scale: 4, nullable: true })
  liveInDailyRate?: number;

  @Column({ name: 'pay_frequency', default: 'weekly' })
  payFrequency: 'weekly' | 'biweekly' | 'monthly';

  @Column({ name: 'ni_number_enc', nullable: true })
  niNumberEnc?: string;

  @Column({ name: 'tax_code', nullable: true })
  taxCode?: string;

  @Column({ name: 'ni_category', default: 'A' })
  niCategory: string;

  @Column({ name: 'pension_opt_in', default: true })
  pensionOptIn: boolean;

  @Column({ name: 'student_loan_plan', nullable: true })
  studentLoanPlan?: string;

  @Column({ name: 'ssn_enc', nullable: true })
  ssnEnc?: string;

  @Column({ name: 'federal_filing_status', nullable: true })
  federalFilingStatus?: string;

  @Column({ name: 'bank_account_enc', type: 'jsonb', nullable: true })
  bankAccountEnc?: Record<string, unknown>;

  @Column({ name: 'dbs_cert_number', nullable: true })
  dbsCertNumber?: string;

  @Column({ name: 'dbs_issued_at', type: 'date', nullable: true })
  dbsIssuedAt?: string;

  @Column({ name: 'dbs_expires_at', type: 'date', nullable: true })
  dbsExpiresAt?: string;

  @Column({ name: 'dbs_type', nullable: true })
  dbsType?: 'basic' | 'standard' | 'enhanced';

  @Column({ name: 'rtw_expires_at', type: 'date', nullable: true })
  rtwExpiresAt?: string;

  @Column({ name: 'vehicle_reg', nullable: true })
  vehicleReg?: string;

  @Column({ name: 'vehicle_insured', default: false })
  vehicleInsured: boolean;

  @Column({ name: 'emergency_contact', type: 'jsonb', nullable: true })
  emergencyContact?: Record<string, unknown>;

  @Column({ type: 'simple-array', nullable: true })
  skills?: string[];

  @Column({ name: 'ytd_gross', type: 'decimal', precision: 12, scale: 2, default: 0 })
  ytdGross: number;

  @Column({ name: 'ytd_tax', type: 'decimal', precision: 12, scale: 2, default: 0 })
  ytdTax: number;

  @Column({ name: 'ytd_ni', type: 'decimal', precision: 12, scale: 2, default: 0 })
  ytdNi: number;
}
