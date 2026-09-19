import type { PerimeterSegment } from '../domain/prototype';

interface Props {
  progressRatio: number;
  segments: PerimeterSegment[];
  complete?: boolean;
}

export const PERIMETER_PATH_D =
  'M 50 1.5 H 91.5 A 7 7 0 0 1 98.5 8.5 V 91.5 A 7 7 0 0 1 91.5 98.5 H 8.5 A 7 7 0 0 1 1.5 91.5 V 8.5 A 7 7 0 0 1 8.5 1.5 H 50 Z';

export function shouldShowPerimeterMarker(progressRatio: number, complete = false): boolean {
  const progress = Math.min(1, Math.max(0, progressRatio));
  return !complete && progress > 0 && progress < 1;
}

export function PerimeterTimeline({ progressRatio, complete = false }: Props) {
  const progress = complete ? 1 : Math.min(1, Math.max(0, progressRatio));

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
      <path className="perimeter-base" d={PERIMETER_PATH_D} pathLength="1" />
      {progress > 0 ? (
        <path
          className="perimeter-progress"
          d={PERIMETER_PATH_D}
          pathLength="1"
          style={{
            strokeDasharray: `${progress} ${1 - progress}`,
            strokeDashoffset: 0,
          }}
        />
      ) : null}
      {shouldShowPerimeterMarker(progress, complete) ? (
        <circle
          className="perimeter-current-dot"
          cx="50"
          cy="1.5"
          r="0"
          data-progress={progress}
        />
      ) : null}
    </svg>
  );
}
