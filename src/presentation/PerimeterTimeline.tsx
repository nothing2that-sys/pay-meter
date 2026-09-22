import type { PerimeterSegment } from '../domain/prototype';

interface Props {
  progressRatio: number;
  segments: PerimeterSegment[];
  complete?: boolean;
}

const X0 = 0.7;
const X1 = 99.3;
const Y0 = 0.7;
const Y1 = 99.3;
const R = 5.3;
const LEFT = X0 + R;
const RIGHT = X1 - R;
const TOP = Y0 + R;
const BOTTOM = Y1 - R;
const MID_X = 50;
const QUARTER_ARC = (Math.PI * R) / 2;

export const PERIMETER_PATH_D =
  'M 50 0.7 H 94 A 5.3 5.3 0 0 1 99.3 6 V 94 A 5.3 5.3 0 0 1 94 99.3 H 6 A 5.3 5.3 0 0 1 0.7 94 V 6 A 5.3 5.3 0 0 1 6 0.7 H 50';

type PathStep =
  | { kind: 'line'; x0: number; y0: number; x1: number; y1: number; length: number }
  | {
      kind: 'arc';
      cx: number;
      cy: number;
      startDeg: number;
      endDeg: number;
      length: number;
    };

const STEPS: PathStep[] = [
  { kind: 'line', x0: MID_X, y0: Y0, x1: RIGHT, y1: Y0, length: RIGHT - MID_X },
  { kind: 'arc', cx: RIGHT, cy: TOP, startDeg: -90, endDeg: 0, length: QUARTER_ARC },
  { kind: 'line', x0: X1, y0: TOP, x1: X1, y1: BOTTOM, length: BOTTOM - TOP },
  { kind: 'arc', cx: RIGHT, cy: BOTTOM, startDeg: 0, endDeg: 90, length: QUARTER_ARC },
  { kind: 'line', x0: RIGHT, y0: Y1, x1: LEFT, y1: Y1, length: RIGHT - LEFT },
  { kind: 'arc', cx: LEFT, cy: BOTTOM, startDeg: 90, endDeg: 180, length: QUARTER_ARC },
  { kind: 'line', x0: X0, y0: BOTTOM, x1: X0, y1: TOP, length: BOTTOM - TOP },
  { kind: 'arc', cx: LEFT, cy: TOP, startDeg: 180, endDeg: 270, length: QUARTER_ARC },
  { kind: 'line', x0: LEFT, y0: Y0, x1: MID_X, y1: Y0, length: MID_X - LEFT },
];

const TOTAL_LENGTH = STEPS.reduce((sum, step) => sum + step.length, 0);

function fmt(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function pointOnStep(step: PathStep, fraction: number): { x: number; y: number } {
  const clamped = Math.min(1, Math.max(0, fraction));
  if (step.kind === 'line') {
    return {
      x: step.x0 + (step.x1 - step.x0) * clamped,
      y: step.y0 + (step.y1 - step.y0) * clamped,
    };
  }

  const angle = (step.startDeg + (step.endDeg - step.startDeg) * clamped) * (Math.PI / 180);
  return {
    x: step.cx + R * Math.cos(angle),
    y: step.cy + R * Math.sin(angle),
  };
}

export function buildPerimeterRangePath(startRatio: number, endRatio: number): string {
  const start = Math.min(1, Math.max(0, startRatio));
  const end = Math.min(1, Math.max(start, endRatio));
  if (end <= start) return '';
  if (start === 0 && end === 1) return PERIMETER_PATH_D;

  const startDistance = TOTAL_LENGTH * start;
  const endDistance = TOTAL_LENGTH * end;
  let stepStartDistance = 0;
  let d = '';
  let started = false;

  for (const step of STEPS) {
    const stepEndDistance = stepStartDistance + step.length;
    const overlapStart = Math.max(startDistance, stepStartDistance);
    const overlapEnd = Math.min(endDistance, stepEndDistance);

    if (overlapEnd > overlapStart) {
      const localStart = (overlapStart - stepStartDistance) / step.length;
      const localEnd = (overlapEnd - stepStartDistance) / step.length;
      const startPoint = pointOnStep(step, localStart);
      const endPoint = pointOnStep(step, localEnd);

      if (!started) {
        d = `M ${fmt(startPoint.x)} ${fmt(startPoint.y)}`;
        started = true;
      }

      if (step.kind === 'line') {
        d += ` L ${fmt(endPoint.x)} ${fmt(endPoint.y)}`;
      } else {
        d += ` A ${fmt(R)} ${fmt(R)} 0 0 1 ${fmt(endPoint.x)} ${fmt(endPoint.y)}`;
      }
    }

    if (stepEndDistance >= endDistance) break;
    stepStartDistance = stepEndDistance;
  }

  return d;
}

export function buildPerimeterProgressPath(progressRatio: number): string {
  return buildPerimeterRangePath(0, progressRatio);
}

export function PerimeterTimeline({ progressRatio, segments, complete = false }: Props) {
  const progress = complete ? 1 : Math.min(1, Math.max(0, progressRatio));
  const visibleSegments =
    segments.length > 0
      ? segments.filter((segment) => segment.endRatio > segment.startRatio)
      : progress > 0
        ? [{ type: 'WORKING' as const, startRatio: 0, endRatio: progress }]
        : [];

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
      <path className="perimeter-base" d={PERIMETER_PATH_D} />

      {visibleSegments.map((segment, index) => {
        const d = buildPerimeterRangePath(segment.startRatio, segment.endRatio);
        const tone = segment.type === 'LOAFING' ? 'loafing' : 'working';
        return (
          <g
            key={`${segment.type}:${segment.startRatio}:${segment.endRatio}:${index}`}
            className={`perimeter-segment-group perimeter-segment-${tone}`}
            data-segment-type={segment.type}
            data-segment-start={segment.startRatio}
            data-segment-end={segment.endRatio}
          >
            <path className="perimeter-segment-glow" d={d} />
            <path className="perimeter-segment-core" d={d} />
          </g>
        );
      })}
    </svg>
  );
}
