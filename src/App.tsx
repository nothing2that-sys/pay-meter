import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_SETTINGS,
  buildPaySnapshot,
  formatDuration,
  formatMicroKrw,
  localDateFromEpoch,
  type PaySnapshot,
  type PrototypeDayControl,
  type PrototypeSettings,
} from './domain/prototype';
import { crossedMilestone } from './features/milestone';
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
import { MoneyTimer } from './presentation/MoneyTimer';

const clock = new DeviceClock();
type Screen = 'timer' | 'dashboard' | 'settings';

function money(value: bigint, privacy: boolean): string {
  return privacy ? '₩ ••••••' : `₩${formatMicroKrw(value)}`;
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
  return (
    <main className="panel-screen">
      <header>
        <button className="text-button" onClick={onBack}>
          타이머
        </button>
        <h1>오늘 상세</h1>
        <button className="text-button" onClick={onSettings}>
          설정
        </button>
      </header>
      <section className="dashboard-focus">
        <span>오늘 번 돈</span>
        <strong>{money(snapshot.todayEarnedMicroKrw, settings.display.privacy)}</strong>
        <span>{(snapshot.scheduledProgressRatio * 100).toFixed(1)}%</span>
      </section>
      <section className="metrics">
        <div>
          <span>루팡으로 번 돈</span>
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
              {money(snapshot.freeWorkReferenceValueMicroKrw, settings.display.privacy)} 상당
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

  const submit = () => {
    try {
      if (!Number.isSafeInteger(draft.salaryKrw) || draft.salaryKrw <= 0)
        throw new Error('월급을 1원 이상 입력해 주세요.');
      if (draft.schedule.workDays.length === 0)
        throw new Error('근무 요일을 하나 이상 선택해 주세요.');
      const clean = {
        ...draft,
        display: { ...draft.display, showDecimals: false },
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
        <div className="time-grid">
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
      </section>

      <section className="switches">
        <h2>화면</h2>
        <label>
          <input
            type="checkbox"
            checked={draft.display.privacy}
            onChange={(e) =>
              setDraft({ ...draft, display: { ...draft.display, privacy: e.target.checked } })
            }
          />{' '}
          Privacy Mode
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.display.milestoneEnabled}
            onChange={(e) =>
              setDraft({
                ...draft,
                display: { ...draft.display, milestoneEnabled: e.target.checked },
              })
            }
          />{' '}
          1만원 Milestone
        </label>
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
  const [milestoneKrw, setMilestoneKrw] = useState<bigint | null>(null);
  const previousPay = useRef<bigint | null>(null);
  const milestoneTimer = useRef<number | null>(null);
  const skipNextMilestone = useRef(false);

  const snapshot = useMemo(
    () =>
      buildPaySnapshot(settings, nowEpochMs, clock.localTimeZone(), loafingIntervals, dayControl),
    [settings, nowEpochMs, loafingIntervals, dayControl],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNowEpochMs(clock.nowEpochMs()), 250);
    const refresh = () => {
      skipNextMilestone.current = true;
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
    const previous = previousPay.current;
    if (previous === null || skipNextMilestone.current) {
      previousPay.current = snapshot.todayEarnedMicroKrw;
      skipNextMilestone.current = false;
      return;
    }
    const crossed = crossedMilestone(previous, snapshot.todayEarnedMicroKrw, {
      enabled: settings.display.milestoneEnabled,
      foreground: document.visibilityState === 'visible',
      pip: false,
    });
    previousPay.current = snapshot.todayEarnedMicroKrw;
    if (!crossed) return;
    setMilestoneKrw(crossed);
    if (milestoneTimer.current !== null) window.clearTimeout(milestoneTimer.current);
    milestoneTimer.current = window.setTimeout(() => setMilestoneKrw(null), 700);
  }, [settings.display.milestoneEnabled, snapshot.todayEarnedMicroKrw]);

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
      milestoneKrw={milestoneKrw}
      onToggleLoafing={toggleLoafing}
      onTogglePrivacy={togglePrivacy}
      onClockOut={clockOut}
      onDetails={() => setScreen('dashboard')}
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
