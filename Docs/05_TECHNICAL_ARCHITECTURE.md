# PayMeter Technical Architecture

## 1. 권장 기술 구성

초기 구현 권장:

- React
- TypeScript
- Vite
- PWA
- Vitest
- Playwright
- IndexedDB
- CSS Variables 기반 Design Token

라이브러리의 정확한 버전은 Phase P0에서 Stable Version을 확인한 뒤 고정한다.

---

## 2. 아키텍처 목표

PayMeter는 UI보다 계산 엔진을 독립적으로 유지한다.

구조:

```
UI Surfaces
  |-- Money Timer
  |-- Full Dashboard
  |-- History
  |-- Settings
  |
Application Services
  |
Domain
  |-- Money
  |-- Pay Engine
  |-- Schedule Engine
  |-- Pay State Engine
  |-- Activity State Engine
  |-- Overtime Engine
  |-- Period Aggregator
  |
Repositories
  |-- Settings Repository
  |-- Session Repository
  |-- History Repository
  |
Infrastructure
  |-- Device Clock
  |-- Time Zone Adapter
  |-- localStorage
  |-- IndexedDB
  |-- Migration
```

Domain Layer는 React에 의존하지 않는다.

---

## 3. 권장 디렉터리

```
src/
  app/
    App.tsx
    routes/

  domain/
    money/
    pay/
    schedule/
    pay-state/
    activity/
    overtime/
    aggregation/
    types/

  application/
    timer/
    dashboard/
    settings/
    activity/
    overtime/
    history/

  infrastructure/
    clock/
      DeviceClock.ts
      FakeClock.ts
    timezone/
    storage/
      local-storage/
      indexed-db/
    migration/

  features/
    money-timer/
    dashboard/
    onboarding/
    settings/
    activity/
    overtime/
    history/

  components/
    common/
    layout/

  styles/
    tokens.css
    global.css

  tests/
    fixtures/
    helpers/
```

---

## 4. Domain Snapshot API

UI가 직접 급여 계산식을 만들지 않는다.

대표 API:

```ts
buildPaySnapshot(input): PaySnapshot
```

입력:

- nowEpochMs
- timeZone
- Salary Profile
- Weekly Schedule
- Daily Override
- App Settings
- Activity Sessions
- Overtime Sessions
- Daily Work State

출력 예:

```ts
PaySnapshot {
  now
  payState
  activityState

  realtimeProgressToday
  finalizedRegularPayToday
  overtimeEarnedToday
  totalRecognizedToday

  currentRate
  elapsedScheduledTime
  remainingScheduledTime

  workingDuration
  loafingDuration
  loafingRatio
  loafingReferenceValue

  unpaidAfterHoursDuration
  unpaidAfterHoursReferenceValue

  earnedWeek
  earnedMonth
  earnedYear
}
```

Money Timer와 Full Dashboard는 동일한 Snapshot을 다른 밀도로 표현한다.

---

## 5. Device Clock

Production 현재 시각 SSOT는 사용자의 디바이스 Wall Clock이다.

```ts
interface Clock {
  nowEpochMs(): number
  localTimeZone(): string
}
```

Production:

```
DeviceClock
```

Test:

```
FakeClock
```

중요:

- 브라우저 실행시간을 Clock으로 사용하지 않는다.
- setInterval 호출 횟수를 Clock으로 사용하지 않는다.
- requestAnimationFrame 누적시간을 급여 계산 SSOT로 사용하지 않는다.

### Recalculation Triggers

다음 시점에 Snapshot을 즉시 재계산한다.

- Initial Load
- 일반 UI Refresh
- visibilitychange -> visible
- window focus
- pageshow
- PWA 재진입

Background에서 Timer가 throttle되더라도 복귀 후 현재 디바이스 시각으로 정확한 결과를 얻어야 한다.

---

## 6. Local Schedule and Time Zone

근무 일정은 Local Civil Time 기준이다.

예:

```
09:00 ~ 18:00
```

현재 날짜와 디바이스 Local Time Zone을 기준으로 실제 경계 timestamp를 만든다.

페이지를 10:00에 열었다고 해서 8시간 후인 18:00 또는 19:00을 추정하는 방식은 사용하지 않는다.

Schedule 자체의 18:00이 경계다.

절대 이벤트는 epoch timestamp와 필요 시 timeZone Snapshot을 함께 보존한다.

---

## 7. UI Refresh

Money Timer는 시각적으로 부드럽게 갱신할 수 있다.

권장:

- 가시 상태: requestAnimationFrame 또는 제한된 refresh loop
- background: 브라우저 throttle 허용
- foreground 복귀: 즉시 Snapshot 재계산

금지:

```
displayedMoney += ratePerFrame
```

허용 개념:

```
displayedMoney = buildPaySnapshot(deviceClock.now()).currentValue
```

Animation Layer는 계산 결과를 꾸밀 뿐 계산을 소유하지 않는다.

---

## 8. Post-Work Transition Engine

설정:

```ts
type PostWorkTransitionMode =
  | "MANUAL_OVERTIME"
  | "AUTO_OVERTIME"
```

### MANUAL_OVERTIME

Scheduled End 이후:

```
REGULAR_WORK
-> AFTER_SCHEDULE_UNPAID
```

무료봉사 시간과 환산 가치를 계산한다.

사용자가 추가근무를 시작해야 PAID_OVERTIME으로 전환한다.

### AUTO_OVERTIME

Scheduled End 이후:

```
REGULAR_WORK
-> PAID_OVERTIME
```

자동 Overtime Session은 Scheduled End를 시작시각으로 사용하고 지정된 기본 Policy Snapshot을 적용한다.

Policy가 invalid하면:

```
AFTER_SCHEDULE_UNPAID
```

로 Fail Safe한다.

---

## 9. Reconstructed Automatic Overtime

웹이 Scheduled End 시각에 실행 중이라는 보장이 없다.

따라서 AUTO_OVERTIME은 이벤트 callback 하나에 의존하면 안 된다.

예:

```
17:50 background
18:00 scheduled end
19:00 foreground
```

19:00 Snapshot 생성 시 다음을 판정한다.

1. 해당 날짜 Schedule End가 지났는가
2. PostWorkTransitionMode가 AUTO_OVERTIME인가
3. 유효한 기본 Policy가 있는가
4. Clock Out 기록이 없는가
5. 같은 경계에서 이미 Session이 생성되어 있는가

조건이 만족하면 18:00부터의 Overtime Segment를 재구성한다.

Persistence가 필요한 경우 deterministic key 또는 uniqueness rule을 사용해 중복 Session을 방지한다.

---

## 10. Activity Engine

Activity State:

- WORKING
- LOAFING

Activity는 Pay State와 독립적이다.

전환:

```
WORKING -> LOAFING
LOAFING -> WORKING
```

각 전환은 timestamp를 가진 ActivitySession으로 기록한다.

FIXED_PERIOD에서는 LOAFING 중에도 급여 진행을 중지하지 않는다.

Money Timer와 Full Dashboard는 동일한 Active Activity Session을 공유한다.

화면 이동으로 Session을 종료하거나 새로 만들지 않는다.

---

## 11. Money Layer

Money Domain 책임:

- 정수 KRW 입력 검증
- micro-KRW 변환
- multiplier 적용
- 기간 배분
- 표시 반올림
- 통화 포맷

권장:

```
1 KRW = 1,000,000 micro-won
```

반복적인 floating point 누적은 사용하지 않는다.

---

## 12. Schedule Engine

책임:

- 특정 날짜의 유효 Schedule 결정
- Weekly Schedule와 Daily Override 우선순위 처리
- Break 정규화
- 정규 유급 Segment 생성
- Scheduled Start / End 계산
- Post-Work Transition 경계 제공

우선순위:

```
Daily Override
> Weekly Schedule
> Off Day
```

---

## 13. Pay State Engine

책임:

- BEFORE_WORK
- REGULAR_WORK
- PAID_BREAK
- UNPAID_BREAK
- AFTER_SCHEDULE_UNPAID
- PAID_OVERTIME
- CLOCKED_OUT
- OFF_DAY

현재 시각, Schedule, Clock Out, Overtime Session, Transition Mode를 사용해 상태를 결정한다.

UI 문구는 Presentation Layer에서 매핑한다.

---

## 14. FIXED_PERIOD and TIME_BASED

### FIXED_PERIOD

연봉, 월급, 주급 기본.

근무 중:

```
Realtime Progress
= Allocated Daily Pay의 시간 배분
```

퇴근:

```
Finalized Regular Pay
= Allocated Daily Pay 100%
```

### TIME_BASED

시급 기본.

```
Finalized Regular Pay
= Actual Payable Duration * Rate
```

두 방식을 동일 변수 의미로 섞지 않는다.

---

## 15. Storage

### localStorage

- Salary settings
- Weekly schedule
- App settings
- PostWorkTransitionMode
- defaultOvertimePolicyId
- Display preferences

### IndexedDB

- Activity Sessions
- Overtime Sessions
- Daily Overrides
- Clock Out Events
- Daily Work State
- Salary revisions
- History and cache

현재 표시 금액이나 현재 Timer 숫자는 Tick마다 저장하지 않는다.

원본 이벤트와 설정에서 재구성한다.

---

## 16. State Management

초기 규모에서는 대형 전역 상태 라이브러리를 필수로 두지 않는다.

필수 공유 상태:

- Current Snapshot
- Settings
- Active Activity Session
- Active Overtime Session

Money Timer와 Full Dashboard는 동일 Application Service 또는 Store를 사용한다.

화면마다 별도의 급여 계산 상태를 만들지 않는다.

---

## 17. Period Aggregator

기간:

- Today
- Week
- Month
- Year

FIXED_PERIOD:

- 완료된 날짜의 finalizedRegularPay 기준

TIME_BASED:

- 실제 유급 Segment 기준

추가수당은 Session Snapshot 기준으로 합산한다.

성능을 위해 Daily Summary Cache를 사용할 수 있지만 Cache는 SSOT가 아니다.

---

## 18. Money Timer Surface

기본 진입 화면.

책임:

- 큰 실시간 누적 금액
- Current Rate
- 현재 상태
- 작은 Timer
- Activity Toggle
- Milestone Effect
- Full Dashboard 진입

Compact Width에서도 Activity Toggle은 유지한다.

---

## 19. Full Dashboard Surface

정식 주요 화면으로 유지한다.

책임:

- 오늘 진행 및 확정 일당
- 근무 진행률
- 업무시간
- 루팡시간
- 루팡률
- 무료봉사
- 추가수당
- Today / Week / Month / Year
- Rate Detail
- History 진입

Money Timer 단순화를 이유로 Dashboard 기능을 삭제하지 않는다.

---

## 20. Milestone Effect

Milestone은 Presentation 이벤트다.

예:

```
5,000
10,000
15,000
20,000
...
```

Threshold Crossing은 이전 Snapshot과 현재 Snapshot의 표시 금액을 비교해 판정할 수 있다.

중요:

- 계산 엔진의 급여 결과를 수정하지 않는다.
- background 복귀 시 지나간 모든 Threshold Effect를 재생하지 않는다.
- 한 Threshold는 한 번만 표시한다.
- Reduced Motion 지원.

---

## 21. PWA

목표:

- 홈 화면 설치
- 앱 형태 실행
- Offline App Shell
- Local data 기반 계산
- 네트워크 없이 Money Timer 및 Dashboard 실행

Service Worker는 Clock 또는 Pay Engine SSOT가 아니다.

---

## 22. Routing

권장:

```
/
  Money Timer

/dashboard
  Full Dashboard

/history
  History

/setup
  First Run Setup

/settings
  Salary, Schedule, Transition, Display Settings

/overtime
  Active Overtime Detail
```

---

## 23. Error Handling

분류:

- Validation Error
- Storage Error
- Migration Error
- Clock Error
- Domain Invariant Error
- Invalid Overtime Policy

자동 전체 초기화는 금지한다.

AUTO_OVERTIME Policy 오류는 무료봉사로 Fail Safe하고 오류 상태를 기록한다.

---

## 24. Clock Anomaly Handling

디바이스 시각이 뒤로 이동할 수 있다.

원칙:

- 음수 Duration 금지
- NaN 금지
- 이미 확정된 과거 급여 자동 감소 금지
- Active Session의 시작보다 now가 작으면 Reconciliation 대상
- 사용자 원본 데이터 자동 삭제 금지

Clock anomaly는 Unit Test 대상이다.

---

## 25. Observability

개발용 Debug Snapshot 예:

- nowEpochMs
- localTimeZone
- payState
- activityState
- active salary revision
- active schedule revision
- postWorkTransitionMode
- defaultOvertimePolicy
- active overtime session
- payable milliseconds
- free work milliseconds

Production 기본 UI에서는 숨긴다.

---

## 26. 성능 목표

Money Timer Snapshot 재계산은 지속적으로 실행되어도 체감 지연이 없어야 한다.

History 규모가 커질 경우:

- IndexedDB index
- Daily Summary Cache
- 기간별 cache invalidation

을 사용한다.

정확성보다 Cache를 우선하지 않는다.

---

## 27. 구현 전략

권장 순서:

1. Pure Domain Model
2. Device Clock and Fake Clock
3. Schedule Engine
4. Pay State Engine
5. FIXED_PERIOD / TIME_BASED
6. Post-Work Transition
7. Local Storage
8. Money Timer
9. Full Dashboard
10. Activity Timer
11. Free Work
12. Overtime
13. History
14. PWA and Polish

계산 엔진과 Clock Contract를 먼저 검증한 뒤 UI를 얹는다.
