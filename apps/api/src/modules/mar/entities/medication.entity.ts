import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { MedicationFormulation, MedicationRoute } from '@my-cura/shared-types';

@Entity('medications')
export class MedicationEntity extends BaseEntity {
  @Column({ name: 'service_user_id', type: 'uuid' })
  serviceUserId: string;

  @Column()
  name: string;

  @Column({ name: 'generic_name', nullable: true })
  genericName?: string;

  /** What the medication is for, in plain language — set by the admin. */
  @Column({ type: 'text', nullable: true })
  purpose?: string;

  @Column()
  dosage: string;

  /** e.g. "1 tablet", "5 ml", "2 puffs" — set by the admin. */
  @Column({ nullable: true })
  quantity?: string;

  @Column({ type: 'enum', enum: MedicationFormulation, nullable: true })
  formulation?: MedicationFormulation;

  /** PRN = "as needed" — no fixed schedule; carers give it when required. */
  @Column({ name: 'is_prn', default: false })
  isPrn: boolean;

  /** When/why to give it, e.g. "For pain — max 4 doses in 24 hours". */
  @Column({ name: 'prn_instructions', type: 'text', nullable: true })
  prnInstructions?: string;

  @Column()
  frequency: string;

  @Column({ name: 'times_of_day', type: 'simple-array', nullable: true })
  timesOfDay?: string[];

  @Column({ type: 'enum', enum: MedicationRoute })
  route: MedicationRoute;

  @Column({ nullable: true })
  prescriber?: string;

  @Column({ name: 'prescriber_contact', nullable: true })
  prescriberContact?: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string;

  @Column({ nullable: true })
  barcode?: string;

  @Column({ name: 'stock_level', nullable: true })
  stockLevel?: number;

  @Column({ name: 'storage_instructions', type: 'text', nullable: true })
  storageInstructions?: string;

  @Column({ name: 'is_controlled', default: false })
  isControlled: boolean;

  @Column({ name: 'cd_schedule', nullable: true })
  cdSchedule?: 'schedule_2' | 'schedule_3' | 'schedule_4' | 'schedule_5';

  @Column({ default: 'active' })
  status: 'active' | 'discontinued' | 'on_hold';
}
