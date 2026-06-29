import { Injectable } from '@nestjs/common';
import { US_FEDERAL_TAX_2024, FilingStatus } from '@my-cura/shared-utils';
import { USPayrollInputs, USPayrollResult } from '@my-cura/shared-types';
import { roundTo2 } from '@my-cura/shared-utils';

@Injectable()
export class USPayrollEngine {
  private readonly tables = US_FEDERAL_TAX_2024;

  calculate(inputs: USPayrollInputs): USPayrollResult {
    const grossPay = roundTo2(inputs.grossPay);

    const federalIncomeTax = this.calculateFederalTax(
      grossPay,
      inputs.filingStatus as FilingStatus,
      inputs.federalAllowances,
      inputs.payPeriods,
    );

    const { socialSecurityEmployee, socialSecurityEmployer } = this.calculateSocialSecurity(
      grossPay,
      inputs.ytdGrossWages,
    );

    const { medicareEmployee, medicareEmployer, additionalMedicare } = this.calculateMedicare(
      grossPay,
      inputs.ytdGrossWages,
    );

    const stateIncomeTax = this.calculateStateTax(grossPay, inputs.stateCode, inputs.filingStatus as FilingStatus);

    const futa = this.calculateFUTA(grossPay, inputs.ytdGrossWages);

    const suta = 0; // Configured per agency/state — placeholder

    const netPay = roundTo2(
      grossPay - federalIncomeTax - socialSecurityEmployee - medicareEmployee - additionalMedicare - stateIncomeTax,
    );

    const employerCost = roundTo2(
      grossPay + socialSecurityEmployer + medicareEmployer + futa + suta,
    );

    return {
      grossPay,
      federalIncomeTax,
      socialSecurityEmployee,
      socialSecurityEmployer,
      medicareEmployee,
      medicareEmployer,
      additionalMedicare,
      stateIncomeTax,
      futa,
      suta,
      netPay,
      employerCost,
    };
  }

  private calculateFederalTax(
    weeklyGross: number,
    filingStatus: FilingStatus,
    allowances: number,
    payPeriods: number,
  ): number {
    const t = this.tables;
    const allowanceValue = 4300 / payPeriods; // 2024 withholding allowance value
    const taxableWages = Math.max(0, weeklyGross - allowances * allowanceValue);
    const annualisedWages = taxableWages * payPeriods;

    const brackets = t.withholding[filingStatus] ?? t.withholding.single;
    let annualTax = 0;

    for (const bracket of brackets) {
      if (annualisedWages <= bracket.min) break;
      const taxableInBracket = Math.min(annualisedWages, bracket.max) - bracket.min;
      annualTax = bracket.base + taxableInBracket * bracket.rate;
      if (annualisedWages <= bracket.max) break;
    }

    return roundTo2(Math.max(0, annualTax / payPeriods));
  }

  private calculateSocialSecurity(
    grossPay: number,
    ytdGrossWages: number,
  ): { socialSecurityEmployee: number; socialSecurityEmployer: number } {
    const ss = this.tables.socialSecurity;
    const remaining = Math.max(0, ss.wageBase - ytdGrossWages);
    const taxable = Math.min(grossPay, remaining);

    return {
      socialSecurityEmployee: roundTo2(taxable * ss.employeeRate),
      socialSecurityEmployer: roundTo2(taxable * ss.employerRate),
    };
  }

  private calculateMedicare(
    grossPay: number,
    ytdGrossWages: number,
  ): { medicareEmployee: number; medicareEmployer: number; additionalMedicare: number } {
    const mc = this.tables.medicare;

    const medicareEmployee = roundTo2(grossPay * mc.employeeRate);
    const medicareEmployer = roundTo2(grossPay * mc.employerRate);

    // Additional 0.9% on wages over $200k (annualised approximation)
    const ytdAfter = ytdGrossWages + grossPay;
    const additionalMedicare =
      ytdAfter > mc.additionalMedicareThreshold
        ? roundTo2(Math.max(0, ytdAfter - Math.max(ytdGrossWages, mc.additionalMedicareThreshold)) * mc.additionalMedicareRate)
        : 0;

    return { medicareEmployee, medicareEmployer, additionalMedicare };
  }

  private calculateStateTax(grossPay: number, stateCode: string, _filingStatus: FilingStatus): number {
    // State tax rates must be configured per tenant in settings
    // Flat-rate approximations for common states — production uses full tables
    const stateRates: Record<string, number> = {
      CA: 0.093,
      NY: 0.0685,
      TX: 0,
      FL: 0,
      WA: 0,
      NV: 0,
      IL: 0.0495,
      PA: 0.0307,
      OH: 0.04,
      GA: 0.055,
      NC: 0.0525,
      VA: 0.0575,
      MA: 0.05,
      MD: 0.0575,
      NJ: 0.0637,
      CO: 0.044,
      AZ: 0.025,
      MN: 0.0535,
      MI: 0.0425,
      WI: 0.0765,
    };

    const rate = stateRates[stateCode.toUpperCase()] ?? 0;
    return roundTo2(grossPay * rate);
  }

  private calculateFUTA(grossPay: number, ytdGrossWages: number): number {
    const futa = this.tables.futa;
    const remaining = Math.max(0, futa.wageBase - ytdGrossWages);
    const taxable = Math.min(grossPay, remaining);
    // Employer pays 0.6% after state credit (6% - 5.4% max credit)
    return roundTo2(taxable * 0.006);
  }
}
