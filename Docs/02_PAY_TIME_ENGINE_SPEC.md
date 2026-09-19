# PayMeter Pay and Time Engine Specification

## 1. 목적

같은 입력과 같은 now에는 UI refresh 빈도와 관계없이 같은 Snapshot을 반환한다.

PayMeter 계산은 timestamp와 시간 Segment 기반이다.

## 2. Core Input

Snapshot 입력:

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

최소:

- localDate
- timeZoneSnapshot
- scheduleSnapshot
- salarySnapshotRef
- scheduledStartEpochMs
- scheduledEndEpochMs
- plannedPaidDurationMs
- dailyTargetPayMicroKrw
- integrityStatus

## 4. Time Segment Standard

모든 Segment는 반열린 구간이다.

- start 포함
- end 제외

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

## 6. Integrity Status

- OK
- NEEDS_TIME_REVIEW
- DATA_WARNING
- STORAGE_ERROR

## 7. FIXED_PERIOD Allocation

Period Pay를 Planned Paid Duration에 배분한다.

Daily Target:

Period Pay
× Planned Paid Duration Of Day
/ Planned Paid Duration Of Period

Daily Target은 계산 SSOT지만 기본 Money Timer Presentation에는 직접 표시하지 않는다.

금액 계산은 integer micro-KRW와 BigInt 또는 동등한 정확도 구조를 사용한다.

## 8. FIXED_PERIOD Realtime Progress

regularProgressToday:

dailyTargetPay
× elapsedPaidDuration
/ plannedPaidDurationOfDay

Unpaid Break 동안 증가하지 않는다.

LOAFING은 진행을 멈추지 않는다.

Scheduled End 이후 정규 Progress는 증가하지 않는다.

## 9. Today Earned

기본 Money Timer의 "오늘 번 돈"은 Domain에서 제공한다.

FIXED_PERIOD Clock Out 전:

- regularProgressToday + overtimeEarnedToday

FIXED_PERIOD Clock Out 후:

- finalizedRegularPayToday + overtimeEarnedToday

TIME_BASED:

- actualRegularEarned + overtimeEarnedToday

UI가 별도 계산식을 만들지 않는다.

## 10. Loafing Earned Value

loafingEarnedValue는 LOAFING Activity와 겹치는 유급 Segment의 금전적 가치다.

FIXED_PERIOD 기본 계산:

- 해당 Day Base Visualization Rate
- LOAFING eligible duration

을 이용한다.

중요:

- Today Earned에 추가로 더하지 않음
- Today Earned의 Breakdown/Reference
- 급여 차감 아님
- 별도 수당 아님

## 11. TIME_BASED Regular Pay

TIME_BASED는 Clock In과 Clock Out을 사용한다.

정규 Base Pay는:

- Clocked-in interval
- Scheduled regular paid interval

교집합에서 unpaid break를 제외해 계산한다.

## 12. Break

V1 Break는 unpaid only다.

Break 동안:

- Current regular rate = 0
- Perimeter Progress 정지
- Activity eligible duration 제외
- Toggle disabled

LOAFING interval이 Break를 가로질러도 Break 교집합은 Loafing Duration에서 제외한다.

## 13. Activity

저장 Activity 원본은 LOAFING interval뿐이다.

workingDuration:

Activity Eligible Duration - Loafing Duration

loafingDuration:

LOAFING interval과 Activity Eligible Segment의 교집합 합계

loafingRatio:

loafingDuration / Activity Eligible Duration

## 14. Scheduled Progress Ratio

scheduledProgressRatio는 기본 외곽 Timeline 진행률이다.

분자:

- now 이전에 소비된 Planned Paid Duration
- unpaid break 제외

분모:

- 해당 Day plannedPaidDuration

범위:

- 0.0 ~ 1.0

Scheduled End에서 1.0이 된다.

Break 동안 증가하지 않는다.

## 15. Perimeter Timeline Segments

Domain은 SVG 좌표를 알지 않는다.

대신 Presentation이 사용할 normalized time segment를 반환할 수 있다.

예:

PerimeterSegment {
  type: WORKING | LOAFING
  startRatio
  endRatio
}

규칙:

- startRatio/endRatio는 Planned Paid Duration 0~1 기준
- Break는 Segment 길이를 차지하지 않음
- LOAFING 원본이 없는 eligible 구간은 WORKING
- Segment 순서는 시간 순
- 같은 type의 연속 Segment는 Presentation에서 병합 가능

## 16. Current Rate

Snapshot은 최소 두 Rate 의미를 분리한다.

### baseVisualizationRate

해당 Day의 정규 급여 시각화 기준 Rate.

### currentRate

현재 이 순간 실제로 진행 중인 Rate.

- REGULAR_WORK: baseVisualizationRate
- BEFORE_WORK: 0
- UNPAID_BREAK: 0
- AFTER_SCHEDULE_UNPAID: 0 regular rate
- OFF_DAY: 0
- CLOCKED_OUT: 0 regular rate

PAID_OVERTIME에서는 overtime current rate를 별도 또는 currentRate로 명시할 수 있다.

## 17. FIXED_PERIOD Clock Out

Clock Out 시:

- realtime regular progress 종료
- finalizedRegularPayToday = Daily Target 100%
- open LOAFING 및 Overtime은 Clock Out에서 종료
- Clock Out 이후 Free Work 증가 없음

## 18. Free Work

무료봉사는 저장 Session이 아니다.

기본 계산:

- Scheduled End 이후
- Clock Out 또는 day clamp 이전
- Paid Overtime Segment 제외

freeWorkDuration:

위 조건의 Duration

freeWorkReferenceValue:

Base Visualization Rate × freeWorkDuration

중요:

- 실제 Pay Total에 더하지 않음
- Today Earned에 더하지 않음
- "무료봉사 Wallet" Presentation을 위한 Reference Value

## 19. Free Work Wallet Snapshot

AFTER_SCHEDULE_UNPAID에서 Snapshot은 최소 다음을 제공해야 한다.

- freeWorkDuration
- freeWorkReferenceValue
- baseVisualizationRate
- scheduledProgressRatio = 1.0
- todayEarned
- payState

Presentation은 이를 Wallet 형태로 보여준다.

Wallet 카피 선택은 Domain 책임이 아니다.

## 20. Free Work Copy Threshold

카피는 Presentation Layer 책임이다.

권장 Trigger:

- freeWorkReferenceValue threshold
- freeWorkDuration threshold

매 Tick마다 랜덤 문구를 바꾸지 않는다.

동일 Snapshot 계산은 카피 선택과 무관해야 한다.

## 21. Manual Overtime

AUTO_OVERTIME은 없다.

사용자 Command로만 Overtime Session을 만든다.

Session Snapshot:

- multiplierBasisPointsSnapshot
- baseRateSnapshot

## 22. Retroactive Overtime

Overtime Start 시:

- now
- Scheduled End

중 하나를 선택할 수 있다.

소급 Overtime과 겹치는 Free Work 구간은 재계산에서 제외된다.

Wallet 금액을 별도 저장하거나 "이체"하지 않는다.

## 23. Overtime Earned

Overtime Earned는 Session duration과 저장된 baseRateSnapshot, multiplierBasisPointsSnapshot으로 계산한다.

현재 Settings의 multiplier를 다시 조회하지 않는다.

## 24. Unclosed Day

Clock Out 없이 local midnight를 넘기면:

- 해당 Day 계산 end를 midnight로 임시 clamp
- integrityStatus = NEEDS_TIME_REVIEW
- 다음 Day Schedule과 자동 연결하지 않음
- 자동 Daily Finalization 금지

## 25. Clock Change

Device Clock forward/backward 변경 시:

- 음수 duration 금지
- NaN 금지
- 확정 과거 급여 자동 감소 금지
- invariant가 깨지면 NEEDS_TIME_REVIEW

## 26. Snapshot Output

PaySnapshot 최소 필드:

- nowEpochMs
- localDate
- payState
- integrityStatus
- todayEarnedMicroKrw
- loafingEarnedValueMicroKrw
- dailyTargetPayMicroKrw
- scheduledProgressRatio
- perimeterSegments
- finalizedRegularPayToday
- overtimeEarnedToday
- totalRecognizedToday
- baseVisualizationRate
- currentRate
- workingDuration
- loafingDuration
- loafingRatio
- freeWorkDuration
- freeWorkReferenceValue
- remainingScheduledPaidDuration
- earnedWeek
- earnedMonth

dailyTargetPayMicroKrw는 Domain 계산값이며 기본 Money Timer가 직접 표시하지 않는다.

## 27. Period Aggregation

기간:

- Today
- Week
- Month

Daily Summary Cache는 SSOT가 아니다.
