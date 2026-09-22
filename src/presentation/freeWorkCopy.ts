const COPY = {
  FW0: ['무료 체험이 시작됐습니다.', '정규 근무는 끝났습니다. 참고로요.'],
  FW1: ['회사 입장에서는 꽤 좋은 시간대입니다.', '월급은 멈췄지만 시간은 계속 나가고 있습니다.'],
  FW2: ['무료봉사 Wallet이 제법 건강해졌습니다.', '퇴근 버튼은 아직 정상 작동합니다.'],
  FW3: ['무상 노동 포트폴리오가 커지고 있습니다.', '이 Wallet은 출금 기능이 없습니다.'],
} as const;

export type FreeWorkBucket = keyof typeof COPY;

export function freeWorkBucket(durationMs: number): FreeWorkBucket {
  const minutes = durationMs / 60_000;
  if (minutes < 15) return 'FW0';
  if (minutes < 30) return 'FW1';
  if (minutes < 60) return 'FW2';
  return 'FW3';
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function freeWorkCopy(localDate: string, durationMs: number): string {
  const bucket = freeWorkBucket(durationMs);
  const options = COPY[bucket];
  return options[stableHash(`${localDate}:${bucket}`) % options.length];
}
