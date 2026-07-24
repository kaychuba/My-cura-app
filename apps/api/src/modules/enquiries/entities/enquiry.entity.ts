import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type EnquiryType = 'demo' | 'sales' | 'general' | 'support';

/** Prospect enquiry from the public marketing site. Append-only, no tenant. */
@Entity('enquiries')
export class EnquiryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  organisation?: string | null;

  @Column({ name: 'enquiry_type', type: 'varchar', length: 20, default: 'general' })
  enquiryType: EnquiryType;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
