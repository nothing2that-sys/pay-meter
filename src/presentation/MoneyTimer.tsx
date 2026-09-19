import {
  formatDuration,
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
  const complete = snapshot.scheduledProgressRatio >= 1 || snapshot.payState === 'CLOCKED_OUT';

  return (
    <main className={`money-timer-frame ${isPiP ? 'pip-timer' : ''}`} aria-live="polite">
      <PerimeterTimeline
        progressRatio={snapshot.scheduledProgressRatio}
        segments={snapshot.perimeterSegments}
        complete={complete}
      />

      <div className="timer-topline">
        {!isPiP ? <button className="text-button" onClick={onDetails}>상세</button> : <span />}
        <button className="text-button" onClick={onTogglePrivacy} aria-label="금액 숨김 전환">
          {settings.display.privacy ? '금액 보기' : '금액 숨김'}
        </button>
      </div>

      <section className="timer-core">
        <div className="state-line">{vm.stateLabel}</div>
        <div className="progress-value" data-testid="progress-value">
          {(snapshot.scheduledProgressRatio * 100).toFixed(snapshot.scheduledProgressRatio >= 1 ? 0 : 1)}%
        </div>
        {vm.timeLabel ? (
          <div className="remaining-time">
            {vm.timeLabel} {formatDuration(vm.timeRemainingMs).slice(0, 5)}
          </div>
        ) : null}

        {vm.freeWorkMode ? (
          <FreeWorkWallet snapshot={snapshot} privacy={settings.display.privacy} onClockOut={onClockOut} />
        ) : vm.clockedOut ? (
          <section className="clocked-summary">
            <div className="money-block">
              <span>오늘 번 돈</span>
              <strong data-testid="current-money">{money(snapshot.todayEarnedMicroKrw, settings.display.privacy)}</strong>
            </div>
            <div className="money-block secondary-money">
              <span>그중 루팡으로 번 돈</span>
              <strong data-testid="loafing-money">{money(snapshot.loafingEarnedValueMicroKrw, settings.display.privacy)}</strong>
            </div>
            {snapshot.freeWorkDurationMs > 0 ? (
              <div className="freework-summary">
                무료봉사 {formatDuration(snapshot.freeWorkDurationMs)} · {money(snapshot.freeWorkReferenceValueMicroKrw, settings.display.privacy)} 상당
              </div>
            ) : null}
          </section>
        ) : (
          <>
            <div className={`money-block ${milestoneKrw && !isPiP ? 'milestone-pulse' : ''}`}>
              <span>오늘 번 돈</span>
              <strong data-testid="current-money">{money(snapshot.todayEarnedMicroKrw, settings.display.privacy)}</strong>
            </div>
            <div className="money-block secondary-money">
              <span>그중 루팡으로 번 돈</span>
              <strong data-testid="loafing-money">{money(snapshot.loafingEarnedValueMicroKrw, settings.display.privacy)}</strong>
            </div>
            {milestoneKrw && !isPiP ? (
              <div className="milestone-ring" role="status">{milestoneKrw.toLocaleString('ko-KR')}원</div>
            ) : null}
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
          </>
        )}
      </section>

      <div className={`corner-rate ${vm.rateDimmed ? 'dimmed' : ''}`} data-testid="rate">
        {settings.display.privacy
          ? '+₩•••/s'
          : `+₩${formatRateMilliKrw(snapshot.currentRateMilliKrwPerSecond)}/s`}
      </div>

      {!isPiP && pipSupported && onOpenPiP ? (
        <button className="pip-button text-button" onClick={onOpenPiP}>위젯으로 열기</button>
      ) : null}
    </main>
  );
}
