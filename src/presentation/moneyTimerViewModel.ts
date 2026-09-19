import type { PaySnapshot } from '../domain/prototype';

export type MoneyTimerTheme = 'neutral' | 'working' | 'loafing' | 'freework';

export interface MoneyTimerViewModel {
  stateLabel: string;
  stateTheme: MoneyTimerTheme;
  freeWorkMode: boolean;
  clockedOut: boolean;
}

export function buildMoneyTimerViewModel(snapshot: PaySnapshot): MoneyTimerViewModel {
  if (snapshot.payState === 'OFF_DAY') {
    return {
      stateLabel: '휴무',
      stateTheme: 'neutral',
      freeWorkMode: false,
      clockedOut: false,
    };
  }
  if (snapshot.payState === 'CLOCKED_OUT') {
    return {
      stateLabel: '퇴근완료',
      stateTheme: 'neutral',
      freeWorkMode: false,
      clockedOut: true,
    };
  }
  if (snapshot.payState === 'AFTER_SCHEDULE_UNPAID') {
    return {
      stateLabel: '봉사중',
      stateTheme: 'freework',
      freeWorkMode: true,
      clockedOut: false,
    };
  }
  if (snapshot.payState === 'BEFORE_WORK') {
    return {
      stateLabel: '출근전',
      stateTheme: 'neutral',
      freeWorkMode: false,
      clockedOut: false,
    };
  }
  if (snapshot.payState === 'UNPAID_BREAK') {
    return {
      stateLabel: '휴게중',
      stateTheme: 'neutral',
      freeWorkMode: false,
      clockedOut: false,
    };
  }

  const loafing = snapshot.activityState === 'LOAFING';
  return {
    stateLabel: loafing ? '루팡중' : '업무중',
    stateTheme: loafing ? 'loafing' : 'working',
    freeWorkMode: false,
    clockedOut: false,
  };
}
