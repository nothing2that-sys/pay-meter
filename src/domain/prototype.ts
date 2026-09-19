export const MICRO_KRW_PER_KRW = 1_000_000n;
export const MILESTONE_KRW = 10_000n;

export type PayState = 'OFF_DAY' | 'BEFORE_WORK' | 'REGULAR_WORK' | 'UNPAID_BREAK' | 'AFTER_SCHEDULE';
export type ActivityState = 'WORKING' | 'LOAFING';

export interface TimeRangeSetting {
  start: string;
  end: string;
}

export interface PrototypeSchedule {
  workDays: number[];
  start: string;
  end: string;
  unpaidBreak: TimeRangeSetting | null;
}

export interface ConsumerItem {
  id: string;
  name: string;
  priceKrw: number;
}

export interface DisplaySettings {
  showDecimals: boolean;
  milestoneEnabled: boolean;
  privacy: boolean;
}

export interface PrototypeSettings {
  salaryKrw: number;
  schedule: PrototypeSchedule;
  display: DisplaySettings;
  consumerItems: ConsumerItem[];
}

export interface LoafingInterval {
  id: string;
  startAtEpochMs: number;
  endAtEpochMs: number | null;
}

export interface EpochRange {
  start: number;
  end: number;
}

export interface WorkDayContext {
  localDate: string;
  timeZone: string;
  scheduledStart: number | null;
  scheduledEnd: number | null;
  unpaidBreak: EpochRange | null;
  paidSegments: EpochRange[];
  plannedPaidDurationMs: number;
  dailyTargetMicroKrw: bigint;
}

export interface PaySnapshot {
  nowEpochMs: number;
  localDate: string;
  payState: PayState;
  activityState: ActivityState;
  currentPayMicroKrw: bigint;
  dailyTargetMicroKrw: bigint;
  progressBasisPoints: number;
  rateMilliKrwPerSecond: bigint;
  elapsedPaidDurationMs: number;
  workingDurationMs: number;
  loafingDurationMs: number;
  loafingRatioBasisPoints: number;
  activityToggleEnabled: boolean;
  context: WorkDayContext;
}

export interface MonthAllocation {
  year: number;
  monthIndex: number;
  plannedPaidDurationMs: number;
  targets: Map<string, bigint>;
}

export const DEFAULT_SETTINGS: PrototypeSettings = {
  salaryKrw: 0,
  schedule: {
    workDays: [1, 2, 3, 4, 5],
    start: '09:00',
    end: '18:00',
    unpaidBreak: { start: '12:00', end: '13:00' },
  },
  display: {
    showDecimals: false,
    milestoneEnabled: true,
    privacy: false,
  },
  consumerItems: [
    { id: 'coffee', name: '커피', priceKrw: 5000 },
    { id: 'lunch', name: '점심', priceKrw: 12000 },
    { id: 'chicken', name: '치킨', priceKrw: 25000 },
  ],
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function localDateFromEpoch(epochMs: number): string {
  const date = new Date(epochMs);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function localDateForParts(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function parseTimeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid local time: ${value}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid local time: ${value}`);
  }
  return hour * 60 + minute;
}

export function plannedPaidDurationMs(schedule: PrototypeSchedule): number {
  const start = parseTimeToMinutes(schedule.start);
  const end = parseTimeToMinutes(schedule.end);
  if (end <= start) throw new Error('P1 does not support overnight schedules.');
  let paidMinutes = end - start;
  if (schedule.unpaidBreak) {
    const breakStart = parseTimeToMinutes(schedule.unpaidBreak.start);
    const breakEnd = parseTimeToMinutes(schedule.unpaidBreak.end);
    if (breakStart < start || breakEnd > end || breakEnd <= breakStart) {
      throw new Error('Unpaid break must be inside the schedule.');
    }
    paidMinutes -= breakEnd - breakStart;
  }
  if (paidMinutes <= 0) throw new Error('Planned paid duration must be positive.');
  return paidMinutes * 60_000;
}

function epochForLocalDateTime(localDate: string, localTime: string): number {
  const [year, month, day] = localDate.split('-').map(Number);
  const minutes = parseTimeToMinutes(localTime);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

export function monthAllocation(settings: PrototypeSettings, year: number, monthIndex: number): MonthAllocation {
  const salaryKrw = settings.salaryKrw;
  if (!Number.isSafeInteger(salaryKrw) || salaryKrw < 0) throw new Error('Salary must be an integer KRW value.');
  const dailyPaidMs = plannedPaidDurationMs(settings.schedule);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const workingDates: string[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day, 12, 0, 0, 0);
    if (settings.schedule.workDays.includes(date.getDay())) {
      workingDates.push(localDateForParts(year, monthIndex, day));
    }
  }

  const periodPaidMs = dailyPaidMs * workingDates.length;
  const targets = new Map<string, bigint>();
  if (periodPaidMs === 0 || salaryKrw === 0) {
    for (const date of workingDates) targets.set(date, 0n);
    return { year, monthIndex, plannedPaidDurationMs: periodPaidMs, targets };
  }

  const salaryMicro = BigInt(salaryKrw) * MICRO_KRW_PER_KRW;
  const periodDuration = BigInt(periodPaidMs);
  const dayDuration = BigInt(dailyPaidMs);
  let assigned = 0n;

  for (const date of workingDates) {
    const target = (salaryMicro * dayDuration) / periodDuration;
    targets.set(date, target);
    assigned += target;
  }

  let remainder = salaryMicro - assigned;
  for (const date of workingDates) {
    if (remainder <= 0n) break;
    targets.set(date, (targets.get(date) ?? 0n) + 1n);
    remainder -= 1n;
  }

  return { year, monthIndex, plannedPaidDurationMs: periodPaidMs, targets };
}

export function buildWorkDayContext(
  settings: PrototypeSettings,
  nowEpochMs: number,
  timeZone: string,
): WorkDayContext {
  const now = new Date(nowEpochMs);
  const localDate = localDateFromEpoch(nowEpochMs);
  const allocation = monthAllocation(settings, now.getFullYear(), now.getMonth());
  const isWorkDay = settings.schedule.workDays.includes(now.getDay());
  if (!isWorkDay) {
    return {
      localDate,
      timeZone,
      scheduledStart: null,
      scheduledEnd: null,
      unpaidBreak: null,
      paidSegments: [],
      plannedPaidDurationMs: 0,
      dailyTargetMicroKrw: 0n,
    };
  }

  const scheduledStart = epochForLocalDateTime(localDate, settings.schedule.start);
  const scheduledEnd = epochForLocalDateTime(localDate, settings.schedule.end);
  let unpaidBreak: EpochRange | null = null;
  let paidSegments: EpochRange[] = [{ start: scheduledStart, end: scheduledEnd }];

  if (settings.schedule.unpaidBreak) {
    unpaidBreak = {
      start: epochForLocalDateTime(localDate, settings.schedule.unpaidBreak.start),
      end: epochForLocalDateTime(localDate, settings.schedule.unpaidBreak.end),
    };
    paidSegments = [
      { start: scheduledStart, end: unpaidBreak.start },
      { start: unpaidBreak.end, end: scheduledEnd },
    ].filter((segment) => segment.end > segment.start);
  }

  return {
    localDate,
    timeZone,
    scheduledStart,
    scheduledEnd,
    unpaidBreak,
    paidSegments,
    plannedPaidDurationMs: paidSegments.reduce((sum, segment) => sum + segment.end - segment.start, 0),
    dailyTargetMicroKrw: allocation.targets.get(localDate) ?? 0n,
  };
}

function intersectionDuration(a: EpochRange, b: EpochRange): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

function elapsedAcrossSegments(segments: EpochRange[], nowEpochMs: number): number {
  let total = 0;
  for (const segment of segments) {
    const clampedEnd = Math.min(nowEpochMs, segment.end);
    if (clampedEnd > segment.start) total += clampedEnd - segment.start;
  }
  return total;
}

export function activeLoafingInterval(intervals: LoafingInterval[]): LoafingInterval | undefined {
  return intervals.find((interval) => interval.endAtEpochMs === null);
}

export function loafingDurationInPaidSegments(
  intervals: LoafingInterval[],
  paidSegments: EpochRange[],
  nowEpochMs: number,
): number {
  let total = 0;
  for (const interval of intervals) {
    const intervalEnd = Math.min(interval.endAtEpochMs ?? nowEpochMs, nowEpochMs);
    if (intervalEnd <= interval.startAtEpochMs) continue;
    const range = { start: interval.startAtEpochMs, end: intervalEnd };
    for (const segment of paidSegments) total += intersectionDuration(range, segment);
  }
  return total;
}

export function buildPaySnapshot(
  settings: PrototypeSettings,
  nowEpochMs: number,
  timeZone: string,
  loafingIntervals: LoafingInterval[],
): PaySnapshot {
  const context = buildWorkDayContext(settings, nowEpochMs, timeZone);
  let payState: PayState = 'OFF_DAY';

  if (context.scheduledStart !== null && context.scheduledEnd !== null) {
    if (nowEpochMs < context.scheduledStart) payState = 'BEFORE_WORK';
    else if (nowEpochMs >= context.scheduledEnd) payState = 'AFTER_SCHEDULE';
    else if (
      context.unpaidBreak &&
      nowEpochMs >= context.unpaidBreak.start &&
      nowEpochMs < context.unpaidBreak.end
    ) {
      payState = 'UNPAID_BREAK';
    } else payState = 'REGULAR_WORK';
  }

  const elapsedPaidDurationMs = elapsedAcrossSegments(context.paidSegments, nowEpochMs);
  const denominator = BigInt(Math.max(1, context.plannedPaidDurationMs));
  const currentPayMicroKrw =
    context.plannedPaidDurationMs === 0
      ? 0n
      : (context.dailyTargetMicroKrw * BigInt(elapsedPaidDurationMs)) / denominator;
  const progressBasisPoints =
    context.dailyTargetMicroKrw === 0n
      ? 0
      : Number((currentPayMicroKrw * 10_000n) / context.dailyTargetMicroKrw);
  const loafingDurationMs = loafingDurationInPaidSegments(
    loafingIntervals,
    context.paidSegments,
    nowEpochMs,
  );
  const workingDurationMs = Math.max(0, elapsedPaidDurationMs - loafingDurationMs);
  const loafingRatioBasisPoints =
    elapsedPaidDurationMs === 0 ? 0 : Math.floor((loafingDurationMs * 10_000) / elapsedPaidDurationMs);
  const activityState: ActivityState = activeLoafingInterval(loafingIntervals) ? 'LOAFING' : 'WORKING';

  return {
    nowEpochMs,
    localDate: context.localDate,
    payState,
    activityState,
    currentPayMicroKrw,
    dailyTargetMicroKrw: context.dailyTargetMicroKrw,
    progressBasisPoints: Math.min(10_000, Math.max(0, progressBasisPoints)),
    rateMilliKrwPerSecond:
      context.plannedPaidDurationMs === 0
        ? 0n
        : context.dailyTargetMicroKrw / BigInt(context.plannedPaidDurationMs),
    elapsedPaidDurationMs,
    workingDurationMs,
    loafingDurationMs,
    loafingRatioBasisPoints,
    activityToggleEnabled: payState === 'REGULAR_WORK',
    context,
  };
}

export function formatMicroKrw(value: bigint, showDecimals = false): string {
  const won = value / MICRO_KRW_PER_KRW;
  if (!showDecimals) return Number(won).toLocaleString('ko-KR');
  const remainder = value % MICRO_KRW_PER_KRW;
  const milli = remainder / 1000n;
  return `${Number(won).toLocaleString('ko-KR')}.${milli.toString().padStart(3, '0')}`;
}

export function formatRateMilliKrw(value: bigint): string {
  const whole = value / 1000n;
  const fraction = value % 1000n;
  return `${whole.toString()}.${fraction.toString().padStart(3, '0')}`;
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function stateLabel(snapshot: PaySnapshot): string {
  if (snapshot.payState === 'OFF_DAY') return '오늘은 휴무';
  if (snapshot.payState === 'BEFORE_WORK') return '출근 전';
  if (snapshot.payState === 'UNPAID_BREAK') return '휴게시간';
  if (snapshot.payState === 'AFTER_SCHEDULE') return '오늘 목표 완료';
  return snapshot.activityState === 'LOAFING' ? '루팡 중' : '돈 버는 중';
}
