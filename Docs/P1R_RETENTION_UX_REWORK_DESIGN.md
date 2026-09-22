# PayMeter P1R Retention UX Rework Detailed Design

## 0. Design Baseline

- Repository: nothing2that-sys/pay-meter
- Branch: main
- Design Base HEAD: [legacy-sha-removed]
- Stage: P1_UX_REWORK_REQUIRED
- P2: BLOCKED
- Result: P1R_DESIGN_READY

이 문서는 P1R 구현을 위한 상세 UX/Domain/Presentation 설계다.

상위 SSOT와 충돌할 경우 Docs/SSOT_INDEX.md의 우선순위를 따른다. 상위 문서가 정하지 않은 P1R 세부 구현 사항은 이 문서를 구현 기준으로 사용한다.

---

## 1. UX Architecture

P1R Money Timer는 Dashboard 축소판이 아니라 하나의 MoneyTimerFrame 안에서 상태에 따라 표현이 바뀌는 단일 계측기다.

정보 우선순위:

1. Perimeter Timeline
2. 현재 상태
3. Scheduled Progress
4. 현재 상황에 맞는 시간 정보
5. Today Earned
6. Loafing Earned Value
7. Activity Action
8. Privacy
9. Current Rate

Presentation 매핑:

- OFF_DAY -> 휴무
- BEFORE_WORK -> 출근 전
- REGULAR_WORK + WORKING -> 업무 중
- REGULAR_WORK + LOAFING -> 루팡 중
- UNPAID_BREAK -> 휴게 중
- AFTER_SCHEDULE_UNPAID -> Free Work Wallet
- CLOCKED_OUT -> 퇴근 완료

LOAFING은 Pay State가 아니라 Activity State다.

데이터 흐름:

DeviceClock + Settings + Loafing Intervals + PrototypeDayControl
-> buildPaySnapshot()
-> MoneyTimerViewModel
-> Main Money Timer / Document PiP

Main/PiP는 급여, Timeline, Free Work를 별도로 계산하지 않는다.

### MoneyTimerFrame

큰 브라우저에서도 viewport 전체 외곽이 아니라 MoneyTimerFrame 외곽을 Timeline으로 사용한다.

권장 Desktop Frame:

- width: 520~580px
- height: 600~720px

작은 창/PiP에서는 Frame이 viewport 대부분을 사용한다.

---

## 2. Regular Work Screen

정규 근무 화면:

- 상태: 업무 중
- 가장 큰 숫자: Scheduled Progress
- Wall Clock 기준: 퇴근까지
- Today Earned
- 그중 Loafing Earned
- 루팡 시작
- 구석 Current Rate
- Perimeter Timeline

권장 시각 위계:

- 상태: 14~16px
- Progress: 52~68px
- 시간 정보: 14~17px
- Today Earned: 28~36px
- Loafing Earned: 18~24px
- Rate: 11~13px

Progress는 소수 1자리 기본, 100%에서는 100%로 표시한다.

### Today Earned

Label: 오늘 번 돈

정수 KRW 표시를 기본으로 한다.

### Loafing Earned

권장 Label: 그중 루팡으로 번 돈

Today Earned에 포함된 Breakdown이다. 두 값을 + 관계로 배치하거나 합산하지 않는다.

### Remaining Time

Domain의 remainingScheduledPaidDuration과 화면의 시간 정보는 분리한다.

Domain:

- remainingScheduledPaidDuration: unpaid break 제외

Presentation:

- BEFORE_WORK: 출근까지 = scheduledStart - now
- REGULAR_WORK/LOAFING: 퇴근까지 = scheduledEnd - now
- UNPAID_BREAK: 휴게 종료까지 = breakEnd - now

JSX에서 직접 계산하지 않고 MoneyTimerViewModel에서 만든다.

---

## 3. LOAFING Screen

LOAFING 진입 시 Layout Shift를 만들지 않는다.

변경:

- 상태: 루팡 중
- 현재 Perimeter Segment: timeline-loafing
- 버튼: 업무 복귀
- Loafing Earned Value 증가

Today Earned 증가율은 FIXED_PERIOD에서 WORKING과 동일하다.

전체 배경을 강한 색으로 바꾸지 않는다. 상태 Text, Perimeter Segment, Action Button 정도로 구분한다.

---

## 4. Break Screen

09:00~18:00, 12:00~13:00 unpaid break라면 8 paid hours가 100%다.

12:00 시점:

- 3h / 8h = 37.5%

12:00~13:00:

- Progress 37.5% 유지
- Current Marker 정지
- Today Earned 정지
- Loafing Earned 정지
- Current Rate = 0
- Activity Toggle disabled
- 시간 Label = 휴게 종료까지

Break 자체는 Perimeter에 길이를 차지하지 않는다.

LOAFING interval이 Break를 가로지르면 Break 교집합은 계산에서 제외한다. Paid-time coordinate에서는 두 LOAFING 조각이 붙어 보일 수 있으며 정상이다.

---

## 5. Free Work Wallet Screen

Scheduled End 도달 즉시:

- Perimeter = 100%
- WORKING/LOAFING history 유지
- Moving Current Marker 제거
- 정적 Completion 표현만 허용
- Regular Today Earned 증가 정지
- Regular Current Rate = 0
- Free Work Wallet이 주 UI가 됨

정보 우선순위:

1. Free Work Reference Value
2. Free Work Duration
3. 실제 지급액 아님 Label
4. Free Work Copy
5. Clock Out Action
6. Today Earned / Loafing Earned summary

Wallet 예:

무료봉사 WALLET

₩18,742
00:44:58

+₩6.944/s 상당
실제 지급액 아님

월급은 멈췄지만 시간은 계속 나가고 있습니다.

[퇴근]

오늘 ₩200,000 / 루팡 ₩31,250

### Accuracy

Wallet Reference Value는 표시용 rounded Rate를 다시 곱하지 않는다.

FIXED_PERIOD P1R:

freeWorkReferenceValue
= dailyTargetPay * freeWorkDuration / plannedPaidDuration

Loafing Earned도 같은 exact arithmetic 원칙을 사용한다.

Wallet 내부 +₩x/s 상당은 Reference Rate다. 정규 currentRate와 다른 의미다.

---

## 6. CLOCKED_OUT Screen

P1R에서는 Retention Test를 종료할 수 있도록 최소 Clock Out 기능을 실제 구현한다.

Clock Out 후:

- Free Work Duration freeze
- Free Work Reference Value freeze
- open LOAFING 종료
- Current Rate = 0
- Perimeter = 100%
- Current Marker 없음
- reload 후 같은 Day에서 다시 증가하지 않음

Free Work가 없었다면 Free Work summary는 숨긴다.

### PrototypeDayControl

P1R 최소 저장:

- localDate
- clockOutAtEpochMs

기존 P1 localStorage Infrastructure를 사용한다.

Clock Out은 idempotent하다. 이미 Clock Out된 Day에서 재실행해도 timestamp를 변경하지 않는다.

정식 WorkDay/IndexedDB/Settlement는 P2/P3/P6에서 교체한다.

---

## 7. PiP Screen

PiP는 동일 Snapshot의 Compact Presentation이다.

목표 크기:

- 340~400px × 400~500px
- 현재 기준 약 360×440

Regular PiP 필수:

- Perimeter
- Progress
- 상태
- Today Earned
- Loafing Earned
- Activity Toggle
- Privacy
- small Rate

우선 제거 가능:

- 브랜드 Text
- 상세한 설명
- Milestone Effect
- 장식

Free Work PiP:

- Perimeter 100%
- Wallet value
- Free Work Duration
- 실제 지급액 아님
- 짧은 Copy
- Clock Out

PiP open/close는 Clock Out/LOAFING lifecycle과 무관하다.

---

## 8. Perimeter Timeline Geometry

### 8.1 Path

하나의 Rounded Rectangle SVG Path.

- 시작점: 상단 중앙
- 진행: 시계 방향
- pathLength = 1 권장
- Domain ratio = 0.0~1.0

Domain은 pixel/SVG 좌표를 반환하지 않는다.

### 8.2 Layers

1. inactive base path
2. elapsed activity segments
3. current marker/highlight

Token:

- timeline-working
- timeline-loafing
- timeline-inactive
- timeline-current

100%에서는 current marker를 제거한다.

### 8.3 Segment Mapping

PerimeterSegment:

- type: WORKING | LOAFING
- startRatio
- endRatio

Invariant:

- 0 <= startRatio < endRatio <= 1
- startRatio ascending
- overlap 없음

Presentation에서 같은 type의 인접 Segment는 병합 가능.

### 8.4 paidOffsetAt(timestamp)

Break는 paid offset을 증가시키지 않는다.

09:00 = 0m
10:00 = 60m
12:00 = 180m
12:30 = 180m
13:00 = 180m
14:00 = 240m
18:00 = 480m

ratio = paidOffset / plannedPaidDuration

따라서:

- 12:00 = 37.5%
- 12:30 = 37.5%
- 13:00 = 37.5%
- 14:00 = 50%
- 18:00 = 100%

### 8.5 Resize

SVG path geometry는 매 Tick 재생성하지 않는다.

ResizeObserver 또는 동일한 layout signal에서만:

- width
- height
- radius
- path geometry

를 갱신한다.

Tick에서는 Snapshot ratio/segment/current marker만 갱신한다.

---

## 9. Domain Snapshot Changes

P1R PaySnapshot 최소 확장:

- nowEpochMs
- localDate
- payState
- activityState
- todayEarnedMicroKrw
- loafingEarnedValueMicroKrw
- dailyTargetPayMicroKrw
- scheduledProgressRatio 또는 basisPoints
- perimeterSegments
- baseVisualizationRate
- currentRate
- elapsedScheduledPaidDurationMs
- remainingScheduledPaidDurationMs
- workingDurationMs
- loafingDurationMs
- freeWorkDurationMs
- freeWorkReferenceValueMicroKrw
- clockOutAtEpochMs
- activityToggleEnabled
- context

todayEarned:

- 근무 중: dailyTarget × elapsedPaid / plannedPaid
- Free Work: Scheduled End 금액으로 고정
- Clock Out: P1R FIXED_PERIOD Daily Target 100% 확정

loafingEarnedValue:

- dailyTarget × loafingPaidDuration / plannedPaid

scheduledProgressRatio:

- elapsedScheduledPaidDuration / plannedPaidDuration
- clamp 0~1

Free Work:

- start = scheduledEnd
- end = clockOut ?? now
- P1R same-day clamp

currentRate:

- REGULAR_WORK > 0
- BEFORE_WORK/BREAK/FREE_WORK/OFF_DAY/CLOCKED_OUT = 0

---

## 10. Free Work Copy Rules

카피 Threshold는 금액이 아니라 Duration 기준을 사용한다.

이유:

급여 수준에 따라 금액 Threshold 도달 속도가 달라지는 편향을 피한다.

Buckets:

- FW0: 0~15m
- FW1: 15~30m
- FW2: 30~60m
- FW3: 60m+

FW0:
- 무료 체험이 시작됐습니다.
- 정규 근무는 끝났습니다. 참고로요.

FW1:
- 회사 입장에서는 꽤 좋은 시간대입니다.
- 월급은 멈췄지만 시간은 계속 나가고 있습니다.

FW2:
- 무료봉사 Wallet이 제법 건강해졌습니다.
- 퇴근 버튼은 아직 정상 작동합니다.

FW3:
- 무상 노동 포트폴리오가 커지고 있습니다.
- 이 Wallet은 출금 기능이 없습니다.

Copy selection:

hash(localDate + bucketKey) % copyCount

같은 날짜/같은 Bucket에서는 같은 문구를 유지한다.

사용자 개인 비하/욕설/능력 조롱은 금지한다.

---

## 11. Settings Simplification

P1R Settings는 세 그룹만 기본 노출한다.

### 급여 / 근무

- 월급
- 근무요일
- 출근
- 퇴근
- 무급 휴게 시작
- 무급 휴게 종료

### 화면

- Privacy Mode
- Milestone

### 데이터

- Export
- Reset

제거:

- Consumer Item Editor
- 금액 소수 Toggle
- 상세 Rate option
- 사용하지 않는 Display option

Legacy localStorage의 consumerItems/showDecimals는 crash 없이 무시한다.

Display Precision:

- Today Earned: integer KRW
- Loafing Earned: integer KRW
- Free Work Wallet: integer KRW
- Rate: KRW/s 소수 3자리
- Progress: 소수 1자리

---

## 12. Responsive Rules

Desktop:

- Frame width 520~580px
- Frame height 600~720px
- Timeline inset 10~14px
- Content safe zone 최소 24px

Small browser:

- width < 420px 또는 height < 560px
- Progress 44~52px
- Today Earned 24~28px
- Loafing Earned 17~20px
- Rate 10~11px
- 가로 scroll 금지

PiP:

- 약 340~400 × 400~500
- 장식 최소화
- Activity/Privacy 접근성 유지

Mobile Portrait:

- width 320~480
- 100dvh 기반 Frame
- safe-area inset 고려
- 브라우저 control과 하단 action 충돌 금지

Domain Snapshot은 화면 크기를 알지 않는다.

---

## 13. Test Matrix

필수:

- Perimeter 0/25/50/100%
- 09:00 0%
- 12:00 37.5%
- 12:30 37.5%
- 13:00 37.5%
- 14:00 50%
- 18:00 100%
- one LOAFING segment
- multiple LOAFING segments
- Break-crossing LOAFING
- Today Earned 동일 now에서 LOAFING 유/무 동일
- Loafing Earned > 0
- Loafing Earned <= Today Earned
- Current Rate Regular > 0
- Before/Break/Free/Off/ClockedOut = 0
- Free Work 18:30 = 30m
- Wallet value > 0
- Wallet value 실제 Pay 미포함
- Free Work Perimeter = 100%
- Copy FW0/FW1/FW2/FW3
- same bucket stable copy
- Clock Out freeze
- Clock Out reload freeze
- Clock Out open LOAFING close
- Privacy regular/freework
- Main/PiP same Snapshot
- Consumer UI non-exposure
- Legacy consumer data no crash
- 3 Settings groups
- 360×480 overflow none
- 360×440 PiP overflow none
- 320×568 mobile no collision
- 560×680 desktop normal
- Milestone does not overpower perimeter
- Background 17:50 -> 19:00 => 100% + Free Work 1h, no catch-up animation

Document PiP 자동화가 불안정하면 Adapter/Shared Snapshot 자동 테스트 + 수동 Smoke를 허용한다.

---

## 14. Implementation File Plan

P1R은 기존 Prototype Domain을 확장하며 P2 Architecture를 미리 만들지 않는다.

### Domain

src/domain/prototype.ts

변경:

- AFTER_SCHEDULE -> AFTER_SCHEDULE_UNPAID
- CLOCKED_OUT
- Today Earned
- Loafing Earned
- Scheduled Progress
- Perimeter Segment
- Remaining Paid Duration
- Free Work
- Clock Out clamp

### Presentation

신규 권장:

- src/presentation/PerimeterTimeline.tsx
- src/presentation/MoneyTimer.tsx
- src/presentation/FreeWorkWallet.tsx
- src/presentation/freeWorkCopy.ts
- src/presentation/moneyTimerViewModel.ts

PerimeterTimeline:
- SVG Geometry only
- Domain pay calculation 금지

MoneyTimer:
- regular/loafing/break/before/off presentation

FreeWorkWallet:
- wallet value/duration/reference label/copy/clockout

moneyTimerViewModel:
- state label
- contextual remaining label/time
- rate display mode
- wallet mode

### App

src/App.tsx 역할 축소:

- settings
- now
- Snapshot Query
- persistence command wiring
- Main/PiP portal
- screen state

### Infrastructure

src/infrastructure/storage.ts:

- PrototypeDayControl
- load/save idempotent Clock Out
- reset/export prototype data

기존 LOAFING persistence 유지.

src/infrastructure/clock.ts, pip.ts는 기존 adapter 유지.

### Consumer

src/features/consumerValue.ts는 강제 삭제하지 않는다.

단 기본 UI/Dashboard/Settings에서 import 연결 제거.

### Style

Design Token:

- --timeline-working
- --timeline-loafing
- --timeline-inactive
- --timeline-current
- --freework-wallet

정확한 색은 실제 화면 Retention Test에서 조정한다.

### Dependency

새 npm dependency는 필요 없다.

---

## 15. Open Questions / Resolved Scope

### O1. Timeline Color

OPEN, NON-BLOCKING.

Token 역할은 확정. 실제 hue/saturation은 화면을 보고 조정한다.

### O2. Rate Zero Presentation

RESOLVED.

비유급 상태에서도 0을 숨기지 않고 Dimmed 표현한다.

Free Work에서는 regular rate와 wallet reference rate의 의미를 분리한다.

### O3. Free Work Copy Tone

OPEN, NON-BLOCKING.

Threshold/안전선은 확정. 실제 카피 강도만 사용 후 조정한다.

### O4. P1R Manual Overtime

RESOLVED.

P1R functional gate는 Clock Out까지다.

P1R에서는 Overtime multiplier source를 새로 발명하지 않는다.

따라서 P1R Test Build에서는 작동하지 않는 추가근무 버튼을 두지 않는다.

- Overtime 위치/Interaction Flow는 설계로만 보존
- 실제 Overtime 금액 산정/Settlement는 P6에서 구현
- multiplier source가 정식 결정되기 전 P1R에서 CTA 활성화 금지

---

## 16. Design Gate

확정:

- MoneyTimerFrame
- Perimeter 의미/geometry
- 상단 중앙 start
- 시계 방향
- paid duration 100%
- Break length 0
- WORKING/LOAFING segment
- marker and 100% behavior
- Today Target UI 제거
- Today Earned
- Loafing Earned
- Current Rate role
- State-specific time label
- Free Work Wallet
- exact Free Work formula
- Duration based copy buckets
- Prototype Clock Out
- CLOCKED_OUT screen
- PiP hierarchy
- Settings simplification
- Consumer PAUSED_EXPERIMENT
- Responsive
- normalized ratio
- module/file boundaries
- test matrix
- P1R no functional Overtime

P1R 구현 후 P2로 바로 가지 않는다.

실제 업무에서 다시 사용하고 Retention Review를 수행한다.

Final Design Status:

P1R_DESIGN_READY
