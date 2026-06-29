import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { InvoiceEntity } from './invoice.entity';

@Entity('invoice_line_items')
export class InvoiceLineItemEntity extends BaseEntity {
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => InvoiceEntity, (inv) => inv.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @Column()
  description: string;

  @Column({ name: 'shift_id', type: 'uuid', nullable: true })
  shiftId?: string;

  @Column({ name: 'shift_date', type: 'date', nullable: true })
  shiftDate?: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  total: number;
}
