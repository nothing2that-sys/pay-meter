export const MICRO_KRW_PER_KRW = 1_000_000n;
export const MILESTONE_KRW = 10_000n;

export type PayState =
  | 'OFF_DAY'
  | 'BEFORE_WORK'
  | 'REGULAR_WORK'
  | 'UNPAID_BREAK'
  | 'AFTER_SCHEDULE_UNPAID'
  | 'CLOCKED_OUT';
export type ActivityState = 'WORKING' | 'LOAFING';
export type PerimeterSegmentType = 'WORKING' | 'LOAFING';
export const VISUAL_THEMES = ['meter-dark', 'mono', 'pocket', 'ledger'] as const;
export type VisualTheme = (typeof VISUAL_THEMES)[number];
export const COLOR_MODES = ['dark', 'light'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];
export type TimerLayoutPreference = 'auto' | 'focus' | 'split';

export function isVisualTheme(value: unknown): value is VisualTheme {
  return typeof value === 'string' && (VISUAL_THEMES as readonly string[]).includes(value);
}

export function isColorMode(value: unknown): value is ColorMode {
  return typeof value === 'string' && (COLOR_MODES as readonly string[]).includes(value);
}

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
  colorMode?: ColorMode;
  theme?: VisualTheme;
  layout?: TimerLayoutPreference;
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
export interface PrototypeDayControl {
  localDate: string;
  clockOutAtEpochMs: number | null;
}

export interface PrototypeDayArchive {
  localDate: string;
  timeZoneSnapshot: string;
  settingsSnapshot: PrototypeSettings;
  lastObservedAtEpochMs: number;
  clockOutAtEpochMs: number | null;
  loafingIntervals: LoafingInterval[];
  integrityStatus: 'OK' | 'NEEDS_TIME_REVIEW';
  updatedAtEpochMs: number;
}
export interface EpochRange {
  start: number;
  end: number;
}
export interface PerimeterSegment {
  type: PerimeterSegmentType;
  startRatio: number;
  endRatio: number;
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
  todayEarnedMicroKrw: bigint;
  loafingEarnedValueMicroKrw: bigint;
  dailyTargetMicroKrw: bigint;
  scheduledProgressRatio: number;
  progressBasisPoints: number;
  perimeterSegments: PerimeterSegment[];
  baseVisualizationRateMilliKrwPerSecond: bigint;
  currentRateMilliKrwPerSecond: bigint;
  elapsedPaidDurationMs: number;
  remainingScheduledPaidDurationMs: number;
  workingDurationMs: number;
  loafingDurationMs: number;
  loafingRatioBasisPoints: number;
  freeWorkDurationMs: number;
  freeWorkReferenceValueMicroKrw: bigint;
  clockOutAtEpochMs: number | null;
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
    milestoneEnabled: false,
    privacy: false,
    colorMode: 'dark',
    theme: 'meter-dark',
    layout: 'auto',
  },
  consumerItems: [],
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
export function localDateFromEpoch(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function localDateForParts(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}
export function parseTimeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid local time: ${value}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59)
    throw new Error(`Invalid local time: ${value}`);
  return hour * 60 + minute;
}
export function plannedPaidDurationMs(schedule: PrototypeSchedule): number {
  const start = parseTimeToMinutes(schedule.start);
  const end = parseTimeToMinutes(schedule.end);
  if (end <= start) throw new Error('P1 does not support overnight schedules.');
  let paidMinutes = end - start;
  if (schedule.unpaidBreak) {
    const bs = parseTimeToMinutes(schedule.unpaidBreak.start);
    const be = parseTimeToMinutes(schedule.unpaidBreak.end);
    if (bs < start || be > end || be <= bs)
      throw new Error('Unpaid break must be inside the schedule.');
    paidMinutes -= be - bs;
  }
  if (paidMinutes <= 0) throw new Error('Planned paid duration must be positive.');
  return paidMinutes * 60_000;
}
function epochForLocalDateTime(localDate: string, localTime: string): number {
  const [year, month, day] = localDate.split('-').map(Number);
  const minutes = parseTimeToMinutes(localTime);
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60, 0, 0).getTime();
}
export function monthAllocation(
  settings: PrototypeSettings,
  year: number,
  monthIndex: number,
): MonthAllocation {
  if (!Number.isSafeInteger(settings.salaryKrw) || settings.salaryKrw < 0)
    throw new Error('Salary must be an integer KRW value.');
  const dailyPaidMs = plannedPaidDurationMs(settings.schedule);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const workingDates: string[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day, 12);
    if (settings.schedule.workDays.includes(date.getDay()))
      workingDates.push(localDateForParts(year, monthIndex, day));
  }
  const periodPaidMs = dailyPaidMs * workingDates.length;
  const targets = new Map<string, bigint>();
  if (periodPaidMs === 0 || settings.salaryKrw === 0) {
    for (const date of workingDates) targets.set(date, 0n);
    return { year, monthIndex, plannedPaidDurationMs: periodPaidMs, targets };
  }
  const salaryMicro = BigInt(settings.salaryKrw) * MICRO_KRW_PER_KRW;
  const periodDuration = BigInt(periodPaidMs);
  let assigned = 0n;
  for (const date of workingDates) {
    const target = (salaryMicro * BigInt(dailyPaidMs)) / periodDuration;
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
  if (!settings.schedule.workDays.includes(now.getDay())) {
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
    ].filter((x) => x.end > x.start);
  }
  return {
    localDate,
    timeZone,
    scheduledStart,
    scheduledEnd,
    unpaidBreak,
    paidSegments,
    plannedPaidDurationMs: paidSegments.reduce((sum, x) => sum + x.end - x.start, 0),
    dailyTargetMicroKrw: allocation.targets.get(localDate) ?? 0n,
  };
}
function intersectionDuration(a: EpochRange, b: EpochRange): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}
function elapsedAcrossSegments(segments: EpochRange[], epochMs: number): number {
  return segments.reduce((total, s) => total + Math.max(0, Math.min(epochMs, s.end) - s.start), 0);
}
export function paidOffsetAt(context: WorkDayContext, epochMs: number): number {
  return Math.min(
    context.plannedPaidDurationMs,
    Math.max(0, elapsedAcrossSegments(context.paidSegments, epochMs)),
  );
}
export function activeLoafingInterval(intervals: LoafingInterval[]): LoafingInterval | undefined {
  return intervals.find((x) => x.endAtEpochMs === null);
}
export function loafingDurationInPaidSegments(
  intervals: LoafingInterval[],
  paidSegments: EpochRange[],
  nowEpochMs: number,
): number {
  let total = 0;
  for (const interval of intervals) {
    const end = Math.min(interval.endAtEpochMs ?? nowEpochMs, nowEpochMs);
    if (end <= interval.startAtEpochMs) continue;
    for (const segment of paidSegments)
      total += intersectionDuration({ start: interval.startAtEpochMs, end }, segment);
  }
  return total;
}
function isLoafingAt(intervals: LoafingInterval[], epochMs: number, endLimit: number): boolean {
  return intervals.some(
    (x) => x.startAtEpochMs <= epochMs && epochMs < Math.min(x.endAtEpochMs ?? endLimit, endLimit),
  );
}
export function buildPerimeterSegments(
  context: WorkDayContext,
  intervals: LoafingInterval[],
  untilEpochMs: number,
): PerimeterSegment[] {
  if (context.plannedPaidDurationMs <= 0) return [];
  const result: PerimeterSegment[] = [];
  for (const paid of context.paidSegments) {
    const end = Math.min(paid.end, untilEpochMs);
    if (end <= paid.start) continue;
    const boundaries = new Set<number>([paid.start, end]);
    for (const interval of intervals) {
      const intervalEnd = Math.min(interval.endAtEpochMs ?? untilEpochMs, untilEpochMs);
      const start = Math.max(paid.start, interval.startAtEpochMs);
      const stop = Math.min(end, intervalEnd);
      if (stop > start) {
        boundaries.add(start);
        boundaries.add(stop);
      }
    }
    const ordered = [...boundaries].sort((a, b) => a - b);
    for (let i = 0; i < ordered.length - 1; i += 1) {
      const start = ordered[i];
      const stop = ordered[i + 1];
      if (stop <= start) continue;
      const type: PerimeterSegmentType = isLoafingAt(
        intervals,
        start + (stop - start) / 2,
        untilEpochMs,
      )
        ? 'LOAFING'
        : 'WORKING';
      const startRatio = paidOffsetAt(context, start) / context.plannedPaidDurationMs;
      const endRatio = paidOffsetAt(context, stop) / context.plannedPaidDurationMs;
      if (endRatio <= startRatio) continue;
      const prev = result.at(-1);
      if (prev && prev.type === type && Math.abs(prev.endRatio - startRatio) < 1e-9)
        prev.endRatio = endRatio;
      else result.push({ type, startRatio, endRatio });
    }
  }
  return result;
}
export function buildPaySnapshot(
  settings: PrototypeSettings,
  nowEpochMs: number,
  timeZone: string,
  loafingIntervals: LoafingInterval[],
  dayControl: PrototypeDayControl | null = null,
): PaySnapshot {
  const context = buildWorkDayContext(settings, nowEpochMs, timeZone);
  const clockOutAtEpochMs =
    dayControl?.localDate === context.localDate ? dayControl.clockOutAtEpochMs : null;
  const effectiveNow =
    clockOutAtEpochMs === null ? nowEpochMs : Math.min(nowEpochMs, clockOutAtEpochMs);
  let payState: PayState = 'OFF_DAY';
  if (clockOutAtEpochMs !== null) payState = 'CLOCKED_OUT';
  else if (context.scheduledStart !== null && context.scheduledEnd !== null) {
    if (nowEpochMs < context.scheduledStart) payState = 'BEFORE_WORK';
    else if (nowEpochMs >= context.scheduledEnd) payState = 'AFTER_SCHEDULE_UNPAID';
    else if (
      context.unpaidBreak &&
      nowEpochMs >= context.unpaidBreak.start &&
      nowEpochMs < context.unpaidBreak.end
    )
      payState = 'UNPAID_BREAK';
    else payState = 'REGULAR_WORK';
  }
  const elapsedPaidDurationMs = elapsedAcrossSegments(context.paidSegments, effectiveNow);
  const denominator = BigInt(Math.max(1, context.plannedPaidDurationMs));
  const regularProgress =
    context.plannedPaidDurationMs === 0
      ? 0n
      : (context.dailyTargetMicroKrw * BigInt(elapsedPaidDurationMs)) / denominator;
  const todayEarnedMicroKrw =
    payState === 'CLOCKED_OUT' && context.plannedPaidDurationMs > 0
      ? context.dailyTargetMicroKrw
      : regularProgress;
  const progressFromTime =
    context.plannedPaidDurationMs === 0 ? 0 : elapsedPaidDurationMs / context.plannedPaidDurationMs;
  const scheduledProgressRatio =
    (payState === 'AFTER_SCHEDULE_UNPAID' || payState === 'CLOCKED_OUT') &&
    context.plannedPaidDurationMs > 0
      ? 1
      : Math.min(1, Math.max(0, progressFromTime));
  const loafingDurationMs = loafingDurationInPaidSegments(
    loafingIntervals,
    context.paidSegments,
    effectiveNow,
  );
  const loafingEarnedValueMicroKrw =
    context.plannedPaidDurationMs === 0
      ? 0n
      : (context.dailyTargetMicroKrw * BigInt(loafingDurationMs)) / denominator;
  const workingDurationMs = Math.max(0, elapsedPaidDurationMs - loafingDurationMs);
  const activityState: ActivityState =
    activeLoafingInterval(loafingIntervals) && payState === 'REGULAR_WORK' ? 'LOAFING' : 'WORKING';
  const baseVisualizationRateMilliKrwPerSecond =
    context.plannedPaidDurationMs === 0
      ? 0n
      : context.dailyTargetMicroKrw / BigInt(context.plannedPaidDurationMs);
  const currentRateMilliKrwPerSecond =
    payState === 'REGULAR_WORK' ? baseVisualizationRateMilliKrwPerSecond : 0n;
  const freeEnd = clockOutAtEpochMs ?? nowEpochMs;
  const freeWorkDurationMs =
    context.scheduledEnd === null ? 0 : Math.max(0, freeEnd - context.scheduledEnd);
  const freeWorkReferenceValueMicroKrw =
    context.plannedPaidDurationMs === 0
      ? 0n
      : (context.dailyTargetMicroKrw * BigInt(freeWorkDurationMs)) / denominator;
  const segmentEnd = Math.min(effectiveNow, context.scheduledEnd ?? effectiveNow);
  return {
    nowEpochMs,
    localDate: context.localDate,
    payState,
    activityState,
    todayEarnedMicroKrw,
    loafingEarnedValueMicroKrw,
    dailyTargetMicroKrw: context.dailyTargetMicroKrw,
    scheduledProgressRatio,
    progressBasisPoints: Math.round(scheduledProgressRatio * 10_000),
    perimeterSegments: buildPerimeterSegments(context, loafingIntervals, segmentEnd),
    baseVisualizationRateMilliKrwPerSecond,
    currentRateMilliKrwPerSecond,
    elapsedPaidDurationMs,
    remainingScheduledPaidDurationMs: Math.max(
      0,
      context.plannedPaidDurationMs - elapsedPaidDurationMs,
    ),
    workingDurationMs,
    loafingDurationMs,
    loafingRatioBasisPoints:
      elapsedPaidDurationMs === 0
        ? 0
        : Math.floor((loafingDurationMs * 10_000) / elapsedPaidDurationMs),
    freeWorkDurationMs,
    freeWorkReferenceValueMicroKrw,
    clockOutAtEpochMs,
    activityToggleEnabled: payState === 'REGULAR_WORK',
    context,
  };
}
export function formatMicroKrw(value: bigint): string {
  return Number(value / MICRO_KRW_PER_KRW).toLocaleString('ko-KR');
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
