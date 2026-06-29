// US Federal Tax tables for 2024 (Publication 15-T)
// State tax rates require per-state configuration at the tenant level

export const US_FEDERAL_TAX_2024 = {
  taxYear: 2024,

  socialSecurity: {
    employeeRate: 0.062,
    employerRate: 0.062,
    wageBase: 168600,
  },

  medicare: {
    employeeRate: 0.0145,
    employerRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: 200000,
  },

  futa: {
    rate: 0.06,
    wageBase: 7000,
    maxCreditRate: 0.054,
  },

  // Percentage method income tax withholding (Pub 15-T Table 1)
  // Payroll period: weekly; tables are annualised internally
  withholding: {
    single: [
      { min: 0, max: 11600, rate: 0.10, base: 0 },
      { min: 11600, max: 47150, rate: 0.12, base: 1160 },
      { min: 47150, max: 100525, rate: 0.22, base: 5426 },
      { min: 100525, max: 191950, rate: 0.24, base: 17168.5 },
      { min: 191950, max: 243725, rate: 0.32, base: 39110.5 },
      { min: 243725, max: 609350, rate: 0.35, base: 55678.5 },
      { min: 609350, max: Infinity, rate: 0.37, base: 183647.25 },
    ],
    married_jointly: [
      { min: 0, max: 23200, rate: 0.10, base: 0 },
      { min: 23200, max: 94300, rate: 0.12, base: 2320 },
      { min: 94300, max: 201050, rate: 0.22, base: 10852 },
      { min: 201050, max: 383900, rate: 0.24, base: 34337 },
      { min: 383900, max: 487450, rate: 0.32, base: 78221 },
      { min: 487450, max: 731200, rate: 0.35, base: 111357 },
      { min: 731200, max: Infinity, rate: 0.37, base: 196669.5 },
    ],
    head_of_household: [
      { min: 0, max: 16550, rate: 0.10, base: 0 },
      { min: 16550, max: 63100, rate: 0.12, base: 1655 },
      { min: 63100, max: 100500, rate: 0.22, base: 7241 },
      { min: 100500, max: 191950, rate: 0.24, base: 15469 },
      { min: 191950, max: 243700, rate: 0.32, base: 37417 },
      { min: 243700, max: 609350, rate: 0.35, base: 53977 },
      { min: 609350, max: Infinity, rate: 0.37, base: 181954.5 },
    ],
  },

  standardDeduction: {
    single: 14600,
    married_jointly: 29200,
    head_of_household: 21900,
  },
};

export type FilingStatus = 'single' | 'married_jointly' | 'head_of_household';

export type USTaxYear = typeof US_FEDERAL_TAX_2024;
