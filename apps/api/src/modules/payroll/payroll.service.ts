import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PayrollPeriodEntity } from './entities/payroll-period.entity';
import { PayrollRecordEntity } from './entities/payroll-record.entity';
import { UKPayrollEngine } from './engines/uk-payroll.engine';
import { USPayrollEngine } from './engines/us-payroll.engine';
import { Country, PayrollStatus, EmploymentType } from '@my-cura/shared-types';
import { encrypt, decrypt } from '@my-cura/shared-utils';

export interface RunPayrollDto {
  periodStart: string;
  periodEnd: string;
  payDate: string;
  country: Country;
}

export interface PayrollSummary {
  period: PayrollPeriodEntity;
  records: PayrollRecordEntity[];
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalNI: number;
  totalPension: number;
  workerCount: number;
}

@Injectable()
export class PayrollService {
  private readonly ukEngine = new UKPayrollEngine();
  private readonly usEngine = new USPayrollEngine();

  constructor(
    @InjectRepository(PayrollPeriodEntity)
    private periodRepo: Repository<PayrollPeriodEntity>,
    @InjectRepository(PayrollRecordEntity)
    private recordRepo: Repository<PayrollRecordEntity>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async listPeriods(tenantId: string): Promise<PayrollPeriodEntity[]> {
    return this.periodRepo.find({
      where: { tenantId },
      order: { periodStart: 'DESC' },
      take: 24,
    });
  }

  async getPeriod(tenantId: string, periodId: string): Promise<PayrollSummary> {
    const period = await this.periodRepo.findOne({ where: { id: periodId, tenantId } });
    if (!period) throw new NotFoundException('Payroll period not found');

    const records = await this.recordRepo.find({
      where: { tenantId, periodId },
    });

    const totals = records.reduce(
      (acc, r) => {
        acc.gross += r.grossPay ?? 0;
        acc.net += r.netPay ?? 0;
        acc.tax += (r.payeTax ?? r.federalIncomeTax ?? 0);
        acc.ni += ((r.employeeNI ?? 0) + (r.employerNI ?? 0));
        acc.pension += ((r.employeePension ?? 0) + (r.employerPension ?? 0));
        return acc;
      },
      { gross: 0, net: 0, tax: 0, ni: 0, pension: 0 },
    );

    return {
      period,
      records,
      totalGross: totals.gross,
      totalNet: totals.net,
      totalTax: totals.tax,
      totalNI: totals.ni,
      totalPension: totals.pension,
      workerCount: records.length,
    };
  }

  async runPayroll(tenantId: string, dto: RunPayrollDto): Promise<PayrollPeriodEntity> {
    // Check for overlapping period
    const existing = await this.periodRepo.findOne({
      where: {
        tenantId,
        country: dto.country,
        periodStart: dto.periodStart,
      } as unknown as Record<string, unknown>,
    });
    if (existing) {
      throw new ConflictException('A payroll period already exists for this start date and country');
    }

    // Create the period record
    const entity = this.periodRepo.create({
      tenantId,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      payDate: dto.payDate,
      country: dto.country,
      status: PayrollStatus.PROCESSING,
    } as unknown as PayrollPeriodEntity);
    const period = (await this.periodRepo.save(entity)) as unknown as PayrollPeriodEntity;

    // In production this would be queued to Bull; here we compute synchronously
    this.processPayrollAsync(tenantId, period).catch((err) => {
      console.error('Payroll processing failed', err);
      this.periodRepo.update((period as PayrollPeriodEntity).id, { status: PayrollStatus.DRAFT });
    });

    return period;
  }

  private async processPayrollAsync(tenantId: string, period: PayrollPeriodEntity): Promise<void> {
    // Fetch all active care workers for this tenant
    const workers = await this.dataSource.query(
      `SELECT cw.*, u.email, u.first_name, u.last_name
       FROM care_workers cw
       JOIN users u ON u.id = cw.user_id
       WHERE cw.tenant_id = $1
         AND cw.contract_start <= $2
         AND (cw.contract_end IS NULL OR cw.contract_end >= $3)`,
      [tenantId, period.periodEnd, period.periodStart],
    );

    // Fetch timesheet data for the period
    const timesheets = await this.dataSource.query(
      `SELECT
         ce.care_worker_id,
         s.shift_type,
         s.pay_rate_override,
         cw.hourly_rate, cw.weekend_rate, cw.bank_holiday_rate,
         cw.sleep_in_rate, cw.live_in_daily_rate,
         EXTRACT(EPOCH FROM (
           MAX(CASE WHEN ce.event_type = 'clock_out' THEN ce.recorded_at END) -
           MIN(CASE WHEN ce.event_type = 'clock_in' THEN ce.recorded_at END)
         )) / 3600 AS hours_worked
       FROM clock_events ce
       JOIN shifts s ON s.id = ce.shift_id
       JOIN care_workers cw ON cw.id = ce.care_worker_id
       WHERE ce.tenant_id = $1
         AND ce.recorded_at BETWEEN $2 AND $3
       GROUP BY ce.care_worker_id, s.shift_type, s.pay_rate_override,
                cw.hourly_rate, cw.weekend_rate, cw.bank_holiday_rate,
                cw.sleep_in_rate, cw.live_in_daily_rate`,
      [tenantId, period.periodStart, period.periodEnd],
    );

    // Group timesheet rows by worker
    const tsMap = new Map<string, typeof timesheets>();
    for (const row of timesheets) {
      if (!tsMap.has(row.care_worker_id)) tsMap.set(row.care_worker_id, []);
      tsMap.get(row.care_worker_id)!.push(row);
    }

    const records: Partial<PayrollRecordEntity>[] = [];
    let totalGross = 0;
    let totalNet = 0;

    for (const worker of workers) {
      const workerTimesheets = tsMap.get(worker.id) ?? [];
      let regularHours = 0;
      let weekendHours = 0;
      let bankHolidayHours = 0;

      for (const ts of workerTimesheets) {
        const hours = parseFloat(ts.hours_worked ?? '0');
        if (ts.shift_type === 'weekend') weekendHours += hours;
        else if (ts.shift_type === 'bank_holiday') bankHolidayHours += hours;
        else regularHours += hours;
      }

      let niNumberDecrypted: string | undefined;
      const encKey = this.configService.get<string>('ENCRYPTION_KEY') ?? '';
      try {
        if (worker.ni_number_enc) niNumberDecrypted = decrypt(worker.ni_number_enc, encKey);
      } catch { /* ignore */ }
      void niNumberDecrypted;

      const hourlyRate = parseFloat(worker.hourly_rate ?? '0');
      const weekendRate = parseFloat(worker.weekend_rate ?? '0') || hourlyRate * 1.5;
      const bankHolidayRate = parseFloat(worker.bank_holiday_rate ?? '0') || hourlyRate * 2;
      const grossPay = regularHours * hourlyRate + weekendHours * weekendRate + bankHolidayHours * bankHolidayRate;

      if (period.country === Country.UK) {
        const result = this.ukEngine.calculate({
          grossPay,
          niCategory: worker.ni_category ?? 'A',
          taxCode: worker.tax_code ?? '1257L',
          pensionOptIn: worker.pension_opt_in ?? true,
          studentLoanPlan: worker.student_loan_plan,
          ytdGrossPay: parseFloat(worker.ytd_gross ?? '0'),
          ytdTaxPaid: parseFloat(worker.ytd_tax ?? '0'),
          ytdNiPaid: parseFloat(worker.ytd_ni ?? '0'),
          taxYearStart: '2024-04-06',
        });

        records.push({
          tenantId,
          periodId: period.id,
          careWorkerId: worker.id,
          grossPay: result.grossPay,
          netPay: result.netPay,
          payeTax: result.payeTax,
          employeeNI: result.employeeNI,
          employerNI: result.employerNI,
          employeePension: result.employeePension,
          employerPension: result.employerPension,
          studentLoan: result.studentLoanDeduction,
          expensesReimbursed: 0,
        });
        totalGross += result.grossPay;
        totalNet += result.netPay;
      } else {
        const result = this.usEngine.calculate({
          grossPay,
          filingStatus: worker.federal_filing_status ?? 'single',
          federalAllowances: 0,
          stateCode: 'CA',
          stateAllowances: 0,
          ytdGrossWages: parseFloat(worker.ytd_gross ?? '0'),
          payPeriods: 52,
          isContractor: false,
        });

        records.push({
          tenantId,
          periodId: period.id,
          careWorkerId: worker.id,
          grossPay: result.grossPay,
          netPay: result.netPay,
          federalIncomeTax: result.federalIncomeTax,
          socialSecurityEE: result.socialSecurityEmployee,
          socialSecurityER: result.socialSecurityEmployer,
          medicareEE: result.medicareEmployee,
          medicareER: result.medicareEmployer,
          futa: result.futa,
          expensesReimbursed: 0,
        });
        totalGross += result.grossPay;
        totalNet += result.netPay;
      }
    }

    // Bulk insert records
    if (records.length > 0) {
      await this.recordRepo.save(records.map((r) => this.recordRepo.create(r)));
    }

    // Update period with totals
    await this.periodRepo.update(period.id, {
      status: PayrollStatus.APPROVED,
      processedAt: new Date(),
      totalGross,
      totalNet,
      workerCount: records.length,
    });
  }

  async getWorkerPayslips(tenantId: string, careWorkerId: string): Promise<PayrollRecordEntity[]> {
    return this.recordRepo.find({
      where: { tenantId, careWorkerId },
      order: { createdAt: 'DESC' },
      take: 12,
    });
  }

  async approvePayroll(tenantId: string, periodId: string): Promise<void> {
    const period = await this.periodRepo.findOne({ where: { id: periodId, tenantId } });
    if (!period) throw new NotFoundException('Payroll period not found');
    if (period.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException('Only processed payroll periods can be approved');
    }
    await this.periodRepo.update(periodId, { status: PayrollStatus.APPROVED });
  }

  async lockPayroll(tenantId: string, periodId: string): Promise<void> {
    const period = await this.periodRepo.findOne({ where: { id: periodId, tenantId } });
    if (!period) throw new NotFoundException('Payroll period not found');
    if (period.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException('Only approved payroll periods can be locked');
    }
    await this.periodRepo.update(periodId, { status: PayrollStatus.LOCKED });
  }
}
