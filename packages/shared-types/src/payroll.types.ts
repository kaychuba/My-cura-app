import { Country, PayrollStatus } from './enums';

export interface PayrollPeriod {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  country: Country;
  status: PayrollStatus;
}

export interface UKPayrollInputs {
  grossPay: number;
  taxCode: string;
  niCategory: 'A' | 'B' | 'C' | 'H' | 'J' | 'M' | 'Z';
  pensionOptIn: boolean;
  studentLoanPlan?: 'plan1' | 'plan2' | 'plan4' | 'postgrad';
  ytdGrossPay: number;
  ytdTaxPaid: number;
  ytdNiPaid: number;
  taxYearStart: string;
  isDirector?: boolean;
}

export interface UKPayrollResult {
  grossPay: number;
  payeTax: number;
  employeeNI: number;
  employerNI: number;
  employeePension: number;
  employerPension: number;
  studentLoanDeduction: number;
  netPay: number;
  employerCost: number;
}

export interface USPayrollInputs {
  grossPay: number;
  filingStatus: 'single' | 'married_jointly' | 'head_of_household';
  federalAllowances: number;
  stateCode: string;
  stateAllowances?: number;
  ytdGrossWages: number;
  payPeriods: number;
  isContractor: boolean;
}

export interface USPayrollResult {
  grossPay: number;
  federalIncomeTax: number;
  socialSecurityEmployee: number;
  socialSecurityEmployer: number;
  medicareEmployee: number;
  medicareEmployer: number;
  additionalMedicare: number;
  stateIncomeTax: number;
  futa: number;
  suta: number;
  netPay: number;
  employerCost: number;
}

export interface PayslipData {
  workerName: string;
  workerAddress: string;
  employeeId?: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  agencyName: string;
  agencyAddress: string;
  country: Country;
  hoursRegular: number;
  hoursOvertime: number;
  hoursBankHoliday: number;
  grossPay: number;
  netPay: number;
  deductions: Array<{ label: string; amount: number }>;
  additions: Array<{ label: string; amount: number }>;
  ytdGross: number;
  ytdTax: number;
  niNumber?: string;
  taxCode?: string;
}
