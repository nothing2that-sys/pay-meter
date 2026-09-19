import type { CSSProperties } from 'react';
import type { PerimeterSegment } from '../domain/prototype';

interface Props {
  progressRatio: number;
  segments: PerimeterSegment[];
  complete?: boolean;
}

export const PERIMETER_PATH_D =
  'M 50 1.5 H 91.5 A 7 7 0 0 1 98.5 8.5 V 91.5 A 7 7 0 0 1 91.5 98.5 H 8.5 A 7 7 0 0 1 1.5 91.5 V 8.5 A 7 7 0 0 1 8.5 1.5 H 50 Z';

export function perimeterSegmentStyle(segment: PerimeterSegment): CSSProperties {
  const length = Math.max(0, Math.min(1, segment.endRatio - segment.startRatio));
  return {
    strokeDasharray: `${length} ${1 - length}`,
    strokeDashoffset: -Math.max(0, Math.min(1, segment.startRatio)),
  };
}

export function shouldShowPerimeterMarker(progressRatio: number, complete = false): boolean {
  const progress = Math.min(1, Math.max(0, progressRatio));
  return !complete && progress > 0 && progress < 1;
}

export function PerimeterTimeline({ progressRatio, segments, complete = false }: Props) {
  const progress = Math.min(1, Math.max(0, progressRatio));
  const markerLength = 0.018;
  const markerStart = Math.max(0, Math.min(1 - markerLength, progress - markerLength / 2));

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
      {segments.map((segment, index) => (
        <path
          key={`${segment.type}:${segment.startRatio}:${index}`}
          className={segment.type === 'LOAFING' ? 'perimeter-loafing' : 'perimeter-working'}
          d={PERIMETER_PATH_D}
          pathLength="1"
          style={perimeterSegmentStyle(segment)}
        />
      ))}
      {shouldShowPerimeterMarker(progress, complete) ? (
        <path
          className="perimeter-current"
          d={PERIMETER_PATH_D}
          pathLength="1"
          style={{
            strokeDasharray: `${markerLength} ${1 - markerLength}`,
            strokeDashoffset: -markerStart,
          }}
        />
      ) : null}
    </svg>
  );
}
