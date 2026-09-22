import type { DailyReport, PeriodReport } from './reportTypes';

export function aggregatePeriod(reports: DailyReport[]): PeriodReport {
  let recognizedPayMicroKrw = 0n;
  let regularPayMicroKrw = 0n;
  let overtimePayMicroKrw = 0n;
  let workingDurationMs = 0;
  let loafingDurationMs = 0;
  let loafingEarnedValueMicroKrw = 0n;
  let freeWorkDurationMs = 0;
  let freeWorkReferenceValueMicroKrw = 0n;
  let overtimeDurationMs = 0;
  let plannedPaidDurationMs = 0;
  let recordedDayCount = 0;
  let syntheticDayCount = 0;
  let integrityIssueCount = 0;
  let excludedDayCount = 0;
  let hasProvisionalData = false;

  for (const report of reports) {
    if (report.integrityStatus === 'EXCLUDED') {
      excludedDayCount += 1;
      continue;
    }

    if (report.integrityStatus === 'NEEDS_REVIEW') integrityIssueCount += 1;
    if (report.integrityStatus === 'PROVISIONAL' || report.source === 'SYNTHETIC_ALLOCATION') {
      hasProvisionalData = true;
    }
    if (report.source === 'SYNTHETIC_ALLOCATION') syntheticDayCount += 1;
    if (
      (report.source === 'LIVE_SNAPSHOT' || report.source === 'ARCHIVED_SNAPSHOT') &&
      report.hasRecord
    )
      recordedDayCount += 1;
    if (report.source === 'EMPTY') continue;

    recognizedPayMicroKrw += report.recognizedPayMicroKrw;
    regularPayMicroKrw += report.regularPayMicroKrw;
    overtimePayMicroKrw += report.overtimePayMicroKrw;
    workingDurationMs += report.workingDurationMs;
    loafingDurationMs += report.loafingDurationMs;
    loafingEarnedValueMicroKrw += report.loafingEarnedValueMicroKrw;
    freeWorkDurationMs += report.freeWorkDurationMs;
    freeWorkReferenceValueMicroKrw += report.freeWorkReferenceValueMicroKrw;
    overtimeDurationMs += report.overtimeDurationMs;
    plannedPaidDurationMs += report.plannedPaidDurationMs;
  }

  return {
    reports,
    recognizedPayMicroKrw,
    regularPayMicroKrw,
    overtimePayMicroKrw,
    workingDurationMs,
    loafingDurationMs,
    loafingEarnedValueMicroKrw,
    freeWorkDurationMs,
    freeWorkReferenceValueMicroKrw,
    overtimeDurationMs,
    plannedPaidDurationMs,
    recordedDayCount,
    syntheticDayCount,
    integrityIssueCount,
    hasProvisionalData,
    excludedDayCount,
  };
}
