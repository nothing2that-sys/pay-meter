import type { PaySnapshot } from '../domain/prototype';

export type MoneyTimerTheme = 'neutral' | 'working' | 'loafing' | 'freework';

export interface MoneyTimerViewModel {
  stateLabel: string;
  stateTheme: MoneyTimerTheme;
  mainSupportLabel: string | null;
  freeWorkMode: boolean;
  clockedOut: boolean;
}

export function buildMoneyTimerViewModel(snapshot: PaySnapshot): MoneyTimerViewModel {
  if (snapshot.payState === 'OFF_DAY') {
    return {
      stateLabel: '오늘은 휴무',
      stateTheme: 'neutral',
      mainSupportLabel: null,
      freeWorkMode: false,
      clockedOut: false,
    };
  }
  if (snapshot.payState === 'CLOCKED_OUT') {
    return {
      stateLabel: '퇴근 완료',
      stateTheme: 'neutral',
      mainSupportLabel: null,
      freeWorkMode: false,
      clockedOut: true,
    };
  }
  if (snapshot.payState === 'AFTER_SCHEDULE_UNPAID') {
    return {
      stateLabel: '무료봉사 중',
      stateTheme: 'freework',
      mainSupportLabel: null,
      freeWorkMode: true,
      clockedOut: false,
    };
  }
  if (snapshot.payState === 'BEFORE_WORK') {
    return {
      stateLabel: '출근 전',
      stateTheme: 'neutral',
      mainSupportLabel: null,
      freeWorkMode: false,
      clockedOut: false,
    };
  }
  if (snapshot.payState === 'UNPAID_BREAK') {
    return {
      stateLabel: '휴게 중',
      stateTheme: 'neutral',
      mainSupportLabel: '적립 일시정지',
      freeWorkMode: false,
      clockedOut: false,
    };
  }
  const loafing = snapshot.activityState === 'LOAFING';
  return {
    stateLabel: loafing ? '루팡 모드' : '업무 중',
    stateTheme: loafing ? 'loafing' : 'working',
    mainSupportLabel: loafing ? null : '정상 적립 중',
    freeWorkMode: false,
    clockedOut: false,
  };
}
