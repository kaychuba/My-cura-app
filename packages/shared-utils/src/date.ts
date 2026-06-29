export function toUTCDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function diffInMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function diffInHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 3600000;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  return addDays(start, 6);
}

export function isUKBankHoliday(date: Date, region: 'england-wales' | 'scotland' | 'northern-ireland' = 'england-wales'): boolean {
  // Bank holiday dates should be fetched from GOV.UK API and cached
  // This is a stub — production implementation queries the cached bank holiday list
  void region;
  void date;
  return false;
}

export function formatDisplayDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDisplayTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
