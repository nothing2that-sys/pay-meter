export interface PeriodChartPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  referenceValue?: number;
  freeValue?: number;
  disabled?: boolean;
  onSelect?: () => void;
  detailLabel?: string;
}

interface Props {
  title: string;
  points: PeriodChartPoint[];
  mode: 'line' | 'stacked' | 'bar';
  privacy?: boolean;
  moneyMetric?: boolean;
}

function safeValue(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? (value ?? 0) : 0;
}

function accessibleValue(point: PeriodChartPoint, privacy: boolean, moneyMetric: boolean): string {
  if (point.disabled) return `${point.label} 미래 기간`;
  if (privacy && moneyMetric) return `${point.label} 금액 숨김`;
  return (
    point.detailLabel ??
    `${point.label} ${Math.round(safeValue(point.value)).toLocaleString('ko-KR')}`
  );
}

function LineChart({ points }: { points: PeriodChartPoint[] }) {
  const width = 640;
  const height = 214;
  const left = 20;
  const right = 20;
  const top = 20;
  const bottom = 42;
  const usableWidth = width - left - right;
  const usableHeight = height - top - bottom;
  const visible = points.filter((point) => !point.disabled);
  const max = Math.max(1, ...visible.map((point) => safeValue(point.value)));
  const denominator = Math.max(1, visible.length - 1);
  const coordinates = visible.map((point, index) => ({
    point,
    x: visible.length === 1 ? width / 2 : left + (usableWidth * index) / denominator,
    y: top + usableHeight * (1 - safeValue(point.value) / max),
  }));
  const polyline = coordinates.map(({ x, y }) => `${x},${y}`).join(' ');
  const area =
    coordinates.length > 0
      ? `${coordinates[0].x},${top + usableHeight} ${polyline} ${coordinates.at(-1)!.x},${top + usableHeight}`
      : '';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <line
        className="detail-chart-baseline"
        x1={left}
        y1={top + usableHeight}
        x2={width - right}
        y2={top + usableHeight}
      />
      {area ? <polygon className="detail-chart-area" points={area} /> : null}
      {coordinates.length > 1 ? <polyline className="detail-chart-line" points={polyline} /> : null}
      {coordinates.map(({ point, x, y }, index) => (
        <circle
          key={`${point.label}:${index}`}
          className="detail-chart-point"
          cx={x}
          cy={y}
          r="4.5"
        />
      ))}
      {coordinates.map(({ point, x }, index) => {
        const step = coordinates.length > 8 ? Math.ceil(coordinates.length / 6) : 1;
        if (index !== 0 && index !== coordinates.length - 1 && index % step !== 0) return null;
        return (
          <text
            key={`label:${point.label}:${index}`}
            className="detail-chart-label"
            x={x}
            y={height - 12}
          >
            {point.label}
          </text>
        );
      })}
    </svg>
  );
}

function ColumnChart({
  points,
  stacked,
  privacy,
  moneyMetric,
}: {
  points: PeriodChartPoint[];
  stacked: boolean;
  privacy: boolean;
  moneyMetric: boolean;
}) {
  const max = Math.max(
    1,
    ...points.map((point) =>
      Math.max(
        safeValue(point.value) + (stacked ? safeValue(point.secondaryValue) : 0),
        safeValue(point.referenceValue),
      ),
    ),
  );

  return (
    <div className={`detail-column-chart ${stacked ? 'stacked' : 'bars'}`}>
      {points.map((point, index) => {
        const primaryHeight = (safeValue(point.value) / max) * 100;
        const secondaryHeight = (safeValue(point.secondaryValue) / max) * 100;
        const referenceHeight = (safeValue(point.referenceValue) / max) * 100;
        const content = (
          <>
            <span className="detail-column-plot" aria-hidden="true">
              {point.disabled ? (
                <i className="detail-column-future">미래</i>
              ) : referenceHeight > 0 ? (
                <i
                  className="detail-column-reference"
                  style={{ height: `${referenceHeight}%` }}
                  title="급여 기준 예상"
                />
              ) : (
                <>
                  <i className="detail-column-primary" style={{ height: `${primaryHeight}%` }} />
                  {stacked && secondaryHeight > 0 ? (
                    <i
                      className="detail-column-secondary"
                      style={{ height: `${secondaryHeight}%` }}
                    />
                  ) : null}
                </>
              )}
              {safeValue(point.freeValue) > 0 ? <i className="detail-column-free">봉사</i> : null}
            </span>
            <span className="detail-column-label">{point.label}</span>
          </>
        );
        const ariaLabel = accessibleValue(point, privacy, moneyMetric);

        return point.onSelect && !point.disabled ? (
          <button
            key={`${point.label}:${index}`}
            type="button"
            className="detail-column"
            aria-label={ariaLabel}
            onClick={point.onSelect}
          >
            {content}
          </button>
        ) : (
          <span key={`${point.label}:${index}`} className="detail-column" aria-label={ariaLabel}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

export function PeriodChart({ title, points, mode, privacy = false, moneyMetric = false }: Props) {
  const latestPoint = points.filter((point) => !point.disabled).at(-1);
  const latestLabel = latestPoint
    ? accessibleValue(latestPoint, privacy, moneyMetric)
    : '표시할 데이터가 없습니다.';

  return (
    <section className="detail-section detail-period-chart" data-testid="cumulative-chart">
      <div className="detail-section-heading">
        <h2>{title}</h2>
        <span>{privacy && moneyMetric ? '금액 숨김' : moneyMetric ? '금액' : '시간 비교'}</span>
      </div>
      {points.length > 0 ? (
        <p className="detail-chart-current" aria-live="polite">
          {latestLabel}
        </p>
      ) : null}
      {points.length === 0 ? (
        <p className="detail-empty-copy">표시할 데이터가 없습니다.</p>
      ) : mode === 'line' ? (
        <>
          <LineChart points={points} />
          <span className="sr-only">
            {points.map((point) => accessibleValue(point, privacy, moneyMetric)).join(', ')}
          </span>
        </>
      ) : (
        <ColumnChart
          points={points}
          stacked={mode === 'stacked'}
          privacy={privacy}
          moneyMetric={moneyMetric}
        />
      )}
    </section>
  );
}
