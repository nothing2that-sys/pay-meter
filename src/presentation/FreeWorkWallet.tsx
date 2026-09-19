import { formatDuration, formatMicroKrw, type PaySnapshot } from '../domain/prototype';

interface Props {
  snapshot: PaySnapshot;
  privacy: boolean;
  onClockOut: () => void;
  onDetails?: () => void;
  showDetails?: boolean;
}

function money(value: bigint, privacy: boolean): string {
  return privacy ? '₩ ••••••' : `₩${formatMicroKrw(value)}`;
}

export function FreeWorkWallet({
  snapshot,
  privacy,
  onClockOut,
  onDetails,
  showDetails = true,
}: Props) {
  return (
    <section className="freework-wallet" data-testid="freework-wallet">
      <div className="freework-main-zone">
        <div className="state-line">무료봉사 중</div>
        <div className="wallet-label">무료봉사 WALLET</div>
        <div className="wallet-money" data-testid="freework-money">
          {money(snapshot.freeWorkReferenceValueMicroKrw, privacy)}
        </div>
        <div className="wallet-duration-row">
          <span>무료봉사 시간</span>
          <strong data-testid="freework-duration">
            {formatDuration(snapshot.freeWorkDurationMs)}
          </strong>
        </div>
      </div>

      <div className="freework-action-zone">
        <div className="secondary-amount-card regular-earned-card">
          <span>정상 적립 금액</span>
          <strong data-testid="normal-earned-money">
            {money(snapshot.todayEarnedMicroKrw, privacy)}
          </strong>
        </div>
        <button className="clockout-button" onClick={onClockOut} data-testid="clock-out">
          퇴근
        </button>
        {showDetails && onDetails ? (
          <button className="detail-button" onClick={onDetails}>
            상세 내역 보기
          </button>
        ) : null}
      </div>
    </section>
  );
}
