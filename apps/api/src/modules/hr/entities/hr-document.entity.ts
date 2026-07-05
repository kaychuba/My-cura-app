import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('hr_documents')
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'expiresAt'])
export class HRDocumentEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column()
  type: 'contract' | 'right_to_work' | 'dbs_check' | 'id_document' | 'qualification' | 'reference' | 'other';

  @Column()
  title: string;

  @Column({ name: 'file_key', nullable: true })
  fileKey?: string;

  @Column({ name: 'issued_at', type: 'date', nullable: true })
  issuedAt?: string;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
