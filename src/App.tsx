import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_SETTINGS,
  buildPaySnapshot,
  formatDuration,
  formatMicroKrw,
  formatRateMilliKrw,
  localDateFromEpoch,
  stateLabel,
  type ConsumerItem,
  type PaySnapshot,
  type PrototypeSettings,
} from './domain/prototype';
import { consumerValueMessage } from './features/consumerValue';
import { crossedMilestone } from './features/milestone';
import { DeviceClock } from './infrastructure/clock';
import { openDocumentPiP, supportsDocumentPiP } from './infrastructure/pip';
import {
  loadLoafingIntervals,
  loadSettings,
  saveLoafingIntervals,
  saveSettings,
  startLoafing,
  stopLoafing,
} from './infrastructure/storage';

const clock = new DeviceClock();
type Screen = 'timer' | 'dashboard' | 'settings';

function percentage(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(1)}%`;
}

function formatPrivacyMoney(value: bigint, settings: PrototypeSettings): string {
  if (settings.display.privacy) return '₩ ••••••';
  return `₩ ${formatMicroKrw(value, settings.display.showDecimals)}`;
}

interface MoneyTimerProps {
  snapshot: PaySnapshot;
  settings: PrototypeSettings;
  isPiP?: boolean;
  milestoneKrw?: bigint | null;
  onToggleLoafing: () => void;
  onTogglePrivacy: () => void;
  onDetails?: () => void;
  onOpenPiP?: () => void;
  pipSupported?: boolean;
}

function MoneyTimer({
  snapshot,
  settings,
  isPiP = false,
  milestoneKrw = null,
  onToggleLoafing,
  onTogglePrivacy,
  onDetails,
  onOpenPiP,
  pipSupported = false,
}: MoneyTimerProps) {
  const consumerMessage = settings.display.privacy
    ? null
    : consumerValueMessage(snapshot.currentPayMicroKrw, settings.consumerItems);
  const state = stateLabel(snapshot);
  const progress = Math.min(100, snapshot.progressBasisPoints / 100);

  return (
    <main className={`money-timer ${isPiP ? 'pip-timer' : ''}`} aria-live="polite">
      <div className="timer-topline">
        <span className="brand">PayMeter</span>
        <button className="icon-button" onClick={onTogglePrivacy} aria-label="금액 숨김 전환">
          {settings.display.privacy ? '금액 보기' : '금액 숨김'}
        </button>
      </div>

      <section className="hero">
        <div className="state-line">
          <span className={`state-dot state-${snapshot.payState.toLowerCase()}`} />
          {state}
        </div>
        <div
          className={`money-value ${milestoneKrw ? 'milestone-pulse' : ''}`}
          data-testid="current-money"
        >
          {formatPrivacyMoney(snapshot.currentPayMicroKrw, settings)}
        </div>
        {milestoneKrw && !isPiP ? (
          <div className="milestone-ring" role="status">
            {milestoneKrw.toLocaleString('ko-KR')}원
          </div>
        ) : null}
        <div className="target-line">
          오늘{' '}
          {settings.display.privacy
            ? '₩ ••••••'
            : formatPrivacyMoney(snapshot.dailyTargetMicroKrw, settings)}{' '}
          중 <strong>{percentage(snapshot.progressBasisPoints)}</strong>
        </div>
        <div
          className="progress-track"
          aria-label={`오늘 진행률 ${percentage(snapshot.progressBasisPoints)}`}
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="meter-readouts">
        <div className="rate" data-testid="rate">
          {settings.display.privacy
            ? '+ ₩ ••• / sec'
            : `+ ₩ ${formatRateMilliKrw(snapshot.currentRateMilliKrwPerSecond)} / sec`}
        </div>
        <div className="timer-value" data-testid="work-timer">
          {formatDuration(snapshot.elapsedPaidDurationMs)}
        </div>
      </section>

      {consumerMessage ? <div className="consumer-line">{consumerMessage}</div> : null}

      <div className="primary-actions">
        <button
          className={`loaf-button ${snapshot.activityState === 'LOAFING' ? 'active' : ''}`}
          disabled={!snapshot.activityToggleEnabled}
          onClick={onToggleLoafing}
          data-testid="loafing-toggle"
        >
          {snapshot.payState === 'UNPAID_BREAK'
            ? '휴게 중'
            : snapshot.activityState === 'LOAFING'
              ? '업무 복귀'
              : '루팡 시작'}
        </button>
        {!isPiP && onDetails ? (
          <button className="secondary-button detail-button" onClick={onDetails}>
            상세
          </button>
        ) : null}
      </div>

      {!isPiP && pipSupported && onOpenPiP ? (
        <button className="text-button pip-button" onClick={onOpenPiP}>
          위젯으로 열기
        </button>
      ) : null}
      {!isPiP && !pipSupported ? (
        <div className="compact-hint">작은 창으로 줄이면 Compact Mode로 동작합니다.</div>
      ) : null}
    </main>
  );
}

interface DashboardProps {
  snapshot: PaySnapshot;
  settings: PrototypeSettings;
  onBack: () => void;
  onSettings: () => void;
}

function Dashboard({ snapshot, settings, onBack, onSettings }: DashboardProps) {
  return (
    <main className="dashboard-shell">
      <header className="screen-header">
        <button className="text-button" onClick={onBack}>
          타이머
        </button>
        <h1>오늘 상세</h1>
        <button className="text-button" onClick={onSettings}>
          설정
        </button>
      </header>
      <section className="dashboard-focus">
        <span>오늘 진행</span>
        <strong>{formatPrivacyMoney(snapshot.currentPayMicroKrw, settings)}</strong>
        <span>{percentage(snapshot.progressBasisPoints)}</span>
      </section>
      <section className="metrics-list">
        <div>
          <span>오늘 목표</span>
          <strong>{formatPrivacyMoney(snapshot.dailyTargetMicroKrw, settings)}</strong>
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
          <strong>{percentage(snapshot.loafingRatioBasisPoints)}</strong>
        </div>
      </section>
      <section className="consumer-panel">
        <h2>소비재 비교</h2>
        <p>
          {settings.display.privacy
            ? 'Privacy Mode에서 숨김'
            : (consumerValueMessage(snapshot.currentPayMicroKrw, settings.consumerItems) ??
              '등록된 항목 없음')}
        </p>
      </section>
    </main>
  );
}

interface SettingsProps {
  value: PrototypeSettings;
  onSave: (settings: PrototypeSettings) => void;
  onCancel?: () => void;
}

function SettingsScreen({ value, onSave, onCancel }: SettingsProps) {
  const [draft, setDraft] = useState<PrototypeSettings>(() => structuredClone(value));
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
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
      ? draft.schedule.workDays.filter((valueDay) => valueDay !== day)
      : [...draft.schedule.workDays, day].sort();
    setDraft({ ...draft, schedule: { ...draft.schedule, workDays } });
  };

  const addConsumer = () => {
    const price = Number(itemPrice);
    if (!itemName.trim() || !Number.isSafeInteger(price) || price <= 0) return;
    const item: ConsumerItem = {
      id: `consumer:${clock.nowEpochMs()}:${itemName.trim()}`,
      name: itemName.trim(),
      priceKrw: price,
    };
    setDraft({ ...draft, consumerItems: [...draft.consumerItems, item] });
    setItemName('');
    setItemPrice('');
  };

  const submit = () => {
    try {
      if (!Number.isSafeInteger(draft.salaryKrw) || draft.salaryKrw <= 0)
        throw new Error('월급을 1원 이상 입력해 주세요.');
      if (draft.schedule.workDays.length === 0)
        throw new Error('근무 요일을 하나 이상 선택해 주세요.');
      buildPaySnapshot(draft, clock.nowEpochMs(), clock.localTimeZone(), []);
      setError('');
      onSave(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '설정을 확인해 주세요.');
    }
  };

  return (
    <main className="settings-shell">
      <header className="screen-header">
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

      <section className="settings-section">
        <h2>급여</h2>
        <label>
          월급
          <div className="input-with-unit">
            <input
              aria-label="월급"
              type="number"
              min="1"
              step="10000"
              value={draft.salaryKrw || ''}
              onChange={(event) => setDraft({ ...draft, salaryKrw: Number(event.target.value) })}
              placeholder="4,000,000"
            />
            <span>원</span>
          </div>
        </label>
      </section>

      <section className="settings-section">
        <h2>Schedule</h2>
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
              onChange={(event) =>
                setDraft({ ...draft, schedule: { ...draft.schedule, start: event.target.value } })
              }
            />
          </label>
          <label>
            퇴근
            <input
              aria-label="퇴근"
              type="time"
              value={draft.schedule.end}
              onChange={(event) =>
                setDraft({ ...draft, schedule: { ...draft.schedule, end: event.target.value } })
              }
            />
          </label>
          <label>
            휴게 시작
            <input
              aria-label="휴게 시작"
              type="time"
              value={draft.schedule.unpaidBreak?.start ?? ''}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  schedule: {
                    ...draft.schedule,
                    unpaidBreak: {
                      start: event.target.value,
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
              onChange={(event) =>
                setDraft({
                  ...draft,
                  schedule: {
                    ...draft.schedule,
                    unpaidBreak: {
                      start: draft.schedule.unpaidBreak?.start ?? '12:00',
                      end: event.target.value,
                    },
                  },
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="settings-section switches">
        <h2>Display</h2>
        <label>
          <input
            type="checkbox"
            checked={draft.display.showDecimals}
            onChange={(event) =>
              setDraft({
                ...draft,
                display: { ...draft.display, showDecimals: event.target.checked },
              })
            }
          />{' '}
          금액 소수 표시
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.display.milestoneEnabled}
            onChange={(event) =>
              setDraft({
                ...draft,
                display: { ...draft.display, milestoneEnabled: event.target.checked },
              })
            }
          />{' '}
          1만원 Milestone
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.display.privacy}
            onChange={(event) =>
              setDraft({ ...draft, display: { ...draft.display, privacy: event.target.checked } })
            }
          />{' '}
          Privacy Mode
        </label>
      </section>

      <section className="settings-section">
        <h2>Consumer Items</h2>
        <div className="consumer-editor">
          {draft.consumerItems.map((item) => (
            <div key={item.id} className="consumer-row">
              <span>{item.name}</span>
              <span>{item.priceKrw.toLocaleString('ko-KR')}원</span>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    consumerItems: draft.consumerItems.filter((current) => current.id !== item.id),
                  })
                }
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <div className="consumer-add">
          <input
            aria-label="소비재 이름"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            placeholder="커피"
          />
          <input
            aria-label="소비재 가격"
            type="number"
            value={itemPrice}
            onChange={(event) => setItemPrice(event.target.value)}
            placeholder="5000"
          />
          <button type="button" onClick={addConsumer}>
            추가
          </button>
        </div>
      </section>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      <button className="save-button" onClick={submit} data-testid="save-settings">
        저장하고 시작
      </button>
    </main>
  );
}

function App() {
  const [settings, setSettings] = useState<PrototypeSettings>(() => loadSettings());
  const [nowEpochMs, setNowEpochMs] = useState(() => clock.nowEpochMs());
  const [screen, setScreen] = useState<Screen>(() =>
    loadSettings().salaryKrw > 0 ? 'timer' : 'settings',
  );
  const [loafingIntervals, setLoafingIntervals] = useState(() =>
    loadLoafingIntervals(localDateFromEpoch(clock.nowEpochMs())),
  );
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [milestoneKrw, setMilestoneKrw] = useState<bigint | null>(null);
  const previousPay = useRef<bigint | null>(null);
  const milestoneTimer = useRef<number | null>(null);
  const skipNextMilestone = useRef(false);

  const snapshot = useMemo(
    () => buildPaySnapshot(settings, nowEpochMs, clock.localTimeZone(), loafingIntervals),
    [settings, nowEpochMs, loafingIntervals],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNowEpochMs(clock.nowEpochMs()), 250);
    const refreshFromDeviceClock = () => {
      skipNextMilestone.current = true;
      setNowEpochMs(clock.nowEpochMs());
    };
    window.addEventListener('focus', refreshFromDeviceClock);
    window.addEventListener('pageshow', refreshFromDeviceClock);
    document.addEventListener('visibilitychange', refreshFromDeviceClock);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshFromDeviceClock);
      window.removeEventListener('pageshow', refreshFromDeviceClock);
      document.removeEventListener('visibilitychange', refreshFromDeviceClock);
    };
  }, []);

  useEffect(() => {
    const previous = previousPay.current;
    if (previous === null || skipNextMilestone.current) {
      previousPay.current = snapshot.currentPayMicroKrw;
      skipNextMilestone.current = false;
      return;
    }
    const crossed = crossedMilestone(previous, snapshot.currentPayMicroKrw, {
      enabled: settings.display.milestoneEnabled,
      foreground: document.visibilityState === 'visible',
      pip: false,
    });
    previousPay.current = snapshot.currentPayMicroKrw;
    if (!crossed) return;
    setMilestoneKrw(crossed);
    if (milestoneTimer.current !== null) window.clearTimeout(milestoneTimer.current);
    milestoneTimer.current = window.setTimeout(() => setMilestoneKrw(null), 850);
  }, [settings.display.milestoneEnabled, snapshot.currentPayMicroKrw]);

  useEffect(() => {
    const currentDate = localDateFromEpoch(nowEpochMs);
    const hasDifferentDate = loafingIntervals.some(
      (interval) => localDateFromEpoch(interval.startAtEpochMs) !== currentDate,
    );
    if (hasDifferentDate) setLoafingIntervals(loadLoafingIntervals(currentDate));
  }, [nowEpochMs, loafingIntervals]);

  const updateSettings = (next: PrototypeSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const togglePrivacy = () => {
    const next = {
      ...settings,
      display: { ...settings.display, privacy: !settings.display.privacy },
    };
    updateSettings(next);
  };

  const toggleLoafing = () => {
    if (!snapshot.activityToggleEnabled) return;
    const at = clock.nowEpochMs();
    const hasOpen = loafingIntervals.some((interval) => interval.endAtEpochMs === null);
    const next = hasOpen ? stopLoafing(loafingIntervals, at) : startLoafing(loafingIntervals, at);
    setLoafingIntervals(next);
    saveLoafingIntervals(next);
    setNowEpochMs(at);
  };

  const openPiP = async () => {
    if (!supportsDocumentPiP() || pipWindow) return;
    try {
      const target = await openDocumentPiP();
      target.document.title = 'PayMeter Widget';
      target.document.body.className = 'pip-body';
      for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) {
        target.document.head.appendChild(node.cloneNode(true));
      }
      target.addEventListener('pagehide', () => setPipWindow(null), { once: true });
      setPipWindow(target);
    } catch {
      setPipWindow(null);
    }
  };

  const saveInitialSettings = (next: PrototypeSettings) => {
    updateSettings(next);
    setScreen('timer');
    setNowEpochMs(clock.nowEpochMs());
  };

  if (screen === 'settings') {
    return (
      <SettingsScreen
        value={settings.salaryKrw > 0 ? settings : DEFAULT_SETTINGS}
        onSave={saveInitialSettings}
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

  return (
    <>
      <MoneyTimer
        snapshot={snapshot}
        settings={settings}
        milestoneKrw={milestoneKrw}
        onToggleLoafing={toggleLoafing}
        onTogglePrivacy={togglePrivacy}
        onDetails={() => setScreen('dashboard')}
        onOpenPiP={openPiP}
        pipSupported={supportsDocumentPiP()}
      />
      {pipWindow
        ? createPortal(
            <MoneyTimer
              snapshot={snapshot}
              settings={settings}
              isPiP
              onToggleLoafing={toggleLoafing}
              onTogglePrivacy={togglePrivacy}
            />,
            pipWindow.document.body,
          )
        : null}
    </>
  );
}

export default App;
