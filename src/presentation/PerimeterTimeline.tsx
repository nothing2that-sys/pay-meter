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

function pointOnArc(step: Extract<PathStep, { kind: 'arc' }>, fraction: number) {
  const angle = (step.startDeg + (step.endDeg - step.startDeg) * fraction) * (Math.PI / 180);
  return {
    x: step.cx + R * Math.cos(angle),
    y: step.cy + R * Math.sin(angle),
  };
}

export function buildPerimeterProgressPath(progressRatio: number): string {
  const progress = Math.min(1, Math.max(0, progressRatio));
  if (progress <= 0) return '';
  if (progress >= 1) return PERIMETER_PATH_D;

  let remaining = TOTAL_LENGTH * progress;
  let d = `M ${fmt(MID_X)} ${fmt(Y0)}`;

  for (const step of STEPS) {
    if (remaining <= 0) break;
    const consumed = Math.min(step.length, remaining);
    const fraction = consumed / step.length;

    if (step.kind === 'line') {
      const x = step.x0 + (step.x1 - step.x0) * fraction;
      const y = step.y0 + (step.y1 - step.y0) * fraction;
      d += ` L ${fmt(x)} ${fmt(y)}`;
    } else {
      const point = pointOnArc(step, fraction);
      d += ` A ${fmt(R)} ${fmt(R)} 0 0 1 ${fmt(point.x)} ${fmt(point.y)}`;
    }

    remaining -= consumed;
    if (fraction < 1) break;
  }

  return d;
}

export function PerimeterTimeline({ progressRatio, complete = false }: Props) {
  const progress = complete ? 1 : Math.min(1, Math.max(0, progressRatio));
  const progressPath = buildPerimeterProgressPath(progress);

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
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
          <stop offset="52%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.58" />
        </linearGradient>
      </defs>
      <path className="perimeter-base" d={PERIMETER_PATH_D} />
      {progressPath ? (
        <>
          <path className="perimeter-progress-glow" d={progressPath} />
          <path className="perimeter-progress" d={progressPath} />
        </>
      ) : null}
    </svg>
  );
}
