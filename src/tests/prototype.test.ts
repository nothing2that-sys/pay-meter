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

const settings: PrototypeSettings = {
  salaryKrw: 4_000_000,
  schedule: { workDays: [1,2,3,4,5], start: '09:00', end: '18:00', unpaidBreak: { start: '12:00', end: '13:00' } },
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
    expect([...allocation.targets.values()].reduce((a,b) => a+b, 0n)).toBe(4_000_000n * MICRO_KRW_PER_KRW);
  });
  it.each([[9,0,0],[12,0,3*60],[12,30,3*60],[13,0,3*60],[14,0,4*60],[18,0,8*60]])(
    'maps %s:%s to %s paid minutes', (hour, minute, expectedMinutes) => {
      const context = buildWorkDayContext(settings, at(hour, minute), 'Asia/Seoul');
      expect(paidOffsetAt(context, at(hour, minute))).toBe(expectedMinutes * 60_000);
    },
  );
});

describe('P1R state and progress', () => {
  it.each([
    [at(8,59,59,999),'BEFORE_WORK',0],
    [at(9),'REGULAR_WORK',0],
    [at(12),'UNPAID_BREAK',0.375],
    [at(12,30),'UNPAID_BREAK',0.375],
    [at(13),'REGULAR_WORK',0.375],
    [at(14),'REGULAR_WORK',0.5],
    [at(18),'AFTER_SCHEDULE_UNPAID',1],
  ])('maps boundary state/progress', (now, state, progress) => {
    const snapshot = buildPaySnapshot(settings, now as number, 'Asia/Seoul', []);
    expect(snapshot.payState).toBe(state);
    expect(snapshot.scheduledProgressRatio).toBeCloseTo(progress as number, 5);
  });

  it('keeps current rate active only during regular work', () => {
    expect(buildPaySnapshot(settings, at(10), 'Asia/Seoul', []).currentRateMilliKrwPerSecond).toBeGreaterThan(0n);
    for (const now of [at(8), at(12,30), at(18), atDay(20,10)]) {
      expect(buildPaySnapshot(settings, now, 'Asia/Seoul', []).currentRateMilliKrwPerSecond).toBe(0n);
    }
  });
});

describe('P1R perimeter and loafing money', () => {
  const loafing: LoafingInterval[] = [{ id:'one', startAtEpochMs: at(10,20), endAtEpochMs: at(10,50) }];
  it('preserves chronological WORKING/LOAFING segments', () => {
    const snapshot = buildPaySnapshot(settings, at(11), 'Asia/Seoul', loafing);
    expect(snapshot.perimeterSegments.map((x) => x.type)).toEqual(['WORKING','LOAFING','WORKING']);
    expect(snapshot.perimeterSegments[1].startRatio).toBeCloseTo(80/480, 5);
    expect(snapshot.perimeterSegments[1].endRatio).toBeCloseTo(110/480, 5);
  });
  it('does not reduce Today Earned while loafing and calculates loafing breakdown exactly', () => {
    const normal = buildPaySnapshot(settings, at(11), 'Asia/Seoul', []);
    const withLoafing = buildPaySnapshot(settings, at(11), 'Asia/Seoul', loafing);
    expect(withLoafing.todayEarnedMicroKrw).toBe(normal.todayEarnedMicroKrw);
    expect(withLoafing.loafingEarnedValueMicroKrw).toBeGreaterThan(0n);
    expect(withLoafing.loafingEarnedValueMicroKrw).toBeLessThanOrEqual(withLoafing.todayEarnedMicroKrw);
  });
  it('excludes a crossed break from loafing duration', () => {
    const crossed = [{ id:'x', startAtEpochMs:at(11,50), endAtEpochMs:at(13,20) }];
    expect(buildPaySnapshot(settings, at(13,20), 'Asia/Seoul', crossed).loafingDurationMs).toBe(30*60_000);
  });
});

describe('P1R free work wallet and clock out', () => {
  it('derives free work without adding it to Today Earned', () => {
    const at18 = buildPaySnapshot(settings, at(18), 'Asia/Seoul', []);
    const at1830 = buildPaySnapshot(settings, at(18,30), 'Asia/Seoul', []);
    expect(at1830.freeWorkDurationMs).toBe(30*60_000);
    expect(at1830.freeWorkReferenceValueMicroKrw).toBeGreaterThan(0n);
    expect(at1830.todayEarnedMicroKrw).toBe(at18.todayEarnedMicroKrw);
    expect(at1830.scheduledProgressRatio).toBe(1);
  });
  it('freezes values at idempotent clock-out timestamp', () => {
    const control = { localDate:'2026-09-21', clockOutAtEpochMs:at(18,30) };
    const later = buildPaySnapshot(settings, at(20), 'Asia/Seoul', [], control);
    expect(later.payState).toBe('CLOCKED_OUT');
    expect(later.freeWorkDurationMs).toBe(30*60_000);
    expect(later.todayEarnedMicroKrw).toBe(later.dailyTargetMicroKrw);
  });
});

describe('P1R view model and free-work copy', () => {
  it('uses contextual wall-clock labels', () => {
    expect(buildMoneyTimerViewModel(buildPaySnapshot(settings, at(8), 'Asia/Seoul', [])).timeLabel).toBe('출근까지');
    expect(buildMoneyTimerViewModel(buildPaySnapshot(settings, at(10), 'Asia/Seoul', [])).timeLabel).toBe('퇴근까지');
    expect(buildMoneyTimerViewModel(buildPaySnapshot(settings, at(12,30), 'Asia/Seoul', [])).timeLabel).toBe('휴게 종료까지');
  });
  it.each([[10,'FW0'],[20,'FW1'],[45,'FW2'],[70,'FW3']])('maps %s minutes to %s', (minutes,bucket) => {
    expect(freeWorkBucket((minutes as number)*60_000)).toBe(bucket);
  });
  it('keeps copy stable within the same date and bucket', () => {
    expect(freeWorkCopy('2026-09-21',20*60_000)).toBe(freeWorkCopy('2026-09-21',29*60_000));
  });
});

describe('existing P1 invariants', () => {
  it('is tick independent', () => {
    const now=at(15,17,23,456);
    expect(buildPaySnapshot(settings,now,'Asia/Seoul',[]).todayEarnedMicroKrw)
      .toBe(buildPaySnapshot(settings,now,'Asia/Seoul',[]).todayEarnedMicroKrw);
  });
  it('keeps milestone foreground-only and disabled in PiP', () => {
    const micro=(won:number)=>BigInt(won)*MICRO_KRW_PER_KRW;
    expect(crossedMilestone(micro(9998),micro(10003),{enabled:true,foreground:true,pip:false})).toBe(10_000n);
    expect(crossedMilestone(micro(9998),micro(10003),{enabled:true,foreground:true,pip:true})).toBeNull();
  });
  it('uses deterministic FakeClock and formats rate', () => {
    const fake=new FakeClock(at(10),'Asia/Seoul');
    expect(fake.nowEpochMs()).toBe(at(10));
    expect(formatRateMilliKrw(buildPaySnapshot(settings,at(10),'Asia/Seoul',[]).currentRateMilliKrwPerSecond)).toMatch(/^6\./);
  });
});
