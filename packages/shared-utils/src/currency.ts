export function formatCurrency(amount: number, currency: 'GBP' | 'USD' = 'GBP'): string {
  return new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function roundTo2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function penceToGBP(pence: number): number {
  return roundTo2(pence / 100);
}

export function centsToUSD(cents: number): number {
  return roundTo2(cents / 100);
}
