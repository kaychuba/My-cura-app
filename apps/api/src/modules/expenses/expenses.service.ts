import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseEntity } from './entities/expense.entity';
import { NotificationsService } from '../notifications/notifications.service';

export interface SubmitExpenseDto {
  category: ExpenseEntity['category'];
  description: string;
  amount: number;
  expenseDate: string;
  receiptKey?: string;
}

const CATEGORIES: ExpenseEntity['category'][] = ['mileage', 'travel', 'supplies', 'meals', 'other'];

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(ExpenseEntity)
    private expenseRepo: Repository<ExpenseEntity>,
    private notifications: NotificationsService,
  ) {}

  async submit(tenantId: string, careWorkerId: string, dto: SubmitExpenseDto): Promise<ExpenseEntity> {
    if (!CATEGORIES.includes(dto.category)) {
      throw new BadRequestException(`Category must be one of: ${CATEGORIES.join(', ')}`);
    }
    if (!dto.amount || dto.amount <= 0 || dto.amount > 10000) {
      throw new BadRequestException('Amount must be between 0 and 10,000');
    }
    if (!dto.description?.trim()) {
      throw new BadRequestException('Description is required');
    }

    const expense = await this.expenseRepo.save(
      this.expenseRepo.create({
        tenantId,
        careWorkerId,
        category: dto.category,
        description: dto.description.trim(),
        amount: dto.amount.toFixed(2),
        expenseDate: dto.expenseDate,
        receiptKey: dto.receiptKey,
        status: 'submitted',
      }),
    );

    await this.notifications.notifyManagers(
      tenantId,
      'expense_submitted',
      'Expense awaiting review',
      `£${dto.amount.toFixed(2)} ${dto.category} claim submitted`,
      { expenseId: expense.id },
    );
    return expense;
  }

  async listMine(tenantId: string, careWorkerId: string, page = 1, limit = 20) {
    return this.paginated({ tenantId, careWorkerId }, page, limit);
  }

  async listAll(tenantId: string, status?: ExpenseEntity['status'], page = 1, limit = 50) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where['status'] = status;
    return this.paginated(where, page, limit);
  }

  async review(
    tenantId: string,
    reviewerId: string,
    id: string,
    decision: 'approved' | 'rejected',
    note?: string,
  ): Promise<ExpenseEntity> {
    const expense = await this.getById(tenantId, id);
    if (expense.status !== 'submitted') {
      throw new BadRequestException('Only submitted expenses can be reviewed');
    }
    expense.status = decision;
    expense.reviewedBy = reviewerId;
    expense.reviewedAt = new Date();
    expense.reviewNote = note;
    const saved = await this.expenseRepo.save(expense);

    await this.notifications.notify(
      tenantId,
      [expense.careWorkerId],
      'expense_update',
      `Expense ${decision}`,
      `Your £${expense.amount} ${expense.category} claim was ${decision}${note ? `: ${note}` : ''}`,
      { expenseId: expense.id },
    );
    return saved;
  }

  async markPaid(tenantId: string, id: string): Promise<ExpenseEntity> {
    const expense = await this.getById(tenantId, id);
    if (expense.status !== 'approved') {
      throw new BadRequestException('Only approved expenses can be marked paid');
    }
    expense.status = 'paid';
    const saved = await this.expenseRepo.save(expense);
    await this.notifications.notify(
      tenantId,
      [expense.careWorkerId],
      'expense_update',
      'Expense paid',
      `Your £${expense.amount} ${expense.category} claim has been paid`,
      { expenseId: expense.id },
    );
    return saved;
  }

  private async getById(tenantId: string, id: string): Promise<ExpenseEntity> {
    const expense = await this.expenseRepo.findOne({ where: { id, tenantId } });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  private async paginated(where: Record<string, unknown>, page: number, limit: number) {
    const [data, total] = await this.expenseRepo.findAndCount({
      where: where as never,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
