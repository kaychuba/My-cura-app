import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('expenses')
@Index(['tenantId', 'careWorkerId', 'createdAt'])
@Index(['tenantId', 'status'])
export class ExpenseEntity extends BaseEntity {
  @Column({ name: 'care_worker_id', type: 'uuid' })
  careWorkerId: string;

  @Column()
  category: 'mileage' | 'travel' | 'supplies' | 'meals' | 'other';

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: string;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: string;

  @Column({ name: 'receipt_key', nullable: true })
  receiptKey?: string;

  @Column({ default: 'submitted' })
  status: 'submitted' | 'approved' | 'rejected' | 'paid';

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote?: string;
}
