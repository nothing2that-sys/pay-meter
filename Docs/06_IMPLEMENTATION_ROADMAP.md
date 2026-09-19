# PayMeter Implementation Roadmap

## 1. 전략

PayMeter는 전체 Domain을 완성한 뒤 처음 사용해보는 방식으로 진행하지 않는다.

Retention Prototype을 먼저 실제 사용하고, 사용 피드백을 다음 구현에 반영한다.

---

# P0 - Toolchain

상태:

COMPLETED

- React
- TypeScript strict
- Vite
- Vitest
- Playwright
- PWA shell
- CI

---

# P1 - Retention Prototype

상태:

COMPLETED

구현:

- MONTHLY FIXED_PERIOD
- Device Wall Clock
- Money Timer
- Today Target/Progress Prototype
- Inferred WORKING
- LOAFING Toggle
- unpaid break
- Milestone
- Consumer Value experiment
- Privacy
- Compact
- Document PiP
- Reload Restore
- Background Resume

Closeout HEAD 이후 실제 사용 피드백이 발생했다.

---

# P1R - Retention UX Rework

상태:

P1R_RETENTION_TEST_READY

목적:

첫 P1 화면을 실제 사용한 결과를 반영해 PayMeter 기본 화면을 다시 단순화한다.

## P1R-1 Perimeter Timeline

- 화면 외곽 한 바퀴 = Planned Paid Duration 100%
- SVG rounded-rectangle path
- WORKING/LOAFING 서로 다른 색
- 시간 순서 Segment 유지
- Break 제외
- Current marker
- Scheduled End 100%

## P1R-2 Money Information Simplification

기본 화면 제거:

- Today Target 금액
- 목표금액 대비 문구
- Consumer Value
- 루팡률
- 상세 Rate

기본 화면 유지:

- Today Earned
- Loafing Earned Value
- Progress %
- Remaining Time
- small Current Rate

상세 설계 정본: `Docs/P1R_RETENTION_UX_REWORK_DESIGN.md`

## P1R-3 Free Work Wallet

정규 종료 후:

- perimeter 100% 고정
- regular pay 증가 정지
- Free Work Wallet 표시
- freeWorkDuration
- freeWorkReferenceValue
- 실제 지급액 아님 label
- threshold based sarcasm copy

Free Work Wallet을 실제로 종료할 수 있는 최소 Clock Out action은 P1R 필수 범위다.

정식 History/Settlement 구조는 이후 Phase에서 교체한다.

## P1R-4 Product Voice

무료봉사 상태:

- 상황을 가볍게 비꼬는 문구
- 사용자 개인 비하 금지
- Threshold 단위 변경
- 매 Tick random 변경 금지

## P1R-5 Settings Simplification

기본 Settings:

- 급여 / 근무
- 화면
- 데이터

제거:

- Consumer Item editor
- 금액 소수 표시 옵션
- 저가치 Display 옵션

## P1R-6 Consumer Value

상태:

PAUSED_EXPERIMENT

기본 UI와 Settings에서 제거한다.

## P1R Acceptance

- 외곽 Timeline을 보고 진행률과 LOAFING 구간을 직관적으로 이해
- Today Earned / Loafing Earned의 관계가 명확
- Free Work Wallet이 실제 급여와 혼동되지 않음
- 무료봉사 카피가 재미는 있으나 불쾌한 개인 조롱이 아님
- Settings가 초기 P1보다 단순
- PiP에서도 핵심 정보가 유지
- Mobile/Compact에서 외곽 path가 깨지지 않음

P1R에서는 Overtime multiplier source를 새로 만들지 않으며 실제 Overtime 금액 기능과 작동하지 않는 CTA를 구현하지 않는다. Overtime은 P6에서 정식 구현한다.

P1R 구현과 최종 Verification Gate는 완료됐다.

검증 근거는 `Docs/P1R_VERIFICATION_CLOSEOUT.md`를 따른다.

다음 단계는 실제 업무 중 P1R Retention Test다.

P2는 이 Retention Test 결과 이전에 착수하지 않는다.

---

# P2 - Domain Contract

상태:

BLOCKED_BY_P1R_RETENTION

구현 예정:

- exact money arithmetic
- SalaryRevision
- ScheduleRevision
- WorkDayContext
- Time Zone Snapshot
- Pay State
- Integrity Status
- Clock Out settlement

---

# P3 - Persistence Baseline

- IndexedDB
- WorkDay
- Revision
- Loafing Session
- migration
- unique index
- BroadcastChannel

---

# P4 - Production Money Timer and PiP

P1R에서 검증한 UX를 정식 P2/P3 Domain에 연결한다.

- Perimeter Timeline
- Today Earned
- Loafing Earned
- Current Rate
- Privacy
- PiP
- Milestone

Consumer Value는 기본 Production Scope에서 제외한다.

---

# P5 - Activity and Break

- inferred WORKING
- LOAFING intervals
- break automatic pause
- loafing ratio/reference

---

# P6 - Manual Overtime and Free Work

P1R Free Work Wallet Prototype을 정식 Domain 구조에 연결한다.

- AFTER_SCHEDULE_UNPAID
- Free Work derived metric
- Clock Out
- multiplier overtime
- manual start/stop
- retroactive start
- Free Work Wallet
- overtime session snapshot

---

# P7 - Timeline Correction and Unclosed Day

- 5 minute correction
- Clock In/Out
- LOAFING
- Overtime
- unclosed day
- midnight clamp

---

# P8 - TIME_BASED Hourly

- Clock In
- AWAITING_CLOCK_IN
- actual payable interval
- Clock Out

---

# P9 - Dashboard and Period Statistics

- Today
- Week
- Month
- History
- Daily Summary Cache

---

# P10 - PWA, Offline, Backup

- Install
- Offline
- Update safety
- JSON Export/Import
- Reset

---

# P11 - Hardening and Release

- Accessibility
- Reduced Motion
- corruption recovery
- multi-tab races
- Clock anomaly
- performance
- CSP
- Production E2E

---

## V1 구현 금지

- AUTO_OVERTIME
- 복합 수당
- Paid Break
- Overnight Schedule
- Holiday/Leave
- Multi Job
- Year Statistics
- Precision Tax Engine
- Consumer Value 기본 기능
