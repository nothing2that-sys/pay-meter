# PayMeter Test and Acceptance Plan

## 1. 목표

PayMeter 테스트의 최우선 목표는 급여 계산이 화면 상태와 관계없이 동일한 결과를 내는지 확인하는 것이다.

---

## 2. 테스트 계층

### Unit

대상:

- Money
- Rate
- Schedule
- Work State
- Segment
- Period Allocation
- Overtime
- Date Boundary

### Integration

대상:

- Settings -> Engine
- Storage -> Restore -> Engine
- Overtime Session -> Dashboard
- Daily Override -> Schedule
- Salary Revision -> Aggregation

### E2E

대상:

- First Run
- Dashboard
- 정규 퇴근 경계
- 무료봉사
- 추가근무
- 퇴근
- 새로고침 복원
- PWA Smoke

---

## 3. 기준 Fixture A

설정:

```
Pay Basis: Monthly
Monthly Pay: 4,000,000 KRW
Schedule: Monday-Friday
Work: 09:00-18:00
Break: 12:00-13:00
Break Paid: false
```

테스트 월의 예정 유급시간을 Fixture에서 고정한다.

예:

```
160 hours
```

기준 Rate:

```
25,000 KRW/hour
```

---

## 4. 필수 시각 경계

### 출근

```
08:59:59.999 BEFORE_WORK
09:00:00.000 REGULAR_WORK
```

### 휴게 시작

```
11:59:59.999 REGULAR_WORK
12:00:00.000 UNPAID_BREAK
```

### 휴게 종료

```
12:59:59.999 UNPAID_BREAK
13:00:00.000 REGULAR_WORK
```

### 퇴근

```
17:59:59.999 REGULAR_WORK
18:00:00.000 AFTER_SCHEDULE_UNPAID
```

18:00 이후 정규급여는 증가하면 안 된다.

---

## 5. Tick Independence

같은 `now`에 대해 다음 렌더링 패턴이 모두 같은 금액을 반환해야 한다.

- 16ms refresh
- 50ms refresh
- 100ms refresh
- 1000ms refresh
- 중간 refresh 없음

---

## 6. Background Restore

절차:

1. 10:00 Snapshot 기록
2. UI update 중단
3. FakeClock을 11:30으로 이동
4. Snapshot 재요청

기대:

90분에 해당하는 유효 유급시간이 한 번에 반영된다.

---

## 7. Free Work

설정:

```
End 18:00
```

18:30 기대:

```
state = AFTER_SCHEDULE_UNPAID
regularEarned = 18:00과 동일
currentRate = 0
unpaidAfterHoursDuration = 30m
```

무료봉사 환산 가치는 증가하지만 Earned에는 더하지 않는다.

---

## 8. Clock Out

18:25에 Clock Out.

18:40 Snapshot 기대:

```
state = CLOCKED_OUT
unpaidAfterHoursDuration = 25m
```

18:25 이후 무료봉사 시간은 증가하지 않는다.

---

## 9. Paid Overtime

18:30 Overtime Start.

Policy:

```
1.5x
```

Base:

```
25,000/hour
```

Overtime:

```
37,500/hour
```

19:30:

```
overtimeDuration = 1h
overtimeEarned = 37,500
```

18:00~18:30은 무급 초과시간으로 유지한다.

---

## 10. Policy Snapshot

절차:

1. 1.5x로 Overtime Session 완료
2. 기본 정책을 2.0x로 변경
3. 과거 날짜 다시 계산

기대:

기존 Session은 1.5x 결과 유지.

---

## 11. Daily Override

기본:

```
09:00~18:00
```

오늘만:

```
09:00~20:00
```

기대:

오늘 18:30은 REGULAR_WORK 또는 Override에 정의된 정책에 따른 상태.

다음 정상 근무일에는 다시 18:00 종료.

---

## 12. Reload Persistence

각 상태에서 새로고침 테스트:

- BEFORE_WORK
- REGULAR_WORK
- BREAK
- AFTER_SCHEDULE_UNPAID
- PAID_OVERTIME
- CLOCKED_OUT

Reload 전후 결과가 동일해야 한다.

---

## 13. Storage Corruption

테스트:

- JSON Parse 실패
- schemaVersion unknown
- 음수 Salary
- invalid time
- orphan overtime policy
- end before start

기대:

- 앱 전체 Crash 금지
- 손상 데이터를 조용히 정상 데이터로 간주하지 않음
- 사용자에게 복구 가능한 오류 제공
- 자동 전체 초기화 금지

---

## 14. Calendar Boundaries

필수:

- 날짜 23:59:59 -> 00:00:00
- 월말
- 연말
- 주 시작
- 윤년 날짜
- Time Zone offset 변화 가능 환경

V1이 Overnight Schedule을 지원하지 않으면 자정 넘김 Schedule 입력은 Validation Error로 검증한다.

---

## 15. Aggregation

확인:

```
Today <= Week
Today <= Month
Month components sum to Month
Year components sum to Year
```

단, Period Allocation 정의 때문에 단순 Rate 곱셈과 정확히 같은지 여부는 해당 기간 Schedule 기준으로 검증한다.

---

## 16. UI Acceptance

Dashboard:

- 현재 상태가 명확함
- 현재 급여가 가장 눈에 띔
- 현재 Rate 확인 가능
- 퇴근까지 시간 확인 가능
- 무료봉사와 실제 급여가 혼동되지 않음
- 추가수당이 별도 표시됨

Mobile:

- 주요 Action Touch 가능
- 숫자 잘림 없음
- 세로 화면에서 핵심 정보가 첫 화면에 최대한 노출

Desktop:

- 과도하게 늘어진 Layout 금지
- Dashboard가 적절한 최대 폭 사용

---

## 17. Performance

목표:

- 일반 Dashboard Snapshot은 체감 지연 없음
- UI update 때문에 메인 Thread가 지속적으로 과부하되지 않음
- background 복귀 시 긴 catch-up animation 없이 즉시 실제값 표시

---

## 18. PWA Acceptance

- 설치 가능
- Offline App Shell
- Offline에서 Settings 읽기
- Offline에서 Dashboard 계산
- 새 Version 설치 후 사용자 데이터 유지

---

## 19. Release Gate

Release Candidate는 최소 다음을 만족해야 한다.

- Unit Test PASS
- Integration Test PASS
- E2E Core Flow PASS
- Production Build PASS
- 저장 복원 PASS
- 새로고침 PASS
- 18:00 경계 PASS
- 무료봉사 PASS
- Overtime PASS
- Mobile Smoke PASS
- Desktop Smoke PASS
- 문서와 구현 일치

계산 관련 Known Critical Defect가 있으면 Release하지 않는다.
