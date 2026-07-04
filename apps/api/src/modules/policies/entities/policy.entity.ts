import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('policies')
@Index(['tenantId', 'publishedAt'])
export class PolicyEntity extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  /** Full policy text (markdown/plain). Either content or externalUrl must be set. */
  @Column({ type: 'text', nullable: true })
  content?: string;

  /** Link to an externally hosted policy (company intranet, PDF host, …). */
  @Column({ name: 'external_url', type: 'varchar', nullable: true })
  externalUrl?: string;

  /** S3 key for an uploaded document — wired up once AWS storage is configured. */
  @Column({ name: 'document_s3_key', type: 'varchar', nullable: true })
  documentS3Key?: string;

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Carers must acknowledge reading this policy. */
  @Column({ name: 'requires_acknowledgement', default: true })
  requiresAcknowledgement: boolean;
}
