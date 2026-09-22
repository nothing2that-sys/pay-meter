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
- SVG based perimeter visualization
- CSS Variables Design Token

## 2. Architecture Goal

UI와 계산을 분리한다.

UI Surfaces:
- Money Timer
- Document PiP
- Full Dashboard
- Timeline
- Settings

Application:
- Commands
- Reconciliation
- Snapshot Query
- Export/Import

Domain:
- Money
- Schedule
- Pay
- Activity
- Overtime
- Aggregation
- Integrity

Presentation:
- Perimeter Timeline Mapper
- Money Timer View Model
- Free Work Wallet Presenter
- Free Work Copy Selector

Infrastructure:
- Device Clock
- Time Zone Adapter
- localStorage
- IndexedDB
- BroadcastChannel
- PWA
- Migration

## 3. Pure Snapshot API

buildPaySnapshot(input) -> PaySnapshot

저장 부작용 금지.

## 4. Command API

예:

- clockIn
- clockOut
- startLoafing
- stopLoafing
- startOvertime
- stopOvertime
- correctTimeline

Command는 transaction 안에서 invariant를 검증한다.

## 5. Device Clock

Production:

DeviceClock

Test:

FakeClock

UI refresh loop는 시간 SSOT가 아니다.

## 6. Time Zone

WorkDay materialization 시 timeZoneSnapshot을 고정한다.

과거 Day를 현재 Time Zone으로 재해석하지 않는다.

## 7. Money

integer micro-KRW BigInt 또는 동등한 exact arithmetic을 사용한다.

Rate를 Tick 누적하지 않는다.

## 8. Schedule Engine

책임:

- SalaryRevision / ScheduleRevision 선택
- Daily Override
- civil time -> epoch
- unpaid break normalization
- plannedPaidDuration
- WorkDayContext

## 9. Pay Engine

책임:

- FIXED_PERIOD target/progress
- TIME_BASED paid interval
- todayEarned
- loafingEarnedValue
- scheduledProgressRatio
- current/base rate
- free work derived duration/value
- overtime pay
- settlement

UI가 Today Earned 또는 Loafing Earned를 재계산하지 않는다.

## 10. Activity Engine

Persist:

- LOAFING interval only

Derive:

- WORKING
- loafingDuration
- workingDuration
- loafing ratio

## 11. Perimeter Timeline Mapper

Domain은 화면 외곽 SVG 좌표를 알지 않는다.

Domain 또는 Query가 normalized time segment를 제공한다.

Presentation은:

- Workday path length
- startRatio/endRatio
- WORKING/LOAFING token

을 SVG stroke segment로 변환한다.

권장:

- 하나의 rounded-rectangle path
- pathLength=1 또는 100
- segment별 stroke-dasharray / dashoffset
- current marker 별도 layer

이 구조로 Timeline Correction 후 Segment만 다시 계산하면 UI를 재사용할 수 있다.

## 12. Free Work Wallet Presenter

입력:

- payState
- freeWorkDuration
- freeWorkReferenceValue
- todayEarned
- baseVisualizationRate

출력:

- Wallet view model
- 실제 급여 아님 label
- threshold bucket
- sarcasm copy key

Wallet 금액을 Storage SSOT로 만들지 않는다.

## 13. Free Work Copy Selector

Copy Selector는 Domain과 분리한다.

입력:

- duration/value threshold bucket

출력:

- deterministic or stable copy

매 render마다 랜덤 문구를 선택하지 않는다.

사용자를 비하하는 문구는 금지한다.

## 14. Overtime Engine

V1:

- manual start/stop
- multiplier only
- retroactive to Scheduled End
- session calculation snapshot

AUTO_OVERTIME 없음.

## 15. Persistence

localStorage:

- lightweight preferences
- prototype-only data when applicable

IndexedDB:

- salary revisions
- schedule revisions
- work days
- timeline events/sessions
- summary cache
- migration metadata

Consumer Items는 V1 저장구조에서 제외한다.

## 16. Multi-tab Coordinator

- IndexedDB transaction
- unique indexes
- deterministic IDs
- BroadcastChannel invalidation

Web Locks는 기본 의존성이 아니다.

## 17. Document PiP

PiP와 본문은 같은 Store/Snapshot Query를 사용한다.

PiP open/close가 Session lifecycle에 영향 없음.

## 18. State Management

공유 최소 상태:

- current WorkDay
- current PaySnapshot
- display preferences
- active command state

Money Timer, PiP, Dashboard가 같은 Query 결과를 사용한다.

## 19. Settings Architecture

Settings Model과 화면 노출을 분리한다.

V1 기본 Settings Surface는:

- Pay/Work
- Display
- Data

세 그룹만 노출한다.

Advanced 후보는 실제 필요성이 확인되기 전까지 숨긴다.

## 20. Timeline Correction

Correction 후:

- WorkDay reload
- cache invalidate
- Snapshot rebuild
- Broadcast invalidate

Perimeter Timeline은 새 Segment 결과를 그대로 다시 렌더링한다.

## 21. PWA

- install
- offline app shell
- local calculation
- versioned migration

Service Worker는 Clock 또는 Pay Engine SSOT가 아니다.

## 22. Error Handling

- Validation Error
- Storage Error
- Migration Error
- Clock Anomaly
- Data Integrity Error

자동 전체 reset 금지.

## 23. Performance

Today Snapshot과 Perimeter Segment 계산은 현재 Day 데이터만 사용한다.

SVG path geometry는 매 Tick 재생성하지 않고 layout 변경 시 재사용할 수 있다.

금액/marker position만 Snapshot에 따라 갱신한다.


## 24. P1R Implementation File Plan

P1R 상세 파일 경계는 `Docs/P1R_RETENTION_UX_REWORK_DESIGN.md`를 따른다.

권장 신규 Presentation 모듈:

- `src/presentation/PerimeterTimeline.tsx`
- `src/presentation/MoneyTimer.tsx`
- `src/presentation/FreeWorkWallet.tsx`
- `src/presentation/freeWorkCopy.ts`
- `src/presentation/moneyTimerViewModel.ts`

기존 `src/App.tsx`는 다음 책임으로 축소한다.

- shared settings
- DeviceClock now
- Snapshot Query
- persistence command wiring
- Main/PiP portal
- screen state

P1R Prototype Domain은 기존 `src/domain/prototype.ts`를 확장한다.

P1R에서 새 npm dependency를 추가하지 않는다. SVG/CSS/React로 구현한다.

Prototype Storage에는 최소 `PrototypeDayControl`을 추가할 수 있다.

- localDate
- clockOutAtEpochMs

Clock Out은 idempotent해야 하며 정식 WorkDay/IndexedDB 구조를 P1R에서 미리 만들지 않는다.

Perimeter SVG Geometry는 layout resize 시에만 갱신하고 매 Tick 재생성하지 않는다.

Free Work Copy Selector는 Presentation Pure Function으로 구현한다.
