import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_SETTINGS,
  buildPaySnapshot,
  formatDuration,
  formatMicroKrw,
  localDateFromEpoch,
  monthAllocation,
  parseTimeToMinutes,
  type PaySnapshot,
  type PrototypeDayControl,
  type PrototypeSettings,
} from './domain/prototype';
import { DeviceClock } from './infrastructure/clock';
import { openDocumentPiP, supportsDocumentPiP } from './infrastructure/pip';
import {
  clockOutPrototypeDay,
  exportPrototypeData,
  loadLoafingIntervals,
  loadPrototypeDayControl,
  loadSettings,
  resetPrototypeData,
  saveLoafingIntervals,
  saveSettings,
  startLoafing,
  stopLoafing,
} from './infrastructure/storage';
import { CumulativeChart, type CumulativeChartPoint } from './presentation/CumulativeChart';
import { MoneyTimer } from './presentation/MoneyTimer';

const clock = new DeviceClock();
type Screen = 'timer' | 'dashboard' | 'settings';

function money(value: bigint, privacy: boolean): string {
  return privacy ? '₩ ••••••' : `₩${formatMicroKrw(value)}`;
}

function minutesToLocalTime(totalMinutes: number): string | null {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0 || totalMinutes >= 24 * 60) return null;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function rangeDurationMinutes(start: string, end: string): number {
  try {
    return Math.max(0, parseTimeToMinutes(end) - parseTimeToMinutes(start));
  } catch {
    return 0;
  }
}

type DashboardPeriod = 'daily' | 'weekly' | 'monthly';

function microKrwToKrw(value: bigint): number {
  return Number(value / 1_000_000n);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function dailyTargetForDate(settings: PrototypeSettings, date: Date): bigint {
  const allocation = monthAllocation(settings, date.getFullYear(), date.getMonth());
  return allocation.targets.get(localDateFromEpoch(startOfLocalDay(date).getTime())) ?? 0n;
}

function buildAccumulationData(
  snapshot: PaySnapshot,
  settings: PrototypeSettings,
  period: DashboardPeriod,
): { total: bigint; points: CumulativeChartPoint[]; title: string } {
  const now = new Date(snapshot.nowEpochMs);

  if (period === 'daily') {
    const current = microKrwToKrw(snapshot.todayEarnedMicroKrw);
    const points = Array.from({ length: 6 }, (_, index) => ({
      label: index === 0 ? '시작' : index === 5 ? '현재' : String(index),
      value: Math.round((current * index) / 5),
    }));
    return { total: snapshot.todayEarnedMicroKrw, points, title: '오늘 누적' };
  }

  const dates: Date[] = [];
  if (period === 'weekly') {
    const mondayOffset = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset, 12);
    for (let index = 0; index <= mondayOffset; index += 1) {
      dates.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index, 12));
    }
  } else {
    for (let day = 1; day <= now.getDate(); day += 1) {
      dates.push(new Date(now.getFullYear(), now.getMonth(), day, 12));
    }
  }

  let cumulative = 0n;
  const points = dates.map((date) => {
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    cumulative += sameDay ? snapshot.todayEarnedMicroKrw : dailyTargetForDate(settings, date);
    return {
      label:
        period === 'weekly'
          ? ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
          : String(date.getDate()),
      value: microKrwToKrw(cumulative),
    };
  });

  return {
    total: cumulative,
    points,
    title: period === 'weekly' ? '이번 주 누적' : '이번 달 누적',
  };
}

function Dashboard({
  snapshot,
  settings,
  onBack,
  onSettings,
}: {
  snapshot: PaySnapshot;
  settings: PrototypeSettings;
  onBack: () => void;
  onSettings: () => void;
}) {
  const [period, setPeriod] = useState<DashboardPeriod>('daily');
  const daily = buildAccumulationData(snapshot, settings, 'daily');
  const weekly = buildAccumulationData(snapshot, settings, 'weekly');
  const monthly = buildAccumulationData(snapshot, settings, 'monthly');
  const selected = period === 'daily' ? daily : period === 'weekly' ? weekly : monthly;

  return (
    <main className="panel-screen dashboard-screen">
      <header>
        <button className="text-button" onClick={onBack}>
          타이머
        </button>
        <h1>상세 내역</h1>
        <button className="text-button" onClick={onSettings}>
          설정
        </button>
      </header>

      <section className="period-summary-grid" aria-label="누적 금액 요약">
        <button className={period === 'daily' ? 'active' : ''} onClick={() => setPeriod('daily')}>
          <span>일간</span>
          <strong>{money(daily.total, settings.display.privacy)}</strong>
        </button>
        <button className={period === 'weekly' ? 'active' : ''} onClick={() => setPeriod('weekly')}>
          <span>주간</span>
          <strong>{money(weekly.total, settings.display.privacy)}</strong>
        </button>
        <button
          className={period === 'monthly' ? 'active' : ''}
          onClick={() => setPeriod('monthly')}
        >
          <span>월간</span>
          <strong>{money(monthly.total, settings.display.privacy)}</strong>
        </button>
      </section>

      <CumulativeChart points={selected.points} title={selected.title} />

      <section className="metrics">
        <div>
          <span>오늘 누적</span>
          <strong>{money(snapshot.todayEarnedMicroKrw, settings.display.privacy)}</strong>
        </div>
        <div>
          <span>루팡 누적액</span>
          <strong>{money(snapshot.loafingEarnedValueMicroKrw, settings.display.privacy)}</strong>
        </div>
        <div>
          <span>업무시간</span>
          <strong>{formatDuration(snapshot.workingDurationMs)}</strong>
        </div>
        <div>
          <span>루팡시간</span>
          <strong>{formatDuration(snapshot.loafingDurationMs)}</strong>
        </div>
        <div>
          <span>루팡률</span>
          <strong>{(snapshot.loafingRatioBasisPoints / 100).toFixed(1)}%</strong>
        </div>
        {snapshot.freeWorkDurationMs > 0 ? (
          <div>
            <span>무료봉사</span>
            <strong>
              {formatDuration(snapshot.freeWorkDurationMs)} ·{' '}
              {money(snapshot.freeWorkReferenceValueMicroKrw, settings.display.privacy)}
            </strong>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function SettingsScreen({
  value,
  onSave,
  onCancel,
}: {
  value: PrototypeSettings;
  onSave: (settings: PrototypeSettings) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<PrototypeSettings>(() => structuredClone(value));
  const [error, setError] = useState('');
  const weekdays = [
    [1, '월'],
    [2, '화'],
    [3, '수'],
    [4, '목'],
    [5, '금'],
    [6, '토'],
    [0, '일'],
  ] as const;

  const toggleWorkDay = (day: number) => {
    const exists = draft.schedule.workDays.includes(day);
    const workDays = exists
      ? draft.schedule.workDays.filter((x) => x !== day)
      : [...draft.schedule.workDays, day].sort();
    setDraft({ ...draft, schedule: { ...draft.schedule, workDays } });
  };

  const applyPaidHours = (hours: number) => {
    const startMinutes = parseTimeToMinutes(draft.schedule.start);
    const breakMinutes = draft.schedule.unpaidBreak
      ? rangeDurationMinutes(draft.schedule.unpaidBreak.start, draft.schedule.unpaidBreak.end)
      : 0;
    const end = minutesToLocalTime(startMinutes + hours * 60 + breakMinutes);
    if (!end) {
      setError('퇴근 시간이 자정을 넘을 수 없습니다.');
      return;
    }
    setError('');
    setDraft({ ...draft, schedule: { ...draft.schedule, end } });
  };

  const applyBreakDuration = (minutes: number) => {
    const start = draft.schedule.unpaidBreak?.start ?? '12:00';
    const end = minutesToLocalTime(parseTimeToMinutes(start) + minutes);
    if (!end) {
      setError('휴게 종료 시간이 자정을 넘을 수 없습니다.');
      return;
    }
    setError('');
    setDraft({
      ...draft,
      schedule: {
        ...draft.schedule,
        unpaidBreak: { start, end },
      },
    });
  };

  const submit = () => {
    try {
      if (!Number.isSafeInteger(draft.salaryKrw) || draft.salaryKrw <= 0)
        throw new Error('월급을 1원 이상 입력해 주세요.');
      if (draft.schedule.workDays.length === 0)
        throw new Error('근무 요일을 하나 이상 선택해 주세요.');
      const clean = {
        ...draft,
        display: { ...draft.display, showDecimals: false, milestoneEnabled: false },
        consumerItems: [],
      };
      buildPaySnapshot(clean, clock.nowEpochMs(), clock.localTimeZone(), []);
      setError('');
      onSave(clean);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '설정을 확인해 주세요.');
    }
  };

  const exportData = () => {
    const blob = new Blob([exportPrototypeData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `paymeter-p1r-${localDateFromEpoch(clock.nowEpochMs())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetData = () => {
    if (!window.confirm('PayMeter 로컬 데이터를 초기화할까요?')) return;
    resetPrototypeData();
    window.location.reload();
  };

  return (
    <main className="panel-screen settings">
      <header>
        {onCancel ? (
          <button className="text-button" onClick={onCancel}>
            취소
          </button>
        ) : (
          <span />
        )}
        <h1>PayMeter 설정</h1>
        <span />
      </header>

      <section>
        <h2>급여 / 근무</h2>
        <label>
          월급
          <input
            aria-label="월급"
            type="number"
            min="1"
            step="10000"
            value={draft.salaryKrw || ''}
            onChange={(e) => setDraft({ ...draft, salaryKrw: Number(e.target.value) })}
            placeholder="4,000,000"
          />
        </label>
        <div className="weekday-row" aria-label="근무 요일">
          {weekdays.map(([day, label]) => (
            <button
              key={day}
              type="button"
              className={draft.schedule.workDays.includes(day) ? 'selected' : ''}
              onClick={() => toggleWorkDay(day)}
              aria-pressed={draft.schedule.workDays.includes(day)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="schedule-block">
          <div className="schedule-input-row">
            <label>
              출근
              <input
                aria-label="출근"
                type="time"
                value={draft.schedule.start}
                onChange={(e) =>
                  setDraft({ ...draft, schedule: { ...draft.schedule, start: e.target.value } })
                }
              />
            </label>
            <label>
              퇴근
              <input
                aria-label="퇴근"
                type="time"
                value={draft.schedule.end}
                onChange={(e) =>
                  setDraft({ ...draft, schedule: { ...draft.schedule, end: e.target.value } })
                }
              />
            </label>
          </div>
          <div className="quick-setting-row" aria-label="근무시간 빠른 설정">
            <span>유급 근무시간</span>
            <button type="button" onClick={() => applyPaidHours(7)}>
              7시간
            </button>
            <button type="button" onClick={() => applyPaidHours(8)}>
              8시간
            </button>
            <button type="button" onClick={() => applyPaidHours(9)}>
              9시간
            </button>
          </div>
        </div>

        <div className="schedule-block">
          <div className="schedule-input-row">
            <label>
              휴게 시작
              <input
                aria-label="휴게 시작"
                type="time"
                value={draft.schedule.unpaidBreak?.start ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    schedule: {
                      ...draft.schedule,
                      unpaidBreak: {
                        start: e.target.value,
                        end: draft.schedule.unpaidBreak?.end ?? '13:00',
                      },
                    },
                  })
                }
              />
            </label>
            <label>
              휴게 종료
              <input
                aria-label="휴게 종료"
                type="time"
                value={draft.schedule.unpaidBreak?.end ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    schedule: {
                      ...draft.schedule,
                      unpaidBreak: {
                        start: draft.schedule.unpaidBreak?.start ?? '12:00',
                        end: e.target.value,
                      },
                    },
                  })
                }
              />
            </label>
          </div>
          <div className="quick-setting-row" aria-label="휴게시간 빠른 설정">
            <span>휴게시간</span>
            <button type="button" onClick={() => applyBreakDuration(30)}>
              30분
            </button>
            <button type="button" onClick={() => applyBreakDuration(60)}>
              1시간
            </button>
            <button type="button" onClick={() => applyBreakDuration(90)}>
              1시간 30분
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2>데이터</h2>
        <div className="data-actions">
          <button type="button" className="secondary" onClick={exportData}>
            데이터 내보내기
          </button>
          <button type="button" className="danger-button" onClick={resetData}>
            로컬 데이터 초기화
          </button>
        </div>
      </section>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="save" onClick={submit} data-testid="save-settings">
        저장하고 시작
      </button>
    </main>
  );
}

export default function App() {
  const initialSettings = useMemo(() => loadSettings(), []);
  const [settings, setSettings] = useState<PrototypeSettings>(initialSettings);
  const [nowEpochMs, setNowEpochMs] = useState(() => clock.nowEpochMs());
  const [screen, setScreen] = useState<Screen>(() =>
    initialSettings.salaryKrw > 0 ? 'timer' : 'settings',
  );
  const [loafingIntervals, setLoafingIntervals] = useState(() =>
    loadLoafingIntervals(localDateFromEpoch(clock.nowEpochMs())),
  );
  const [dayControl, setDayControl] = useState<PrototypeDayControl | null>(() =>
    loadPrototypeDayControl(localDateFromEpoch(clock.nowEpochMs())),
  );
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const snapshot = useMemo(
    () =>
      buildPaySnapshot(settings, nowEpochMs, clock.localTimeZone(), loafingIntervals, dayControl),
    [settings, nowEpochMs, loafingIntervals, dayControl],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNowEpochMs(clock.nowEpochMs()), 250);
    const refresh = () => {
      setNowEpochMs(clock.nowEpochMs());
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  useEffect(() => {
    const currentDate = localDateFromEpoch(nowEpochMs);
    if (dayControl?.localDate !== currentDate) setDayControl(loadPrototypeDayControl(currentDate));
    if (loafingIntervals.some((x) => localDateFromEpoch(x.startAtEpochMs) !== currentDate)) {
      setLoafingIntervals(loadLoafingIntervals(currentDate));
    }
  }, [nowEpochMs, dayControl, loafingIntervals]);

  const updateSettings = (next: PrototypeSettings) => {
    setSettings(next);
    saveSettings(next);
  };
  const togglePrivacy = () =>
    updateSettings({
      ...settings,
      display: { ...settings.display, privacy: !settings.display.privacy },
    });

  const toggleLoafing = () => {
    if (!snapshot.activityToggleEnabled) return;
    const at = clock.nowEpochMs();
    const next = loafingIntervals.some((x) => x.endAtEpochMs === null)
      ? stopLoafing(loafingIntervals, at)
      : startLoafing(loafingIntervals, at);
    setLoafingIntervals(next);
    saveLoafingIntervals(next);
    setNowEpochMs(at);
  };

  const clockOut = () => {
    const at = clock.nowEpochMs();
    const closed = stopLoafing(loafingIntervals, at);
    if (closed !== loafingIntervals) {
      setLoafingIntervals(closed);
      saveLoafingIntervals(closed);
    }
    const next = clockOutPrototypeDay(dayControl, snapshot.localDate, at);
    setDayControl(next);
    setNowEpochMs(at);
  };

  const openPiP = async () => {
    if (!supportsDocumentPiP() || pipWindow) return;
    try {
      const target = await openDocumentPiP();
      target.document.title = 'PayMeter Widget';
      target.document.body.className = 'pip-body';
      for (const node of document.querySelectorAll('link[rel="stylesheet"], style'))
        target.document.head.appendChild(node.cloneNode(true));
      target.addEventListener('pagehide', () => setPipWindow(null), { once: true });
      setPipWindow(target);
    } catch {
      setPipWindow(null);
    }
  };

  if (screen === 'settings') {
    return (
      <SettingsScreen
        value={settings.salaryKrw > 0 ? settings : DEFAULT_SETTINGS}
        onSave={(next) => {
          updateSettings(next);
          setScreen('timer');
          setNowEpochMs(clock.nowEpochMs());
        }}
        onCancel={settings.salaryKrw > 0 ? () => setScreen('timer') : undefined}
      />
    );
  }
  if (screen === 'dashboard') {
    return (
      <Dashboard
        snapshot={snapshot}
        settings={settings}
        onBack={() => setScreen('timer')}
        onSettings={() => setScreen('settings')}
      />
    );
  }

  const timer = (
    <MoneyTimer
      snapshot={snapshot}
      settings={settings}
      onToggleLoafing={toggleLoafing}
      onTogglePrivacy={togglePrivacy}
      onClockOut={clockOut}
      onDetails={() => setScreen('dashboard')}
      onSettings={() => setScreen('settings')}
      onOpenPiP={openPiP}
      pipSupported={supportsDocumentPiP()}
    />
  );

  return (
    <>
      {timer}
      {pipWindow
        ? createPortal(
            <MoneyTimer
              snapshot={snapshot}
              settings={settings}
              isPiP
              onToggleLoafing={toggleLoafing}
              onTogglePrivacy={togglePrivacy}
              onClockOut={clockOut}
            />,
            pipWindow.document.body,
          )
        : null}
    </>
  );
}
