import type { DailyReport } from '../../domain/reporting/reportTypes';
import { compareLocalDates, dateFromLocalDate } from '../../domain/reporting/reportRange';

interface Props {
  reports: DailyReport[];
  anchorLocalDate: string;
  todayLocalDate: string;
  onSelect: (localDate: string) => void;
}

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

function statusLabels(report: DailyReport): string[] {
  if (report.integrityStatus === 'NEEDS_REVIEW' || report.integrityStatus === 'EXCLUDED') {
    return ['확인'];
  }
  if (report.source === 'SYNTHETIC_ALLOCATION') return ['예상'];
  if (report.source === 'EMPTY') return ['기록 없음'];

  const labels: string[] = [];
  if (report.loafingDurationMs > 0) labels.push('루팡');
  if (report.freeWorkDurationMs > 0) labels.push('봉사');
  if (report.overtimeDurationMs > 0 || report.overtimePayMicroKrw > 0n) labels.push('추가');
  if (labels.length === 0) labels.push(report.hasRecord ? '기록' : '기록 없음');
  return labels;
}

export function MonthlyCalendar({ reports, anchorLocalDate, todayLocalDate, onSelect }: Props) {
  const anchor = dateFromLocalDate(anchorLocalDate);
  const firstWeekday = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12).getDay();
  const cells: Array<DailyReport | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...reports,
  ];

  return (
    <section className="detail-section monthly-calendar" data-testid="monthly-calendar">
      <div className="detail-section-heading">
        <h2>캘린더</h2>
        <span>날짜를 눌러 일간 보기</span>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {weekdays.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((report, index) => {
          if (!report) return <span key={`empty:${index}`} className="calendar-cell empty" />;

          const day = Number(report.localDate.slice(-2));
          const future = compareLocalDates(report.localDate, todayLocalDate) > 0;
          const labels = future ? ['미래'] : statusLabels(report);
          const selectable = !future;
          const ariaLabel = `${report.localDate} ${labels.join(' ')}`;

          return (
            <button
              key={report.localDate}
              type="button"
              className={`calendar-cell source-${report.source.toLowerCase()}`}
              disabled={!selectable}
              aria-label={ariaLabel}
              data-detail-date={report.localDate}
              onClick={() => onSelect(report.localDate)}
            >
              <strong>{day}</strong>
              <span className="calendar-markers">
                {labels.map((label) => (
                  <i key={label} className={`calendar-marker marker-${label.replaceAll(' ', '-')}`}>
                    {label}
                  </i>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
