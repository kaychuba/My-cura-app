import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * Append-only trail written by AuditLogInterceptor on every mutating request.
 * Deliberately not a BaseEntity — audit rows are never updated or deleted.
 */
@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'userId', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column()
  action: string;

  @Column({ name: 'resource_type', nullable: true })
  resourceType?: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
