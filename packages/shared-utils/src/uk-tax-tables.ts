// UK Tax tables for 2024/25 tax year (6 April 2024 – 5 April 2025)
// Update annually when HMRC publishes new rates

export const UK_TAX_2024_25 = {
  taxYear: '2024-25',
  personalAllowance: 12570,
  basicRateThreshold: 50270,
  higherRateThreshold: 125140,
  basicRate: 0.20,
  higherRate: 0.40,
  additionalRate: 0.45,
  personalAllowanceTaperThreshold: 100000,

  nationalInsurance: {
    primaryThreshold: 12570,
    upperEarningsLimit: 50270,
    employeeRateBelow: 0.08,
    employeeRateAbove: 0.02,
    secondaryThreshold: 9100,
    employerRate: 0.138,
    employerRateAboveUEL: 0.138,
  },

  pension: {
    lowerQualifyingEarnings: 6240,
    upperQualifyingEarnings: 50270,
    employeeMinRate: 0.05,
    employerMinRate: 0.03,
  },

  ssp: {
    weeklyRate: 116.75,
    waitingDays: 3,
    maxWeeks: 28,
    minimumWeeklyEarnings: 123,
  },

  smp: {
    firstSixWeeksRate: 0.90,
    flatWeeklyRate: 184.03,
    totalWeeks: 39,
  },

  spp: {
    weeklyRate: 184.03,
    maxWeeks: 2,
  },

  studentLoan: {
    plan1Threshold: 22015,
    plan1Rate: 0.09,
    plan2Threshold: 27295,
    plan2Rate: 0.09,
    plan4Threshold: 31395,
    plan4Rate: 0.09,
    postgradThreshold: 21000,
    postgradRate: 0.06,
  },

  mileageRates: {
    firstTenThousandMiles: 0.45,
    aboveTenThousandMiles: 0.25,
    motorcycleRate: 0.24,
    cycleRate: 0.20,
  },
};

export type UKTaxYear = typeof UK_TAX_2024_25;
