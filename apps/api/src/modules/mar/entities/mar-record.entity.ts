import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { MARStatus } from '@my-cura/shared-types';

@Entity('mar_records')
@Index(['medicationId', 'scheduledAt'])
@Index(['serviceUserId', 'scheduledAt'])
export class MARRecordEntity extends BaseEntity {
  @Column({ name: 'medication_id', type: 'uuid' })
  medicationId: string;

  @Column({ name: 'service_user_id', type: 'uuid' })
  serviceUserId: string;

  /** Null while the dose is only scheduled; set when a carer records it. */
  @Column({ name: 'care_worker_id', type: 'uuid', nullable: true })
  careWorkerId?: string;

  @Column({ name: 'shift_id', type: 'uuid', nullable: true })
  shiftId?: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  /** The time the carer says they gave it (their "time completed" selection). */
  @Column({ name: 'administered_at', type: 'timestamptz', nullable: true })
  administeredAt?: Date;

  /** Server timestamp of when the carer submitted the record. */
  @Column({ name: 'recorded_at', type: 'timestamptz', nullable: true })
  recordedAt?: Date;

  /** Carer's initials, entered as their signature. */
  @Column({ nullable: true })
  initials?: string;

  /** Witness initials for controlled drugs (when no witness account is picked). */
  @Column({ name: 'witness_initials', nullable: true })
  witnessInitials?: string;

  @Column({ type: 'enum', enum: MARStatus })
  status: MARStatus;

  @Column({ name: 'dose_given', nullable: true })
  doseGiven?: string;

  @Column({ name: 'reason_not_given', nullable: true })
  reasonNotGiven?: string;

  @Column({ name: 'side_effects', nullable: true })
  sideEffects?: string;

  @Column({ name: 'signature_svg_enc', type: 'text', nullable: true })
  signatureSvgEnc?: string;

  @Column({ name: 'witness_id', type: 'uuid', nullable: true })
  witnessId?: string;

  @Column({ name: 'witness_sig_enc', type: 'text', nullable: true })
  witnessSigEnc?: string;

  @Column({ name: 'barcode_verified', default: false })
  barcodeVerified: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
