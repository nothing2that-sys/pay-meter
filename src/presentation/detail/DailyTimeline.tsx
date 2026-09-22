import type { DailyTimelineSegment } from '../../domain/reporting/reportTypes';

interface Props {
  segments: DailyTimelineSegment[];
}

const labels: Record<DailyTimelineSegment['type'], string> = {
  WORKING: '업무',
  LOAFING: '루팡',
  BREAK: '휴게',
  OVERTIME: '추가근무',
  FREE_WORK: '무료봉사',
};

function timeLabel(epochMs: number): string {
  const date = new Date(epochMs);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function DailyTimeline({ segments }: Props) {
  if (segments.length === 0) {
    return (
      <section className="detail-section daily-timeline-section">
        <div className="detail-section-heading">
          <h2>시간 흐름</h2>
          <span>실제 기록 없음</span>
        </div>
        <p className="detail-empty-copy">현재 P1R에는 이 날짜의 실제 시간 구간 기록이 없습니다.</p>
      </section>
    );
  }

  const startEpochMs = Math.min(...segments.map((segment) => segment.startEpochMs));
  const endEpochMs = Math.max(...segments.map((segment) => segment.endEpochMs));
  const durationMs = Math.max(1, endEpochMs - startEpochMs);

  return (
    <section className="detail-section daily-timeline-section" data-testid="daily-timeline">
      <div className="detail-section-heading">
        <h2>시간 흐름</h2>
        <span>실제 시각 기준</span>
      </div>
      <div className="daily-timeline-time-row" aria-hidden="true">
        <span>{timeLabel(startEpochMs)}</span>
        <span>{timeLabel(endEpochMs)}</span>
      </div>
      <div className="daily-timeline-track" role="img" aria-label="하루 실제 시간 흐름">
        {segments.map((segment, index) => {
          const left = ((segment.startEpochMs - startEpochMs) / durationMs) * 100;
          const width = ((segment.endEpochMs - segment.startEpochMs) / durationMs) * 100;
          const label = labels[segment.type];
          return (
            <span
              key={`${segment.type}:${segment.startEpochMs}:${index}`}
              className={`daily-timeline-segment segment-${segment.type.toLowerCase()}`}
              style={{ left: `${left}%`, width: `${width}%` }}
              aria-label={`${label} ${timeLabel(segment.startEpochMs)}부터 ${timeLabel(segment.endEpochMs)}까지`}
              title={`${label} ${timeLabel(segment.startEpochMs)}–${timeLabel(segment.endEpochMs)}`}
            >
              {width >= 11 ? label : ''}
            </span>
          );
        })}
      </div>
      <div className="daily-timeline-legend">
        {[...new Set(segments.map((segment) => segment.type))].map((type) => (
          <span key={type} className={`legend-${type.toLowerCase()}`}>
            <i aria-hidden="true" />
            {labels[type]}
          </span>
        ))}
      </div>
    </section>
  );
}
