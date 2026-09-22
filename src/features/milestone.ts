import { MICRO_KRW_PER_KRW, MILESTONE_KRW } from '../domain/prototype';

export interface MilestoneOptions {
  enabled: boolean;
  foreground: boolean;
  pip: boolean;
}

export function crossedMilestone(
  previousMicroKrw: bigint,
  currentMicroKrw: bigint,
  options: MilestoneOptions,
): bigint | null {
  if (!options.enabled || !options.foreground || options.pip) return null;
  if (currentMicroKrw <= previousMicroKrw) return null;
  const thresholdMicro = MILESTONE_KRW * MICRO_KRW_PER_KRW;
  const previousBucket = previousMicroKrw / thresholdMicro;
  const currentBucket = currentMicroKrw / thresholdMicro;
  if (currentBucket <= previousBucket) return null;
  return currentBucket * MILESTONE_KRW;
}
