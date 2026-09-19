import { beforeEach, describe, expect, it } from 'vitest';
import {
  clockOutPrototypeDay,
  loadSettings,
  stopLoafing,
} from '../infrastructure/storage';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

describe('P1R prototype storage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  it('normalizes legacy consumerItems and showDecimals without crashing', () => {
    localStorage.setItem(
      'paymeter:p1:settings',
      JSON.stringify({
        salaryKrw: 4_000_000,
        display: {
          showDecimals: true,
          milestoneEnabled: true,
          privacy: false,
        },
        consumerItems: [{ id: 'legacy', name: 'Legacy item', priceKrw: 12_345 }],
      }),
    );

    const loaded = loadSettings();

    expect(loaded.salaryKrw).toBe(4_000_000);
    expect(loaded.display.showDecimals).toBe(false);
    expect(loaded.consumerItems).toEqual([]);
  });

  it('keeps the first clock-out timestamp on duplicate execution', () => {
    const firstAt = new Date(2026, 8, 21, 18, 30).getTime();
    const laterAt = new Date(2026, 8, 21, 18, 45).getTime();

    const first = clockOutPrototypeDay(null, '2026-09-21', firstAt);
    const duplicate = clockOutPrototypeDay(first, '2026-09-21', laterAt);

    expect(duplicate.clockOutAtEpochMs).toBe(firstAt);
    expect(JSON.parse(localStorage.getItem('paymeter:p1r:day-control') ?? '{}')).toEqual({
      localDate: '2026-09-21',
      clockOutAtEpochMs: firstAt,
    });
  });

  it('closes every open LOAFING interval at clock-out time', () => {
    const startAt = new Date(2026, 8, 21, 17, 50).getTime();
    const closedAt = new Date(2026, 8, 21, 18, 30).getTime();

    const intervals = stopLoafing(
      [{ id: 'open', startAtEpochMs: startAt, endAtEpochMs: null }],
      closedAt,
    );

    expect(intervals).toEqual([
      { id: 'open', startAtEpochMs: startAt, endAtEpochMs: closedAt },
    ]);
  });
});
