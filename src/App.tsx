import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_SETTINGS,
  buildPaySnapshot,
  localDateFromEpoch,
  parseTimeToMinutes,
  type ColorMode,
  type PrototypeDayArchive,
  type PrototypeDayControl,
  type PrototypeSettings,
  type VisualTheme,
} from './domain/prototype';
import { DeviceClock } from './infrastructure/clock';
import { openDocumentPiP, supportsDocumentPiP } from './infrastructure/pip';
import {
  clockOutPrototypeDay,
  exportPrototypeData,
  loadLoafingIntervals,
  loadPrototypeDayArchives,
  loadPrototypeDayControl,
  loadSettings,
  resetPrototypeData,
  saveLoafingIntervals,
  savePrototypeDayArchive,
  saveSettings,
  startLoafing,
  stopLoafing,
} from './infrastructure/storage';
import { MoneyTimer } from './presentation/MoneyTimer';
import { DetailReportScreen } from './presentation/detail/DetailReportScreen';

const clock = new DeviceClock();
type Screen = 'timer' | 'dashboard' | 'settings';

const COLOR_MODE_OPTIONS: ReadonlyArray<{ value: ColorMode; label: string; description: string }> =
  [
    { value: 'dark', label: '다크', description: '어두운 배경' },
    { value: 'light', label: '라이트', description: '밝은 배경' },
  ];

const THEME_OPTIONS: Record<
  VisualTheme,
  {
    value: VisualTheme;
    label: string;
    description: string;
    previewClass: string;
  }
> = {
  'meter-dark': {
    value: 'meter-dark',
    label: 'Meter Dark',
    description: '정돈된 기본 테마',
    previewClass: 'preview-meter',
  },
  mono: {
    value: 'mono',
    label: 'Mono',
    description: '장식 없는 저자극 테마',
    previewClass: 'preview-mono',
  },
  pocket: {
    value: 'pocket',
    label: 'Pocket',
    description: '부드러운 지갑형 테마',
    previewClass: 'preview-pocket',
  },
  ledger: {
    value: 'ledger',
    label: 'Ledger',
    description: '정밀한 장부형 테마',
    previewClass: 'preview-ledger',
  },
};

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
    <main
      className={`panel-screen settings mode-${draft.display.colorMode ?? 'dark'} theme-${draft.display.theme ?? 'meter-dark'}`}
    >
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

        <div className="break-setting-heading">
          <span>무급 휴게시간</span>
          <label className="break-toggle">
            <input
              type="checkbox"
              checked={draft.schedule.unpaidBreak !== null}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  schedule: {
                    ...draft.schedule,
                    unpaidBreak: event.target.checked ? { start: '12:00', end: '13:00' } : null,
                  },
                })
              }
            />
            <span>{draft.schedule.unpaidBreak ? '사용' : '없음'}</span>
          </label>
        </div>
        {draft.schedule.unpaidBreak ? (
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
        ) : null}
      </section>

      <section>
        <h2>화면 스타일</h2>
        <div className="style-setting-group">
          <span className="style-setting-label">베이스</span>
          <div className="base-option-row" aria-label="화면 베이스 선택">
            {COLOR_MODE_OPTIONS.map(({ value, label, description }) => (
              <button
                key={value}
                type="button"
                className={(draft.display.colorMode ?? 'dark') === value ? 'selected' : ''}
                aria-pressed={(draft.display.colorMode ?? 'dark') === value}
                onClick={() =>
                  setDraft({
                    ...draft,
                    display: { ...draft.display, colorMode: value },
                  })
                }
              >
                <strong>{label}</strong>
                <small>{description}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="style-setting-group">
          <span className="style-setting-label">테마</span>
          <div className="theme-option-grid">
            {Object.values(THEME_OPTIONS).map(({ value, label, description, previewClass }) => (
              <button
                key={value}
                type="button"
                className={
                  (draft.display.theme ?? 'meter-dark') === value
                    ? 'style-option selected'
                    : 'style-option'
                }
                aria-pressed={(draft.display.theme ?? 'meter-dark') === value}
                onClick={() =>
                  setDraft({
                    ...draft,
                    display: { ...draft.display, theme: value },
                  })
                }
              >
                <span className={`theme-preview ${previewClass}`}>
                  <i />
                  <b />
                </span>
                <strong>
                  {value === 'meter-dark'
                    ? (draft.display.colorMode ?? 'dark') === 'light'
                      ? 'Meter Light'
                      : 'Meter Dark'
                    : label}
                </strong>
                <small>{description}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="style-setting-group">
          <span className="style-setting-label">레이아웃</span>
          <div className="layout-option-row" aria-label="레이아웃 선택">
            {[
              ['auto', '자동'],
              ['focus', '집중형'],
              ['split', '분할형'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={(draft.display.layout ?? 'auto') === value ? 'selected' : ''}
                aria-pressed={(draft.display.layout ?? 'auto') === value}
                onClick={() =>
                  setDraft({
                    ...draft,
                    display: {
                      ...draft.display,
                      layout: value as 'auto' | 'focus' | 'split',
                    },
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p className="style-setting-help">
            작은 화면과 위젯에서는 선택과 관계없이 안전한 세로 배치를 사용합니다.
          </p>
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
  const [dayArchives, setDayArchives] = useState<PrototypeDayArchive[]>(() =>
    loadPrototypeDayArchives(),
  );
  const [activeLocalDate, setActiveLocalDate] = useState(() =>
    localDateFromEpoch(clock.nowEpochMs()),
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
    if (currentDate === activeLocalDate) return;

    const midnight = new Date(nowEpochMs);
    midnight.setHours(0, 0, 0, 0);
    const previousDayEnd = midnight.getTime() - 1;
    const closed = stopLoafing(loafingIntervals, previousDayEnd);
    saveLoafingIntervals(closed, activeLocalDate);
    setDayArchives(
      savePrototypeDayArchive({
        localDate: activeLocalDate,
        timeZoneSnapshot: clock.localTimeZone(),
        settingsSnapshot: structuredClone(settings),
        lastObservedAtEpochMs: previousDayEnd,
        clockOutAtEpochMs:
          dayControl?.localDate === activeLocalDate ? dayControl.clockOutAtEpochMs : null,
        loafingIntervals: closed,
        integrityStatus:
          dayControl?.localDate === activeLocalDate && dayControl.clockOutAtEpochMs !== null
            ? 'OK'
            : 'NEEDS_TIME_REVIEW',
        updatedAtEpochMs: nowEpochMs,
      }),
    );

    setActiveLocalDate(currentDate);
    setDayControl(loadPrototypeDayControl(currentDate));
    setLoafingIntervals(loadLoafingIntervals(currentDate));
  }, [nowEpochMs, activeLocalDate, settings, dayControl, loafingIntervals]);

  const archiveMinute = Math.floor(nowEpochMs / 60_000);
  useEffect(() => {
    if (settings.salaryKrw <= 0 || snapshot.localDate !== activeLocalDate) return;
    setDayArchives(
      savePrototypeDayArchive({
        localDate: snapshot.localDate,
        timeZoneSnapshot: clock.localTimeZone(),
        settingsSnapshot: structuredClone(settings),
        lastObservedAtEpochMs: nowEpochMs,
        clockOutAtEpochMs: dayControl?.clockOutAtEpochMs ?? null,
        loafingIntervals,
        integrityStatus: 'OK',
        updatedAtEpochMs: nowEpochMs,
      }),
    );
  }, [archiveMinute, activeLocalDate, snapshot.localDate, settings, dayControl, loafingIntervals]);

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
    saveLoafingIntervals(next, snapshot.localDate);
    setDayArchives(
      savePrototypeDayArchive({
        localDate: snapshot.localDate,
        timeZoneSnapshot: clock.localTimeZone(),
        settingsSnapshot: structuredClone(settings),
        lastObservedAtEpochMs: at,
        clockOutAtEpochMs: dayControl?.clockOutAtEpochMs ?? null,
        loafingIntervals: next,
        integrityStatus: 'OK',
        updatedAtEpochMs: at,
      }),
    );
    setNowEpochMs(at);
  };

  const clockOut = () => {
    const at = clock.nowEpochMs();
    const closed = stopLoafing(loafingIntervals, at);
    if (closed !== loafingIntervals) {
      setLoafingIntervals(closed);
      saveLoafingIntervals(closed, snapshot.localDate);
    }
    const next = clockOutPrototypeDay(dayControl, snapshot.localDate, at);
    setDayControl(next);
    setDayArchives(
      savePrototypeDayArchive({
        localDate: snapshot.localDate,
        timeZoneSnapshot: clock.localTimeZone(),
        settingsSnapshot: structuredClone(settings),
        lastObservedAtEpochMs: at,
        clockOutAtEpochMs: next.clockOutAtEpochMs,
        loafingIntervals: closed,
        integrityStatus: 'OK',
        updatedAtEpochMs: at,
      }),
    );
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
      <DetailReportScreen
        snapshot={snapshot}
        settings={settings}
        loafingIntervals={loafingIntervals}
        dayArchives={dayArchives}
        onBack={() => setScreen('timer')}
        onSettings={() => setScreen('settings')}
        onTogglePrivacy={togglePrivacy}
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
