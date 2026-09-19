# PayMeter Pay and Time Engine Specification

## 1. 목적

이 문서는 PayMeter의 급여 계산, 근무 타이머, 활동 타이머 결과를 결정하는 정본 규칙을 정의한다.

동일한 입력과 동일한 시각에는 화면 갱신 주기와 관계없이 동일한 결과가 나와야 한다.

---

## 2. 두 개의 독립 축

PayMeter는 상태를 하나로 합치지 않는다.

### Pay State

급여와 근무 일정에 영향을 주는 상태.

- BEFORE_WORK
- REGULAR_WORK
- PAID_BREAK
- UNPAID_BREAK
- AFTER_SCHEDULE_UNPAID
- PAID_OVERTIME
- CLOCKED_OUT
- OFF_DAY

### Activity State

사용자가 직접 기록하는 활동 상태.

- WORKING
- LOAFING

향후 MEETING, LEARNING, PERSONAL, CUSTOM으로 확장 가능하다.

중요:

Activity State는 기본적으로 Pay State를 변경하지 않는다.

월급쟁이가 LOAFING 상태라고 해서 계약 급여가 멈추지 않는다.

---

## 3. 시간 Segment

예:

```
09:00 ~ 10:20  REGULAR_WORK + WORKING
10:20 ~ 10:45  REGULAR_WORK + LOAFING
10:45 ~ 12:00  REGULAR_WORK + WORKING
12:00 ~ 13:00  UNPAID_BREAK
13:00 ~ 18:00  REGULAR_WORK + WORKING
18:00 ~ 18:25  AFTER_SCHEDULE_UNPAID
18:25 ~ 20:10  PAID_OVERTIME
20:10          CLOCKED_OUT
```

급여와 활동 통계는 같은 시간축을 사용하지만 서로 다른 의미를 가진다.

---

## 4. 급여 누적 방식

### FIXED_PERIOD

기본 대상:

- ANNUAL
- MONTHLY
- WEEKLY

정규 근무일에는 하루에 배정된 계약 급여가 존재한다.

근무 중에는 사용자가 체감할 수 있도록 일당을 예정 유급시간에 배분하여 실시간 진행 금액을 보여준다.

퇴근 완료 시 해당 날짜의 정규 급여는 배정 일당 100%로 확정한다.

즉 실시간 진행 금액은 진행 표시이고, 퇴근 후 확정 금액은 계약상 일일 배분이다.

### TIME_BASED

기본 대상:

- HOURLY

실제 유급 Segment의 시간만큼 정규 급여가 확정된다.

일급은 사용자 정책에 따라 FIXED_PERIOD 또는 TIME_BASED로 확장 가능하다.

---

## 5. Period Allocation

예:

월급 4,000,000원이고 해당 월의 예정 정규 근무일이 20일이면:

```
Allocated Daily Pay = 4,000,000 / 20
                    = 200,000 KRW
```

해당 날짜의 예정 유급시간이 8시간이면 실시간 시각화 Rate는:

```
Visualization Rate = 200,000 / 8h
                   = 25,000 KRW/hour
```

이 Rate는 법률상 통상임금을 뜻하지 않는다.

PayMeter의 실시간 시각화 기준이다.

---

## 6. FIXED_PERIOD 퇴근 확정 규칙

예정 일당:

```
200,000 KRW
```

17:00 시점 실시간 진행 금액:

```
175,000 KRW
```

사용자가 17:00에 퇴근 처리하면:

```
Realtime Progress = 종료
Final Regular Daily Pay = 200,000 KRW
```

따라서 오늘 누적과 주, 월, 연 누적에는 200,000원이 반영된다.

조기퇴근 시간 자체는 별도 Attendance 통계로 보존할 수 있다.

이 규칙은 FIXED_PERIOD에만 적용한다.

---

## 7. TIME_BASED 퇴근 확정 규칙

TIME_BASED에서는 퇴근 처리 시점까지 실제 유급 Segment를 합산한 값이 확정 금액이다.

조기퇴근으로 예정 시간이 줄었다면 그만큼 정규 급여도 줄어든다.

---

## 8. Work State

### BEFORE_WORK

급여 증가 0.

### REGULAR_WORK

FIXED_PERIOD:

실시간 진행 금액은 Visualization Rate로 증가.

TIME_BASED:

실제 Earned가 Base Rate로 증가.

### PAID_BREAK

설정에 따라 유급시간으로 포함.

### UNPAID_BREAK

실시간 증가 0.

### AFTER_SCHEDULE_UNPAID

정규 근무 종료 후 유급 추가근무가 시작되지 않았고 퇴근 처리도 하지 않은 상태.

UI 기본:

```
무료봉사 중
```

정규 급여 진행 증가 0.

별도 통계:

- unpaidAfterHoursDuration
- unpaidAfterHoursReferenceValue

### PAID_OVERTIME

설정된 Overtime Policy에 따라 추가급여 증가.

### CLOCKED_OUT

정규급여 및 활동 타이머 종료.

FIXED_PERIOD는 해당 날짜 정규 배정 일당을 확정한다.

TIME_BASED는 실제 유급시간을 확정한다.

### OFF_DAY

급여 증가 0.

---

## 9. Activity Timer

Activity Session은 사용자의 명시적 입력으로 시작 및 종료한다.

예:

```
09:00 WORKING start
10:20 LOAFING start
10:45 WORKING return
```

각 전환은 이전 Session을 종료하고 새 Session을 시작한다.

계산:

```
workingDuration
= Sum(WORKING session durations)

loafingDuration
= Sum(LOAFING session durations)
```

루팡률 기본 정의:

```
loafingRatio
= loafingDuration
  / (workingDuration + loafingDuration)
```

정규 휴게시간은 분모에서 제외한다.

루팡 환산 가치:

```
loafingReferenceValue
= Visualization Base Rate
  * loafingDuration
```

이는 급여에서 차감하지 않는다.

---

## 10. Activity State 전이

기본:

```
WORKING
  -> LOAFING

LOAFING
  -> WORKING
```

정규 무급 휴게가 시작되면 Activity Session은 일시 종료하거나 BREAK로 분리한다.

휴게 종료 후 기본 복귀 상태는 WORKING으로 한다.

퇴근 시 진행 중 Activity Session은 종료한다.

무료봉사 구간에서 루팡 Activity를 기록하지 않는 것을 V1 기본으로 한다.

---

## 11. 정규 근무 종료

예정 근무:

```
09:00 ~ 18:00
```

18:00:00부터 정규 실시간 진행 Rate는 0.

다음 중 하나가 발생할 때까지 AFTER_SCHEDULE_UNPAID:

- 유급 추가근무 시작
- 퇴근 처리
- Daily Override로 정규 종료 변경

FIXED_PERIOD 사용자가 18:00 이후 18:30에 퇴근하더라도 정규 일당은 동일하다.

18:00~18:30은 무료봉사 시간으로 별도 기록한다.

---

## 12. 추가수당 정책

OvertimePolicy:

- MULTIPLIER
- CUSTOM_HOURLY
- FIXED
- HOURLY_PLUS_FIXED

### MULTIPLIER

```
Overtime Rate = Base Visualization Rate * Multiplier
```

법적 자동판정이 아니라 사용자 지정 정책이다.

---

## 13. Overtime Session

필수 개념:

```
id
date
startAt
endAt
policyId
rateSnapshot
fixedAllowanceSnapshot
```

과거 결과가 현재 설정 변경으로 바뀌지 않도록 Session 시작 시 Snapshot을 저장한다.

---

## 14. 금액 정밀도

금액을 UI tick마다 더하지 않는다.

권장:

```
1 KRW = 1,000,000 micro-won
```

Segment 또는 기간 계산 결과를 timestamp 차이와 Rate로 계산하고 표시 단계에서 포맷한다.

---

## 15. Dashboard Snapshot

```
PaySnapshot {
  now
  payState
  activityState

  realtimeProgressToday
  finalizedRegularPayToday
  overtimeEarnedToday
  totalRecognizedToday

  earnedWeek
  earnedMonth
  earnedYear

  currentRate
  elapsedScheduledTime
  remainingScheduledTime

  workingDuration
  loafingDuration
  loafingRatio
  loafingReferenceValue

  unpaidAfterHoursDuration
  unpaidAfterHoursReferenceValue
}
```

### realtimeProgressToday

현재 시점의 타이머형 급여 진행 표시.

### finalizedRegularPayToday

퇴근 완료 후 확정된 정규급여.

### totalRecognizedToday

확정 정규급여 + 추가수당.

퇴근 전에는 UI에서 예상 또는 진행값으로 표시할 수 있다.

---

## 16. 기간 누적

Today, Week, Month, Year는 로컬 Calendar 기준이다.

FIXED_PERIOD에서는 퇴근 완료된 근무일의 배정 일당을 정규 누적에 사용한다.

현재 진행 중인 오늘은 Dashboard에서 별도 실시간 진행값으로 합성해 보여줄 수 있다.

---

## 17. Timer Independence

화면에서는 ms 단위로 움직여도 계산은 timestamp 기반이다.

다음 refresh 주기가 모두 같은 now에서 같은 결과를 내야 한다.

- 16ms
- 50ms
- 100ms
- 1000ms
- background 후 복귀

---

## 18. 무료봉사 환산 가치

```
unpaidAfterHoursReferenceValue
= Visualization Base Rate
* unpaidAfterHoursDuration
```

실제 급여에는 더하지 않는다.

---

## 19. 예시

설정:

```
월급 4,000,000원
근무일 20일
09:00~18:00
12:00~13:00 무급 휴게
```

배정 일당:

```
200,000원
```

시각화 Rate:

```
25,000원/hour
416.666666원/min
6.944444원/sec
0.006944원/ms
```

오늘:

```
09:00~10:30 업무
10:30~11:00 루팡
11:00~12:00 업무
12:00~13:00 휴게
13:00~17:00 업무
17:00 퇴근
```

17:00 직전 실시간 진행값은 예정 유급시간 기준 일부 값이지만 퇴근 처리 후:

```
Final Regular Daily Pay = 200,000원
Loafing Duration = 30m
Loafing Reference Value = 12,500원
```

루팡 환산 12,500원은 급여에서 차감하지 않는다.

---

## 20. 계산 Contract

- Pay State와 Activity State는 분리한다.
- 루팡 상태는 FIXED_PERIOD 급여 진행을 중지하지 않는다.
- FIXED_PERIOD는 퇴근 처리 시 예정 일당 100%를 정규급여로 확정한다.
- TIME_BASED는 실제 유급시간만 확정한다.
- 정규 종료 이후 추가수당 미등록 시간은 무료봉사다.
- 과거 Overtime Session은 현재 설정 변경으로 변하지 않는다.
- UI refresh 주기는 계산 결과에 영향을 주지 않는다.
- 모든 타이머는 timestamp에서 재계산 가능해야 한다.
