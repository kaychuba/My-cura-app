import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ConsentGivenBy, ConsentStatus, ConsentType } from '@my-cura/shared-types';

/**
 * Append-only consent event log. Rows are never updated or deleted (the
 * database role physically cannot); the newest row per consent type is the
 * current position, everything older is auditable history.
 */
@Entity('service_user_consents')
export class ServiceUserConsentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'service_user_id', type: 'uuid' })
  serviceUserId: string;

  @Column({ name: 'consent_type', type: 'varchar', length: 40 })
  consentType: ConsentType;

  @Column({ type: 'varchar', length: 20 })
  status: ConsentStatus;

  @Column({ name: 'given_by', type: 'varchar', length: 30 })
  givenBy: ConsentGivenBy;

  @Column({ name: 'given_by_name', type: 'varchar', length: 160, nullable: true })
  givenByName?: string | null;

  @Column({ name: 'capacity_assessed', default: false })
  capacityAssessed: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'review_by', type: 'date', nullable: true })
  reviewBy?: string | null;

  @Column({ name: 'recorded_by', type: 'uuid' })
  recordedBy: string;

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;
}
