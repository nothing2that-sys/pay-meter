import { describe, expect, it } from 'vitest';
import {
  MICRO_KRW_PER_KRW,
  buildPaySnapshot,
  buildWorkDayContext,
  formatRateMilliKrw,
  monthAllocation,
  type LoafingInterval,
  type PrototypeSettings,
} from '../domain/prototype';
import { consumerValueMessage } from '../features/consumerValue';
import { crossedMilestone } from '../features/milestone';
import { FakeClock } from '../infrastructure/clock';
import { startLoafing, stopLoafing } from '../infrastructure/storage';

const settings: PrototypeSettings = {
  salaryKrw: 4_000_000,
  schedule: {
    workDays: [1, 2, 3, 4, 5],
    start: '09:00',
    end: '18:00',
    unpaidBreak: { start: '12:00', end: '13:00' },
  },
  display: { showDecimals: false, milestoneEnabled: true, privacy: false },
  consumerItems: [
    { id: 'coffee', name: '커피', priceKrw: 5000 },
    { id: 'lunch', name: '점심', priceKrw: 12000 },
    { id: 'chicken', name: '치킨', priceKrw: 25000 },
  ],
};

function at(hour: number, minute = 0, second = 0, millisecond = 0): number {
  return new Date(2026, 8, 21, hour, minute, second, millisecond).getTime();
}

describe('P1 monthly fixed-period allocation', () => {
  it('allocates the monthly salary by planned paid duration and preserves the exact period total', () => {
    const allocation = monthAllocation(settings, 2026, 8);
    expect(allocation.targets.size).toBe(22);
    expect(allocation.plannedPaidDurationMs).toBe(22 * 8 * 60 * 60 * 1000);
    const total = [...allocation.targets.values()].reduce((sum, value) => sum + value, 0n);
    expect(total).toBe(4_000_000n * MICRO_KRW_PER_KRW);
  });

  it('builds an eight-hour paid day context instead of dividing salary by workday count in UI code', () => {
    const context = buildWorkDayContext(settings, at(15), 'Asia/Seoul');
    expect(context.plannedPaidDurationMs).toBe(8 * 60 * 60 * 1000);
    expect(context.dailyTargetMicroKrw).toBeGreaterThan(0n);
  });
});

describe('schedule half-open boundaries', () => {
  it.each([
    [at(8, 59, 59, 999), 'BEFORE_WORK'],
    [at(9), 'REGULAR_WORK'],
    [at(11, 59, 59, 999), 'REGULAR_WORK'],
    [at(12), 'UNPAID_BREAK'],
    [at(12, 59, 59, 999), 'UNPAID_BREAK'],
    [at(13), 'REGULAR_WORK'],
    [at(17, 59, 59, 999), 'REGULAR_WORK'],
    [at(18), 'AFTER_SCHEDULE'],
  ])('maps %s to %s', (now, expected) => {
    expect(buildPaySnapshot(settings, now as number, 'Asia/Seoul', []).payState).toBe(expected);
  });
});

describe('tick independence', () => {
  it('returns the same snapshot for the same wall clock now regardless of imagined refresh cadence', () => {
    const now = at(15, 17, 23, 456);
    const cadences = [16, 100, 1000];
    const snapshots = cadences.map(() => buildPaySnapshot(settings, now, 'Asia/Seoul', []));
    expect(snapshots[0].currentPayMicroKrw).toBe(snapshots[1].currentPayMicroKrw);
    expect(snapshots[1].currentPayMicroKrw).toBe(snapshots[2].currentPayMicroKrw);
    expect(snapshots[0].elapsedPaidDurationMs).toBe(snapshots[2].elapsedPaidDurationMs);
  });
});

describe('inferred activity and break', () => {
  it('keeps fixed-period pay identical while LOAFING changes activity only', () => {
    const loafing: LoafingInterval[] = [{ id: 'one', startAtEpochMs: at(10, 30), endAtEpochMs: at(11) }];
    const normal = buildPaySnapshot(settings, at(11), 'Asia/Seoul', []);
    const withLoafing = buildPaySnapshot(settings, at(11), 'Asia/Seoul', loafing);
    expect(withLoafing.currentPayMicroKrw).toBe(normal.currentPayMicroKrw);
    expect(withLoafing.loafingDurationMs).toBe(30 * 60 * 1000);
    expect(withLoafing.workingDurationMs).toBe(normal.workingDurationMs - 30 * 60 * 1000);
  });

  it('excludes a crossed unpaid break from LOAFING duration while preserving the intent interval', () => {
    const loafing: LoafingInterval[] = [{ id: 'one', startAtEpochMs: at(11, 50), endAtEpochMs: at(13, 20) }];
    const snapshot = buildPaySnapshot(settings, at(13, 20), 'Asia/Seoul', loafing);
    expect(snapshot.loafingDurationMs).toBe(30 * 60 * 1000);
  });

  it('persists one open LOAFING interval and closes it without duplicating a session', () => {
    const started = startLoafing([], at(10, 30));
    const duplicateStart = startLoafing(started, at(10, 45));
    expect(duplicateStart).toHaveLength(1);
    const stopped = stopLoafing(duplicateStart, at(11));
    expect(stopped[0].endAtEpochMs).toBe(at(11));
  });
});

describe('milestone presentation guard', () => {
  const micro = (won: number) => BigInt(won) * MICRO_KRW_PER_KRW;

  it('emits one representative 10,000 KRW threshold when foreground money crosses it', () => {
    expect(crossedMilestone(micro(9998), micro(10003), { enabled: true, foreground: true, pip: false })).toBe(10_000n);
  });

  it('does not replay background catch-up thresholds', () => {
    expect(crossedMilestone(micro(19000), micro(45000), { enabled: true, foreground: false, pip: false })).toBeNull();
  });

  it('is disabled in Document PiP', () => {
    expect(crossedMilestone(micro(9998), micro(10003), { enabled: true, foreground: true, pip: true })).toBeNull();
  });

  it('respects the user effect toggle', () => {
    expect(crossedMilestone(micro(9998), micro(10003), { enabled: false, foreground: true, pip: false })).toBeNull();
  });
});

describe('presentation helpers', () => {
  it('derives consumer value without changing pay data', () => {
    expect(consumerValueMessage(13_000n * MICRO_KRW_PER_KRW, settings.consumerItems)).toBe('점심값 벌었음');
    expect(consumerValueMessage(4_000n * MICRO_KRW_PER_KRW, settings.consumerItems)).toBe('커피까지 1,000원');
  });

  it('formats the default daily visualization rate around KRW per second without accumulating it', () => {
    const snapshot = buildPaySnapshot(settings, at(10), 'Asia/Seoul', []);
    expect(formatRateMilliKrw(snapshot.rateMilliKrwPerSecond)).toMatch(/^6\.3/);
  });

  it('uses a fake clock for deterministic tests', () => {
    const fake = new FakeClock(at(10), 'Asia/Seoul');
    expect(fake.nowEpochMs()).toBe(at(10));
    fake.setNow(at(11));
    expect(fake.nowEpochMs()).toBe(at(11));
    expect(fake.localTimeZone()).toBe('Asia/Seoul');
  });
});
