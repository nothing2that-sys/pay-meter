export interface CumulativeChartPoint {
  label: string;
  value: number;
}

interface Props {
  points: CumulativeChartPoint[];
  title: string;
}

export function CumulativeChart({ points, title }: Props) {
  const width = 640;
  const height = 210;
  const left = 18;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const usableWidth = width - left - right;
  const usableHeight = height - top - bottom;
  const max = Math.max(1, ...points.map((point) => point.value));
  const denominator = Math.max(1, points.length - 1);
  const coordinates = points.map((point, index) => ({
    x: left + (usableWidth * index) / denominator,
    y: top + usableHeight * (1 - point.value / max),
  }));
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(' ');
  const area =
    coordinates.length > 0
      ? `${left},${top + usableHeight} ${polyline} ${coordinates.at(-1)!.x},${top + usableHeight}`
      : '';

  return (
    <section className="cumulative-chart" data-testid="cumulative-chart">
      <div className="chart-header">
        <strong>{title}</strong>
        <span>누적 금액</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <line
          className="chart-baseline"
          x1={left}
          y1={top + usableHeight}
          x2={width - right}
          y2={top + usableHeight}
        />
        {area ? <polygon className="chart-area" points={area} /> : null}
        {polyline ? <polyline className="chart-line" points={polyline} /> : null}
        {coordinates.map((point, index) => (
          <circle
            key={`${points[index].label}:${index}`}
            className="chart-point"
            cx={point.x}
            cy={point.y}
            r="4"
          />
        ))}
        {points.map((point, index) => {
          const step = points.length > 8 ? Math.ceil(points.length / 6) : 1;
          const show = index === 0 || index === points.length - 1 || index % step === 0;
          if (!show) return null;
          const x = left + (usableWidth * index) / denominator;
          return (
            <text
              key={`label:${point.label}:${index}`}
              className="chart-label"
              x={x}
              y={height - 12}
            >
              {point.label}
            </text>
          );
        })}
      </svg>
    </section>
  );
}
