import { beforeEach, describe, expect, it } from 'vitest';
import {
  clockOutPrototypeDay,
  loadLoafingIntervals,
  loadPrototypeDayArchives,
  loadSettings,
  saveLoafingIntervals,
  savePrototypeDayArchive,
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
    expect(loaded.display.milestoneEnabled).toBe(false);
    expect(loaded.display.colorMode).toBe('dark');
    expect(loaded.consumerItems).toEqual([]);
  });

  it('preserves the light color mode and falls back to dark for unknown values', () => {
    localStorage.setItem(
      'paymeter:p1:settings',
      JSON.stringify({ display: { colorMode: 'light' } }),
    );
    expect(loadSettings().display.colorMode).toBe('light');

    localStorage.setItem(
      'paymeter:p1:settings',
      JSON.stringify({ display: { colorMode: 'unknown-mode' } }),
    );
    expect(loadSettings().display.colorMode).toBe('dark');
  });

  it('preserves supported Phase 2 themes and falls back for unknown values', () => {
    for (const theme of ['pocket', 'ledger'] as const) {
      localStorage.setItem('paymeter:p1:settings', JSON.stringify({ display: { theme } }));
      expect(loadSettings().display.theme).toBe(theme);
    }

    localStorage.setItem(
      'paymeter:p1:settings',
      JSON.stringify({ display: { theme: 'unknown-theme' } }),
    );
    expect(loadSettings().display.theme).toBe('meter-dark');
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

    expect(intervals).toEqual([{ id: 'open', startAtEpochMs: startAt, endAtEpochMs: closedAt }]);
  });
  it('preserves loafing intervals from other dates when saving the active date', () => {
    const firstStart = new Date(2026, 8, 20, 10).getTime();
    const secondStart = new Date(2026, 8, 21, 11).getTime();

    saveLoafingIntervals(
      [{ id: 'first', startAtEpochMs: firstStart, endAtEpochMs: firstStart + 60_000 }],
      '2026-09-20',
    );
    saveLoafingIntervals(
      [{ id: 'second', startAtEpochMs: secondStart, endAtEpochMs: secondStart + 60_000 }],
      '2026-09-21',
    );

    expect(loadLoafingIntervals('2026-09-20')).toHaveLength(1);
    expect(loadLoafingIntervals('2026-09-21')).toHaveLength(1);
  });

  it('upserts daily archives without replacing another day', () => {
    const settings = {
      ...loadSettings(),
      salaryKrw: 4_000_000,
    };
    for (const [localDate, observedAt] of [
      ['2026-09-20', new Date(2026, 8, 20, 18).getTime()],
      ['2026-09-21', new Date(2026, 8, 21, 18).getTime()],
    ] as const) {
      savePrototypeDayArchive({
        localDate,
        timeZoneSnapshot: 'Asia/Seoul',
        settingsSnapshot: settings,
        lastObservedAtEpochMs: observedAt,
        clockOutAtEpochMs: null,
        loafingIntervals: [],
        integrityStatus: 'OK',
        updatedAtEpochMs: observedAt,
      });
    }

    expect(loadPrototypeDayArchives().map((archive) => archive.localDate)).toEqual([
      '2026-09-20',
      '2026-09-21',
    ]);
  });
});
