import {
  formatDuration,
  formatMicroKrw,
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
  milestoneKrw?: bigint | null;
  pipSupported?: boolean;
  onToggleLoafing: () => void;
  onTogglePrivacy: () => void;
  onClockOut: () => void;
  onDetails?: () => void;
  onOpenPiP?: () => void;
}

function money(value: bigint, privacy: boolean): string {
  return privacy ? '₩ ••••••' : `₩${formatMicroKrw(value)}`;
}

export function MoneyTimer({
  snapshot,
  settings,
  isPiP = false,
  milestoneKrw = null,
  pipSupported = false,
  onToggleLoafing,
  onTogglePrivacy,
  onClockOut,
  onDetails,
  onOpenPiP,
}: Props) {
  const vm = buildMoneyTimerViewModel(snapshot);
  const complete =
    snapshot.scheduledProgressRatio >= 1 ||
    snapshot.payState === 'AFTER_SCHEDULE_UNPAID' ||
    snapshot.payState === 'CLOCKED_OUT';
  const showActivityAction =
    snapshot.payState === 'REGULAR_WORK' || snapshot.payState === 'UNPAID_BREAK';

  return (
    <main
      className={`money-timer-frame state-${vm.stateTheme} ${isPiP ? 'pip-timer' : ''}`}
      aria-live="polite"
    >
      <PerimeterTimeline
        progressRatio={snapshot.scheduledProgressRatio}
        segments={snapshot.perimeterSegments}
        complete={complete}
      />

      <div className="timer-topline">
        <button className="text-button" onClick={onTogglePrivacy} aria-label="금액 숨김 전환">
          {settings.display.privacy ? '금액 보기' : '금액 숨김'}
        </button>
      </div>

      <div className="timer-layout">
        {vm.freeWorkMode ? (
          <FreeWorkWallet
            snapshot={snapshot}
            privacy={settings.display.privacy}
            onClockOut={onClockOut}
            onDetails={onDetails}
            showDetails={!isPiP}
          />
        ) : (
          <>
            <section className="timer-main-zone">
              <div className="state-line">{vm.stateLabel}</div>
              <div
                className={`money-block main-money ${milestoneKrw && !isPiP ? 'milestone-pulse' : ''}`}
              >
                <strong data-testid="current-money">
                  {money(snapshot.todayEarnedMicroKrw, settings.display.privacy)}
                </strong>
                {vm.mainSupportLabel ? (
                  <span className="main-support-label">{vm.mainSupportLabel}</span>
                ) : null}
              </div>

              {milestoneKrw && !isPiP ? (
                <div className="milestone-ring" role="status">
                  {milestoneKrw.toLocaleString('ko-KR')}원
                </div>
              ) : null}
            </section>

            <aside className="timer-action-zone">
              <div className="secondary-amount-card loafing-amount-card">
                <span>루팡 누적액</span>
                <strong data-testid="loafing-money">
                  {money(snapshot.loafingEarnedValueMicroKrw, settings.display.privacy)}
                </strong>
              </div>

              {vm.clockedOut && snapshot.freeWorkDurationMs > 0 ? (
                <div className="secondary-amount-card freework-history-card">
                  <span>무료봉사 기록</span>
                  <strong data-testid="clocked-freework-money">
                    {money(snapshot.freeWorkReferenceValueMicroKrw, settings.display.privacy)}
                  </strong>
                  <small>{formatDuration(snapshot.freeWorkDurationMs)}</small>
                </div>
              ) : null}

              {showActivityAction ? (
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
                      : '루팡 모드'}
                </button>
              ) : null}

              {!isPiP && onDetails ? (
                <button className="detail-button" onClick={onDetails}>
                  상세 보기
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
