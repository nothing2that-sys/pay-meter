import type { ReportPeriod } from '../../domain/reporting/reportTypes';

interface Props {
  value: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}

const periods: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'daily', label: '일간' },
  { value: 'weekly', label: '주간' },
  { value: 'monthly', label: '월간' },
  { value: 'yearly', label: '연간' },
];

export function PeriodTabs({ value, onChange }: Props) {
  return (
    <nav className="detail-period-tabs" aria-label="보고 기간">
      {periods.map((period) => (
        <button
          key={period.value}
          type="button"
          className={value === period.value ? 'active' : ''}
          aria-pressed={value === period.value}
          onClick={() => onChange(period.value)}
        >
          {period.label}
        </button>
      ))}
    </nav>
  );
}
