import { MICRO_KRW_PER_KRW, type ConsumerItem } from '../domain/prototype';

export function consumerValueMessage(
  currentMicroKrw: bigint,
  items: ConsumerItem[],
): string | null {
  const valid = items
    .filter((item) => item.name.trim() && Number.isFinite(item.priceKrw) && item.priceKrw > 0)
    .sort((a, b) => a.priceKrw - b.priceKrw);
  if (valid.length === 0) return null;

  const currentKrw = Number(currentMicroKrw / MICRO_KRW_PER_KRW);
  const earned = [...valid].reverse().find((item) => currentKrw >= item.priceKrw);
  if (earned) return `${earned.name}값 벌었음`;

  const next = valid[0];
  return `${next.name}까지 ${(next.priceKrw - currentKrw).toLocaleString('ko-KR')}원`;
}
