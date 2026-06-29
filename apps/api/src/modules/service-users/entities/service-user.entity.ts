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
