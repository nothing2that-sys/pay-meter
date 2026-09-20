import {
  buildPaySnapshot,
  buildWorkDayContext,
  type LoafingInterval,
  type PaySnapshot,
  type PrototypeDayArchive,
  type PrototypeSettings,
} from '../prototype';
import { compareLocalDates, dateFromLocalDate } from './reportRange';
import type { DailyReport, DailyTimelineSegment } from './reportTypes';

function emptyDailyReport(localDate: string): DailyReport {
  return {
    localDate,
    source: 'EMPTY',
    recognizedPayMicroKrw: 0n,
    regularPayMicroKrw: 0n,
    overtimePayMicroKrw: 0n,
    workingDurationMs: 0,
    loafingDurationMs: 0,
    loafingEarnedValueMicroKrw: 0n,
    freeWorkDurationMs: 0,
    freeWorkReferenceValueMicroKrw: 0n,
    overtimeDurationMs: 0,
    clockInAtEpochMs: null,
    clockOutAtEpochMs: null,
    plannedPaidDurationMs: 0,
    timelineSegments: [],
    integrityStatus: 'OK',
    isFinalized: false,
    hasRecord: false,
  };
}

function isLoafingAt(
  intervals: LoafingInterval[],
  epochMs: number,
  visibleEndEpochMs: number,
): boolean {
  return intervals.some((interval) => {
    const end = Math.min(interval.endAtEpochMs ?? visibleEndEpochMs, visibleEndEpochMs);
    return interval.startAtEpochMs <= epochMs && epochMs < end;
  });
}

function buildLiveTimeline(
  snapshot: PaySnapshot,
  loafingIntervals: LoafingInterval[],
): DailyTimelineSegment[] {
  const context = snapshot.context;
  if (context.scheduledStart === null || context.scheduledEnd === null) return [];

  const visibleEnd = snapshot.clockOutAtEpochMs ?? snapshot.nowEpochMs;
  const regularEnd = Math.min(visibleEnd, context.scheduledEnd);
  const segments: DailyTimelineSegment[] = [];

  for (const paid of context.paidSegments) {
    const end = Math.min(paid.end, regularEnd);
    if (end <= paid.start) continue;

    const boundaries = new Set<number>([paid.start, end]);
    for (const interval of loafingIntervals) {
      const intervalEnd = Math.min(interval.endAtEpochMs ?? visibleEnd, visibleEnd);
      const start = Math.max(paid.start, interval.startAtEpochMs);
      const stop = Math.min(end, intervalEnd);
      if (stop > start) {
        boundaries.add(start);
        boundaries.add(stop);
      }
    }

    const ordered = [...boundaries].sort((left, right) => left - right);
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const startEpochMs = ordered[index];
      const endEpochMs = ordered[index + 1];
      if (endEpochMs <= startEpochMs) continue;
      const midpoint = startEpochMs + (endEpochMs - startEpochMs) / 2;
      segments.push({
        type: isLoafingAt(loafingIntervals, midpoint, visibleEnd) ? 'LOAFING' : 'WORKING',
        startEpochMs,
        endEpochMs,
      });
    }
  }

  if (context.unpaidBreak && visibleEnd > context.unpaidBreak.start) {
    const endEpochMs = Math.min(visibleEnd, context.unpaidBreak.end);
    if (endEpochMs > context.unpaidBreak.start) {
      segments.push({
        type: 'BREAK',
        startEpochMs: context.unpaidBreak.start,
        endEpochMs,
      });
    }
  }

  if (snapshot.freeWorkDurationMs > 0) {
    segments.push({
      type: 'FREE_WORK',
      startEpochMs: context.scheduledEnd,
      endEpochMs: context.scheduledEnd + snapshot.freeWorkDurationMs,
    });
  }

  return segments.sort((left, right) => left.startEpochMs - right.startEpochMs);
}

export function buildDailyReportFromSnapshot(
  snapshot: PaySnapshot,
  loafingIntervals: LoafingInterval[],
): DailyReport {
  const regularPayMicroKrw = snapshot.todayEarnedMicroKrw;
  const overtimePayMicroKrw = 0n;
  const recognizedPayMicroKrw = regularPayMicroKrw + overtimePayMicroKrw;
  const hasRecord =
    snapshot.elapsedPaidDurationMs > 0 ||
    snapshot.loafingDurationMs > 0 ||
    snapshot.freeWorkDurationMs > 0 ||
    snapshot.clockOutAtEpochMs !== null;

  return {
    localDate: snapshot.localDate,
    source: 'LIVE_SNAPSHOT',
    recognizedPayMicroKrw,
    regularPayMicroKrw,
    overtimePayMicroKrw,
    workingDurationMs: snapshot.workingDurationMs,
    loafingDurationMs: snapshot.loafingDurationMs,
    loafingEarnedValueMicroKrw: snapshot.loafingEarnedValueMicroKrw,
    freeWorkDurationMs: snapshot.freeWorkDurationMs,
    freeWorkReferenceValueMicroKrw: snapshot.freeWorkReferenceValueMicroKrw,
    overtimeDurationMs: 0,
    clockInAtEpochMs: null,
    clockOutAtEpochMs: snapshot.clockOutAtEpochMs,
    plannedPaidDurationMs: snapshot.context.plannedPaidDurationMs,
    timelineSegments: buildLiveTimeline(snapshot, loafingIntervals),
    integrityStatus: 'OK',
    isFinalized: snapshot.payState === 'CLOCKED_OUT',
    hasRecord,
  };
}

export function buildSyntheticAllocationReport(
  settings: PrototypeSettings,
  localDate: string,
  timeZone: string,
): DailyReport {
  const date = dateFromLocalDate(localDate);
  const context = buildWorkDayContext(settings, date.getTime(), timeZone);
  if (context.plannedPaidDurationMs <= 0) return emptyDailyReport(localDate);

  const regularPayMicroKrw = context.dailyTargetMicroKrw;
  return {
    localDate,
    source: 'SYNTHETIC_ALLOCATION',
    recognizedPayMicroKrw: regularPayMicroKrw,
    regularPayMicroKrw,
    overtimePayMicroKrw: 0n,
    workingDurationMs: 0,
    loafingDurationMs: 0,
    loafingEarnedValueMicroKrw: 0n,
    freeWorkDurationMs: 0,
    freeWorkReferenceValueMicroKrw: 0n,
    overtimeDurationMs: 0,
    clockInAtEpochMs: null,
    clockOutAtEpochMs: null,
    plannedPaidDurationMs: context.plannedPaidDurationMs,
    timelineSegments: [],
    integrityStatus: 'PROVISIONAL',
    isFinalized: false,
    hasRecord: false,
  };
}

export function buildArchivedDailyReport(archive: PrototypeDayArchive): DailyReport {
  const observedAt = archive.clockOutAtEpochMs ?? archive.lastObservedAtEpochMs;
  const dayControl = archive.clockOutAtEpochMs
    ? { localDate: archive.localDate, clockOutAtEpochMs: archive.clockOutAtEpochMs }
    : null;
  const snapshot = buildPaySnapshot(
    archive.settingsSnapshot,
    observedAt,
    archive.timeZoneSnapshot,
    archive.loafingIntervals,
    dayControl,
  );
  const report = buildDailyReportFromSnapshot(snapshot, archive.loafingIntervals);
  return {
    ...report,
    localDate: archive.localDate,
    source: 'ARCHIVED_SNAPSHOT',
    integrityStatus: archive.integrityStatus === 'OK' ? 'OK' : 'NEEDS_REVIEW',
    isFinalized: archive.clockOutAtEpochMs !== null,
  };
}

export interface AvailableDailyReportInput {
  localDate: string;
  snapshot: PaySnapshot;
  settings: PrototypeSettings;
  loafingIntervals: LoafingInterval[];
  dayArchives?: PrototypeDayArchive[];
}

export function buildAvailableDailyReport({
  localDate,
  snapshot,
  settings,
  loafingIntervals,
  dayArchives = [],
}: AvailableDailyReportInput): DailyReport {
  if (compareLocalDates(localDate, snapshot.localDate) > 0) return emptyDailyReport(localDate);
  if (localDate === snapshot.localDate)
    return buildDailyReportFromSnapshot(snapshot, loafingIntervals);
  const archive = dayArchives.find((candidate) => candidate.localDate === localDate);
  if (archive) return buildArchivedDailyReport(archive);
  return buildSyntheticAllocationReport(settings, localDate, snapshot.context.timeZone);
}
