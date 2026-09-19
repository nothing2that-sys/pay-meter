import type { PaySnapshot } from '../domain/prototype';

export interface MoneyTimerViewModel {
  stateLabel: string;
  timeLabel: string | null;
  timeRemainingMs: number;
  freeWorkMode: boolean;
  clockedOut: boolean;
  rateDimmed: boolean;
}

export function buildMoneyTimerViewModel(snapshot: PaySnapshot): MoneyTimerViewModel {
  const { context } = snapshot;
  if (snapshot.payState === 'OFF_DAY') {
    return {
      stateLabel: '오늘은 휴무',
      timeLabel: null,
      timeRemainingMs: 0,
      freeWorkMode: false,
      clockedOut: false,
      rateDimmed: true,
    };
  }
  if (snapshot.payState === 'CLOCKED_OUT') {
    return {
      stateLabel: '퇴근 완료',
      timeLabel: null,
      timeRemainingMs: 0,
      freeWorkMode: false,
      clockedOut: true,
      rateDimmed: true,
    };
  }
  if (snapshot.payState === 'AFTER_SCHEDULE_UNPAID') {
    return {
      stateLabel: '오늘 근무 완료',
      timeLabel: null,
      timeRemainingMs: 0,
      freeWorkMode: true,
      clockedOut: false,
      rateDimmed: true,
    };
  }
  if (snapshot.payState === 'BEFORE_WORK') {
    return {
      stateLabel: '출근 전',
      timeLabel: '출근까지',
      timeRemainingMs: Math.max(
        0,
        (context.scheduledStart ?? snapshot.nowEpochMs) - snapshot.nowEpochMs,
      ),
      freeWorkMode: false,
      clockedOut: false,
      rateDimmed: true,
    };
  }
  if (snapshot.payState === 'UNPAID_BREAK') {
    return {
      stateLabel: '휴게 중',
      timeLabel: '휴게 종료까지',
      timeRemainingMs: Math.max(
        0,
        (context.unpaidBreak?.end ?? snapshot.nowEpochMs) - snapshot.nowEpochMs,
      ),
      freeWorkMode: false,
      clockedOut: false,
      rateDimmed: true,
    };
  }
  return {
    stateLabel: snapshot.activityState === 'LOAFING' ? '루팡 중' : '업무 중',
    timeLabel: '퇴근까지',
    timeRemainingMs: Math.max(
      0,
      (context.scheduledEnd ?? snapshot.nowEpochMs) - snapshot.nowEpochMs,
    ),
    freeWorkMode: false,
    clockedOut: false,
    rateDimmed: false,
  };
}
