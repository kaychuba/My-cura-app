import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('import_jobs')
@Index(['tenantId', 'createdAt'])
export class ImportJobEntity extends BaseEntity {
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'entity_type' })
  entityType: 'service_users' | 'care_workers' | 'medications';

  @Column({ name: 'file_name', nullable: true })
  fileName?: string;

  @Column({ nullable: true })
  template?: string;

  @Column({ name: 'row_count', type: 'int', default: 0 })
  rowCount: number;

  @Column({ name: 'created_count', type: 'int', default: 0 })
  createdCount: number;

  @Column({ name: 'updated_count', type: 'int', default: 0 })
  updatedCount: number;

  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount: number;

  @Column({ type: 'jsonb', nullable: true })
  errors?: { row: number; message: string }[];
}
