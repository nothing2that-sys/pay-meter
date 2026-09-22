import { describe, expect, it } from 'vitest';
import {
  buildPaySnapshot,
  type LoafingInterval,
  type PrototypeSettings,
} from '../domain/prototype';
import { aggregatePeriod } from '../domain/reporting/aggregatePeriod';
import {
  buildArchivedDailyReport,
  buildAvailableDailyReport,
  buildDailyReportFromSnapshot,
  buildSyntheticAllocationReport,
} from '../domain/reporting/buildDailyReport';
import { monthlyRange, weeklyRange, yearlyRange } from '../domain/reporting/reportRange';

const settings: PrototypeSettings = {
  salaryKrw: 4_000_000,
  schedule: {
    workDays: [1, 2, 3, 4, 5],
    start: '09:00',
    end: '18:00',
    unpaidBreak: { start: '12:00', end: '13:00' },
  },
  display: { showDecimals: false, milestoneEnabled: false, privacy: false },
  consumerItems: [],
};

function at(year: number, monthIndex: number, day: number, hour: number, minute = 0): number {
  return new Date(year, monthIndex, day, hour, minute, 0, 0).getTime();
}

describe('detail reporting daily mapping', () => {
  it('maps the current PaySnapshot without changing recognized pay semantics', () => {
    const intervals: LoafingInterval[] = [
      {
        id: 'loaf',
        startAtEpochMs: at(2026, 8, 21, 9, 30),
        endAtEpochMs: at(2026, 8, 21, 9, 45),
      },
    ];
    const snapshot = buildPaySnapshot(settings, at(2026, 8, 21, 10), 'Asia/Seoul', intervals);
    const report = buildDailyReportFromSnapshot(snapshot, intervals);

    expect(report.recognizedPayMicroKrw).toBe(snapshot.todayEarnedMicroKrw);
    expect(report.regularPayMicroKrw).toBe(snapshot.todayEarnedMicroKrw);
    expect(report.overtimePayMicroKrw).toBe(0n);
    expect(report.loafingEarnedValueMicroKrw).toBe(snapshot.loafingEarnedValueMicroKrw);
    expect(report.workingDurationMs).toBe(snapshot.workingDurationMs);
    expect(report.loafingDurationMs).toBe(snapshot.loafingDurationMs);
    expect(report.source).toBe('LIVE_SNAPSHOT');
  });

  it('does not add loafing earned value to recognized pay', () => {
    const intervals: LoafingInterval[] = [
      {
        id: 'loaf',
        startAtEpochMs: at(2026, 8, 21, 9),
        endAtEpochMs: at(2026, 8, 21, 10),
      },
    ];
    const snapshot = buildPaySnapshot(settings, at(2026, 8, 21, 11), 'Asia/Seoul', intervals);
    const report = buildDailyReportFromSnapshot(snapshot, intervals);

    expect(report.loafingEarnedValueMicroKrw).toBeGreaterThan(0n);
    expect(report.recognizedPayMicroKrw).toBe(report.regularPayMicroKrw);
    expect(report.recognizedPayMicroKrw).not.toBe(
      report.regularPayMicroKrw + report.loafingEarnedValueMicroKrw,
    );
  });

  it('does not add free work reference value to recognized pay', () => {
    const snapshot = buildPaySnapshot(settings, at(2026, 8, 21, 18, 30), 'Asia/Seoul', []);
    const report = buildDailyReportFromSnapshot(snapshot, []);

    expect(report.freeWorkReferenceValueMicroKrw).toBeGreaterThan(0n);
    expect(report.recognizedPayMicroKrw).toBe(report.regularPayMicroKrw);
    expect(report.recognizedPayMicroKrw).not.toBe(
      report.regularPayMicroKrw + report.freeWorkReferenceValueMicroKrw,
    );
  });

  it('builds a wall-clock timeline with work, loafing, break and free work', () => {
    const intervals: LoafingInterval[] = [
      {
        id: 'loaf',
        startAtEpochMs: at(2026, 8, 21, 10),
        endAtEpochMs: at(2026, 8, 21, 10, 30),
      },
    ];
    const snapshot = buildPaySnapshot(settings, at(2026, 8, 21, 18, 30), 'Asia/Seoul', intervals);
    const report = buildDailyReportFromSnapshot(snapshot, intervals);

    expect(report.timelineSegments.map((segment) => segment.type)).toContain('WORKING');
    expect(report.timelineSegments.map((segment) => segment.type)).toContain('LOAFING');
    expect(report.timelineSegments.map((segment) => segment.type)).toContain('BREAK');
    expect(report.timelineSegments.map((segment) => segment.type)).toContain('FREE_WORK');
  });

  it('keeps past allocation explicitly provisional without inventing activity history', () => {
    const report = buildSyntheticAllocationReport(settings, '2026-09-18', 'Asia/Seoul');

    expect(report.source).toBe('SYNTHETIC_ALLOCATION');
    expect(report.integrityStatus).toBe('PROVISIONAL');
    expect(report.recognizedPayMicroKrw).toBeGreaterThan(0n);
    expect(report.workingDurationMs).toBe(0);
    expect(report.loafingDurationMs).toBe(0);
    expect(report.freeWorkDurationMs).toBe(0);
    expect(report.clockInAtEpochMs).toBeNull();
    expect(report.clockOutAtEpochMs).toBeNull();
    expect(report.timelineSegments).toEqual([]);
  });

  it('rebuilds an archived day from its frozen settings and activity inputs', () => {
    const observedAt = at(2026, 8, 18, 18);
    const report = buildArchivedDailyReport({
      localDate: '2026-09-18',
      timeZoneSnapshot: 'Asia/Seoul',
      settingsSnapshot: settings,
      lastObservedAtEpochMs: observedAt,
      clockOutAtEpochMs: observedAt,
      loafingIntervals: [
        {
          id: 'archived-loaf',
          startAtEpochMs: at(2026, 8, 18, 10),
          endAtEpochMs: at(2026, 8, 18, 10, 30),
        },
      ],
      integrityStatus: 'OK',
      updatedAtEpochMs: observedAt,
    });

    expect(report.source).toBe('ARCHIVED_SNAPSHOT');
    expect(report.isFinalized).toBe(true);
    expect(report.loafingDurationMs).toBe(30 * 60_000);
    expect(report.timelineSegments.map((segment) => segment.type)).toContain('LOAFING');
  });

  it('excludes future dates instead of synthesizing pay', () => {
    const snapshot = buildPaySnapshot(settings, at(2026, 8, 21, 10), 'Asia/Seoul', []);
    const report = buildAvailableDailyReport({
      localDate: '2026-09-22',
      snapshot,
      settings,
      loafingIntervals: [],
    });

    expect(report.source).toBe('EMPTY');
    expect(report.recognizedPayMicroKrw).toBe(0n);
  });
});

describe('detail reporting ranges', () => {
  it('honors Monday and Sunday week starts without changing source data', () => {
    const monday = weeklyRange('2026-09-23', 1);
    const sunday = weeklyRange('2026-09-23', 0);

    expect(monday.startLocalDate).toBe('2026-09-21');
    expect(monday.endLocalDate).toBe('2026-09-27');
    expect(sunday.startLocalDate).toBe('2026-09-20');
    expect(sunday.endLocalDate).toBe('2026-09-26');
    expect(monday.dates).toHaveLength(7);
    expect(sunday.dates).toHaveLength(7);
  });

  it.each([
    ['2026-02-10', 28],
    ['2024-02-10', 29],
    ['2026-04-10', 30],
    ['2026-05-10', 31],
  ])('handles calendar month length for %s', (anchor, days) => {
    expect(monthlyRange(anchor).dates).toHaveLength(days);
  });

  it('handles common and leap years', () => {
    expect(yearlyRange('2026-09-21').dates).toHaveLength(365);
    expect(yearlyRange('2024-09-21').dates).toHaveLength(366);
  });
});

describe('detail reporting period aggregation', () => {
  it('equals the sum of its daily reports', () => {
    const first = buildSyntheticAllocationReport(settings, '2026-09-17', 'Asia/Seoul');
    const second = buildSyntheticAllocationReport(settings, '2026-09-18', 'Asia/Seoul');
    const total = aggregatePeriod([first, second]);

    expect(total.recognizedPayMicroKrw).toBe(
      first.recognizedPayMicroKrw + second.recognizedPayMicroKrw,
    );
    expect(total.regularPayMicroKrw).toBe(first.regularPayMicroKrw + second.regularPayMicroKrw);
    expect(total.hasProvisionalData).toBe(true);
    expect(total.syntheticDayCount).toBe(2);
    expect(total.plannedPaidDurationMs).toBe(
      first.plannedPaidDurationMs + second.plannedPaidDurationMs,
    );
  });

  it('includes the live day in planned paid duration totals', () => {
    const snapshot = buildPaySnapshot(settings, at(2026, 8, 21, 10), 'Asia/Seoul', []);
    const live = buildDailyReportFromSnapshot(snapshot, []);
    const synthetic = buildSyntheticAllocationReport(settings, '2026-09-18', 'Asia/Seoul');
    const total = aggregatePeriod([synthetic, live]);

    expect(total.plannedPaidDurationMs).toBe(
      synthetic.plannedPaidDurationMs + live.plannedPaidDurationMs,
    );
  });

  it('keeps loafing and free-work values as breakdown/reference totals only', () => {
    const intervals: LoafingInterval[] = [
      {
        id: 'loaf',
        startAtEpochMs: at(2026, 8, 21, 17),
        endAtEpochMs: at(2026, 8, 21, 17, 30),
      },
    ];
    const snapshot = buildPaySnapshot(settings, at(2026, 8, 21, 18, 30), 'Asia/Seoul', intervals);
    const daily = buildDailyReportFromSnapshot(snapshot, intervals);
    const total = aggregatePeriod([daily]);

    expect(total.recognizedPayMicroKrw).toBe(daily.regularPayMicroKrw);
    expect(total.loafingEarnedValueMicroKrw).toBe(daily.loafingEarnedValueMicroKrw);
    expect(total.freeWorkReferenceValueMicroKrw).toBe(daily.freeWorkReferenceValueMicroKrw);
  });

  it('does not include future dates in a partial month', () => {
    const snapshot = buildPaySnapshot(settings, at(2026, 8, 21, 10), 'Asia/Seoul', []);
    const reports = monthlyRange('2026-09-21').dates.map((localDate) =>
      buildAvailableDailyReport({
        localDate,
        snapshot,
        settings,
        loafingIntervals: [],
      }),
    );
    const total = aggregatePeriod(reports);

    expect(reports.filter((report) => report.source === 'EMPTY').length).toBeGreaterThan(0);
    expect(
      reports
        .filter((report) => report.localDate > snapshot.localDate)
        .every((report) => report.recognizedPayMicroKrw === 0n),
    ).toBe(true);
    expect(total.recognizedPayMicroKrw).toBeGreaterThan(0n);
  });

  it('is unaffected by privacy settings at the domain layer', () => {
    const privateSettings: PrototypeSettings = {
      ...settings,
      display: { ...settings.display, privacy: true },
    };
    const visible = buildSyntheticAllocationReport(settings, '2026-09-18', 'Asia/Seoul');
    const privateReport = buildSyntheticAllocationReport(
      privateSettings,
      '2026-09-18',
      'Asia/Seoul',
    );

    expect(privateReport).toEqual(visible);
  });
});
