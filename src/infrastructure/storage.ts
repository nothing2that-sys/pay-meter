import {
  DEFAULT_SETTINGS,
  type ColorMode,
  type LoafingInterval,
  type PrototypeDayArchive,
  type PrototypeDayControl,
  type PrototypeSettings,
  type VisualTheme,
  isColorMode,
  isVisualTheme,
  localDateFromEpoch,
} from '../domain/prototype';

const SETTINGS_KEY = 'paymeter:p1:settings';
const LOAFING_KEY = 'paymeter:p1:loafing';
const DAY_CONTROL_KEY = 'paymeter:p1r:day-control';
const DAY_ARCHIVE_KEY = 'paymeter:p1r:day-archive';
const EXPORT_VERSION = 2;

function cloneDefaults(): PrototypeSettings {
  return structuredClone(DEFAULT_SETTINGS);
}

function normalizeTheme(value: unknown): VisualTheme {
  return isVisualTheme(value) ? value : 'meter-dark';
}

function normalizeColorMode(value: unknown): ColorMode {
  return isColorMode(value) ? value : 'dark';
}

function normalizeLayout(value: unknown): 'auto' | 'focus' | 'split' {
  return value === 'focus' || value === 'split' ? value : 'auto';
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
        milestoneEnabled: false,
        colorMode: normalizeColorMode(parsed.display?.colorMode),
        theme: normalizeTheme(parsed.display?.theme),
        layout: normalizeLayout(parsed.display?.layout),
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
      display: {
        ...settings.display,
        showDecimals: false,
        milestoneEnabled: false,
        colorMode: normalizeColorMode(settings.display.colorMode),
        theme: normalizeTheme(settings.display.theme),
        layout: normalizeLayout(settings.display.layout),
      },
      consumerItems: [],
    }),
  );
}

function loadAllLoafingIntervals(): LoafingInterval[] {
  try {
    const raw = localStorage.getItem(LOAFING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LoafingInterval[];
    return Array.isArray(parsed)
      ? parsed.filter(
          (interval) =>
            typeof interval?.id === 'string' &&
            Number.isFinite(interval.startAtEpochMs) &&
            (interval.endAtEpochMs === null || Number.isFinite(interval.endAtEpochMs)),
        )
      : [];
  } catch {
    return [];
  }
}

export function loadLoafingIntervals(localDate: string): LoafingInterval[] {
  return loadAllLoafingIntervals().filter(
    (interval) => localDateFromEpoch(interval.startAtEpochMs) === localDate,
  );
}

export function saveLoafingIntervals(
  intervals: LoafingInterval[],
  localDate = intervals[0] ? localDateFromEpoch(intervals[0].startAtEpochMs) : null,
): void {
  if (!localDate) {
    localStorage.setItem(LOAFING_KEY, JSON.stringify(intervals));
    return;
  }
  const preserved = loadAllLoafingIntervals().filter(
    (interval) => localDateFromEpoch(interval.startAtEpochMs) !== localDate,
  );
  localStorage.setItem(LOAFING_KEY, JSON.stringify([...preserved, ...intervals]));
}

export function loadPrototypeDayArchives(): PrototypeDayArchive[] {
  try {
    const raw = localStorage.getItem(DAY_ARCHIVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PrototypeDayArchive[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (archive) =>
          typeof archive?.localDate === 'string' &&
          typeof archive.timeZoneSnapshot === 'string' &&
          Number.isFinite(archive.lastObservedAtEpochMs) &&
          Number.isFinite(archive.updatedAtEpochMs) &&
          (archive.clockOutAtEpochMs === null || Number.isFinite(archive.clockOutAtEpochMs)) &&
          Array.isArray(archive.loafingIntervals) &&
          archive.settingsSnapshot !== null &&
          typeof archive.settingsSnapshot === 'object',
      )
      .sort((left, right) => left.localDate.localeCompare(right.localDate));
  } catch {
    return [];
  }
}

export function savePrototypeDayArchive(archive: PrototypeDayArchive): PrototypeDayArchive[] {
  const archives = loadPrototypeDayArchives().filter(
    (existing) => existing.localDate !== archive.localDate,
  );
  const next = [...archives, structuredClone(archive)].sort((left, right) =>
    left.localDate.localeCompare(right.localDate),
  );
  localStorage.setItem(DAY_ARCHIVE_KEY, JSON.stringify(next));
  return next;
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
      dayArchives: loadPrototypeDayArchives(),
    },
    null,
    2,
  );
}

export function resetPrototypeData(): void {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(LOAFING_KEY);
  localStorage.removeItem(DAY_CONTROL_KEY);
  localStorage.removeItem(DAY_ARCHIVE_KEY);
}
