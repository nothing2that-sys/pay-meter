# PayMeter Pay and Time Engine Specification

## 1. 목적

이 문서는 PayMeter의 급여 계산 결과를 결정하는 정본 규칙을 정의한다.

화면 애니메이션, 렌더링 주기, 브라우저 성능과 관계없이 동일한 입력과 동일한 시각에는 동일한 금액이 나와야 한다.

---

## 2. 핵심 개념

PayMeter는 시간을 Segment로 나누고 각 Segment에 급여 규칙을 적용한다.

예:

```
09:00 ~ 12:00  Regular Paid
12:00 ~ 13:00  Unpaid Break
13:00 ~ 18:00  Regular Paid
18:00 ~ 18:25  Unpaid Overtime
18:25 ~ 20:10  Paid Overtime 1.5x
20:10          Clocked Out
```

총 급여는 유급 Segment의 합이다.

```
Total Earned
= Sum(Regular Paid Segments)
+ Sum(Paid Overtime Segments)
+ Sum(Fixed Allowances)
```

무급 초과시간은 별도 통계이며 Earned에는 포함하지 않는다.

---

## 3. 급여 입력 기준

지원 Pay Basis:

- ANNUAL
- MONTHLY
- WEEKLY
- DAILY
- HOURLY

### 3.1 Period Allocation Mode

ANNUAL, MONTHLY, WEEKLY, DAILY 입력의 기본 계산 방식은 해당 기간의 급여를 그 기간의 예정 유급 정규 근무시간에 배분하는 방식이다.

예:

월급 4,000,000원이고 해당 월의 예정 유급 정규 근무시간이 160시간이면:

```
Base Hour Value = 4,000,000 / 160
                = 25,000 KRW/hour
```

이 방식의 목적은 해당 기간의 정상 스케줄을 모두 수행했을 때 설정 급여와 누적 합계가 일치하게 만드는 것이다.

주의:

이 값은 법률상 통상임금 또는 법정 시급을 의미하지 않는다.

PayMeter 내부의 시각화 기준값이다.

### 3.2 Hourly Mode

HOURLY 입력은 입력값 자체를 기본 시간급으로 사용한다.

### 3.3 Manual Hourly Override

향후 Advanced Option으로 Period Allocation 결과와 별개로 기준 시급을 직접 지정할 수 있다.

V1에서는 필요 시 구현하되 기본값은 OFF다.

---

## 4. 예정 유급시간

예정 유급시간은 Schedule과 Break Policy로 계산한다.

예:

```
Schedule 09:00 ~ 18:00
Break    12:00 ~ 13:00
Break    Unpaid
```

예정 유급시간:

```
8 hours
```

Break가 Paid라면:

```
9 hours
```

휴게시간의 UI 표기와 급여 반영 여부는 반드시 분리한다.

---

## 5. Work State

도메인 상태는 최소 다음을 가진다.

### BEFORE_WORK

해당 날짜 근무 시작 전.

급여 증가:

```
0
```

### REGULAR_WORK

정규 유급 근무 Segment.

급여 증가:

```
Base Rate
```

### PAID_BREAK

유급 휴게 Segment.

급여 증가:

```
Base Rate
```

### UNPAID_BREAK

무급 휴게 Segment.

급여 증가:

```
0
```

### AFTER_SCHEDULE_UNPAID

정규 근무 종료 후 유급 추가근무가 시작되지 않았고 퇴근 처리도 하지 않은 상태.

UI 기본 표시:

```
무료봉사 중
```

급여 증가:

```
0
```

별도 통계:

- unpaidAfterHoursDuration
- unpaidAfterHoursReferenceValue

### PAID_OVERTIME

유급 추가근무 중.

급여 증가:

설정된 Overtime Policy에 따름.

### CLOCKED_OUT

사용자가 해당 날짜 근무 종료를 확정한 상태.

급여 증가:

```
0
```

무료봉사 시간 증가:

```
0
```

### OFF_DAY

기본 비근무일 또는 일일 Override 휴무일.

급여 증가:

```
0
```

---

## 6. 상태 전이

대표 전이:

```
BEFORE_WORK
  -> REGULAR_WORK

REGULAR_WORK
  -> PAID_BREAK
  -> UNPAID_BREAK
  -> REGULAR_WORK
  -> AFTER_SCHEDULE_UNPAID

AFTER_SCHEDULE_UNPAID
  -> PAID_OVERTIME
  -> CLOCKED_OUT

PAID_OVERTIME
  -> AFTER_SCHEDULE_UNPAID
  -> CLOCKED_OUT
```

사용자가 예정 퇴근시각 전에 명시적으로 퇴근 처리하는 기능은 향후 Early Clock Out으로 확장 가능하다.

V1에서 구현하는 경우 그 시점 이후 정규 급여를 실제 근무액에서 제외할지, 예정 급여 전망만 변경할지를 별도 옵션으로 정의해야 한다.

---

## 7. 정규 근무 종료 규칙

예정 근무:

```
09:00 ~ 18:00
```

18:00:00부터 기본 급여 증가는 중지된다.

18:00:00 이후 다음 중 하나가 발생하기 전까지 AFTER_SCHEDULE_UNPAID 상태다.

- 유급 추가근무 시작
- 퇴근 처리
- Daily Override로 정규 퇴근시각 변경

예:

18:00 정규 급여:

```
240,000 KRW
```

18:30에도 유급 추가근무가 없다면:

```
Earned = 240,000 KRW
Unpaid After Hours = 30 minutes
```

---

## 8. 추가수당 정책

OvertimePolicy는 다음 유형을 지원한다.

### MULTIPLIER

```
Overtime Rate = Base Rate * Multiplier
```

예:

```
1.5x
```

### CUSTOM_HOURLY

```
Overtime Rate = Configured Hourly Rate
```

### FIXED

해당 추가근무 세션이 조건을 만족하면 고정 금액을 1회 반영한다.

고정수당 반영 시점은 정책으로 정의한다.

V1 권장:

추가근무 종료 시 반영.

### HOURLY_PLUS_FIXED

시간급 계산 결과와 고정수당을 모두 반영한다.

---

## 9. Overtime Session

유급 추가근무는 명시적 Session으로 저장한다.

필수 필드 개념:

```
id
date
startAt
endAt
policyId
rateSnapshot
fixedAllowanceSnapshot
```

중요:

향후 사용자가 기본 수당 설정을 변경하더라도 과거 결과가 바뀌지 않도록 Session 시작 시 적용 규칙 Snapshot을 저장한다.

---

## 10. 급여 계산 단위

금액 계산은 화면 tick에 따라 더하지 않는다.

개념식:

```
segmentEarned = ratePerMillisecond * payableDurationMilliseconds
```

하지만 구현에서는 반복적인 floating point 누적을 피한다.

권장 내부 표현:

```
1 KRW = 1,000,000 micro-won
```

입력 급여는 정수 KRW로 보존한다.

Segment 계산 결과를 micro-won 수준으로 계산하고 최종 표시 단계에서 포맷한다.

---

## 11. Snapshot Calculation

Dashboard는 현재 시각 `now`를 받아 다음 Snapshot을 만든다.

```
PaySnapshot {
  now
  state
  earnedToday
  earnedWeek
  earnedMonth
  earnedYear
  regularEarnedToday
  overtimeEarnedToday
  currentRate
  elapsedRegularWork
  remainingRegularWork
  unpaidAfterHoursDuration
  unpaidAfterHoursReferenceValue
}
```

Snapshot은 저장된 결과를 계속 더하는 객체가 아니라 현재 데이터에서 재계산 가능한 결과다.

---

## 12. 기간 누적 정의

### Today

사용자 로컬 시간대의 현재 날짜 00:00~24:00 범위.

### Week

기본:

월요일 시작.

향후 설정 가능.

### Month

사용자 로컬 달력 기준 월.

### Year

사용자 로컬 달력 기준 연도.

---

## 13. 현재 증가율

Dashboard의 `+ KRW / sec`는 현재 Work State에서 적용되는 실시간 Rate다.

예:

REGULAR_WORK:

```
+ 8.333333 KRW/sec
```

UNPAID_BREAK:

```
+ 0 KRW/sec
```

AFTER_SCHEDULE_UNPAID:

```
+ 0 KRW/sec
```

PAID_OVERTIME 1.5x:

```
+ 12.5 KRW/sec
```

---

## 14. 무료봉사 환산 가치

무료봉사 환산 가치는 실제 급여가 아니다.

계산:

```
Reference Value
= Base Regular Rate
* Unpaid After Hours Duration
```

UI에서는 반드시 실제 Earned와 구분한다.

예:

```
무료봉사 00:32:14
기준 급여 환산 가치 16,117원
```

이 금액은 실제 누적급여에 더하지 않는다.

---

## 15. Daily Override 우선순위

특정 날짜의 스케줄 계산 우선순위:

1. Daily Override
2. 기본 Weekly Schedule
3. 기본 Off Day

수당 정책 우선순위:

1. 해당 Overtime Session Snapshot
2. 해당 날짜 Override Policy
3. 기본 Overtime Policy

과거 Session은 현재 설정값을 다시 참조하지 않는다.

---

## 16. 새로고침 및 백그라운드

새로고침 또는 브라우저 백그라운드 상태에서도 돈을 tick별로 놓치지 않는다.

예:

10:00에 화면을 닫고 11:30에 다시 열었을 때:

```
11:30 Snapshot
= 11:30까지의 유효 Segment를 다시 계산
```

90분 동안 setInterval이 실행되지 않았어도 결과는 동일해야 한다.

---

## 17. 시스템 시간 변경

절대 이벤트는 timestamp로 기록한다.

현재 시각이 과거 이벤트보다 비정상적으로 뒤로 이동하는 경우:

- 음수 Duration을 만들지 않는다.
- 계산 오류 상태를 생성한다.
- 사용자 데이터는 자동 수정하지 않는다.

Clock 관련 비정상 케이스는 Unit Test 대상이다.

---

## 18. 월급 예시

설정:

```
월급 4,000,000원
월~금
09:00~18:00
12:00~13:00 무급 휴게
```

해당 월 예정 유급시간:

```
160 hours
```

Base Rate:

```
25,000 KRW/hour
416.666666 KRW/min
6.944444 KRW/sec
0.006944 KRW/ms
```

17:00까지 실제 정규 유급 근무가 7시간이라면:

```
175,000 KRW
```

18:00:

```
200,000 KRW
```

18:00 이후 기본 정규급여는 멈춘다.

18:30에 1.5x 추가근무를 시작하면 이후 Rate:

```
37,500 KRW/hour
```

---

## 19. 계산 Contract

다음은 절대 깨지면 안 된다.

- 동일 입력 + 동일 now = 동일 Snapshot
- 렌더링 FPS는 계산 결과에 영향 없음
- 새로고침은 계산 결과에 영향 없음
- 과거 Overtime Session은 현재 설정 변경으로 변하지 않음
- 무급 초과시간은 Earned에 포함되지 않음
- 유급 추가근무는 명시적으로 시작된 구간만 계산
- 정규 근무 종료 경계 시각부터 정규 Rate는 0
