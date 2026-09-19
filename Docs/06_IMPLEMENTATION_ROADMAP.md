# PayMeter Implementation Roadmap

## 1. 전략

PayMeter는 전체 Domain을 완성한 뒤 처음 사용해보는 방식으로 진행하지 않는다.

가장 먼저 Retention Prototype을 만든다.

검증 질문:

- 실제 업무 중 계속 띄워두는가
- Document PiP가 유용한가
- Today Progress가 자주 보게 만드는가
- LOAFING Toggle을 실제로 누르는가
- Consumer Value와 Milestone이 며칠 뒤에도 의미가 있는가

Prototype이 가치가 없으면 복잡한 V1 구현을 중단할 수 있어야 한다.

---

# P0 - Toolchain

- React
- TypeScript strict
- Vite
- Vitest
- Playwright
- PWA shell
- CI

완료:

- dev
- build
- unit smoke
- e2e smoke
- CI PASS

---

# P1 - Retention Prototype

버려도 되는 Prototype 성격을 허용한다.

범위:

- MONTHLY FIXED_PERIOD only
- 단일 월~금 Schedule
- unpaid break
- Device Clock
- Money Timer
- Today Target
- Today Progress
- Inferred WORKING
- LOAFING Toggle
- 10,000원 Milestone
- Consumer Value
- Privacy Mode
- Document PiP
- Compact fallback

제외:

- History
- Timeline Correction
- Hourly
- Overtime
- Week/Month 정교화
- Import
- Multi-tab hardening

## Retention Gate

P1 이후 실제 상시 사용성을 확인한다.

Gate 통과 시 P2 이후 진행.

---

# P2 - Domain Contract

구현:

- Money BigInt micro-KRW
- exact allocation
- deterministic remainder
- SalaryRevision
- ScheduleRevision
- WorkDayContext
- FakeClock
- Time Zone Snapshot
- Pay State
- Integrity Status
- half-open interval
- Clock Out settlement

완료:

- FIXED_PERIOD target
- early Clock Out 100%
- break boundary
- timezone snapshot
- clock jump safety

---

# P3 - Persistence Baseline

- IndexedDB schema
- localStorage preferences
- WorkDay
- Salary Revision
- Schedule Revision
- Loafing Session
- migrations
- deterministic keys
- unique indexes
- BroadcastChannel

완료:

- reload restore
- migration fixture
- basic multi-tab conflict test
- corruption does not full-reset

---

# P4 - Production Money Timer and PiP

Prototype 코드를 그대로 제품 코드로 간주하지 않는다.

P2/P3 Domain을 기반으로 재연결한다.

- Money Timer
- Progress
- Compact
- PiP
- Privacy
- Milestone
- Consumer Value

Money Timer와 PiP는 같은 Snapshot Query를 사용한다.

---

# P5 - Activity and Break

- inferred WORKING
- LOAFING intervals
- break automatic pause
- break toggle disable
- pre-break LOAFING intent restore
- loafing ratio
- loafing reference value

---

# P6 - Manual Overtime and Free Work

- AFTER_SCHEDULE_UNPAID
- Free Work derived metrics
- multiplier overtime only
- manual start/stop
- retroactive to Scheduled End
- session calculation snapshot

AUTO_OVERTIME은 구현하지 않는다.

---

# P7 - Timeline Correction and Unclosed Day

- 5 minute correction
- Clock In/Out correction
- LOAFING correction
- Overtime correction
- correction preview
- unclosed previous day detection
- midnight clamp
- NEEDS_TIME_REVIEW

---

# P8 - TIME_BASED Hourly

- Clock In
- AWAITING_CLOCK_IN
- actual regular payable interval
- Clock Out
- break intersection
- overtime coexistence

Clock In 없이 regular pay 생성 금지.

---

# P9 - Dashboard and Period Statistics

- Full Dashboard
- Today
- Week
- Month
- Daily Summary Cache
- History
- Consumer statistics

Year는 제외한다.

---

# P10 - PWA, Offline, Backup

- Install
- Offline App Shell
- Service Worker update safety
- JSON Export
- JSON Import preview
- Reset scopes

---

# P11 - Hardening and Release

- Accessibility
- Reduced Motion
- Storage corruption recovery
- Multi-tab race tests
- Clock anomaly UX
- Performance
- CSP
- Production E2E
- documentation verification

---

## V1 Release Scope

P0부터 P11까지 완료하되 기능 범위는 문서의 단순화된 V1을 넘지 않는다.

특히 구현 금지:

- AUTO_OVERTIME
- 복합 추가수당
- Paid Break
- Overnight Schedule
- Holiday/Leave
- Multi Job
- Year Statistics
- Precision Tax Engine
