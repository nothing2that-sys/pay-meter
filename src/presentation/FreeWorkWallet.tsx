import { formatDuration, formatMicroKrw, type PaySnapshot } from '../domain/prototype';

interface Props {
  snapshot: PaySnapshot;
  privacy: boolean;
  onClockOut: () => void;
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

function ExitIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />
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

export function FreeWorkWallet({ snapshot, privacy, onClockOut }: Props) {
  const ratioPercent =
    snapshot.dailyTargetMicroKrw > 0n
      ? Number(
          (snapshot.freeWorkReferenceValueMicroKrw * 10_000n + snapshot.dailyTargetMicroKrw / 2n) /
            snapshot.dailyTargetMicroKrw,
        ) / 100
      : 0;

  return (
    <section className="freework-wallet" data-testid="freework-wallet">
      <div className="freework-main-zone">
        <div className="freework-amount-stage">
          <div
            className={`wallet-money${amountDensityClass(
              snapshot.freeWorkReferenceValueMicroKrw,
              privacy,
            )}`}
            data-testid="freework-money"
          >
            <span className="currency-symbol">₩</span>
            <span className="currency-digits">
              {moneyDigits(snapshot.freeWorkReferenceValueMicroKrw, privacy)}
            </span>
          </div>

          <div className="wallet-duration-row">
            <span>무료봉사 시간</span>
            <strong data-testid="freework-duration">
              {formatDuration(snapshot.freeWorkDurationMs)}
            </strong>
          </div>
        </div>
      </div>

      <div className="freework-action-zone">
        <div className="secondary-amount-card regular-earned-card">
          <div className="mini-card-icon">
            <ChartIcon />
          </div>
          <div>
            <span>일당</span>
            <strong data-testid="normal-earned-money">
              {money(snapshot.todayEarnedMicroKrw, privacy)}
            </strong>
          </div>
          <ChevronIcon />
        </div>

        <div className="freework-ratio" data-testid="freework-ratio">
          <span>봉사 비중</span>
          <strong>일당의 {ratioPercent.toFixed(1)}%</strong>
        </div>

        <button className="clockout-button" onClick={onClockOut} data-testid="clock-out">
          <ExitIcon />
          <span>퇴근</span>
          <ChevronIcon />
        </button>
      </div>
    </section>
  );
}
