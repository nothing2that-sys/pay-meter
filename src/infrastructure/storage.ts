import {
  DEFAULT_SETTINGS,
  type LoafingInterval,
  type PrototypeDayControl,
  type PrototypeSettings,
  localDateFromEpoch,
} from '../domain/prototype';

const SETTINGS_KEY = 'paymeter:p1:settings';
const LOAFING_KEY = 'paymeter:p1:loafing';
const DAY_CONTROL_KEY = 'paymeter:p1r:day-control';
const EXPORT_VERSION = 1;

function cloneDefaults(): PrototypeSettings {
  return structuredClone(DEFAULT_SETTINGS);
}

export function loadSettings(): PrototypeSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw) as Partial<PrototypeSettings>;
    return {
      ...cloneDefaults(),
      ...parsed,
      schedule: { ...cloneDefaults().schedule, ...parsed.schedule },
      display: {
        ...cloneDefaults().display,
        ...parsed.display,
        showDecimals: false,
      },
      consumerItems: [],
    };
  } catch {
    return cloneDefaults();
  }
}

export function saveSettings(settings: PrototypeSettings): void {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...settings,
      display: { ...settings.display, showDecimals: false },
      consumerItems: [],
    }),
  );
}

export function loadLoafingIntervals(localDate: string): LoafingInterval[] {
  try {
    const raw = localStorage.getItem(LOAFING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LoafingInterval[];
    return parsed.filter((interval) => localDateFromEpoch(interval.startAtEpochMs) === localDate);
  } catch {
    return [];
  }
}

export function saveLoafingIntervals(intervals: LoafingInterval[]): void {
  localStorage.setItem(LOAFING_KEY, JSON.stringify(intervals));
}

export function startLoafing(intervals: LoafingInterval[], atEpochMs: number): LoafingInterval[] {
  if (intervals.some((interval) => interval.endAtEpochMs === null)) return intervals;
  return [
    ...intervals,
    { id: `loafing:${atEpochMs}`, startAtEpochMs: atEpochMs, endAtEpochMs: null },
  ];
}

export function stopLoafing(intervals: LoafingInterval[], atEpochMs: number): LoafingInterval[] {
  return intervals.map((interval) =>
    interval.endAtEpochMs !== null
      ? interval
      : { ...interval, endAtEpochMs: Math.max(interval.startAtEpochMs, atEpochMs) },
  );
}

export function loadPrototypeDayControl(localDate: string): PrototypeDayControl | null {
  try {
    const raw = localStorage.getItem(DAY_CONTROL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrototypeDayControl;
    if (parsed.localDate !== localDate || !Number.isFinite(parsed.clockOutAtEpochMs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clockOutPrototypeDay(
  current: PrototypeDayControl | null,
  localDate: string,
  atEpochMs: number,
): PrototypeDayControl {
  if (current?.localDate === localDate && current.clockOutAtEpochMs !== null) return current;
  const next = { localDate, clockOutAtEpochMs: atEpochMs };
  localStorage.setItem(DAY_CONTROL_KEY, JSON.stringify(next));
  return next;
}

export function exportPrototypeData(): string {
  return JSON.stringify(
    {
      schema: 'paymeter-p1r',
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      settings: loadSettings(),
      loafingIntervals: JSON.parse(localStorage.getItem(LOAFING_KEY) ?? '[]'),
      dayControl: JSON.parse(localStorage.getItem(DAY_CONTROL_KEY) ?? 'null'),
    },
    null,
    2,
  );
}

export function resetPrototypeData(): void {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(LOAFING_KEY);
  localStorage.removeItem(DAY_CONTROL_KEY);
}
