# PayMeter — Detail Reporting and History Design

## 0. Status

- Repository: `nothing2that-sys/pay-meter`
- Branch: `main`
- Design baseline HEAD: `[legacy-sha-removed]`
- Scope: Detail / History / Reporting / Aggregation
- Implementation: NOT INCLUDED
- P2: BLOCKED 상태 유지
- Result: `DETAIL_REPORTING_DESIGN_READY`

이 문서는 PayMeter의 상세보기에서 사용하는 일간, 주간, 월간, 연간 보고 구조와 장기 데이터 누적 방법을 정의한다.

기존 P1R Money Timer의 Domain 의미를 변경하지 않는다.
특히 다음 원칙을 그대로 유지한다.

- Device Wall Clock이 현재 시각 SSOT
- 현재 표시 금액을 Tick마다 저장하지 않음
- WORKING Session을 별도 저장하지 않음
- Free Work Session을 별도 저장하지 않음
- 원본 Event와 Snapshot이 SSOT
- Daily Summary는 Cache이며 SSOT가 아님
- 과거 WorkDay는 현재 설정 변경으로 재해석하지 않음

---

## 1. Design Goal

상세보기의 역할은 기본 Money Timer에서 제거한 정보를 다시 나열하는 것이 아니다.

각 기간별로 질문이 다르다.

### 일간

오늘 또는 특정 하루에 언제 무엇을 했는가.

### 주간

이번 주 각 날짜가 어떻게 달랐는가.

### 월간

이번 달의 누적과 반복 패턴이 어떻게 보이는가.

### 연간

1년 동안 수입, 루팡, 무료봉사, 추가근무가 어떤 추세를 만들었는가.

따라서 상세보기는 다음 네 개의 기본 Period를 사용한다.

- Daily
- Weekly
- Monthly
- Yearly

전체 누적 Lifetime은 별도 5번째 기본 탭으로 만들지 않는다.
연간 화면의 보조 Summary 또는 향후 `전체` Period로 확장한다.

---

## 2. Core Reporting Principle

보고서 결과 자체를 새로운 원본 데이터로 저장하지 않는다.

금지 예:

- weeklyEarnedAmount를 원본으로 저장
- monthlyLoafingValue를 원본으로 저장
- yearlyFreeWorkValue를 원본으로 저장
- 그래프의 누적 포인트를 원본으로 저장

정식 구조는 다음과 같다.

```text
SalaryRevision
ScheduleRevision
DailyOverride
WorkDay
ClockEvent
LoafingSession
OvertimeSession
        |
        v
Historical Day Calculation
        |
        v
DailySummaryCache
        |
        +-------------------+
        |                   |
        v                   v
Daily Detail         Period Aggregation
                         |
              +----------+----------+
              |          |          |
              v          v          v
            Weekly     Monthly     Yearly
```

주간, 월간, 연간은 모두 일별 계산 결과를 합산하여 생성한다.

Period Aggregate는 재생성 가능한 ViewModel이다.

---

## 3. Source of Truth

보고 계산의 원본은 기존 Storage Contract를 따른다.

### SalaryRevision

해당 WorkDay가 참조한 급여 계산 기준.

과거 SalaryRevision을 현재 급여 설정으로 덮어쓰지 않는다.

### ScheduleRevision

해당 날짜의 근무 일정 계산 기준.

### WorkDay

과거 근무일의 핵심 Snapshot과 날짜 경계.

주요 Reporting Key:

- id
- localDate
- timeZoneSnapshot
- salaryRevisionId
- scheduleRevisionId
- scheduleSnapshot
- scheduledStartEpochMs
- scheduledEndEpochMs
- plannedPaidDurationMs
- dailyTargetPayMicroKrw
- clockInAtEpochMs
- clockOutAtEpochMs
- integrityStatus

### LoafingSession

실제 LOAFING 시작과 종료 기록.

WORKING 시간은 저장하지 않고 계산한다.

### OvertimeSession

실제 유급 추가근무 구간과 당시 multiplier/base rate Snapshot.

### DailyOverride

사용자 보정이 적용된 경우 해당 날짜 계산에 반영한다.

### Free Work

별도 Session을 저장하지 않는다.

다음에서 파생한다.

- WorkDay scheduled end
- Clock Out
- Overtime Session
- day clamp

---

## 4. Money Semantics in Reports

보고서에서 금액의 의미를 혼합하지 않는다.

### Recognized Pay

실제 급여 성격으로 합산 가능한 값.

```text
recognizedPay
= regularPay
+ overtimePay
```

### Loafing Earned Value

정규 유급시간 중 LOAFING 시간에 대응하는 금액 Breakdown.

```text
loafingEarnedValue <= regularPay
```

Loafing Earned Value는 Recognized Pay에 이미 포함되어 있으므로 다시 더하지 않는다.

잘못된 표현:

```text
총 수입 = regularPay + loafingEarnedValue
```

금지한다.

### Free Work Reference Value

무료봉사 시간의 참고 가치.

실제 지급 급여가 아니다.

Recognized Pay에 합산하지 않는다.

### Optional Fun Metric

향후 재미 지표로 다음과 같은 파생값은 만들 수 있다.

```text
loafingEarnedValue - freeWorkReferenceValue
```

단, 금융적 총액이 아니므로 기본 핵심 지표가 아니라 명확한 Entertainment Metric으로만 사용한다.

---

## 5. Time and Period Boundary

### 5.1 Daily Key

일간 보고의 기준 Key는 `WorkDay.localDate`다.

과거 WorkDay를 현재 Device Time Zone으로 다시 나누지 않는다.

일간 상세의 시각 표시는 해당 WorkDay의 `timeZoneSnapshot`을 사용한다.

### 5.2 V1 Overnight

기존 SSOT를 유지한다.

V1은 Overnight Schedule을 지원하지 않는다.

날짜를 넘긴 미종료 WorkDay는 기존 Data Storage 규칙에 따라:

- integrityStatus = NEEDS_TIME_REVIEW
- safe clamp
- 다음 WorkDay와 자동 병합 금지

로 처리한다.

향후 Overnight 지원 시에도 Reporting Period는 WorkDay 논리 날짜를 기준으로 확장한다.

### 5.3 Weekly

주간은 LocalDate 범위 Query다.

`weekStartsOn`은 Report Range를 선택하는 Presentation/Query 입력으로 취급한다.

주 시작 요일 변경은 과거 WorkDay를 수정하지 않는다.
같은 원본을 다른 주간 범위로 다시 묶을 뿐이다.

주간 Cache를 저장할 경우 Cache Key에는 반드시 `weekStartsOn`을 포함해야 한다.

V1에서는 별도 Weekly Persistent Cache를 만들지 않는다.

### 5.4 Monthly

월간 Key:

```text
YYYY-MM
```

WorkDay.localDate 기준 Calendar Month다.

급여 계약상의 Pay Period와 월간 화면의 Calendar Month를 동일 개념으로 간주하지 않는다.

### 5.5 Yearly

연간 Key:

```text
YYYY
```

WorkDay.localDate 기준 Calendar Year다.

연간 보고는 12개월 비교와 1년 총결산 용도다.

---

## 6. Daily Detail

일간은 네 Period 중 가장 상세하다.

### 6.1 Header

권장:

- 선택 날짜
- 근무 상태
- 일당 또는 현재까지 인정 금액
- 데이터 확인 필요 Badge

오늘 진행 중이라면:

- 현재까지

Clock Out 완료된 과거 날짜라면:

- 확정 결과

의 의미를 분리한다.

### 6.2 Core Metrics

최소:

- Recognized Pay
- Working Duration
- Loafing Duration
- Loafing Earned Value
- Free Work Duration
- Free Work Reference Value
- Overtime Duration
- Overtime Pay

값이 0인 보조 항목은 화면 밀도를 위해 축약 가능하다.

### 6.3 Daily Timeline

일간 상세 Timeline은 메인 Money Timer Perimeter와 좌표 의미가 다르다.

메인 Perimeter:

- Paid-time coordinate
- unpaid break 길이 0

일간 상세 Timeline:

- Wall-clock coordinate
- 실제 하루 시간 순서를 보여줌

예:

```text
09:00                                       19:00
| WORK | LOAF | WORK | BREAK | WORK | LOAF | FREE |
```

목적은 사용자가 다음을 확인할 수 있게 하는 것이다.

- 언제 루팡했는가
- 휴게시간은 언제였는가
- 정규근무가 언제 끝났는가
- 무료봉사가 언제 시작됐는가
- 추가근무 구간이 있었는가

따라서 상세 Timeline에서 unpaid break는 실제 시간 길이를 가진다.

### 6.4 Correction Entry

향후 Timeline Correction 기능이 연결되면 일간 상세가 진입점이다.

수정 가능 후보:

- Clock In
- Clock Out
- Loafing start/end
- Overtime start/end

수정 후 해당 날짜의 DailySummaryCache를 invalidate한다.

---

## 7. Weekly Report

주간의 목적은 날짜 간 비교다.

### 7.1 Header Summary

권장:

- 이번 주 Recognized Pay
- 총 유급 활동시간
- 총 Loafing Duration
- 총 Loafing Earned Value
- 총 Free Work Duration
- 총 Free Work Reference Value
- 총 Overtime

### 7.2 Daily Comparison

요일별 Bar 또는 Stacked Bar를 기본 시각화로 사용한다.

시간 구성 Bar의 Additive 관계:

```text
activity eligible duration
= working duration
+ loafing duration
```

Free Work는 activity eligible duration에 포함하지 않는다.

따라서 한 Stack에서 의미가 혼동되지 않게:

- WORKING
- LOAFING

을 기본 Stack으로 사용하고,
Free Work는 별도 extension/marker 또는 두 번째 시각 요소로 표시하는 것을 권장한다.

### 7.3 Weekly Insight

단순 파생 정보는 허용한다.

예:

- 가장 긴 근무일
- Loafing Duration이 가장 긴 날
- Free Work가 가장 긴 날
- 평균 출근 시각
- 평균 퇴근 시각

단, integrityStatus가 비정상인 날짜는 평균 계산에서 제외하거나 결과에 확인 필요를 표시한다.

---

## 8. Monthly Report

월간의 목적은 누적과 반복 패턴이다.

### 8.1 Header Summary

권장:

- 월 누적 Recognized Pay
- 근무 기록 일수
- Working Duration
- Loafing Duration
- Loafing Earned Value
- Free Work Duration
- Free Work Reference Value
- Overtime Pay

### 8.2 Calendar View

월간은 Calendar Grid를 제공한다.

각 날짜 Cell은 최소한 다음 상태를 표현할 수 있어야 한다.

- 기록 없음
- 정상 기록
- LOAFING 존재
- Free Work 존재
- Overtime 존재
- 데이터 확인 필요

색만으로 상태를 전달하지 않는다.
Badge, icon, label 중 하나를 함께 사용한다.

날짜를 선택하면 Daily Detail로 이동한다.

### 8.3 Cumulative Graph

월간 기본 Graph는 Recognized Pay의 누적 Line을 권장한다.

X:

- 해당 월의 WorkDay LocalDate

Y:

- cumulative recognizedPay

미래 날짜는 Point를 생성하지 않는다.

Loafing Earned Value와 Free Work Reference Value는 별도 Metric Toggle로 전환 가능하지만 기본 화면에서 여러 누적선을 동시에 겹쳐 복잡하게 만들지 않는다.

---

## 9. Yearly Report

연간은 필요하지만 Daily/Weekly만큼 세밀하게 만들지 않는다.

목적:

- 12개월 비교
- 1년 총결산
- 장기 추세 확인

### 9.1 Annual Summary

권장:

- 연간 Recognized Pay
- 총 기록 일수
- 총 Working Duration
- 총 Loafing Duration
- 총 Loafing Earned Value
- 총 Free Work Duration
- 총 Free Work Reference Value
- 총 Overtime Pay

### 9.2 Month by Month

12개월 Bar 또는 Line.

기본 Metric:

- monthly recognizedPay

Metric 전환 후보:

- Loafing Earned Value
- Free Work Reference Value
- Working Duration
- Loafing Duration

월을 선택하면 해당 Monthly Report로 Drill Down한다.

### 9.3 Year Navigation

```text
< 2025    2026    2027 >
```

과거 연도는 같은 원본 WorkDay를 사용하여 재생성한다.

---

## 10. Lifetime Accumulation

Lifetime은 데이터 모델에서는 지원하되 기본 네 탭과 동급으로 만들지 않는다.

향후 예:

- 총 Recognized Pay
- 총 Loafing Earned Value
- 총 Free Work Reference Value
- 총 기록 일수
- PayMeter 최초 기록일
- 최장 Free Work 기록

Lifetime도 별도 SSOT를 만들지 않는다.

필요 시 전체 DailySummaryCache를 합산한다.

데이터가 수년 이상 누적되어 실제 성능 문제가 확인된 경우에만 rebuild 가능한 상위 Aggregate Cache를 추가한다.

---

## 11. DailySummaryCache Extension

기존 DailySummaryCache 원칙을 유지하면서 Reporting에 필요한 필드를 확장할 수 있다.

권장 후보:

```text
workDayId
sourceVersion

regularPayMicroKrw
overtimePayMicroKrw
recognizedPayMicroKrw

loafingEarnedValueMicroKrw
freeWorkReferenceValueMicroKrw

workingDurationMs
loafingDurationMs
overtimeDurationMs
freeWorkDurationMs

clockInAtEpochMs
clockOutAtEpochMs

integrityStatus
finalized
```

주의:

- Cache이므로 삭제해도 원본에서 재생성 가능해야 한다.
- Cache에서 원본 Event를 복원하려고 하면 안 된다.
- 현재 진행 중인 Day의 매 Tick 값을 Cache에 저장하지 않는다.
- `recognizedPayMicroKrw`는 convenience cache일 뿐 계산 정의를 중복 소유하지 않는다.

### Source Version

원본 변경 시 deterministic하게 Cache stale 여부를 판별해야 한다.

sourceVersion 계산 입력 후보:

- WorkDay updatedAt 또는 revision
- DailyOverride updatedAt
- LoafingSession version set
- OvertimeSession version set
- ClockEvent effective version

구체적인 hash/version 방식은 Storage 구현 단계에서 확정한다.

---

## 12. Aggregation Pipeline

Period Report 생성 흐름:

```text
1. Report date range 결정
2. WorkDay를 localDate index로 조회
3. 각 WorkDay의 DailySummaryCache 확인
4. Cache miss/stale이면 원본으로 Day Summary 재계산
5. Valid Day Summary를 Period Aggregator에 전달
6. Weekly/Monthly/Yearly ViewModel 생성
7. Presentation render
```

현재 Day:

- 실시간 PaySnapshot 사용
- persisted Daily Cache를 Tick마다 갱신하지 않음

과거 finalized Day:

- DailySummaryCache 우선 사용 가능

과거 Cache miss:

- 원본에서 lazy rebuild 가능

---

## 13. Persistent Aggregate Cache Decision

V1에서는 다음을 기본적으로 만들지 않는다.

- WeeklySummaryStore
- MonthlySummaryStore
- YearlySummaryStore

이유:

- Yearly Query도 최대 약 365/366 Daily Record
- Local IndexedDB 기준 충분히 작은 데이터
- Correction propagation 단순화
- Cache consistency 문제 최소화

먼저 DailySummaryCache만 사용한다.

추후 실제 Profile 결과에서 성능 문제가 확인되면:

```text
MonthlyAggregateCache
YearlyAggregateCache
```

를 추가할 수 있다.

이 경우에도 반드시:

- rebuildable
- source range/version 포함
- SSOT 아님

조건을 유지한다.

---

## 14. Correction Propagation

사용자가 과거 기록을 수정하면 상위 보고서를 직접 수정하지 않는다.

흐름:

```text
Raw Event Correction
        |
        v
Invalidate DailySummaryCache
        |
        v
Rebuild Daily Summary
        |
        v
Weekly / Monthly / Yearly next query automatically changed
```

예:

- Clock Out 수정
- LOAFING 구간 수정
- Free Work 구간이 Overtime으로 전환
- DailyOverride 수정

모두 같은 규칙을 사용한다.

Cascading write로 주간/월간/연간 숫자를 별도 수정하는 구조를 금지한다.

---

## 15. Integrity Handling

보고서는 손상 데이터를 정상 숫자처럼 조용히 섞지 않는다.

### VALID

정상 집계.

### NEEDS_TIME_REVIEW

해당 날짜를 사용자에게 표시하고 확인 필요 Badge를 제공한다.

Safe calculation이 가능한 값은 표시할 수 있지만 Period Header에 다음 중 하나를 표시한다.

- 확인 필요한 기록 N일
- 일부 값은 임시 계산

### CORRUPT / UNREADABLE

금액 합계에 임의 값을 넣지 않는다.

해당 날짜는 제외하고 사용자에게 데이터 확인 필요를 표시한다.

Period Report ViewModel은 최소 다음 정보를 가진다.

- integrityIssueCount
- hasProvisionalData
- excludedDayCount

---

## 16. Data Retention

V1 기본 정책:

- Raw History 자동 삭제 없음
- 오래된 WorkDay 자동 압축 없음
- LoafingSession 자동 병합 삭제 없음
- OvertimeSession 자동 삭제 없음

DailySummaryCache는 언제든 제거/재구축 가능하다.

장기 사용으로 저장 공간 문제가 실측되기 전까지 원본 이력 보존을 우선한다.

---

## 17. Export / Import

기존 Export Contract를 유지한다.

Export의 핵심은 원본이다.

포함:

- Settings
- Salary Revisions
- Schedule Revisions
- Work Days
- Daily Overrides
- Loafing Sessions
- Overtime Sessions

DailySummaryCache, Weekly/Monthly/Yearly Report 결과는 Export 필수가 아니다.

Import 후 Cache는 다시 생성할 수 있어야 한다.

따라서 다른 Device/Browser로 이동해도 같은 원본과 같은 계산 버전이면 같은 Report를 재생성할 수 있어야 한다.

---

## 18. P1R Transitional Rule

현재 P1R Prototype에는 정식 WorkDay History Persistence가 아직 없다.

`P1R_FINAL_UI_DESIGN.md`의 기존 Detail Accumulation 규칙은 P1R Retention Test용 임시 시각화다.

정식 History가 없는 상태에서 과거 날짜를 Daily Target Allocation으로 채운 값은 실제 측정 기록이 아니다.

따라서 P1R에서 이러한 값을 노출하는 경우:

- 실제 Activity History라고 표현하지 않음
- 실제 LOAFING History를 생성했다고 간주하지 않음
- 실제 Free Work History를 생성했다고 간주하지 않음
- 정식 History Store에 저장하지 않음
- `급여 배분 기준`, `예상 누적` 등 실제 기록과 구분되는 의미를 사용

정식 WorkDay History 도입 후:

- synthetic past allocation 제거
- 실제 WorkDay + Session 기반 Reporting으로 교체

이 문서는 Detail/History의 최종 Target Design이며 P2 착수를 자동 승인하지 않는다.

---

## 19. Privacy

Privacy Mode에서는 Detail의 모든 금액을 함께 Mask한다.

포함:

- Daily Recognized Pay
- Loafing Earned Value
- Free Work Reference Value
- Overtime Pay
- Weekly/Monthly/Yearly Total
- Graph Tooltip 금액

시간과 상태는 기존 Privacy 정책에 따라 유지 가능하다.

그래프 Y축에 실제 금액 눈금이 노출되면 Privacy Mode에서 함께 Mask하거나 상대 축으로 전환한다.

---

## 20. Accessibility

- 색만으로 WORKING/LOAFING/FREE WORK를 구분하지 않음
- Graph에 text/legend 제공
- Calendar Cell에 screen reader label 제공
- 금액은 tabular nums 사용
- 긴 기간 그래프는 touch target 확보
- Reduced Motion 존중
- Landscape/Portrait 모두 Detail 자체 scroll 허용
- Money Timer 본 화면의 no-scroll contract와 Detail scroll contract를 혼동하지 않음

---

## 21. Recommended Detail Navigation

기본:

```text
상세보기

[ 일간 ] [ 주간 ] [ 월간 ] [ 연간 ]
```

Period 이동:

- Daily: 이전날 / 다음날 / 날짜 선택
- Weekly: 이전주 / 다음주
- Monthly: 이전달 / 다음달
- Yearly: 이전년 / 다음년

Drill Down:

```text
Year -> Month -> Day
Week -> Day
Month Calendar -> Day
```

상위 Period에서 특정 항목을 선택하면 하위 상세로 자연스럽게 진입한다.

---

## 22. Recommended Presentation Hierarchy

### Daily

1. 오늘/선택일 Recognized Pay
2. 시간 Breakdown
3. Wall-clock Timeline
4. Loafing Value
5. Free Work
6. Overtime
7. Correction

### Weekly

1. Weekly Recognized Pay
2. 요일별 비교
3. Loafing / Free Work Summary
4. Simple Insight
5. Day Drill Down

### Monthly

1. Monthly Recognized Pay
2. Cumulative Graph
3. Calendar Grid
4. Loafing / Free Work / Overtime Summary
5. Day Drill Down

### Yearly

1. Annual Recognized Pay
2. 12 Month Trend
3. Annual Loafing / Free Work / Overtime
4. Month Drill Down
5. Optional Lifetime Summary

---

## 23. Test and Acceptance Matrix

### Calculation

- Loafing Earned Value가 Recognized Pay에 중복 합산되지 않음
- Free Work Reference Value가 Recognized Pay에 합산되지 않음
- Overtime Pay는 Recognized Pay에 포함
- 미래 날짜는 누적하지 않음
- 같은 원본이면 같은 Report
- 현재 Tick 빈도가 Period Total에 영향 없음

### Daily

- Wall-clock Timeline 순서 정확
- Break 실제 길이 표현
- multiple LOAFING 정확
- Free Work 구간 정확
- Overtime 구간 정확
- Correction 후 즉시 재계산

### Weekly

- weekStartsOn 변경 시 원본 변경 없음
- 7일 범위 정확
- Daily 합과 Weekly 합 일치

### Monthly

- 월 경계 정확
- 28/29/30/31일 처리
- 미래 날짜 Point 없음
- Daily 합과 Monthly 합 일치

### Yearly

- 윤년 처리
- 12 Month 합과 Year Total 일치
- Month Drill Down 일치

### Integrity

- NEEDS_TIME_REVIEW 표시
- corrupt day 조용히 정상값 처리 금지
- excluded/provisional 상태 전달

### Cache

- cache miss rebuild
- stale cache rebuild
- cache 삭제 후 동일 결과
- Raw correction 후 상위 Report 자동 변경

---

## 24. Implementation Boundary Proposal

정식 구현 단계에서 권장 모듈 경계:

### Domain

- `reporting/buildDailyReport.ts`
- `reporting/aggregatePeriod.ts`
- `reporting/reportTypes.ts`
- `reporting/reportRange.ts`

### Infrastructure

- WorkDay date-range query
- Session batch query
- DailySummaryCache repository
- cache invalidation

### Presentation

- `DetailReportScreen.tsx`
- `DailyReportView.tsx`
- `WeeklyReportView.tsx`
- `MonthlyReportView.tsx`
- `YearlyReportView.tsx`
- `DailyTimeline.tsx`
- `CumulativeChart.tsx`
- `MonthlyCalendar.tsx`

Presentation에서 급여 공식이나 Raw Session 합산을 직접 구현하지 않는다.

---

## 25. Final Decisions

확정:

- 상세보기 기본 Period는 일간/주간/월간/연간
- Lifetime은 데이터 모델 지원, 기본 5번째 탭은 아님
- Raw Event/WorkDay가 SSOT
- DailySummaryCache만 기본 Persistent Aggregate Cache
- Weekly/Monthly/Yearly는 동적 집계
- 장기 데이터 자동 삭제 없음
- 과거 급여/근무 설정 변경으로 기존 WorkDay 재작성 금지
- Daily Timeline은 Wall-clock coordinate
- Main Perimeter는 기존 paid-time coordinate 유지
- Loafing Value는 Regular Pay의 Breakdown
- Free Work Reference Value는 실제 급여 아님
- Calendar Month/Year는 WorkDay.localDate 기준
- V1 Overnight 미지원 유지
- P1R synthetic accumulation은 실제 History가 아님
- 정식 History 도입 후 실제 WorkDay 기반으로 교체
- P2는 여전히 BLOCKED

Final Status:

`DETAIL_REPORTING_DESIGN_READY`
