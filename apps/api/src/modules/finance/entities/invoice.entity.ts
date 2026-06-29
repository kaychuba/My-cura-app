import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { InvoiceStatus } from '@my-cura/shared-types';
import { InvoiceLineItemEntity } from './invoice-line-item.entity';

@Entity('invoices')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'status'])
@Index(['serviceUserId', 'tenantId'])
export class InvoiceEntity extends BaseEntity {
  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @Column({ name: 'service_user_id', type: 'uuid' })
  serviceUserId: string;

  @Column({ name: 'service_user_name' })
  serviceUserName: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({ name: 'subtotal', type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'total', type: 'decimal', precision: 14, scale: 2, default: 0 })
  total: number;

  @Column({ length: 3, default: 'GBP' })
  currency: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @Column({ name: 'stripe_invoice_id', nullable: true })
  stripeInvoiceId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => InvoiceLineItemEntity, (item) => item.invoice, { cascade: true, eager: true })
  lineItems: InvoiceLineItemEntity[];
}
