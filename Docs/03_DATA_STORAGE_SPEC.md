# PayMeter Data and Storage Specification

## 1. 목표

PayMeter V1은 Local First로 동작한다.

사용자의 급여와 근무 데이터는 기본적으로 사용자 기기 밖으로 전송하지 않는다.

---

## 2. 저장소 구분

### localStorage

작고 자주 읽는 설정 데이터.

권장 저장 대상:

- appSettings
- salaryProfile
- weeklySchedule
- defaultOvertimePolicies
- displayPreferences
- schemaVersion pointer

### IndexedDB

이력성 데이터와 날짜별 이벤트.

저장 대상:

- Daily Override
- Overtime Session
- Clock Out Event
- Daily Summary Cache
- 설정 변경 이력
- Import 및 Migration metadata

---

## 3. 기본 원칙

- 급여 설정은 사용자가 명시적으로 저장해야 변경된다.
- 과거 급여 결과는 과거에 적용된 Snapshot으로 재현 가능해야 한다.
- 현재 설정을 수정했다고 과거 추가근무 계산이 바뀌면 안 된다.
- 모든 기록에는 stable ID를 사용한다.
- 날짜 문자열만으로 절대 시각을 표현하지 않는다.
- 절대 이벤트에는 timestamp를 사용한다.
- 로컬 날짜 판정에 필요한 timeZone 정보는 별도로 보존할 수 있게 한다.

---

## 4. SalaryProfile

개념 구조:

```ts
SalaryProfile {
  id
  name
  payBasis
  amountKrw
  currency
  periodAllocationMode
  manualHourlyOverrideKrw
  effectiveFrom
  createdAt
  updatedAt
}
```

설명:

- payBasis: ANNUAL | MONTHLY | WEEKLY | DAILY | HOURLY
- amountKrw: 정수 원 단위
- periodAllocationMode: 기본 true
- effectiveFrom: 급여 변경 이력 지원을 위한 기준일

V1에서는 단일 Active Profile만 노출해도 데이터 구조는 다중 이력으로 확장 가능하게 유지한다.

---

## 5. WeeklySchedule

개념 구조:

```ts
WeeklySchedule {
  timeZone
  weekStartsOn
  days: {
    monday: DaySchedule
    tuesday: DaySchedule
    ...
  }
}

DaySchedule {
  enabled
  startLocalTime
  endLocalTime
  breaks: BreakWindow[]
}

BreakWindow {
  startLocalTime
  endLocalTime
  paid
}
```

Local Time은 HH:mm 또는 분 단위 정규화 값으로 저장한다.

---

## 6. DailyOverride

개념 구조:

```ts
DailyOverride {
  id
  localDate
  enabled
  startLocalTime
  endLocalTime
  breaks
  note
  createdAt
  updatedAt
}
```

Override가 존재하면 해당 날짜의 기본 WeeklySchedule보다 우선한다.

---

## 7. OvertimePolicy

개념 구조:

```ts
OvertimePolicy {
  id
  name
  type
  multiplierBasisPoints
  customHourlyKrw
  fixedAllowanceKrw
  enabled
}
```

권장 multiplier 표현:

```
1.0x = 10000
1.5x = 15000
2.0x = 20000
```

부동소수점 `1.5`를 장기 저장 Contract로 사용하지 않는 것을 권장한다.

---

## 8. OvertimeSession

개념 구조:

```ts
OvertimeSession {
  id
  localDate
  startAtEpochMs
  endAtEpochMs
  timeZone
  policySnapshot
  baseRateSnapshot
  earnedMicroKrw
  note
  createdAt
  updatedAt
}
```

진행 중이면 endAtEpochMs는 null일 수 있다.

Session 시작 시 Snapshot을 고정한다.

---

## 9. DailyWorkState

정규 근무 종료 후 사용자의 상태를 보존하기 위한 최소 데이터가 필요하다.

개념:

```ts
DailyWorkState {
  localDate
  clockedOutAtEpochMs
  activeOvertimeSessionId
  unpaidAfterHoursSuppressed
  updatedAt
}
```

`clockedOutAtEpochMs`가 있으면 해당 시각 이후 무료봉사 카운터를 증가시키지 않는다.

---

## 10. Salary Change History

급여가 변경될 때 기존 Profile 값을 덮어쓰기만 하지 않는다.

최소한 다음 중 하나를 사용한다.

권장:

Effective Dated Salary Profile.

예:

```
2026-01-01 ~ 2026-06-30
Monthly 4,000,000

2026-07-01 ~
Monthly 4,300,000
```

이 구조가 있어야 올해 누적을 과거 급여 기준으로 정확히 계산할 수 있다.

초기 UI는 현재 급여만 편집해도 내부적으로 새 effective record를 만들도록 설계할 수 있다.

---

## 11. Schema Version

각 저장 루트에는 schemaVersion을 둔다.

예:

```
schemaVersion: 1
```

Migration 원칙:

- 읽기 전에 버전 확인
- 순차 Migration
- Migration 실패 시 원본 데이터 보존
- 사용자 동의 없이 초기화 금지
- 테스트 Fixture로 이전 버전 복원 검증

---

## 12. Import and Export

V1 후반 또는 V1.1에서 JSON Backup을 지원하는 것을 권장한다.

Export 대상:

- Settings
- Salary History
- Schedule
- Daily Overrides
- Overtime Sessions
- Daily State

민감한 정보가 포함될 수 있으므로 Export 전에 설명을 표시한다.

---

## 13. Reset

초기화는 범위를 분리한다.

- 화면 설정만 초기화
- 급여 및 근무 설정 초기화
- 이력만 삭제
- 전체 데이터 초기화

전체 초기화는 별도 확인 절차를 둔다.

---

## 14. 데이터 무결성 규칙

다음 데이터는 저장 전에 거부한다.

- 음수 급여
- NaN 또는 Infinity
- start >= end인 정상 근무시간
- 겹치는 휴게시간
- end < start인 Overtime Session
- 존재하지 않는 Policy Snapshot
- 유효하지 않은 Local Date
- 유효하지 않은 multiplier

야간 근무처럼 자정을 넘기는 일정은 별도 Contract를 정의하기 전까지 V1 기본 스케줄에서 금지하거나 명시적으로 Overnight Schedule로 처리한다.

암묵적으로 다음날로 넘겨 해석하지 않는다.

---

## 15. 캐시

Daily Summary는 성능을 위해 캐시할 수 있다.

하지만 캐시는 SSOT가 아니다.

원본 설정과 Session에서 재생성할 수 있어야 한다.

설정이나 과거 데이터가 수정되면 관련 캐시는 무효화한다.

---

## 16. Privacy

V1 기본 정책:

- 외부 서버 업로드 없음
- 분석 SDK 없음 또는 명시적 선택
- 급여 데이터 원격 전송 없음
- 브라우저 로컬 저장

향후 Cloud Sync가 추가되면 Local Only와 Cloud Sync를 명확히 구분한다.
