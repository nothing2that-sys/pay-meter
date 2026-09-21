import { useMemo, useState } from 'react';
import {
  formatMicroKrw,
  type LoafingInterval,
  type PaySnapshot,
  type PrototypeDayArchive,
  type PrototypeSettings,
} from '../../domain/prototype';
import { aggregatePeriod } from '../../domain/reporting/aggregatePeriod';
import { buildAvailableDailyReport } from '../../domain/reporting/buildDailyReport';
import {
  compareLocalDates,
  dateFromLocalDate,
  reportRange,
  shiftPeriodAnchor,
} from '../../domain/reporting/reportRange';
import type { DailyReport, PeriodReport, ReportPeriod } from '../../domain/reporting/reportTypes';
import { DailyTimeline } from './DailyTimeline';
import { MonthlyCalendar } from './MonthlyCalendar';
import { PeriodChart, type PeriodChartPoint } from './PeriodChart';
import { PeriodTabs } from './PeriodTabs';

interface Props {
  snapshot: PaySnapshot;
  settings: PrototypeSettings;
  loafingIntervals: LoafingInterval[];
  dayArchives: PrototypeDayArchive[];
  onBack: () => void;
  onSettings: () => void;
  onTogglePrivacy: () => void;
}

interface DetailNavigationState {
  period: ReportPeriod;
  anchorLocalDate: string;
}

function money(value: bigint, privacy: boolean): string {
  return privacy ? '₩••••••' : `₩${formatMicroKrw(value)}`;
}

function durationLabel(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return '0분';
  const totalMinutes = Math.floor(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}분`;
  if (minutes <= 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

function krwNumber(value: bigint): number {
  const krw = value / 1_000_000n;
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  return Number(krw > max ? max : krw);
}

function koreanDate(localDate: string): string {
  const date = dateFromLocalDate(localDate);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function shortDate(localDate: string): string {
  const date = dateFromLocalDate(localDate);
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function periodTitle(period: ReportPeriod, anchorLocalDate: string): string {
  const date = dateFromLocalDate(anchorLocalDate);
  if (period === 'daily') return koreanDate(anchorLocalDate);
  if (period === 'monthly') return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  if (period === 'yearly') return `${date.getFullYear()}년`;
  const range = reportRange('weekly', anchorLocalDate);
  return `${shortDate(range.startLocalDate)} – ${shortDate(range.endLocalDate)}`;
}

function isCurrentRange(
  period: ReportPeriod,
  anchorLocalDate: string,
  todayLocalDate: string,
): boolean {
  const range = reportRange(period, anchorLocalDate);
  return (
    compareLocalDates(range.startLocalDate, todayLocalDate) <= 0 &&
    compareLocalDates(todayLocalDate, range.endLocalDate) <= 0
  );
}

function sourceLabel(report: DailyReport): string {
  if (report.source === 'LIVE_SNAPSHOT') {
    return report.isFinalized ? '오늘 확정 Snapshot' : '현재 Snapshot';
  }
  if (report.source === 'ARCHIVED_SNAPSHOT') return '저장된 실제 기록';
  if (report.source === 'SYNTHETIC_ALLOCATION') return '급여 기준 예상값';
  return '기록 없음';
}

function IntegrityNotice({ report }: { report: PeriodReport }) {
  if (
    !report.hasProvisionalData &&
    report.integrityIssueCount === 0 &&
    report.excludedDayCount === 0
  ) {
    return null;
  }

  return (
    <section className="detail-integrity-notice" aria-live="polite">
      {report.hasProvisionalData ? (
        <p>
          <strong>예상값 포함</strong>
          급여와 근무일정 기준의 배분값입니다. 실제 근태 기록이 아닙니다.
        </p>
      ) : null}
      {report.integrityIssueCount > 0 ? (
        <p>
          <strong>확인 필요</strong>
          확인 필요한 기록 {report.integrityIssueCount}일
        </p>
      ) : null}
      {report.excludedDayCount > 0 ? (
        <p>
          <strong>집계 제외</strong>
          읽을 수 없어 제외된 기록 {report.excludedDayCount}일
        </p>
      ) : null}
    </section>
  );
}

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'loafing' | 'freework' | 'overtime';
}) {
  return (
    <div className={tone ? `detail-metric-row tone-${tone}` : 'detail-metric-row'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DailyReportView({
  report,
  privacy,
  todayLocalDate,
}: {
  report: DailyReport;
  privacy: boolean;
  todayLocalDate: string;
}) {
  const future = compareLocalDates(report.localDate, todayLocalDate) > 0;

  if (future) {
    return (
      <section className="detail-empty-state" data-testid="daily-report-view">
        <strong>아직 기록되지 않은 날짜입니다</strong>
        <span>미래 날짜에는 누적값을 만들지 않습니다.</span>
      </section>
    );
  }

  if (report.source === 'EMPTY') {
    return (
      <section className="detail-empty-state" data-testid="daily-report-view">
        <strong>아직 기록이 없습니다</strong>
        <span>현재 P1R에서 확인 가능한 실제 또는 급여 기준 데이터가 없습니다.</span>
      </section>
    );
  }

  const synthetic = report.source === 'SYNTHETIC_ALLOCATION';

  return (
    <div className="detail-report-view daily-report-view" data-testid="daily-report-view">
      <section className="detail-hero">
        <span className={synthetic ? 'detail-source-pill provisional' : 'detail-source-pill'}>
          {sourceLabel(report)}
        </span>
        <strong className="detail-hero-money">
          {money(report.recognizedPayMicroKrw, privacy)}
        </strong>
        <span className="detail-hero-caption">
          {synthetic ? '급여 기준 누적' : report.isFinalized ? '인정 금액' : '현재까지 인정 금액'}
        </span>
      </section>

      {synthetic ? (
        <section className="detail-integrity-notice">
          <p>
            <strong>실제 History 아님</strong>이 날짜는 Salary / Schedule 기반 배분값만 표시합니다.
            실제 출퇴근, 루팡, 무료봉사 기록은 생성하지 않습니다.
          </p>
        </section>
      ) : null}

      <DailyTimeline segments={report.timelineSegments} />

      <section className="detail-section detail-metrics">
        <div className="detail-section-heading">
          <h2>{synthetic ? '급여 기준' : '시간과 금액'}</h2>
          <span>{synthetic ? '예상' : 'Snapshot'}</span>
        </div>
        {synthetic ? (
          <MetricRow label="예정 유급시간" value={durationLabel(report.plannedPaidDurationMs)} />
        ) : (
          <>
            <MetricRow label="근무시간" value={durationLabel(report.workingDurationMs)} />
            {report.loafingDurationMs > 0 ? (
              <MetricRow
                label="루팡"
                value={`${durationLabel(report.loafingDurationMs)} · ${money(
                  report.loafingEarnedValueMicroKrw,
                  privacy,
                )}`}
                tone="loafing"
              />
            ) : null}
            {report.freeWorkDurationMs > 0 ? (
              <MetricRow
                label="무료봉사"
                value={`${durationLabel(report.freeWorkDurationMs)} · ${money(
                  report.freeWorkReferenceValueMicroKrw,
                  privacy,
                )}`}
                tone="freework"
              />
            ) : null}
            {report.overtimeDurationMs > 0 || report.overtimePayMicroKrw > 0n ? (
              <MetricRow
                label="추가근무"
                value={`${durationLabel(report.overtimeDurationMs)} · ${money(
                  report.overtimePayMicroKrw,
                  privacy,
                )}`}
                tone="overtime"
              />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function WeeklyReportView({
  periodReport,
  privacy,
  todayLocalDate,
  current,
  onSelectDay,
}: {
  periodReport: PeriodReport;
  privacy: boolean;
  todayLocalDate: string;
  current: boolean;
  onSelectDay: (localDate: string) => void;
}) {
  const weekdayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const points: PeriodChartPoint[] = periodReport.reports.map((report) => {
    const date = dateFromLocalDate(report.localDate);
    const future = compareLocalDates(report.localDate, todayLocalDate) > 0;
    const synthetic = report.source === 'SYNTHETIC_ALLOCATION';
    const workingMinutes = report.workingDurationMs / 60_000;
    const loafingMinutes = report.loafingDurationMs / 60_000;
    const referenceMinutes = synthetic ? report.plannedPaidDurationMs / 60_000 : 0;

    return {
      label: weekdayNames[date.getDay()],
      value: workingMinutes,
      secondaryValue: loafingMinutes,
      referenceValue: referenceMinutes,
      freeValue: report.freeWorkDurationMs / 60_000,
      disabled: future,
      detailLabel: synthetic
        ? `${weekdayNames[date.getDay()]} 급여 기준 예정 ${Math.round(referenceMinutes)}분`
        : report.source === 'EMPTY'
          ? `${weekdayNames[date.getDay()]} 기록 없음`
          : `${weekdayNames[date.getDay()]} 근무 ${Math.round(workingMinutes)}분 루팡 ${Math.round(
              loafingMinutes,
            )}분`,
      onSelect: future ? undefined : () => onSelectDay(report.localDate),
    };
  });
  const plannedDurationMs = periodReport.plannedPaidDurationMs;

  return (
    <div className="detail-report-view" data-testid="weekly-report-view">
      <section className="detail-hero">
        <strong className="detail-hero-money">
          {money(periodReport.recognizedPayMicroKrw, privacy)}
        </strong>
        <span className="detail-hero-caption">
          {periodReport.hasProvisionalData ? '급여 기준 누적' : '인정 금액'}
        </span>
      </section>
      <IntegrityNotice report={periodReport} />
      <PeriodChart title={current ? '이번 주 누적' : '주간 비교'} points={points} mode="stacked" />
      <section className="detail-section detail-metrics">
        <div className="detail-section-heading">
          <h2>주간 요약</h2>
          <span>일별 비교</span>
        </div>
        {periodReport.recordedDayCount > 0 ? (
          <MetricRow label="기록된 근무일" value={`${periodReport.recordedDayCount}일`} />
        ) : null}
        {plannedDurationMs > 0 ? (
          <MetricRow label="예정 유급시간" value={durationLabel(plannedDurationMs)} />
        ) : null}
        {periodReport.workingDurationMs > 0 ? (
          <MetricRow
            label="기록된 근무시간"
            value={durationLabel(periodReport.workingDurationMs)}
          />
        ) : null}
        {periodReport.loafingDurationMs > 0 ? (
          <MetricRow
            label="루팡"
            value={`${durationLabel(periodReport.loafingDurationMs)} · ${money(
              periodReport.loafingEarnedValueMicroKrw,
              privacy,
            )}`}
            tone="loafing"
          />
        ) : null}
        {periodReport.freeWorkDurationMs > 0 ? (
          <MetricRow
            label="무료봉사"
            value={`${durationLabel(periodReport.freeWorkDurationMs)} · ${money(
              periodReport.freeWorkReferenceValueMicroKrw,
              privacy,
            )}`}
            tone="freework"
          />
        ) : null}
        {periodReport.overtimePayMicroKrw > 0n ? (
          <MetricRow
            label="추가근무"
            value={money(periodReport.overtimePayMicroKrw, privacy)}
            tone="overtime"
          />
        ) : null}
      </section>
    </div>
  );
}

function MonthlyReportView({
  periodReport,
  anchorLocalDate,
  privacy,
  todayLocalDate,
  current,
  onSelectDay,
}: {
  periodReport: PeriodReport;
  anchorLocalDate: string;
  privacy: boolean;
  todayLocalDate: string;
  current: boolean;
  onSelectDay: (localDate: string) => void;
}) {
  let cumulative = 0n;
  const points: PeriodChartPoint[] = [];
  for (const report of periodReport.reports) {
    const future = compareLocalDates(report.localDate, todayLocalDate) > 0;
    if (!future && report.source !== 'EMPTY') cumulative += report.recognizedPayMicroKrw;
    points.push({
      label: String(Number(report.localDate.slice(-2))),
      value: krwNumber(cumulative),
      disabled: future,
      detailLabel: future
        ? `${report.localDate} 미래 기간`
        : `${report.localDate} 누적 ${krwNumber(cumulative).toLocaleString('ko-KR')}원`,
    });
  }

  const plannedDurationMs = periodReport.plannedPaidDurationMs;

  return (
    <div className="detail-report-view" data-testid="monthly-report-view">
      <section className="detail-hero">
        <strong className="detail-hero-money">
          {money(periodReport.recognizedPayMicroKrw, privacy)}
        </strong>
        <span className="detail-hero-caption">
          {periodReport.hasProvisionalData ? '급여 기준 누적' : '인정 금액'}
        </span>
      </section>
      <IntegrityNotice report={periodReport} />
      <PeriodChart
        title={current ? '이번 달 누적' : '월 누적'}
        points={points}
        mode="line"
        privacy={privacy}
        moneyMetric
      />
      <MonthlyCalendar
        reports={periodReport.reports}
        anchorLocalDate={anchorLocalDate}
        todayLocalDate={todayLocalDate}
        onSelect={onSelectDay}
      />
      <section className="detail-section detail-metrics">
        <div className="detail-section-heading">
          <h2>월간 요약</h2>
          <span>누적</span>
        </div>
        <MetricRow label="실제 기록 일수" value={`${periodReport.recordedDayCount}일`} />
        {periodReport.syntheticDayCount > 0 ? (
          <MetricRow label="급여 기준 배분일" value={`${periodReport.syntheticDayCount}일`} />
        ) : null}
        {plannedDurationMs > 0 ? (
          <MetricRow label="예정 유급시간" value={durationLabel(plannedDurationMs)} />
        ) : null}
        {periodReport.workingDurationMs > 0 ? (
          <MetricRow
            label="기록된 근무시간"
            value={durationLabel(periodReport.workingDurationMs)}
          />
        ) : null}
        {periodReport.loafingDurationMs > 0 ? (
          <MetricRow
            label="루팡"
            value={`${durationLabel(periodReport.loafingDurationMs)} · ${money(
              periodReport.loafingEarnedValueMicroKrw,
              privacy,
            )}`}
            tone="loafing"
          />
        ) : null}
        {periodReport.freeWorkDurationMs > 0 ? (
          <MetricRow
            label="무료봉사"
            value={`${durationLabel(periodReport.freeWorkDurationMs)} · ${money(
              periodReport.freeWorkReferenceValueMicroKrw,
              privacy,
            )}`}
            tone="freework"
          />
        ) : null}
        {periodReport.overtimePayMicroKrw > 0n ? (
          <MetricRow
            label="추가근무"
            value={money(periodReport.overtimePayMicroKrw, privacy)}
            tone="overtime"
          />
        ) : null}
      </section>
    </div>
  );
}

function YearlyReportView({
  periodReport,
  anchorLocalDate,
  privacy,
  todayLocalDate,
  current,
  onSelectMonth,
}: {
  periodReport: PeriodReport;
  anchorLocalDate: string;
  privacy: boolean;
  todayLocalDate: string;
  current: boolean;
  onSelectMonth: (localDate: string) => void;
}) {
  const year = dateFromLocalDate(anchorLocalDate).getFullYear();
  const points: PeriodChartPoint[] = Array.from({ length: 12 }, (_, monthIndex) => {
    const month = String(monthIndex + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}`;
    const firstLocalDate = `${monthPrefix}-01`;
    const reports = periodReport.reports.filter((report) =>
      report.localDate.startsWith(monthPrefix),
    );
    const monthly = aggregatePeriod(reports);
    const future = compareLocalDates(firstLocalDate, todayLocalDate) > 0;
    return {
      label: `${monthIndex + 1}월`,
      value: krwNumber(monthly.recognizedPayMicroKrw),
      disabled: future,
      detailLabel: future
        ? `${monthIndex + 1}월 미래 기간`
        : `${monthIndex + 1}월 ${krwNumber(monthly.recognizedPayMicroKrw).toLocaleString(
            'ko-KR',
          )}원`,
      onSelect: future ? undefined : () => onSelectMonth(firstLocalDate),
    };
  });

  return (
    <div className="detail-report-view" data-testid="yearly-report-view">
      <section className="detail-hero">
        <strong className="detail-hero-money">
          {money(periodReport.recognizedPayMicroKrw, privacy)}
        </strong>
        <span className="detail-hero-caption">
          {periodReport.hasProvisionalData ? '급여 기준 연간 누적' : '연간 인정 금액'}
        </span>
      </section>
      <IntegrityNotice report={periodReport} />
      <PeriodChart
        title={current ? '올해 누적' : '12개월 비교'}
        points={points}
        mode="bar"
        privacy={privacy}
        moneyMetric
      />
      <section className="detail-section detail-metrics">
        <div className="detail-section-heading">
          <h2>연간 총결산</h2>
          <span>{year}년</span>
        </div>
        <MetricRow label="실제 기록 일수" value={`${periodReport.recordedDayCount}일`} />
        {periodReport.syntheticDayCount > 0 ? (
          <MetricRow label="급여 기준 배분일" value={`${periodReport.syntheticDayCount}일`} />
        ) : null}
        {periodReport.workingDurationMs > 0 ? (
          <MetricRow
            label="기록된 근무시간"
            value={durationLabel(periodReport.workingDurationMs)}
          />
        ) : null}
        {periodReport.loafingDurationMs > 0 ? (
          <MetricRow
            label="루팡"
            value={`${durationLabel(periodReport.loafingDurationMs)} · ${money(
              periodReport.loafingEarnedValueMicroKrw,
              privacy,
            )}`}
            tone="loafing"
          />
        ) : null}
        {periodReport.freeWorkDurationMs > 0 ? (
          <MetricRow
            label="무료봉사"
            value={`${durationLabel(periodReport.freeWorkDurationMs)} · ${money(
              periodReport.freeWorkReferenceValueMicroKrw,
              privacy,
            )}`}
            tone="freework"
          />
        ) : null}
        {periodReport.overtimePayMicroKrw > 0n ? (
          <MetricRow
            label="추가근무"
            value={money(periodReport.overtimePayMicroKrw, privacy)}
            tone="overtime"
          />
        ) : null}
      </section>
    </div>
  );
}

export function DetailReportScreen({
  snapshot,
  settings,
  loafingIntervals,
  dayArchives,
  onBack,
  onSettings,
  onTogglePrivacy,
}: Props) {
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [anchorLocalDate, setAnchorLocalDate] = useState(snapshot.localDate);
  const [history, setHistory] = useState<DetailNavigationState[]>([]);
  const range = useMemo(() => reportRange(period, anchorLocalDate, 1), [period, anchorLocalDate]);
  const reports = useMemo(
    () =>
      range.dates.map((localDate) =>
        buildAvailableDailyReport({
          localDate,
          snapshot,
          settings,
          loafingIntervals,
          dayArchives,
        }),
      ),
    [range.dates, snapshot, settings, loafingIntervals, dayArchives],
  );
  const periodReport = useMemo(() => aggregatePeriod(reports), [reports]);
  const current = isCurrentRange(period, anchorLocalDate, snapshot.localDate);
  const previousAnchor = shiftPeriodAnchor(period, anchorLocalDate, -1);
  const nextAnchor = shiftPeriodAnchor(period, anchorLocalDate, 1);
  const nextRange = reportRange(period, nextAnchor, 1);
  const canGoNext = compareLocalDates(nextRange.startLocalDate, snapshot.localDate) <= 0;

  const changePeriod = (nextPeriod: ReportPeriod) => {
    setPeriod(nextPeriod);
    setHistory([]);
  };

  const drillDown = (nextPeriod: ReportPeriod, nextAnchor: string) => {
    setHistory((value) => [...value, { period, anchorLocalDate }]);
    setPeriod(nextPeriod);
    setAnchorLocalDate(nextAnchor);
  };

  const handleBack = () => {
    const previous = history.at(-1);
    if (!previous) {
      onBack();
      return;
    }
    setHistory((value) => value.slice(0, -1));
    setPeriod(previous.period);
    setAnchorLocalDate(previous.anchorLocalDate);
  };

  const daily = reports[0];

  return (
    <main
      className={`detail-screen mode-${settings.display.colorMode ?? 'dark'} theme-${settings.display.theme ?? 'meter-dark'}`}
      data-testid="detail-report-screen"
    >
      <div className="detail-topbar">
        <button type="button" className="detail-back-button" onClick={handleBack}>
          <span aria-hidden="true">‹</span>
          뒤로
        </button>
        <h1 aria-label="상세 내역">상세보기</h1>
        <div className="detail-top-actions">
          <button
            type="button"
            className="detail-icon-action"
            aria-label="금액 숨김 전환"
            aria-pressed={settings.display.privacy}
            onClick={onTogglePrivacy}
          >
            {settings.display.privacy ? '표시' : '숨김'}
          </button>
          <button
            type="button"
            className="detail-icon-action"
            aria-label="설정"
            onClick={onSettings}
          >
            설정
          </button>
        </div>
      </div>

      <div className="detail-sticky-controls">
        <PeriodTabs value={period} onChange={changePeriod} />
        <div className="detail-period-navigation">
          <button
            type="button"
            aria-label="이전 기간"
            onClick={() => setAnchorLocalDate(previousAnchor)}
          >
            ‹
          </button>
          <strong>{periodTitle(period, anchorLocalDate)}</strong>
          <button
            type="button"
            aria-label="다음 기간"
            disabled={!canGoNext}
            onClick={() => setAnchorLocalDate(nextAnchor)}
          >
            ›
          </button>
        </div>
      </div>

      {period === 'daily' ? (
        <DailyReportView
          report={daily}
          privacy={settings.display.privacy}
          todayLocalDate={snapshot.localDate}
        />
      ) : period === 'weekly' ? (
        <WeeklyReportView
          periodReport={periodReport}
          privacy={settings.display.privacy}
          todayLocalDate={snapshot.localDate}
          current={current}
          onSelectDay={(localDate) => drillDown('daily', localDate)}
        />
      ) : period === 'monthly' ? (
        <MonthlyReportView
          periodReport={periodReport}
          anchorLocalDate={anchorLocalDate}
          privacy={settings.display.privacy}
          todayLocalDate={snapshot.localDate}
          current={current}
          onSelectDay={(localDate) => drillDown('daily', localDate)}
        />
      ) : (
        <YearlyReportView
          periodReport={periodReport}
          anchorLocalDate={anchorLocalDate}
          privacy={settings.display.privacy}
          todayLocalDate={snapshot.localDate}
          current={current}
          onSelectMonth={(localDate) => drillDown('monthly', localDate)}
        />
      )}
    </main>
  );
}
