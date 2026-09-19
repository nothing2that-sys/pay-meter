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

라이브러리의 정확한 버전은 구현 Phase 0에서 현재 Stable Version을 확인한 뒤 고정한다.

---

## 2. 아키텍처 목표

PayMeter는 UI보다 계산 엔진을 독립적으로 유지한다.

구조:

```
UI
  |
Application Services
  |
Domain
  |-- Pay Engine
  |-- Time Engine
  |-- Work State Engine
  |-- Period Aggregator
  |
Repositories
  |-- Settings Repository
  |-- History Repository
  |
Storage
  |-- localStorage
  |-- IndexedDB
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
    work-state/
    aggregation/
    types/

  application/
    dashboard/
    settings/
    overtime/
    history/

  infrastructure/
    clock/
    storage/
      local-storage/
      indexed-db/
    migration/

  features/
    dashboard/
    onboarding/
    settings/
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

## 4. Domain API 방향

UI가 직접 급여 계산식을 만들지 않는다.

예:

```ts
buildPaySnapshot(input): PaySnapshot
```

입력:

- 현재 시각
- Salary Profile
- Weekly Schedule
- Daily Override
- Overtime Session
- Daily Work State

출력:

- Work State
- Current Rate
- Current Earned
- Period Totals
- Remaining Time
- Unpaid After Hours

Dashboard는 이 결과를 표시한다.

---

## 5. Clock

Clock Adapter:

```ts
interface Clock {
  nowEpochMs(): number
}
```

Production:

SystemClock

Test:

FakeClock

이 구조를 사용하면 다음 테스트가 가능하다.

- 08:59:59
- 09:00:00
- 11:59:59
- 12:00:00
- 13:00:00
- 17:59:59
- 18:00:00
- 18:30:00

---

## 6. UI Refresh

Dashboard 표시 갱신은 requestAnimationFrame 또는 제한된 refresh loop를 사용할 수 있다.

권장:

- 가시 상태: 부드러운 실시간 갱신
- 백그라운드: 브라우저에 맡김
- 포커스 복귀: 즉시 Snapshot 재계산

중요:

Refresh Loop는 돈을 누적하지 않는다.

항상 현재 now를 기준으로 Snapshot을 다시 요청한다.

---

## 7. State Management

초기 규모에서는 대형 전역 상태 라이브러리를 필수로 두지 않는다.

권장:

- Settings Context 또는 단순 Store
- Query 성격 데이터는 Repository에서 로드
- Dashboard 계산은 Selector 또는 Application Service

복잡도가 실제로 증가한 뒤 전역 State Library 도입을 판단한다.

---

## 8. Money Layer

Money Domain에서 다음 책임을 분리한다.

- 정수 KRW 입력 검증
- micro-KRW 변환
- multiplier 적용
- 표시 반올림
- 통화 포맷

UI 컴포넌트에서 직접 부동소수점 급여 계산을 하지 않는다.

---

## 9. Schedule Engine

Schedule Engine 책임:

- 특정 날짜의 유효 Schedule 결정
- Weekly Schedule와 Daily Override 병합
- Break 정규화
- 유급 Segment 생성
- 경계 시각 판정

결과는 Pay Engine이 사용할 Segment 목록이어야 한다.

---

## 10. Work State Engine

Work State Engine 책임:

- 현재 시각 상태 판정
- 정규 근무 여부
- 휴게 여부
- 정규 종료 여부
- 유급 추가근무 여부
- 퇴근 완료 여부

UI 문구는 별도 Presentation Mapping으로 관리한다.

Domain Enum에 한국어 문구를 직접 넣지 않는다.

---

## 11. Period Aggregator

기간 합산:

- Today
- Week
- Month
- Year

필요 데이터:

- Salary effective history
- Schedule history 또는 당시 Snapshot
- Daily Override
- Overtime Session
- Daily State

V1 초기에는 과거 Schedule 변경 이력이 없을 경우 현재 스케줄을 과거에 소급 적용하는 문제가 생길 수 있다.

따라서 구현 초기에 다음 중 하나를 선택해야 한다.

권장:

설정 변경 시 effectiveFrom을 가진 Schedule Revision을 저장한다.

이렇게 해야 과거 누적을 정확히 재현할 수 있다.

---

## 12. PWA

목표:

- 홈 화면 설치
- 앱 형태 실행
- 핵심 Asset Offline Cache
- 네트워크 없이 Dashboard 실행

Service Worker가 급여 계산 SSOT가 되어서는 안 된다.

---

## 13. Routing

권장 화면:

```
/
  Dashboard

/setup
  First Run Setup

/settings
  Salary and Schedule Settings

/history
  History

/overtime
  Active Overtime Detail
```

모바일에서는 Dashboard 중심의 하단 네비게이션 또는 간결한 메뉴를 사용한다.

---

## 14. Error Handling

오류 종류를 분리한다.

- Validation Error
- Storage Error
- Migration Error
- Clock Error
- Domain Invariant Error

사용자 데이터 손실 위험이 있는 오류는 자동 초기화하지 않는다.

---

## 15. Observability

V1은 서버 Telemetry가 없어도 된다.

개발 모드에서는 Debug Snapshot을 선택적으로 제공할 수 있다.

예:

- 현재 state
- 적용된 salary revision
- 적용된 schedule revision
- 적용된 overtime policy
- 계산된 payable milliseconds

이 정보는 계산 오류 검증에 유용하다.

Production UI에서는 기본적으로 숨긴다.

---

## 16. 성능 목표

Dashboard Snapshot 계산은 일반적인 1년 이력 규모에서 체감 지연이 없어야 한다.

History가 커질 경우:

- 날짜별 Summary Cache
- IndexedDB index
- 기간별 incremental cache

를 사용할 수 있다.

그러나 정확성보다 캐시를 우선하지 않는다.

---

## 17. 구현 전략

처음부터 모든 화면을 만들지 않는다.

권장 순서:

1. Pure Domain Model
2. Pay Engine
3. Schedule and Work State
4. Fake Clock Test
5. Storage
6. Minimal Dashboard
7. Settings
8. Overtime
9. History
10. PWA and Polish

계산 엔진을 먼저 검증하고 UI를 얹는다.
