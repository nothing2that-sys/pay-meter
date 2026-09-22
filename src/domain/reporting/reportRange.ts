import type { ReportPeriod } from './reportTypes';

export interface ReportRange {
  startLocalDate: string;
  endLocalDate: string;
  dates: string[];
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function dateFromLocalDate(localDate: string): Date {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function localDateFromDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function compareLocalDates(left: string, right: string): number {
  return left.localeCompare(right);
}

export function shiftLocalDate(localDate: string, days: number): string {
  const date = dateFromLocalDate(localDate);
  date.setDate(date.getDate() + days);
  return localDateFromDate(date);
}

function enumerate(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(localDateFromDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function dailyRange(anchorLocalDate: string): ReportRange {
  return {
    startLocalDate: anchorLocalDate,
    endLocalDate: anchorLocalDate,
    dates: [anchorLocalDate],
  };
}

export function weeklyRange(anchorLocalDate: string, weekStartsOn = 1): ReportRange {
  const anchor = dateFromLocalDate(anchorLocalDate);
  const normalizedWeekStart = ((weekStartsOn % 7) + 7) % 7;
  const offset = (anchor.getDay() - normalizedWeekStart + 7) % 7;
  const start = new Date(anchor);
  start.setDate(start.getDate() - offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    startLocalDate: localDateFromDate(start),
    endLocalDate: localDateFromDate(end),
    dates: enumerate(start, end),
  };
}

export function monthlyRange(anchorLocalDate: string): ReportRange {
  const anchor = dateFromLocalDate(anchorLocalDate);
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
  return {
    startLocalDate: localDateFromDate(start),
    endLocalDate: localDateFromDate(end),
    dates: enumerate(start, end),
  };
}

export function yearlyRange(anchorLocalDate: string): ReportRange {
  const anchor = dateFromLocalDate(anchorLocalDate);
  const start = new Date(anchor.getFullYear(), 0, 1, 12);
  const end = new Date(anchor.getFullYear(), 11, 31, 12);
  return {
    startLocalDate: localDateFromDate(start),
    endLocalDate: localDateFromDate(end),
    dates: enumerate(start, end),
  };
}

export function reportRange(
  period: ReportPeriod,
  anchorLocalDate: string,
  weekStartsOn = 1,
): ReportRange {
  if (period === 'daily') return dailyRange(anchorLocalDate);
  if (period === 'weekly') return weeklyRange(anchorLocalDate, weekStartsOn);
  if (period === 'monthly') return monthlyRange(anchorLocalDate);
  return yearlyRange(anchorLocalDate);
}

export function shiftPeriodAnchor(
  period: ReportPeriod,
  anchorLocalDate: string,
  amount: number,
): string {
  const date = dateFromLocalDate(anchorLocalDate);
  if (period === 'daily') date.setDate(date.getDate() + amount);
  else if (period === 'weekly') date.setDate(date.getDate() + amount * 7);
  else if (period === 'monthly') date.setMonth(date.getMonth() + amount, 1);
  else date.setFullYear(date.getFullYear() + amount, 0, 1);
  return localDateFromDate(date);
}
