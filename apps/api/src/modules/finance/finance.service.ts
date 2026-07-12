import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, In, DataSource } from 'typeorm';
import Stripe from 'stripe';
import { InvoiceStatus, SubscriptionTier } from '@my-cura/shared-types';
import { InvoiceEntity } from './entities/invoice.entity';
import { InvoiceLineItemEntity } from './entities/invoice-line-item.entity';
import { SubscriptionEntity, SubscriptionStatus } from './entities/subscription.entity';

const SUBSCRIPTION_PRICES: Record<SubscriptionTier, { monthly: string; annual: string }> = {
  [SubscriptionTier.STARTER]: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? '',
  },
  [SubscriptionTier.PROFESSIONAL]: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
  },
  [SubscriptionTier.ENTERPRISE]: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? '',
  },
};

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(InvoiceEntity)
    private invoiceRepo: Repository<InvoiceEntity>,
    @InjectRepository(InvoiceLineItemEntity)
    private lineItemRepo: Repository<InvoiceLineItemEntity>,
    @InjectRepository(SubscriptionEntity)
    private subscriptionRepo: Repository<SubscriptionEntity>,
    private dataSource: DataSource,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: '2024-06-20',
    });
  }

  // ─── Invoice number generation ────────────────────────────────────────────

  private async nextInvoiceNumber(tenantId: string): Promise<string> {
    const count = await this.invoiceRepo.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    const seq = String(count + 1).padStart(4, '0');
    return `INV-${year}-${seq}`;
  }

  // ─── Generate invoice from completed shifts ───────────────────────────────

  async generateInvoice(
    tenantId: string,
    serviceUserId: string,
    periodStart: string,
    periodEnd: string,
    currency = 'GBP',
    taxRatePct = 0,
    notes?: string,
  ): Promise<InvoiceEntity> {
    // Fetch completed shifts for the service user in the period via raw SQL
    // (avoids cross-module service injection; scheduling module owns shifts table)
    const shifts: Array<{
      id: string;
      scheduled_start: Date;
      scheduled_end: Date;
      shift_type: string;
      hourly_rate: number;
      service_user_name: string;
    }> = await this.dataSource.manager.query(
      `SELECT
         s.id,
         s.scheduled_start,
         s.scheduled_end,
         s.shift_type,
         COALESCE(cw.hourly_rate, 15.00)::numeric AS hourly_rate,
         CONCAT(su.first_name, ' ', su.last_name) AS service_user_name
       FROM shifts s
       LEFT JOIN care_workers cw ON cw.user_id = s.care_worker_id AND cw.tenant_id = $1
       LEFT JOIN service_users su ON su.id = s.service_user_id AND su.tenant_id = $1
       WHERE s.tenant_id = $1
         AND s.service_user_id = $2
         AND s.status = 'completed'
         AND s.scheduled_start::date >= $3
         AND s.scheduled_end::date <= $4
       ORDER BY s.scheduled_start`,
      [tenantId, serviceUserId, periodStart, periodEnd],
    );

    if (!shifts.length) {
      throw new BadRequestException(
        'No completed shifts found for this service user in the selected period',
      );
    }

    const serviceUserName = shifts[0].service_user_name ?? 'Service User';
    const invoiceNumber = await this.nextInvoiceNumber(tenantId);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const lineItems: Partial<InvoiceLineItemEntity>[] = shifts.map((shift) => {
      const startMs = new Date(shift.scheduled_start).getTime();
      const endMs = new Date(shift.scheduled_end).getTime();
      const hours = Math.round(((endMs - startMs) / 3_600_000) * 100) / 100;
      const total = Math.round(hours * Number(shift.hourly_rate) * 100) / 100;
      const shiftDate = new Date(shift.scheduled_start).toISOString().split('T')[0];

      return {
        tenantId,
        shiftId: shift.id,
        shiftDate,
        description: `${shift.shift_type.replace(/_/g, ' ')} — ${shiftDate}`,
        quantity: hours,
        unitPrice: Number(shift.hourly_rate),
        total,
      };
    });

    const subtotal = lineItems.reduce((sum, li) => sum + (li.total ?? 0), 0);
    const taxAmount = Math.round(subtotal * (taxRatePct / 100) * 100) / 100;
    const total = subtotal + taxAmount;

    const invoice = this.invoiceRepo.create({
      tenantId,
      invoiceNumber,
      serviceUserId,
      serviceUserName,
      periodStart,
      periodEnd,
      currency,
      subtotal,
      taxAmount,
      total,
      status: InvoiceStatus.DRAFT,
      dueDate: dueDate.toISOString().split('T')[0],
      notes,
      lineItems: lineItems as InvoiceLineItemEntity[],
    });

    return this.invoiceRepo.save(invoice);
  }

  // ─── List invoices ────────────────────────────────────────────────────────

  async listInvoices(
    tenantId: string,
    status?: InvoiceStatus,
    page = 1,
    limit = 20,
  ): Promise<{ data: InvoiceEntity[]; total: number; page: number; pages: number }> {
    const where: any = { tenantId };
    if (status) where.status = status;

    const [data, total] = await this.invoiceRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['lineItems'],
    });

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  async getInvoice(tenantId: string, id: string): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, tenantId },
      relations: ['lineItems'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  // ─── Status transitions ───────────────────────────────────────────────────

  async sendInvoice(tenantId: string, id: string): Promise<InvoiceEntity> {
    const invoice = await this.getInvoice(tenantId, id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be sent');
    }
    invoice.status = InvoiceStatus.SENT;
    invoice.sentAt = new Date();
    return this.invoiceRepo.save(invoice);
  }

  async markAsPaid(tenantId: string, id: string, paidAt?: string): Promise<InvoiceEntity> {
    const invoice = await this.getInvoice(tenantId, id);
    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Voided invoices cannot be marked as paid');
    }
    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = paidAt ? new Date(paidAt) : new Date();
    return this.invoiceRepo.save(invoice);
  }

  async voidInvoice(tenantId: string, id: string): Promise<InvoiceEntity> {
    const invoice = await this.getInvoice(tenantId, id);
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Paid invoices cannot be voided');
    }
    invoice.status = InvoiceStatus.VOID;
    return this.invoiceRepo.save(invoice);
  }

  // ─── KPI dashboard ────────────────────────────────────────────────────────

  async getKPIs(tenantId: string): Promise<{
    revenueMTD: number;
    revenueYTD: number;
    outstandingTotal: number;
    outstandingCount: number;
    overdueTotal: number;
    overdueCount: number;
    payrollCostMTD: number;
    grossMarginPct: number;
    currency: string;
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [revMTD, revYTD, outstanding, overdue, payrollCost] = await Promise.all([
      this.dataSource.manager.query(
        `SELECT COALESCE(SUM(total),0) AS val FROM invoices
         WHERE tenant_id=$1 AND status='paid' AND paid_at::date>=$2 AND deleted_at IS NULL`,
        [tenantId, monthStart],
      ),
      this.dataSource.manager.query(
        `SELECT COALESCE(SUM(total),0) AS val FROM invoices
         WHERE tenant_id=$1 AND status='paid' AND paid_at::date>=$2 AND deleted_at IS NULL`,
        [tenantId, yearStart],
      ),
      this.dataSource.manager.query(
        `SELECT COALESCE(SUM(total),0) AS val, COUNT(*) AS cnt FROM invoices
         WHERE tenant_id=$1 AND status='sent' AND deleted_at IS NULL`,
        [tenantId],
      ),
      this.dataSource.manager.query(
        `SELECT COALESCE(SUM(total),0) AS val, COUNT(*) AS cnt FROM invoices
         WHERE tenant_id=$1 AND status='sent' AND due_date < $2 AND deleted_at IS NULL`,
        [tenantId, today],
      ),
      this.dataSource.manager.query(
        `SELECT COALESCE(SUM(total_gross),0) AS val FROM payroll_periods
         WHERE tenant_id=$1 AND period_start>=$2 AND deleted_at IS NULL`,
        [tenantId, monthStart],
      ),
    ]);

    const revenueMTD = Number(revMTD[0]?.val ?? 0);
    const payrollCostMTD = Number(payrollCost[0]?.val ?? 0);
    const grossMarginPct =
      revenueMTD > 0
        ? Math.round(((revenueMTD - payrollCostMTD) / revenueMTD) * 10000) / 100
        : 0;

    return {
      revenueMTD,
      revenueYTD: Number(revYTD[0]?.val ?? 0),
      outstandingTotal: Number(outstanding[0]?.val ?? 0),
      outstandingCount: Number(outstanding[0]?.cnt ?? 0),
      overdueTotal: Number(overdue[0]?.val ?? 0),
      overdueCount: Number(overdue[0]?.cnt ?? 0),
      payrollCostMTD,
      grossMarginPct,
      currency: 'GBP',
    };
  }

  // ─── Revenue chart (monthly revenue vs payroll cost) ─────────────────────

  async getRevenueChart(
    tenantId: string,
    months = 12,
  ): Promise<Array<{ month: string; revenue: number; payrollCost: number; margin: number }>> {
    const rows: Array<{ month: string; revenue: number; payroll_cost: number }> =
      await this.dataSource.manager.query(
        `WITH months AS (
           SELECT generate_series(
             date_trunc('month', NOW()) - ($2 - 1) * interval '1 month',
             date_trunc('month', NOW()),
             '1 month'::interval
           ) AS m
         ),
         inv AS (
           SELECT date_trunc('month', paid_at) AS m, COALESCE(SUM(total),0) AS revenue
           FROM invoices
           WHERE tenant_id=$1 AND status='paid' AND deleted_at IS NULL
           GROUP BY 1
         ),
         pay AS (
           SELECT date_trunc('month', period_start::date) AS m, COALESCE(SUM(total_gross),0) AS payroll_cost
           FROM payroll_periods
           WHERE tenant_id=$1 AND deleted_at IS NULL
           GROUP BY 1
         )
         SELECT
           to_char(months.m, 'Mon YY') AS month,
           COALESCE(inv.revenue, 0)::numeric AS revenue,
           COALESCE(pay.payroll_cost, 0)::numeric AS payroll_cost
         FROM months
         LEFT JOIN inv ON inv.m = months.m
         LEFT JOIN pay ON pay.m = months.m
         ORDER BY months.m`,
        [tenantId, months],
      );

    return rows.map((r) => {
      const revenue = Number(r.revenue);
      const payrollCost = Number(r.payroll_cost);
      const margin = revenue > 0 ? Math.round(((revenue - payrollCost) / revenue) * 10000) / 100 : 0;
      return { month: r.month, revenue, payrollCost, margin };
    });
  }

  // ─── Stripe subscription ──────────────────────────────────────────────────

  async getSubscription(tenantId: string): Promise<SubscriptionEntity | null> {
    return this.subscriptionRepo.findOne({ where: { tenantId } });
  }

  async createCheckoutSession(
    tenantId: string,
    tier: SubscriptionTier,
    billing: 'monthly' | 'annual',
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    const priceId = SUBSCRIPTION_PRICES[tier]?.[billing];
    if (!priceId) throw new BadRequestException('Invalid subscription plan');

    let sub = await this.subscriptionRepo.findOne({ where: { tenantId } });
    let customerId = sub?.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        metadata: { tenantId },
      });
      customerId = customer.id;

      if (!sub) {
        sub = this.subscriptionRepo.create({ tenantId, stripeCustomerId: customerId });
      } else {
        sub.stripeCustomerId = customerId;
      }
      await this.subscriptionRepo.save(sub);
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tenantId },
    });

    return { url: session.url! };
  }

  async createPortalSession(tenantId: string, returnUrl: string): Promise<{ url: string }> {
    const sub = await this.subscriptionRepo.findOne({ where: { tenantId } });
    if (!sub?.stripeCustomerId) {
      throw new BadRequestException('No active subscription found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async handleWebhook(payload: Buffer, sig: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;
        const tenantId = session.metadata?.tenantId;
        if (!tenantId) break;
        const stripeSubscription = await this.stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        await this.upsertSubscriptionFromStripe(tenantId, stripeSubscription);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const customer = await this.stripe.customers.retrieve(stripeSub.customer as string);
        if (customer.deleted) break;
        const tenantId = (customer as Stripe.Customer).metadata?.tenantId;
        if (!tenantId) break;
        await this.upsertSubscriptionFromStripe(tenantId, stripeSub);
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const customer = await this.stripe.customers.retrieve(inv.customer as string);
        if (customer.deleted) break;
        const tenantId = (customer as Stripe.Customer).metadata?.tenantId;
        if (!tenantId) break;
        await this.subscriptionRepo.update(
          { tenantId },
          { status: SubscriptionStatus.PAST_DUE },
        );
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async upsertSubscriptionFromStripe(
    tenantId: string,
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    let sub = await this.subscriptionRepo.findOne({ where: { tenantId } });
    if (!sub) sub = this.subscriptionRepo.create({ tenantId });

    const priceId = stripeSub.items.data[0]?.price.id ?? '';
    const tier = this.tierFromPriceId(priceId);

    sub.stripeSubscriptionId = stripeSub.id;
    sub.stripePriceId = priceId;
    sub.stripeCustomerId = stripeSub.customer as string;
    sub.tier = tier;
    sub.status = stripeSub.status as unknown as SubscriptionStatus;
    sub.currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
    sub.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
    sub.cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
    if (stripeSub.trial_end) {
      sub.trialEnd = new Date(stripeSub.trial_end * 1000);
    }

    await this.subscriptionRepo.save(sub);
  }

  private tierFromPriceId(priceId: string): SubscriptionTier {
    for (const [tier, prices] of Object.entries(SUBSCRIPTION_PRICES)) {
      if (Object.values(prices).includes(priceId)) {
        return tier as SubscriptionTier;
      }
    }
    return SubscriptionTier.STARTER;
  }
}
