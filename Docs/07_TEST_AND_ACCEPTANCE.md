# PayMeter Test and Acceptance Plan

## 1. 목표

급여 계산과 모든 타이머가 화면 refresh와 독립적으로 재현 가능해야 한다.

---

## 2. 테스트 계층

Unit:

- Money
- Rate
- AccrualMode
- Schedule
- Pay State
- Activity State
- Activity Session
- Period Allocation
- Daily Settlement
- Overtime
- Date Boundary

Integration:

- Settings -> Engine
- Storage -> Restore -> Engine
- Activity Session -> Dashboard
- Clock Out -> Daily Settlement
- Overtime -> Dashboard
- Daily Override -> Schedule
- Salary Revision -> Aggregation

E2E:

- First Run
- Realtime Dashboard
- 업무/루팡 전환
- 정규 종료
- 무료봉사
- 추가근무
- 퇴근
- 새로고침 복원
- PWA Smoke

---

## 3. 기준 Fixture A

```
Pay Basis: Monthly
Accrual Mode: FIXED_PERIOD
Monthly Pay: 4,000,000 KRW
Working Days: 20
Schedule: 09:00-18:00
Break: 12:00-13:00 unpaid
```

기대:

```
Allocated Daily Pay = 200,000
Visualization Rate = 25,000/hour
```

---

## 4. 시각 경계

```
08:59:59.999 BEFORE_WORK
09:00:00.000 REGULAR_WORK

11:59:59.999 REGULAR_WORK
12:00:00.000 UNPAID_BREAK

12:59:59.999 UNPAID_BREAK
13:00:00.000 REGULAR_WORK

17:59:59.999 REGULAR_WORK
18:00:00.000 AFTER_SCHEDULE_UNPAID
```

---

## 5. Tick Independence

동일 now에서 다음 refresh 주기는 동일 결과.

- 16ms
- 50ms
- 100ms
- 1000ms
- 중간 refresh 없음

Pay와 Timer 모두 적용.

---

## 6. Activity Timer

절차:

```
09:00 WORKING
10:30 LOAFING
11:00 WORKING
12:00 BREAK
13:00 WORKING
```

11:00 기대:

```
workingDuration = 1h30m
loafingDuration = 30m
loafingRatio = 25%
```

12:00~13:00은 Activity 분모에서 제외.

FIXED_PERIOD의 실시간 급여 진행은 LOAFING 상태에서도 계속 증가해야 한다.

---

## 7. Activity Reload

10:45 LOAFING 진행 중 새로고침.

11:00 복원 기대:

- active state = LOAFING
- Session start = 10:45 유지
- duration = 15m
- 중복 Session 생성 없음

---

## 8. FIXED_PERIOD 조기퇴근

17:00에 Clock Out.

퇴근 직전 실시간 진행값이 200,000보다 작더라도 기대:

```
finalizedRegularPayToday = 200,000
```

업무 및 루팡 Session은 17:00에서 종료.

기간 누적에는 200,000 반영.

---

## 9. TIME_BASED 조기퇴근

동일 Schedule, Hourly mode에서 17:00 퇴근.

기대:

실제 유급시간까지만 정규급여 확정.

예정 일당으로 보정하면 안 된다.

---

## 10. Free Work

18:30 기대:

```
payState = AFTER_SCHEDULE_UNPAID
currentRate = 0
unpaidAfterHoursDuration = 30m
```

정규 급여 진행은 18:00 이후 증가하지 않는다.

---

## 11. Clock Out After Schedule

18:25 퇴근.

18:40 기대:

```
state = CLOCKED_OUT
unpaidAfterHoursDuration = 25m
```

FIXED_PERIOD 정규 일당은 배정 일당으로 확정.

---

## 12. Paid Overtime

18:30 Overtime Start.

```
Base = 25,000/hour
Policy = 1.5x
Overtime = 37,500/hour
```

19:30:

```
overtimeDuration = 1h
overtimeEarned = 37,500
```

18:00~18:30은 무료봉사로 유지.

---

## 13. Policy Snapshot

1. 1.5x Session 완료
2. 기본 정책 2.0x 변경
3. 과거 재계산

기존 Session은 1.5x 유지.

---

## 14. Daily Override

기본 09:00~18:00.

오늘만 09:00~20:00.

18:30은 기본 무료봉사 상태가 되어서는 안 된다.

---

## 15. Reload Persistence

다음 상태에서 새로고침 전후 동일:

- REGULAR + WORKING
- REGULAR + LOAFING
- BREAK
- AFTER_SCHEDULE_UNPAID
- PAID_OVERTIME
- CLOCKED_OUT

---

## 16. Storage Corruption

테스트:

- invalid JSON
- unknown schemaVersion
- negative Salary
- invalid time
- overlapping ActivitySession
- orphan policy
- end before start

전체 자동 초기화 금지.

---

## 17. Calendar Boundaries

- 날짜 변경
- 월말
- 연말
- 주 시작
- 윤년
- Time Zone offset

---

## 18. Aggregation

FIXED_PERIOD:

완료 근무일의 finalizedRegularPay 합계가 Week, Month, Year 정규 누적의 기준이다.

현재 진행 중 오늘은 별도 Realtime Progress로 표시 가능.

TIME_BASED:

실제 유급 Segment 합계가 기준.

---

## 19. UI Acceptance

- 현재 급여가 가장 눈에 띔
- 근무 타이머가 실시간으로 보임
- 업무/루팡 상태 전환이 한 번의 Tap으로 가능
- 업무/루팡 시간 확인 가능
- 퇴근 후 확정 일당을 명확히 표시
- 무료봉사와 실제 급여가 혼동되지 않음
- 추가수당 별도 표시
- 루팡 환산 가치는 실제 급여 차감처럼 보이지 않음

---

## 20. Release Gate

- Unit PASS
- Integration PASS
- E2E Core PASS
- Production Build PASS
- Refresh Independence PASS
- Activity Timer PASS
- FIXED_PERIOD Settlement PASS
- TIME_BASED Settlement PASS
- 18:00 Boundary PASS
- Free Work PASS
- Overtime PASS
- Mobile Smoke PASS
- Desktop Smoke PASS
- 문서와 구현 일치

## 21. Device Clock Resume

Fixture:

```
Schedule 09:00~18:00
Mode MANUAL_OVERTIME
```

절차:

1. 17:50 Snapshot
2. UI Timer 실행 중단
3. FakeClock 19:00으로 이동
4. visibility/focus 복귀

기대:

```
Regular stops at 18:00
Pay State = AFTER_SCHEDULE_UNPAID
Free Work = 1h
```

중간 Tick 개수는 결과에 영향 없음.

## 22. AUTO_OVERTIME Resume

설정:

```
Schedule 09:00~18:00
Mode AUTO_OVERTIME
Policy 1.5x
Base 25,000/hour
```

17:50에서 19:00으로 바로 이동.

기대:

```
Overtime Start = 18:00
Overtime Duration = 1h
Overtime Earned = 37,500
```

앱이 18:00에 실행 중이었는지 여부는 결과에 영향 없음.

## 23. Missing Auto Policy

AUTO_OVERTIME인데 default policy가 없거나 invalid.

18:00 이후 기대:

```
Pay State = AFTER_SCHEDULE_UNPAID
Current Rate = 0
```

유급 추가근무를 임의 생성하면 실패.

## 24. Device Clock Change

현재 진행 Session 중 디바이스 시간을 과거로 변경하는 Fixture를 둔다.

기대:

- 음수 Duration 없음
- NaN 없음
- 확정 과거 급여 자동 감소 없음
- 현재 Snapshot이 안전한 상태 유지

## 25. Reconstructed Session Deduplication

AUTO_OVERTIME 상태에서:

1. 19:00 재진입
2. Session 재구성
3. 새로고침
4. 다시 19:00 Snapshot

기대:

동일 18:00 시작 Overtime Session이 중복 생성되지 않는다.
