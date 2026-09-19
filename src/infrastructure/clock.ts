export interface Clock {
  nowEpochMs(): number;
  localTimeZone(): string;
}

declare global {
  interface Window {
    __PAYMETER_TEST_NOW__?: number;
  }
}

export class DeviceClock implements Clock {
  nowEpochMs(): number {
    if (typeof window !== 'undefined' && typeof window.__PAYMETER_TEST_NOW__ === 'number') {
      return window.__PAYMETER_TEST_NOW__;
    }
    return Date.now();
  }

  localTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }
}

export class FakeClock implements Clock {
  constructor(
    private epochMs: number,
    private readonly timeZone = 'UTC',
  ) {}

  nowEpochMs(): number {
    return this.epochMs;
  }

  localTimeZone(): string {
    return this.timeZone;
  }

  setNow(epochMs: number): void {
    this.epochMs = epochMs;
  }
}
