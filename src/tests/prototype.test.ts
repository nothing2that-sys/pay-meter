import { describe, expect, it } from 'vitest';
import {
  MICRO_KRW_PER_KRW,
  buildPaySnapshot,
  buildWorkDayContext,
  formatRateMilliKrw,
  monthAllocation,
  paidOffsetAt,
  type LoafingInterval,
  type PrototypeSettings,
} from '../domain/prototype';
import { crossedMilestone } from '../features/milestone';
import { FakeClock } from '../infrastructure/clock';
import { freeWorkBucket, freeWorkCopy } from '../presentation/freeWorkCopy';
import { buildMoneyTimerViewModel } from '../presentation/moneyTimerViewModel';
import {
  PERIMETER_PATH_D,
  buildPerimeterProgressPath,
  buildPerimeterRangePath,
} from '../presentation/PerimeterTimeline';

const settings: PrototypeSettings = {
  salaryKrw: 4_000_000,
  schedule: {
    workDays: [1, 2, 3, 4, 5],
    start: '09:00',
    end: '18:00',
    unpaidBreak: { start: '12:00', end: '13:00' },
  },
  display: { showDecimals: false, milestoneEnabled: true, privacy: false },
  consumerItems: [],
};

function at(hour: number, minute = 0, second = 0, millisecond = 0): number {
  return new Date(2026, 8, 21, hour, minute, second, millisecond).getTime();
}
function atDay(day: number, hour: number, minute = 0): number {
  return new Date(2026, 8, day, hour, minute).getTime();
}

describe('P1R monthly allocation and paid coordinate', () => {
  it('preserves the exact monthly salary', () => {
    const allocation = monthAllocation(settings, 2026, 8);
    expect([...allocation.targets.values()].reduce((a, b) => a + b, 0n)).toBe(
      4_000_000n * MICRO_KRW_PER_KRW,
    );
  });
  it.each([
    [9, 0, 0],
    [12, 0, 3 * 60],
    [12, 30, 3 * 60],
    [13, 0, 3 * 60],
    [14, 0, 4 * 60],
    [18, 0, 8 * 60],
  ])('maps %s:%s to %s paid minutes', (hour, minute, expectedMinutes) => {
    const context = buildWorkDayContext(settings, at(hour, minute), 'Asia/Seoul');
    expect(paidOffsetAt(context, at(hour, minute))).toBe(expectedMinutes * 60_000);
  });
});

describe('P1R state and progress', () => {
  it.each([
    [at(8, 59, 59, 999), 'BEFORE_WORK', 0],
    [at(9), 'REGULAR_WORK', 0],
    [at(11), 'REGULAR_WORK', 0.25],
    [at(12), 'UNPAID_BREAK', 0.375],
    [at(12, 30), 'UNPAID_BREAK', 0.375],
    [at(13), 'REGULAR_WORK', 0.375],
    [at(14), 'REGULAR_WORK', 0.5],
    [at(18), 'AFTER_SCHEDULE_UNPAID', 1],
  ])('maps boundary state/progress', (now, state, progress) => {
    const snapshot = buildPaySnapshot(settings, now as number, 'Asia/Seoul', []);
    expect(snapshot.payState).toBe(state);
    expect(snapshot.scheduledProgressRatio).toBeCloseTo(progress as number, 5);
  });

  it('keeps current rate active only during regular work', () => {
    expect(
      buildPaySnapshot(settings, at(10), 'Asia/Seoul', []).currentRateMilliKrwPerSecond,
    ).toBeGreaterThan(0n);
    for (const now of [at(8), at(12, 30), at(18), atDay(20, 10)]) {
      expect(buildPaySnapshot(settings, now, 'Asia/Seoul', []).currentRateMilliKrwPerSecond).toBe(
        0n,
      );
    }
  });
});

describe('P1R perimeter and loafing money', () => {
  const loafing: LoafingInterval[] = [
    { id: 'one', startAtEpochMs: at(10, 20), endAtEpochMs: at(10, 50) },
  ];
  it('preserves chronological WORKING/LOAFING segments', () => {
    const snapshot = buildPaySnapshot(settings, at(11), 'Asia/Seoul', loafing);
    expect(snapshot.perimeterSegments.map((x) => x.type)).toEqual([
      'WORKING',
      'LOAFING',
      'WORKING',
    ]);
    expect(snapshot.perimeterSegments[1].startRatio).toBeCloseTo(80 / 480, 5);
    expect(snapshot.perimeterSegments[1].endRatio).toBeCloseTo(110 / 480, 5);
  });
  it('does not reduce Today Earned while loafing and calculates loafing breakdown exactly', () => {
    const normal = buildPaySnapshot(settings, at(11), 'Asia/Seoul', []);
    const withLoafing = buildPaySnapshot(settings, at(11), 'Asia/Seoul', loafing);
    expect(withLoafing.todayEarnedMicroKrw).toBe(normal.todayEarnedMicroKrw);
    expect(withLoafing.loafingEarnedValueMicroKrw).toBeGreaterThan(0n);
    expect(withLoafing.loafingEarnedValueMicroKrw).toBeLessThanOrEqual(
      withLoafing.todayEarnedMicroKrw,
    );
  });
  it('preserves separated multiple LOAFING segments in chronological order', () => {
    const multiple: LoafingInterval[] = [
      { id: 'a', startAtEpochMs: at(9, 30), endAtEpochMs: at(9, 45) },
      { id: 'b', startAtEpochMs: at(10, 30), endAtEpochMs: at(10, 40) },
    ];
    const snapshot = buildPaySnapshot(settings, at(11), 'Asia/Seoul', multiple);
    expect(snapshot.perimeterSegments.map((x) => x.type)).toEqual([
      'WORKING',
      'LOAFING',
      'WORKING',
      'LOAFING',
      'WORKING',
    ]);
  });

  it('excludes a crossed break from loafing duration and keeps open LOAFING intent after break', () => {
    const crossed: LoafingInterval[] = [
      { id: 'x', startAtEpochMs: at(11, 50), endAtEpochMs: null },
    ];
    const snapshot = buildPaySnapshot(settings, at(13, 20), 'Asia/Seoul', crossed);
    expect(snapshot.loafingDurationMs).toBe(30 * 60_000);
    expect(snapshot.activityState).toBe('LOAFING');
    expect(snapshot.perimeterSegments.map((x) => x.type)).toEqual(['WORKING', 'LOAFING']);
  });

  it('freezes the perimeter ratio and elapsed segment during unpaid break', () => {
    const atBreakStart = buildPaySnapshot(settings, at(12), 'Asia/Seoul', []);
    const atBreakMiddle = buildPaySnapshot(settings, at(12, 30), 'Asia/Seoul', []);

    expect(atBreakStart.scheduledProgressRatio).toBe(0.375);
    expect(atBreakMiddle.scheduledProgressRatio).toBe(0.375);
    expect(atBreakStart.perimeterSegments.at(-1)?.endRatio).toBeCloseTo(0.375, 5);
    expect(atBreakMiddle.perimeterSegments.at(-1)?.endRatio).toBeCloseTo(0.375, 5);
  });
});

describe('P1R free work wallet and clock out', () => {
  it('derives free work without adding it to Today Earned', () => {
    const at18 = buildPaySnapshot(settings, at(18), 'Asia/Seoul', []);
    const at1830 = buildPaySnapshot(settings, at(18, 30), 'Asia/Seoul', []);
    expect(at1830.freeWorkDurationMs).toBe(30 * 60_000);
    expect(at1830.freeWorkReferenceValueMicroKrw).toBeGreaterThan(0n);
    expect(at1830.todayEarnedMicroKrw).toBe(at18.todayEarnedMicroKrw);
    expect(at1830.scheduledProgressRatio).toBe(1);
    expect(at1830.perimeterSegments.at(-1)?.endRatio).toBe(1);
  });
  it('freezes values at idempotent clock-out timestamp', () => {
    const control = { localDate: '2026-09-21', clockOutAtEpochMs: at(18, 30) };
    const later = buildPaySnapshot(settings, at(20), 'Asia/Seoul', [], control);
    expect(later.payState).toBe('CLOCKED_OUT');
    expect(later.freeWorkDurationMs).toBe(30 * 60_000);
    expect(later.todayEarnedMicroKrw).toBe(later.dailyTargetMicroKrw);
    expect(later.currentRateMilliKrwPerSecond).toBe(0n);
  });
});

describe('P1R final timer view model and free-work copy', () => {
  it('maps working, loafing and free work to the final state labels and themes', () => {
    const working = buildMoneyTimerViewModel(buildPaySnapshot(settings, at(10), 'Asia/Seoul', []));
    const loafing = buildMoneyTimerViewModel(
      buildPaySnapshot(settings, at(10), 'Asia/Seoul', [
        { id: 'open', startAtEpochMs: at(9, 30), endAtEpochMs: null },
      ]),
    );
    const freeWork = buildMoneyTimerViewModel(
      buildPaySnapshot(settings, at(18, 30), 'Asia/Seoul', []),
    );

    expect(working).toMatchObject({
      stateLabel: '업무중',
      stateTheme: 'working',
    });
    expect(loafing).toMatchObject({
      stateLabel: '루팡중',
      stateTheme: 'loafing',
    });
    expect(freeWork).toMatchObject({
      stateLabel: '봉사중',
      stateTheme: 'freework',
      freeWorkMode: true,
    });
  });

  it.each([
    [0, 'FW0'],
    [14, 'FW0'],
    [15, 'FW1'],
    [29, 'FW1'],
    [30, 'FW2'],
    [59, 'FW2'],
    [60, 'FW3'],
    [70, 'FW3'],
  ])('maps %s minutes to %s', (minutes, bucket) => {
    expect(freeWorkBucket((minutes as number) * 60_000)).toBe(bucket);
  });
  it('keeps copy stable within the same date and bucket', () => {
    expect(freeWorkCopy('2026-09-21', 20 * 60_000)).toBe(freeWorkCopy('2026-09-21', 29 * 60_000));
  });
});

describe('P1R perimeter presentation contract', () => {
  it('starts the rounded path at top center and proceeds clockwise toward the right edge', () => {
    expect(PERIMETER_PATH_D.startsWith('M 50 0.7 H 94')).toBe(true);
  });

  it('builds one physical partial path instead of any dash pattern', () => {
    const quarter = buildPerimeterProgressPath(0.25);
    expect(quarter.startsWith('M 50 0.7')).toBe(true);
    expect(quarter).not.toBe(PERIMETER_PATH_D);
    expect(quarter).not.toContain('Z');
    expect(buildPerimeterProgressPath(0)).toBe('');
    expect(buildPerimeterProgressPath(1)).toBe(PERIMETER_PATH_D);
  });

  it('builds independent physical paths for historical activity ranges', () => {
    const working = buildPerimeterRangePath(0, 0.1);
    const loafing = buildPerimeterRangePath(0.1, 0.25);
    expect(working.startsWith('M 50 0.7')).toBe(true);
    expect(loafing.startsWith('M 50 0.7')).toBe(false);
    expect(working).not.toBe(loafing);
    expect(buildPerimeterRangePath(0.25, 0.25)).toBe('');
  });
});

describe('existing P1 invariants', () => {
  it('is tick independent for the complete Snapshot', () => {
    const now = at(15, 17, 23, 456);
    expect(buildPaySnapshot(settings, now, 'Asia/Seoul', [])).toEqual(
      buildPaySnapshot(settings, now, 'Asia/Seoul', []),
    );
  });
  it('keeps milestone foreground-only and disabled in PiP', () => {
    const micro = (won: number) => BigInt(won) * MICRO_KRW_PER_KRW;
    expect(
      crossedMilestone(micro(9998), micro(10003), { enabled: true, foreground: true, pip: false }),
    ).toBe(10_000n);
    expect(
      crossedMilestone(micro(9998), micro(10003), { enabled: true, foreground: true, pip: true }),
    ).toBeNull();
  });
  it('uses deterministic FakeClock and formats rate', () => {
    const fake = new FakeClock(at(10), 'Asia/Seoul');
    expect(fake.nowEpochMs()).toBe(at(10));
    expect(
      formatRateMilliKrw(
        buildPaySnapshot(settings, at(10), 'Asia/Seoul', []).currentRateMilliKrwPerSecond,
      ),
    ).toMatch(/^6\./);
  });
});
