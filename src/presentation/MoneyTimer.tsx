import type { CSSProperties } from 'react';
import {
  formatMicroKrw,
  formatRateMilliKrw,
  type PaySnapshot,
  type PrototypeSettings,
} from '../domain/prototype';
import { FreeWorkWallet } from './FreeWorkWallet';
import { buildMoneyTimerViewModel } from './moneyTimerViewModel';
import { PerimeterTimeline } from './PerimeterTimeline';

interface Props {
  snapshot: PaySnapshot;
  settings: PrototypeSettings;
  isPiP?: boolean;
  pipSupported?: boolean;
  onToggleLoafing: () => void;
  onTogglePrivacy: () => void;
  onClockOut: () => void;
  onDetails?: () => void;
  onSettings?: () => void;
  onOpenPiP?: () => void;
}

function money(value: bigint, privacy: boolean): string {
  return privacy ? '₩ ••••••' : `₩${formatMicroKrw(value)}`;
}

function moneyDigits(value: bigint, privacy: boolean): string {
  return privacy ? '••••••' : formatMicroKrw(value);
}

function amountDensityClass(value: bigint, privacy: boolean): string {
  const length = moneyDigits(value, privacy).length;
  if (length >= 11) return ' amount-compact';
  if (length >= 9) return ' amount-tight';
  return '';
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a2 2 0 002.7 2.7" />
      <path d="M9.9 4.3A10.8 10.8 0 0112 4c5.1 0 8.5 4 9.4 5.2a1.3 1.3 0 010 1.6 15.4 15.4 0 01-3 3.2" />
      <path d="M6.1 6.1A15.2 15.2 0 002.6 9.2a1.3 1.3 0 000 1.6C3.5 12 6.9 16 12 16c1 0 2-.2 2.8-.4" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5A3.5 3.5 0 1112 15a3.5 3.5 0 010-6.5z" />
      <path d="M19.4 13.5l1.3 1-.9 2-1.7-.2a7.9 7.9 0 01-1.6 1.6l.2 1.7-2 .9-1-1.3a7.8 7.8 0 01-2.3 0l-1 1.3-2-.9.2-1.7A7.9 7.9 0 017 16.3l-1.7.2-.9-2 1.3-1a7.8 7.8 0 010-2.3l-1.3-1 .9-2 1.7.2A7.9 7.9 0 018.6 6.8l-.2-1.7 2-.9 1 1.3a7.8 7.8 0 012.3 0l1-1.3 2 .9-.2 1.7A7.9 7.9 0 0118 8.4l1.7-.2.9 2-1.3 1a7.8 7.8 0 010 2.3z" />
    </svg>
  );
}

function MaskIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 8.2c2.3-1.8 4.8-2.7 7.5-2.7s5.2.9 7.5 2.7l-.9 5.2c-.5 3-2.8 5.1-6.6 5.1s-6.1-2.1-6.6-5.1l-.9-5.2z" />
      <path d="M7.8 11.2c.8-.5 1.7-.6 2.6-.2M16.2 11.2c-.8-.5-1.7-.6-2.6-.2" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19V11M12 19V5M19 19v-8" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function MoneyTimer({
  snapshot,
  settings,
  isPiP = false,
  pipSupported = false,
  onToggleLoafing,
  onTogglePrivacy,
  onClockOut,
  onDetails,
  onSettings,
  onOpenPiP,
}: Props) {
  const vm = buildMoneyTimerViewModel(snapshot);
  const complete =
    snapshot.scheduledProgressRatio >= 1 ||
    snapshot.payState === 'AFTER_SCHEDULE_UNPAID' ||
    snapshot.payState === 'CLOCKED_OUT';
  const showActivityAction =
    snapshot.payState === 'REGULAR_WORK' || snapshot.payState === 'UNPAID_BREAK';
  const freeWorkFillBasisPoints =
    snapshot.dailyTargetMicroKrw > 0n
      ? Number((snapshot.freeWorkReferenceValueMicroKrw * 10_000n) / snapshot.dailyTargetMicroKrw)
      : 0;
  const frameStyle = {
    '--freework-fill': `${Math.min(100, Math.max(0, freeWorkFillBasisPoints / 100))}%`,
  } as CSSProperties;
  const visualTheme = settings.display.theme ?? 'meter-dark';
  const colorMode = settings.display.colorMode ?? 'dark';
  const layoutPreference = settings.display.layout ?? 'auto';
  const currentRate = settings.display.privacy
    ? '₩••••/초'
    : `${snapshot.currentRateMilliKrwPerSecond > 0n ? '+' : ''}₩${formatRateMilliKrw(
        snapshot.currentRateMilliKrwPerSecond,
      )}/초`;

  return (
    <main
      className={`money-timer-frame mode-${colorMode} theme-${visualTheme} layout-${layoutPreference} state-${vm.stateTheme} ${
        isPiP ? 'pip-timer' : ''
      }`}
      style={frameStyle}
      aria-live="polite"
    >
      <PerimeterTimeline
        progressRatio={snapshot.scheduledProgressRatio}
        segments={snapshot.perimeterSegments}
        complete={complete}
      />

      <header className="app-header">
        <div className="brand-block">
          <div className="brand">
            Pay<span>Meter</span>
          </div>
          <div className="brand-meta">
            <div className="header-state state-line">
              <span className="state-dot" />
              <span>{vm.stateLabel}</span>
            </div>
            <div className="current-rate" data-testid="current-rate" aria-label="현재 초당 적립액">
              <span>현재 적립</span>
              <strong>{currentRate}</strong>
            </div>
          </div>
        </div>
        <div className="header-actions">
          {!isPiP && onDetails ? (
            <button className="round-icon-button" onClick={onDetails} aria-label="상세 보기">
              <ListIcon />
            </button>
          ) : null}
          <button
            className="round-icon-button"
            onClick={onTogglePrivacy}
            aria-label="금액 숨김 전환"
          >
            <EyeOffIcon />
          </button>
          {!isPiP && onSettings ? (
            <button className="round-icon-button" onClick={onSettings} aria-label="설정">
              <GearIcon />
            </button>
          ) : null}
        </div>
      </header>

      <div className="timer-layout">
        {vm.freeWorkMode ? (
          <FreeWorkWallet
            snapshot={snapshot}
            privacy={settings.display.privacy}
            onClockOut={onClockOut}
          />
        ) : (
          <>
            <section className="timer-main-zone">
              <div className="amount-stage">
                <div
                  className={`main-money${amountDensityClass(
                    snapshot.todayEarnedMicroKrw,
                    settings.display.privacy,
                  )}`}
                >
                  <strong data-testid="current-money">
                    <span className="currency-symbol">₩</span>
                    <span className="currency-digits">
                      {moneyDigits(snapshot.todayEarnedMicroKrw, settings.display.privacy)}
                    </span>
                  </strong>
                </div>

                <div className="loafing-inline-card">
                  <div className="mini-card-icon">
                    <ChartIcon />
                  </div>
                  <div>
                    <span>루팡 누적액</span>
                    <strong data-testid="loafing-money">
                      {money(snapshot.loafingEarnedValueMicroKrw, settings.display.privacy)}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            <aside className="timer-action-zone">
              {vm.clockedOut && snapshot.freeWorkDurationMs > 0 ? (
                <div className="secondary-amount-card clocked-freework-card">
                  <div>
                    <span>무료봉사 기록</span>
                    <strong data-testid="clocked-freework-money">
                      {money(snapshot.freeWorkReferenceValueMicroKrw, settings.display.privacy)}
                    </strong>
                  </div>
                </div>
              ) : null}

              {showActivityAction ? (
                <button
                  className={`loaf-button ${snapshot.activityState === 'LOAFING' ? 'active' : ''}`}
                  disabled={!snapshot.activityToggleEnabled}
                  onClick={onToggleLoafing}
                  data-testid="loafing-toggle"
                >
                  <MaskIcon />
                  <span>
                    {snapshot.payState === 'UNPAID_BREAK'
                      ? '휴게중'
                      : snapshot.activityState === 'LOAFING'
                        ? '업무 복귀'
                        : '루팡 모드'}
                  </span>
                  <ChevronIcon />
                </button>
              ) : null}

              {!isPiP && pipSupported && onOpenPiP ? (
                <button className="pip-button text-button" onClick={onOpenPiP}>
                  위젯으로 열기
                </button>
              ) : null}
            </aside>
          </>
        )}
      </div>
    </main>
  );
}
