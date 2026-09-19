import { formatDuration, formatMicroKrw, formatRateMilliKrw, type PaySnapshot } from '../domain/prototype';
import { freeWorkCopy } from './freeWorkCopy';

interface Props {
  snapshot: PaySnapshot;
  privacy: boolean;
  onClockOut: () => void;
}

function money(value: bigint, privacy: boolean): string {
  return privacy ? '₩ ••••••' : `₩${formatMicroKrw(value)}`;
}

export function FreeWorkWallet({ snapshot, privacy, onClockOut }: Props) {
  return (
    <section className="freework-wallet" data-testid="freework-wallet">
      <div className="wallet-label">무료봉사 WALLET</div>
      <div className="wallet-money" data-testid="freework-money">
        {money(snapshot.freeWorkReferenceValueMicroKrw, privacy)}
      </div>
      <div className="wallet-duration">{formatDuration(snapshot.freeWorkDurationMs)}</div>
      <div className="wallet-rate">
        {privacy ? '+₩•••/s 상당' : `+₩${formatRateMilliKrw(snapshot.baseVisualizationRateMilliKrwPerSecond)}/s 상당`}
      </div>
      <div className="wallet-warning">실제 지급액 아님</div>
      <p className="wallet-copy">{freeWorkCopy(snapshot.localDate, snapshot.freeWorkDurationMs)}</p>
      <button className="clockout-button" onClick={onClockOut} data-testid="clock-out">
        퇴근
      </button>
    </section>
  );
}
