import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('service_users')
export class ServiceUserEntity extends BaseEntity {
  @Column({ name: 'nhs_number_enc', nullable: true })
  nhsNumberEnc?: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: string;

  @Column({ nullable: true })
  gender?: 'female' | 'male' | 'non_binary' | 'prefer_not_to_say';

  /** Why this person needs care, in plain language — shown to carers. */
  @Column({ name: 'condition_summary', type: 'text', nullable: true })
  conditionSummary?: string;

  /** Profile photo URL (uploads arrive with the storage module / AWS). */
  @Column({ name: 'photo_url', nullable: true })
  photoUrl?: string;

  @Column({ name: 'care_commenced_on', type: 'date', nullable: true })
  careCommencedOn?: string;

  @Column({ name: 'hospital_contact', type: 'jsonb', nullable: true })
  hospitalContact?: { name: string; phone?: string; ward?: string };

  @Column({ name: 'pharmacy_contact', type: 'jsonb', nullable: true })
  pharmacyContact?: { name: string; phone?: string; address?: string };

  @Column({ type: 'jsonb' })
  address: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    lat: number;
    lon: number;
  };

  @Column({ name: 'contact_details', type: 'jsonb', nullable: true })
  contactDetails?: Record<string, unknown>;

  @Column({ name: 'funding_source', nullable: true })
  fundingSource?: 'nhs' | 'local_authority' | 'private' | 'combined';

  @Column({ name: 'care_level', nullable: true })
  careLevel?: 'low' | 'medium' | 'high' | 'critical';

  /** Daily care hours the admin has allocated — one care-doc entry per hour. */
  @Column({ name: 'care_hours_per_day', type: 'int', nullable: true })
  careHoursPerDay?: number;

  /** When the care day begins, e.g. '08:00'. */
  @Column({ name: 'care_day_start', nullable: true })
  careDayStart?: string;

  @Column({ default: 'active' })
  status: 'active' | 'inactive' | 'deceased' | 'hospital';

  @Column({ name: 'key_safe_code_enc', nullable: true })
  keySafeCodeEnc?: string;

  @Column({ name: 'gp_details', type: 'jsonb', nullable: true })
  gpDetails?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  allergies?: string[];

  @Column({ name: 'medical_conditions', type: 'jsonb', nullable: true })
  medicalConditions?: string[];

  @Column({ name: 'mobility_needs', type: 'text', nullable: true })
  mobilityNeeds?: string;

  @Column({ name: 'communication_needs', type: 'text', nullable: true })
  communicationNeeds?: string;

  @Column({ name: 'emergency_contacts', type: 'jsonb', nullable: true })
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    isPrimaryContact: boolean;
    hasPortalAccess: boolean;
  }>;
}
