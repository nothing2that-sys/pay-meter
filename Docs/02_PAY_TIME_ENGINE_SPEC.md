# PayMeter Pay and Time Engine Specification

## 1. 목적

같은 입력과 같은 now에는 UI refresh 빈도와 관계없이 같은 Snapshot을 반환한다.

PayMeter 계산은 timestamp와 시간 Segment 기반이다.

## 2. Core Input

Snapshot 계산 입력:

- nowEpochMs
- WorkDayContext
- Salary Snapshot
- Schedule Snapshot
- Clock In/Out Event
- Loafing Intervals
- Overtime Sessions
- integrityStatus

Snapshot 계산 자체는 저장을 변경하지 않는다.

## 3. WorkDayContext

WorkDayContext 최소 필드:

- localDate
- timeZoneSnapshot
- scheduleSnapshot
- salarySnapshotRef
- scheduledStartEpochMs
- scheduledEndEpochMs
- plannedPaidDurationMs
- integrityStatus

Work Day가 한번 materialize되면 timeZoneSnapshot을 바꾸지 않는다.

## 4. Time Segment Standard

모든 Segment는 start 포함, end 제외인 반열린 구간이다.

예:

- 09:00 <= t < 12:00 REGULAR_WORK
- 12:00 <= t < 13:00 UNPAID_BREAK
- 13:00 <= t < 18:00 REGULAR_WORK
- 18:00부터 정규 구간 종료

## 5. Pay State

- OFF_DAY
- BEFORE_WORK
- AWAITING_CLOCK_IN
- REGULAR_WORK
- UNPAID_BREAK
- AFTER_SCHEDULE_UNPAID
- PAID_OVERTIME
- CLOCKED_OUT

AWAITING_CLOCK_IN:

- TIME_BASED only
- Schedule regular window에 들어왔지만 Clock In이 없음
- Current Rate = 0

## 6. Integrity Status

Pay State와 별도 축:

- OK
- NEEDS_TIME_REVIEW
- DATA_WARNING
- STORAGE_ERROR

Clock 역행, 미마감 Day, 손상 Session이 있으면 정상 Pay State와 별개로 경고를 표시할 수 있다.

## 7. FIXED_PERIOD Allocation

기간 급여를 예정 유급시간에 배분한다.

Period Visualization Rate의 개념:

- Period Pay / Planned Paid Duration Of Period

Daily Target:

- Period Pay × Planned Paid Duration Of Day / Planned Paid Duration Of Period

요일별 예정 시간이 달라도 같은 Period 안에서 시간당 시각화 가치의 의미가 일정해진다.

### Annual

ANNUAL은 V1에서 Annual Pay / 12를 Monthly Pay로 정규화하고 월 단위 Planned Paid Duration을 사용한다.

### Precision

Money는 integer micro-KRW BigInt를 권장한다.

Daily Target 배분에서 발생하는 remainder는 localDate 오름차순으로 deterministic distribution하여 해당 Period의 Daily Target 총합이 Period Pay와 정확히 일치하도록 한다.

UI는 계산 중간 Rate를 float 누적하지 않는다.

## 8. FIXED_PERIOD Realtime Progress

해당 Day의 정규 진행값은 Day Target과 그 날의 Planned Paid Segment 진행 비율에서 계산한다.

Unpaid Break 동안 증가하지 않는다.

LOAFING은 진행을 멈추지 않는다.

Scheduled End 이후 정규 Progress는 더 증가하지 않는다.

## 9. FIXED_PERIOD Clock Out

Clock Out 시:

- realtime regular progress 종료
- finalizedRegularPayToday = Daily Target 100%
- 진행 중 LOAFING 및 Overtime의 open interval은 Clock Out에서 종료
- Clock Out 이후 Free Work 증가 없음

조기퇴근 차감은 없다.

## 10. TIME_BASED Regular Pay

TIME_BASED는 Clock In과 Clock Out을 사용한다.

정규 Base Pay는 다음 교집합의 Duration으로 계산한다.

- Clocked-in interval
- Scheduled regular paid interval
- Break 제외

Clock In이 없으면 regular paid duration = 0.

Clock Out이 없고 현재 Day가 유효하면 now까지 계산한다.

## 11. Break

V1 Break는 unpaid only다.

Break는 Schedule에 의해 자동 적용된다.

Break 동안:

- Regular Rate = 0
- Activity eligible duration 제외
- Toggle disabled

Break 직전 LOAFING intent는 Break 이후 계속될 수 있다.

Loafing interval이 Break를 가로질러도 통계 계산 시 Break 교집합은 제외한다.

## 12. Activity

저장되는 Activity 원본은 LOAFING interval뿐이다.

workingDuration:

- Activity Eligible Duration - Loafing Duration

loafingDuration:

- Loafing intervals와 Activity Eligible Segment의 교집합 합계

loafingRatio:

- loafingDuration / Activity Eligible Duration

Activity Eligible Duration에는 unpaid break를 포함하지 않는다.

LOAFING은 급여 차감값이 아니다.

## 13. Loafing Reference Value

loafingReferenceValue는 해당 구간의 Base Visualization Rate를 기준으로 계산한다.

이는 실제 급여에서 빼지 않는다.

Salary 변경 경계를 가로지르는 과거 계산은 해당 WorkDay 또는 Rate Snapshot을 사용한다.

## 14. Scheduled End

Scheduled End부터 정규 급여 진행은 0이다.

Clock Out하지 않았고 active Overtime이 없다면:

- Pay State = AFTER_SCHEDULE_UNPAID

## 15. Free Work

무료봉사는 저장 Session이 아니다.

기본 계산:

- Scheduled End 이후
- Clock Out 또는 day clamp 이전
- Paid Overtime Segment를 제외한 Duration

unpaidAfterHoursReferenceValue:

- Free Work Duration × Base Visualization Rate

실제 Pay Total에는 포함하지 않는다.

## 16. Manual Overtime

AUTO_OVERTIME은 없다.

사용자 Command로만 Overtime Session을 만든다.

V1 multiplier 범위는 validation 가능한 양수 값으로 제한하며 UI Preset은 1.0x, 1.5x, 2.0x를 우선한다.

Session 계산 Snapshot:

- multiplierBasisPointsSnapshot
- baseRateSnapshot

baseRateSnapshot은 과거 설정 변경으로 금액이 바뀌지 않도록 해당 Session 시작 시점의 계산 가능한 Rate 분수 또는 동등 정밀도 정보를 가진다.

## 17. Retroactive Overtime

Scheduled End 이후 Overtime Start 시 UX는 다음 선택을 제공할 수 있다.

- 지금부터
- Scheduled End부터

소급 시작은 해당 WorkDay의 Scheduled End보다 이를 수 없다.

정밀 조정은 Timeline Correction에서 5분 단위로 수행한다.

## 18. Overtime Earned

Overtime Earned는 Session duration과 저장된 baseRateSnapshot, multiplierBasisPointsSnapshot으로 계산한다.

현재 Settings의 multiplier를 다시 조회하지 않는다.

## 19. Clock Out and Overtime

Clock Out 시 open Overtime은 같은 timestamp에서 종료한다.

Clock Out 이후 Overtime을 자동 생성하거나 연장하지 않는다.

## 20. Unclosed Day

V1은 overnight Schedule을 허용하지 않는다.

Clock Out 없이 local midnight를 넘기면:

- 해당 Day 계산 end를 midnight로 임시 clamp
- integrityStatus = NEEDS_TIME_REVIEW
- 다음 Day Schedule과 자동 연결하지 않음
- 자동 Daily Finalization 금지
- Timeline Correction 요구

## 21. Clock Change

Device Clock forward jump:

- 새로운 Wall Clock 기준 Snapshot을 계산
- 비정상적으로 큰 jump가 Day 경계나 Session invariant를 깨면 NEEDS_TIME_REVIEW 가능

Device Clock backward jump:

- 음수 duration 금지
- open Session start보다 now가 작으면 NEEDS_TIME_REVIEW
- finalized past pay 자동 감소 금지

PayMeter는 조작 방지 근태 시스템이 아니다.

## 22. Same Timestamp Precedence

동일 timestamp에서 충돌할 때 기본 우선순위:

1. 명시적 Timeline Correction 결과
2. Clock Out
3. Overtime Stop
4. Overtime Start
5. Schedule derived boundary
6. Free Work derived state

Clock Out이 같은 timestamp에 존재하면 그 이후 파생 Session을 만들지 않는다.

## 23. Snapshot Output

PaySnapshot 최소 필드:

- nowEpochMs
- localDate
- payState
- integrityStatus
- currentDisplayPay
- regularProgressToday
- dailyTargetPay
- dailyProgressRatio
- finalizedRegularPayToday
- overtimeEarnedToday
- totalRecognizedToday
- currentRate
- workingDuration
- loafingDuration
- loafingRatio
- loafingReferenceValue
- freeWorkDuration
- freeWorkReferenceValue
- earnedWeek
- earnedMonth

Year와 ms Rate는 없다.

## 24. Current Display Pay

FIXED_PERIOD Clock Out 전:

- regularProgressToday + overtimeEarnedToday

FIXED_PERIOD Clock Out 후:

- finalizedRegularPayToday + overtimeEarnedToday

TIME_BASED:

- actual regular earned + overtimeEarnedToday

UI는 이 값을 별도로 재조합하지 않는다.

## 25. Period Aggregation

기간:

- Today
- Week
- Month

완료된 Day는 finalized/settled source를 사용한다.

진행 중 Today는 Realtime Snapshot으로 합성할 수 있다.

Daily Summary Cache는 결과를 빠르게 표시하기 위한 Cache일 뿐 SSOT가 아니다.
