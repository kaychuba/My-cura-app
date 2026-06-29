import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
  RawBodyRequest,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, InvoiceStatus, SubscriptionTier } from '@my-cura/shared-types';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ─── KPIs ──────────────────────────────────────────────────────────────────

  @Get('kpis')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get finance KPI summary' })
  getKPIs(@Req() req: any) {
    return this.financeService.getKPIs(req.user.tenantId);
  }

  @Get('revenue-chart')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Monthly revenue vs payroll cost chart data' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  getRevenueChart(
    @Req() req: any,
    @Query('months', new DefaultValuePipe(12), ParseIntPipe) months: number,
  ) {
    return this.financeService.getRevenueChart(req.user.tenantId, months);
  }

  // ─── Invoices ──────────────────────────────────────────────────────────────

  @Get('invoices')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List invoices' })
  @ApiQuery({ name: 'status', enum: InvoiceStatus, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listInvoices(
    @Req() req: any,
    @Query('status') status?: InvoiceStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.financeService.listInvoices(req.user.tenantId, status, page, limit);
  }

  @Get('invoices/:id')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get invoice detail' })
  getInvoice(@Req() req: any, @Param('id') id: string) {
    return this.financeService.getInvoice(req.user.tenantId, id);
  }

  @Post('invoices/generate')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate invoice from completed shifts' })
  generateInvoice(
    @Req() req: any,
    @Body()
    body: {
      serviceUserId: string;
      periodStart: string;
      periodEnd: string;
      currency?: string;
      taxRatePct?: number;
      notes?: string;
    },
  ) {
    return this.financeService.generateInvoice(
      req.user.tenantId,
      body.serviceUserId,
      body.periodStart,
      body.periodEnd,
      body.currency,
      body.taxRatePct,
      body.notes,
    );
  }

  @Patch('invoices/:id/send')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark invoice as sent' })
  sendInvoice(@Req() req: any, @Param('id') id: string) {
    return this.financeService.sendInvoice(req.user.tenantId, id);
  }

  @Patch('invoices/:id/mark-paid')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark invoice as paid' })
  markAsPaid(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { paidAt?: string },
  ) {
    return this.financeService.markAsPaid(req.user.tenantId, id, body.paidAt);
  }

  @Patch('invoices/:id/void')
  @Roles(UserRole.AGENCY_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Void an invoice' })
  voidInvoice(@Req() req: any, @Param('id') id: string) {
    return this.financeService.voidInvoice(req.user.tenantId, id);
  }

  // ─── Subscription ──────────────────────────────────────────────────────────

  @Get('subscription')
  @Roles(UserRole.AGENCY_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current subscription' })
  getSubscription(@Req() req: any) {
    return this.financeService.getSubscription(req.user.tenantId);
  }

  @Post('subscription/checkout')
  @Roles(UserRole.AGENCY_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  createCheckout(
    @Req() req: any,
    @Body() body: { tier: SubscriptionTier; billing: 'monthly' | 'annual'; successUrl: string; cancelUrl: string },
  ) {
    return this.financeService.createCheckoutSession(
      req.user.tenantId,
      body.tier,
      body.billing,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Post('subscription/portal')
  @Roles(UserRole.AGENCY_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Open Stripe billing portal' })
  createPortal(
    @Req() req: any,
    @Body() body: { returnUrl: string },
  ) {
    return this.financeService.createPortalSession(req.user.tenantId, body.returnUrl);
  }

  // Stripe webhook — no auth guard, validated by signature
  @Post('webhooks/stripe')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    await this.financeService.handleWebhook(req.rawBody as Buffer, sig);
    return { received: true };
  }
}
