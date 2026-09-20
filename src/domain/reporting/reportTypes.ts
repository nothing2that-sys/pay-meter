export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type ReportSource = 'LIVE_SNAPSHOT' | 'ARCHIVED_SNAPSHOT' | 'SYNTHETIC_ALLOCATION' | 'EMPTY';

export type ReportIntegrityStatus = 'OK' | 'PROVISIONAL' | 'NEEDS_REVIEW' | 'EXCLUDED';

export type DailyTimelineSegmentType = 'WORKING' | 'LOAFING' | 'BREAK' | 'OVERTIME' | 'FREE_WORK';

export interface DailyTimelineSegment {
  type: DailyTimelineSegmentType;
  startEpochMs: number;
  endEpochMs: number;
}

export interface DailyReport {
  localDate: string;
  source: ReportSource;
  recognizedPayMicroKrw: bigint;
  regularPayMicroKrw: bigint;
  overtimePayMicroKrw: bigint;
  workingDurationMs: number;
  loafingDurationMs: number;
  loafingEarnedValueMicroKrw: bigint;
  freeWorkDurationMs: number;
  freeWorkReferenceValueMicroKrw: bigint;
  overtimeDurationMs: number;
  clockInAtEpochMs: number | null;
  clockOutAtEpochMs: number | null;
  plannedPaidDurationMs: number;
  timelineSegments: DailyTimelineSegment[];
  integrityStatus: ReportIntegrityStatus;
  isFinalized: boolean;
  hasRecord: boolean;
}

export interface PeriodReport {
  reports: DailyReport[];
  recognizedPayMicroKrw: bigint;
  regularPayMicroKrw: bigint;
  overtimePayMicroKrw: bigint;
  workingDurationMs: number;
  loafingDurationMs: number;
  loafingEarnedValueMicroKrw: bigint;
  freeWorkDurationMs: number;
  freeWorkReferenceValueMicroKrw: bigint;
  overtimeDurationMs: number;
  plannedPaidDurationMs: number;
  recordedDayCount: number;
  syntheticDayCount: number;
  integrityIssueCount: number;
  hasProvisionalData: boolean;
  excludedDayCount: number;
}
