# PayMeter Technical Architecture

## 1. 권장 기술 구성

- React
- TypeScript
- Vite
- PWA
- Vitest
- Playwright
- IndexedDB
- BroadcastChannel
- Document Picture-in-Picture feature detection
- CSS Variables

정확한 라이브러리 버전은 구현 시작 시 Stable Version으로 고정한다.

## 2. Architecture Goal

UI와 계산을 분리한다.

구조:

UI Surfaces
- Money Timer
- Document PiP
- Full Dashboard
- Timeline
- Settings

Application
- Commands
- Reconciliation
- Snapshot Query
- Export/Import

Domain
- Money
- Schedule
- Pay
- Activity
- Overtime
- Aggregation
- Integrity

Repositories
- Settings
- WorkDay
- Session
- History

Infrastructure
- Device Clock
- Time Zone Adapter
- localStorage
- IndexedDB
- BroadcastChannel
- PWA
- Migration

## 3. Pure Snapshot API

대표 Query:

buildPaySnapshot(input) -> PaySnapshot

이 함수는 저장을 변경하지 않는다.

금지:

- Session 생성
- DB write
- Settings 변경
- Migration
- Broadcast

## 4. Command API

예:

- clockIn(workDayId, at)
- clockOut(workDayId, at)
- startLoafing(workDayId, at)
- stopLoafing(workDayId, at)
- startOvertime(workDayId, at, multiplier)
- stopOvertime(workDayId, at)
- correctTimeline(workDayId, patch)

각 Command는 Repository transaction 안에서 현재 상태를 다시 읽고 invariant를 검증한다.

## 5. Reconciliation

Reconciliation은 Snapshot Query와 다르다.

용도:

- 미마감 이전 Day 감지
- integrityStatus 업데이트
- stale cache invalidate
- migration 후 projection 보정

V1에는 AUTO_OVERTIME 생성 Reconciliation이 없다.

## 6. Device Clock

Clock interface:

- nowEpochMs
- localTimeZone

Production:

- DeviceClock

Test:

- FakeClock

UI refresh loop가 Clock SSOT가 되어서는 안 된다.

## 7. Time Zone

WorkDay materialization 시 localDate와 timeZoneSnapshot을 고정한다.

과거 Day 계산은 저장된 timeZoneSnapshot을 사용한다.

현재 기기 Time Zone으로 과거 Day를 다시 해석하지 않는다.

DST 전용 근태 엔진은 만들지 않는다.

V1은 WorkDay Snapshot과 epoch boundary를 기준으로 계산하며 DST 및 Time Zone 변경 Edge Case는 경고와 테스트로 관리한다.

## 8. Money

내부 금액은 integer micro-KRW BigInt를 권장한다.

Rate를 Number float으로 Tick 누적하지 않는다.

Period Allocation은 integer/rational 계산으로 구현한다.

## 9. Schedule Engine

책임:

- 유효 SalaryRevision과 ScheduleRevision 선택
- Daily Override 적용
- local civil time -> epoch boundary 변환
- unpaid break normalization
- plannedPaidDuration 계산
- WorkDayContext 생성

V1 overnight Schedule은 validation에서 거부한다.

## 10. Pay Engine

책임:

- FIXED_PERIOD target/progress
- TIME_BASED clocked interval
- Scheduled End
- free work derived duration
- overtime pay
- Clock Out settlement
- currentDisplayPay

UI가 정규 금액과 Overtime을 직접 조합하지 않는다.

## 11. Activity Engine

기본 WORKING을 추론한다.

Persisted Activity:

- LOAFING interval only

workingDuration은 eligible duration에서 loafing duration을 뺀 파생값이다.

## 12. Overtime Engine

V1:

- manual start/stop
- multiplier only
- current or retroactive-to-scheduled-end start
- session calculation snapshot

별도 Policy Engine은 만들지 않는다.

## 13. Persistence

localStorage:

- display preferences
- privacy
- consumer items
- lightweight app setting pointers

IndexedDB:

- salary revisions
- schedule revisions
- work days
- timeline events/sessions
- summary cache
- migration metadata

## 14. Multi-tab Coordinator

V1:

- IndexedDB transaction
- unique indexes
- deterministic IDs
- BroadcastChannel invalidation

BroadcastChannel 수신 시 메모리 상태를 그대로 합치지 않는다.

Repository를 다시 읽는다.

Web Locks는 기본 의존성이 아니다.

## 15. Document PiP

Document PiP adapter는 UI feature layer에 둔다.

원칙:

- API feature detection
- user gesture로 open
- PiP와 본문이 동일 Store/Snapshot Query 사용
- PiP open/close가 Session lifecycle에 영향 없음
- PiP에서는 Milestone Effect disabled

지원하지 않으면 일반 Compact Money Timer로 fallback.

## 16. State Management

공유할 최소 상태:

- current WorkDay
- current PaySnapshot
- display preferences
- active UI commands state

DB 원본 전체를 거대한 UI Store에 복제하지 않는다.

Money Timer, PiP, Dashboard가 같은 Query 결과를 사용한다.

## 17. Timeline Correction

Application Command가 수정 전후 invariant를 검증한다.

Correction 후:

- affected WorkDay reload
- cache invalidate
- Snapshot rebuild
- Broadcast invalidate

## 18. PWA

목표:

- install
- offline app shell
- local data calculation
- versioned migration

Service Worker는 Clock 또는 Pay Engine SSOT가 아니다.

업데이트된 앱과 오래 열린 탭이 동시에 존재할 수 있음을 고려한다.

## 19. Error Handling

분류:

- Validation Error
- Storage Error
- Migration Error
- Clock Anomaly
- Data Integrity Error

자동 전체 reset 금지.

사용자 수정 가능한 문제는 Timeline 또는 Data Recovery UI로 연결한다.

## 20. Security and Privacy

- CSP 권장
- third-party script 최소화
- 원격 analytics 기본 없음
- 금액 숨김
- JSON Export

Local Only는 물리적 화면 노출까지 해결하지 않으므로 Privacy Mode를 별도 제공한다.

## 21. Performance

Money Timer는 자주 재계산되므로 Today Snapshot은 현재 Day 데이터만 사용해 빠르게 계산한다.

Week/Month는 Daily Summary Cache를 사용할 수 있다.

Cache는 항상 재생성 가능해야 한다.

## 22. Suggested Source Layout

src/
- app/
- domain/
  - money/
  - schedule/
  - pay/
  - activity/
  - overtime/
  - integrity/
  - aggregation/
- application/
  - commands/
  - queries/
  - reconciliation/
  - timeline/
- infrastructure/
  - clock/
  - timezone/
  - storage/
  - broadcast/
  - pip/
  - pwa/
- features/
  - money-timer/
  - dashboard/
  - timeline/
  - settings/
  - privacy/
  - consumer-value/
- tests/
