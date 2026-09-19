import type { CSSProperties } from 'react';
import type { PerimeterSegment } from '../domain/prototype';

interface Props {
  progressRatio: number;
  segments: PerimeterSegment[];
  complete?: boolean;
}

export const PERIMETER_PATH_D =
  'M 50 0.7 H 94 A 5.3 5.3 0 0 1 99.3 6 V 94 A 5.3 5.3 0 0 1 94 99.3 H 6 A 5.3 5.3 0 0 1 0.7 94 V 6 A 5.3 5.3 0 0 1 6 0.7 H 50 Z';

export function perimeterProgressStyle(progressRatio: number): CSSProperties {
  const progress = Math.min(1, Math.max(0, progressRatio));
  const progressLength = progress * 100;
  return {
    strokeDasharray: `${progressLength} 100`,
    strokeDashoffset: 0,
  };
}

export function shouldShowPerimeterMarker(progressRatio: number, complete = false): boolean {
  const progress = Math.min(1, Math.max(0, progressRatio));
  return !complete && progress > 0 && progress < 1;
}

export function PerimeterTimeline({ progressRatio, complete = false }: Props) {
  const progress = complete ? 1 : Math.min(1, Math.max(0, progressRatio));
  const progressStyle = perimeterProgressStyle(progress);

  return (
    <svg
      className={`perimeter ${complete ? 'perimeter-complete' : ''}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="perimeter-timeline"
      data-progress-ratio={progress}
      data-complete={complete ? 'true' : 'false'}
    >
      <defs>
        <linearGradient id="perimeter-ambient-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
          <stop offset="45%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path className="perimeter-base" d={PERIMETER_PATH_D} pathLength="100" />
      {progress > 0 ? (
        <>
          <path
            className="perimeter-progress-glow"
            d={PERIMETER_PATH_D}
            pathLength="100"
            style={progressStyle}
          />
          <path
            className="perimeter-progress"
            d={PERIMETER_PATH_D}
            pathLength="100"
            style={progressStyle}
          />
        </>
      ) : null}
    </svg>
  );
}
