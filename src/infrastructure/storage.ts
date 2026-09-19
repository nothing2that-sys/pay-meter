import {
  DEFAULT_SETTINGS,
  type LoafingInterval,
  type PrototypeSettings,
  localDateFromEpoch,
} from '../domain/prototype';

const SETTINGS_KEY = 'paymeter:p1:settings';
const LOAFING_KEY = 'paymeter:p1:loafing';

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
      display: { ...cloneDefaults().display, ...parsed.display },
      consumerItems: Array.isArray(parsed.consumerItems) ? parsed.consumerItems : cloneDefaults().consumerItems,
    };
  } catch {
    return cloneDefaults();
  }
}

export function saveSettings(settings: PrototypeSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
    {
      id: `loafing:${atEpochMs}`,
      startAtEpochMs: atEpochMs,
      endAtEpochMs: null,
    },
  ];
}

export function stopLoafing(intervals: LoafingInterval[], atEpochMs: number): LoafingInterval[] {
  return intervals.map((interval) => {
    if (interval.endAtEpochMs !== null) return interval;
    return { ...interval, endAtEpochMs: Math.max(interval.startAtEpochMs, atEpochMs) };
  });
}
