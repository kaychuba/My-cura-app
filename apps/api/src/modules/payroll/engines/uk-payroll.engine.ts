import { Injectable } from '@nestjs/common';
import { UK_TAX_2024_25 } from '@my-cura/shared-utils';
import { UKPayrollInputs, UKPayrollResult } from '@my-cura/shared-types';
import { roundTo2 } from '@my-cura/shared-utils';

@Injectable()
export class UKPayrollEngine {
  private readonly tables = UK_TAX_2024_25;

  calculate(inputs: UKPayrollInputs): UKPayrollResult {
    const grossPay = roundTo2(inputs.grossPay);
    const annualisedGross = inputs.ytdGrossPay + grossPay;

    const payeTax = this.calculatePAYE(grossPay, inputs.taxCode, inputs.ytdGrossPay, inputs.ytdTaxPaid);
    const { employeeNI, employerNI } = this.calculateNI(grossPay, inputs.niCategory);
    const { employeePension, employerPension } = this.calculatePension(grossPay, inputs.pensionOptIn);
    const studentLoanDeduction = this.calculateStudentLoan(grossPay, inputs.studentLoanPlan);

    const netPay = roundTo2(
      grossPay - payeTax - employeeNI - employeePension - studentLoanDeduction,
    );

    const employerCost = roundTo2(grossPay + employerNI + employerPension);

    void annualisedGross;

    return {
      grossPay,
      payeTax,
      employeeNI,
      employerNI,
      employeePension,
      employerPension,
      studentLoanDeduction,
      netPay,
      employerCost,
    };
  }

  private calculatePAYE(
    grossPay: number,
    taxCode: string,
    ytdGross: number,
    ytdTaxPaid: number,
  ): number {
    const t = this.tables;

    // Extract personal allowance from tax code
    const personalAllowance = this.personalAllowanceFromCode(taxCode);

    // Cumulative method: tax on YTD gross minus tax already paid
    const ytdTaxableGross = Math.max(0, ytdGross + grossPay - personalAllowance);
    const ytdTaxDue = this.applyTaxBands(ytdTaxableGross);
    const periodTax = roundTo2(Math.max(0, ytdTaxDue - ytdTaxPaid));

    return periodTax;

    void t;
  }

  private applyTaxBands(taxableIncome: number): number {
    const t = this.tables;
    let tax = 0;

    if (taxableIncome <= 0) return 0;

    const basicBand = t.basicRateThreshold - t.personalAllowance;
    const higherBand = t.higherRateThreshold - t.basicRateThreshold;

    if (taxableIncome > higherBand + basicBand) {
      tax += (taxableIncome - higherBand - basicBand) * t.additionalRate;
      taxableIncome = higherBand + basicBand;
    }

    if (taxableIncome > basicBand) {
      tax += (taxableIncome - basicBand) * t.higherRate;
      taxableIncome = basicBand;
    }

    tax += taxableIncome * t.basicRate;
    return roundTo2(tax);
  }

  private personalAllowanceFromCode(taxCode: string): number {
    const t = this.tables;
    const upper = taxCode.toUpperCase().trim();

    if (upper === 'BR') return 0;
    if (upper === 'D0') return 0;
    if (upper === 'D1') return 0;
    if (upper === 'NT') return Infinity;
    if (upper === '0T') return 0;

    // Standard format: numeric + letter suffix (e.g. 1257L)
    const match = upper.match(/^(\d+)[A-Z]$/);
    if (match) return parseInt(match[1], 10) * 10;

    return t.personalAllowance;
  }

  private calculateNI(grossPay: number, niCategory: string): { employeeNI: number; employerNI: number } {
    const ni = this.tables.nationalInsurance;

    // Categories M and Z have zero employee NI (under 21s, apprentices)
    if (niCategory === 'C') {
      // Category C: employer NI only (employee over State Pension Age)
      const employerNI = grossPay > ni.secondaryThreshold / 52
        ? roundTo2((Math.min(grossPay, ni.upperEarningsLimit / 52) - ni.secondaryThreshold / 52) * ni.employerRate)
        : 0;
      return { employeeNI: 0, employerNI };
    }

    const weeklyPrimary = ni.primaryThreshold / 52;
    const weeklyUEL = ni.upperEarningsLimit / 52;
    const weeklySecondary = ni.secondaryThreshold / 52;

    let employeeNI = 0;
    if (grossPay > weeklyPrimary) {
      const belowUEL = Math.min(grossPay, weeklyUEL) - weeklyPrimary;
      employeeNI = belowUEL * ni.employeeRateBelow;
      if (grossPay > weeklyUEL) {
        employeeNI += (grossPay - weeklyUEL) * ni.employeeRateAbove;
      }
    }

    let employerNI = 0;
    if (grossPay > weeklySecondary) {
      employerNI = (grossPay - weeklySecondary) * ni.employerRate;
    }

    return { employeeNI: roundTo2(employeeNI), employerNI: roundTo2(employerNI) };
  }

  private calculatePension(grossPay: number, optIn: boolean): { employeePension: number; employerPension: number } {
    if (!optIn) return { employeePension: 0, employerPension: 0 };

    const p = this.tables.pension;
    const weeklyLower = p.lowerQualifyingEarnings / 52;
    const weeklyUpper = p.upperQualifyingEarnings / 52;

    if (grossPay <= weeklyLower) return { employeePension: 0, employerPension: 0 };

    const qualifyingEarnings = Math.min(grossPay, weeklyUpper) - weeklyLower;
    return {
      employeePension: roundTo2(qualifyingEarnings * p.employeeMinRate),
      employerPension: roundTo2(qualifyingEarnings * p.employerMinRate),
    };
  }

  private calculateStudentLoan(grossPay: number, plan?: string): number {
    if (!plan) return 0;
    const sl = this.tables.studentLoan;

    const weeklyThreshold = (() => {
      switch (plan) {
        case 'plan1': return sl.plan1Threshold / 52;
        case 'plan2': return sl.plan2Threshold / 52;
        case 'plan4': return sl.plan4Threshold / 52;
        case 'postgrad': return sl.postgradThreshold / 52;
        default: return Infinity;
      }
    })();

    const rate = plan === 'postgrad' ? sl.postgradRate : sl.plan1Rate;
    const deductible = Math.max(0, grossPay - weeklyThreshold);
    return roundTo2(deductible * rate);
  }

  calculateSSP(sickDaysInPeriod: number, ytdSickDays: number): number {
    const ssp = this.tables.ssp;
    const totalSickDays = ytdSickDays + sickDaysInPeriod;
    if (totalSickDays <= ssp.waitingDays) return 0;
    if (ytdSickDays >= ssp.maxWeeks * 5) return 0;

    const eligibleDays = Math.min(sickDaysInPeriod, ssp.maxWeeks * 5 - ytdSickDays);
    return roundTo2((ssp.weeklyRate / 5) * eligibleDays);
  }
}
