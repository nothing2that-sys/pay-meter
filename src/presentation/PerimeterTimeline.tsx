import type { CSSProperties } from 'react';
import type { PerimeterSegment } from '../domain/prototype';

interface Props {
  progressRatio: number;
  segments: PerimeterSegment[];
  complete?: boolean;
}

function segmentStyle(segment: PerimeterSegment): CSSProperties {
  const length = Math.max(0, segment.endRatio - segment.startRatio);
  return { strokeDasharray: `${length} ${1 - length}`, strokeDashoffset: -segment.startRatio };
}

export function PerimeterTimeline({ progressRatio, segments, complete = false }: Props) {
  const progress = Math.min(1, Math.max(0, progressRatio));
  const markerLength = 0.018;
  const markerStart = Math.max(0, Math.min(1 - markerLength, progress - markerLength / 2));
  return (
    <svg className="perimeter" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <rect
        className="perimeter-base"
        x="1.5"
        y="1.5"
        width="97"
        height="97"
        rx="7"
        pathLength="1"
      />
      {segments.map((segment, index) => (
        <rect
          key={`${segment.type}:${segment.startRatio}:${index}`}
          className={segment.type === 'LOAFING' ? 'perimeter-loafing' : 'perimeter-working'}
          x="1.5"
          y="1.5"
          width="97"
          height="97"
          rx="7"
          pathLength="1"
          style={segmentStyle(segment)}
        />
      ))}
      {!complete && progress > 0 ? (
        <rect
          className="perimeter-current"
          x="1.5"
          y="1.5"
          width="97"
          height="97"
          rx="7"
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
