# PayMeter Data and Storage Specification

## 1. 목표

PayMeter V1은 Local First로 동작한다.

사용자의 급여와 근무 데이터는 기본적으로 사용자 기기 밖으로 전송하지 않는다.

---

## 2. 저장소 구분

### localStorage

작고 자주 읽는 설정 데이터.

- appSettings
- salaryProfile
- weeklySchedule
- defaultOvertimePolicies
- displayPreferences
- schemaVersion pointer

### IndexedDB

이력성 데이터와 날짜별 이벤트.

- Daily Override
- Overtime Session
- Activity Session
- Clock Out Event
- Daily Summary Cache
- 설정 변경 이력
- Import 및 Migration metadata

---

## 3. 기본 원칙

- 급여 설정은 사용자가 명시적으로 저장해야 변경된다.
- 과거 급여 결과는 과거에 적용된 Snapshot으로 재현 가능해야 한다.
- 현재 설정 변경이 과거 Session 금액을 바꾸면 안 된다.
- 모든 기록에는 stable ID를 사용한다.
- 절대 이벤트에는 timestamp를 사용한다.
- timeZone 정보를 보존할 수 있어야 한다.
- Activity 기록은 급여 기록과 분리한다.

---

## 4. SalaryProfile

```ts
SalaryProfile {
  id
  name
  payBasis
  accrualMode
  amountKrw
  currency
  effectiveFrom
  createdAt
  updatedAt
}
```

- payBasis: ANNUAL | MONTHLY | WEEKLY | DAILY | HOURLY
- accrualMode: FIXED_PERIOD | TIME_BASED
- amountKrw: 정수 KRW

기본 매핑:

- ANNUAL, MONTHLY, WEEKLY -> FIXED_PERIOD
- HOURLY -> TIME_BASED

---

## 5. WeeklySchedule

```ts
WeeklySchedule {
  timeZone
  weekStartsOn
  days
}

DaySchedule {
  enabled
  startLocalTime
  endLocalTime
  breaks
}

BreakWindow {
  startLocalTime
  endLocalTime
  paid
}
```

---

## 6. DailyOverride

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

Override가 기본 WeeklySchedule보다 우선한다.

---

## 7. ActivitySession

사용자가 직접 기록한 업무 및 루팡 Timer의 원본 데이터다.

```ts
ActivitySession {
  id
  localDate
  type
  startAtEpochMs
  endAtEpochMs
  timeZone
  createdAt
  updatedAt
}
```

type:

- WORKING
- LOAFING

진행 중 Session은 endAtEpochMs가 null일 수 있다.

전환 시 이전 Session을 종료하고 새 Session을 생성한다.

급여 엔진은 ActivitySession을 근거로 정규 급여를 삭감하지 않는다.

---

## 8. OvertimePolicy

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

예:

```
1.5x = 15000
2.0x = 20000
```

---

## 9. OvertimeSession

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

Session 시작 시 정책 Snapshot을 고정한다.

---

## 10. DailyWorkState

```ts
DailyWorkState {
  localDate
  clockedOutAtEpochMs
  activeOvertimeSessionId
  activeActivitySessionId
  finalizedRegularPayMicroKrw
  unpaidAfterHoursSuppressed
  updatedAt
}
```

FIXED_PERIOD 사용자가 퇴근 처리하면 `finalizedRegularPayMicroKrw`에 해당 날짜의 배정 정규 일당을 확정할 수 있다.

`clockedOutAtEpochMs` 이후에는 무료봉사 및 Activity Timer가 증가하지 않는다.

---

## 11. Salary Change History

급여 변경 시 기존 Profile을 덮어쓰기만 하지 않는다.

Effective Dated Salary Profile을 사용한다.

예:

```
2026-01-01 ~ 2026-06-30
Monthly 4,000,000

2026-07-01 ~
Monthly 4,300,000
```

---

## 12. Daily Summary Cache

성능용 캐시는 다음 파생값을 포함할 수 있다.

```ts
DailySummary {
  localDate
  finalizedRegularPayMicroKrw
  overtimePayMicroKrw
  workingDurationMs
  loafingDurationMs
  unpaidAfterHoursDurationMs
  clockedOutAtEpochMs
  sourceRevision
}
```

이 캐시는 SSOT가 아니다.

원본 Session과 설정에서 재생성 가능해야 한다.

---

## 13. Schema Version

각 저장 루트에는 schemaVersion을 둔다.

Migration 원칙:

- 읽기 전에 버전 확인
- 순차 Migration
- 실패 시 원본 보존
- 사용자 동의 없이 초기화 금지
- 이전 버전 Fixture 테스트

---

## 14. Import and Export

Export 대상:

- Settings
- Salary History
- Schedule
- Daily Overrides
- Overtime Sessions
- Activity Sessions
- Daily State

---

## 15. Reset

범위를 분리한다.

- 화면 설정만 초기화
- 급여 및 근무 설정 초기화
- 활동 기록만 삭제
- 근무 이력만 삭제
- 전체 데이터 초기화

전체 초기화는 별도 확인 절차를 둔다.

---

## 16. 데이터 무결성

다음 데이터는 거부한다.

- 음수 급여
- NaN 또는 Infinity
- invalid Schedule
- 겹치는 Break
- end < start Session
- 동일 시각에 겹치는 ActivitySession
- 존재하지 않는 Policy Snapshot
- invalid Local Date
- invalid multiplier

자정을 넘기는 Schedule은 별도 Contract 전까지 암묵적으로 허용하지 않는다.

---

## 17. Privacy

V1 기본:

- 외부 서버 업로드 없음
- 급여 데이터 원격 전송 없음
- 활동 기록 원격 전송 없음
- 키보드, 마우스, 앱 사용 감시 없음
- 사용자가 직접 Activity 상태를 전환
- 브라우저 로컬 저장

향후 Cloud Sync가 추가되면 Local Only와 명확히 구분한다.

## 18. App Time and Transition Settings

localStorage의 appSettings에는 최소 다음 설정을 보존한다.

```ts
AppSettings {
  deviceTimeZoneMode: "DEVICE_LOCAL"
  postWorkTransitionMode:
    | "MANUAL_OVERTIME"
    | "AUTO_OVERTIME"
  defaultOvertimePolicyId: string | null
}
```

기본값:

```
deviceTimeZoneMode = DEVICE_LOCAL
postWorkTransitionMode = MANUAL_OVERTIME
```

AUTO_OVERTIME을 선택할 때는 유효한 defaultOvertimePolicyId가 필요하다.

정책이 삭제되거나 손상된 경우 자동으로 유급시간을 생성하지 않고 무료봉사 상태로 Fail Safe한다.

## 19. No Tick Persistence

다음 값은 매 UI Tick마다 저장하지 않는다.

- 현재 표시 금액
- 현재 표시 Timer 숫자
- ms 단위 경과값

대신 다음 원본을 저장한다.

- Schedule
- Clock Out Event
- Activity Session start/end
- Overtime Session start/end
- Daily Override
- Policy Snapshot

현재 값은 디바이스 시각에서 재계산한다.

이 방식으로 페이지가 닫혀 있던 시간도 정확히 복원한다.

## 20. Reconstructed Automatic Overtime

AUTO_OVERTIME에서 앱이 정규 종료 시점에 실행 중이지 않았던 경우 다음 실행 시 Scheduled End를 시작 시각으로 하는 Overtime Session을 재구성할 수 있다.

재구성 Session은 중복 생성되지 않아야 한다.

Clock Out 기록이 Scheduled End 이전 또는 이후에 존재하면 Clock Out 이후 구간을 자동 Overtime으로 생성하지 않는다.
