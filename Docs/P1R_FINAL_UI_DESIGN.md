# PayMeter — P1R Final Money Timer UI Design

## 0. Status

- Repository: `nothing2that-sys/pay-meter`
- Branch: `main`
- Design baseline HEAD: `[legacy-sha-removed]`
- Scope: P1R Presentation / Responsive UI only
- P2: BLOCKED
- Result: `P1R_FINAL_UI_DESIGN_READY`

이 문서는 P1R Retention Test 직전 확정된 Money Timer 최종 UI 방향을 기록한다.

기존 `P1R_RETENTION_UX_REWORK_DESIGN.md`의 Domain contract와 계산 의미는 유지한다.
단, 기본 Money Timer의 정보 위계, 상태별 색상, Perimeter 표현, Portrait/Landscape 구성은 이 문서를 최신 Presentation 기준으로 사용한다.

---

## 1. Final UX Principle

Money Timer는 숫자와 상태를 빠르게 읽는 계측기다.

기본 화면에서는 설명을 최소화하고 현재 상태에서 가장 중요한 금액을 가장 크게 표시한다.

공통 제거 항목:

- Progress 퍼센트 숫자
- 퇴근까지 남은 시간
- `오늘 번 돈` 라벨
- 불필요한 설명 문구
- 중복된 진행률 UI

공통 유지 항목:

- 화면 최외곽 Perimeter
- 상태
- 가장 중요한 현재 금액
- 루팡 누적액 또는 무료봉사 관련 보조 정보
- Privacy
- Settings
- Primary Action
- Detail Action

---

## 2. Perimeter — One Full Loop = 100%

### 2.1 Core Meaning

화면 최외곽의 Rounded Rectangle 한 바퀴 전체가 해당 근무일의 Planned Paid Duration 100%다.

Perimeter는 장식용 테두리가 아니라 실제 진행률 UI다.

- 0.0 = 시작점
- 1.0 = 한 바퀴 완료
- source = `scheduledProgressRatio`
- 시작점 = 상단 중앙
- 진행 방향 = 시계 방향
- unpaid break = path length 0
- break 중 progress freeze
- Scheduled End = 100%
- Free Work = 100% 완료 상태 유지

### 2.2 Segment Semantics

외곽선은 하나의 연속된 Timeline이다.

별도의 여러 progress ring처럼 보이게 만들지 않는다.

이미 지나간 구간 안에서만 Activity 상태를 색으로 구분한다.

예:

`WORKING -> LOAFING -> WORKING -> LOAFING -> WORKING -> inactive`

즉:

- elapsed WORKING = Working Theme color
- elapsed LOAFING = Loafing Theme color
- future = inactive color

루팡 구간 때문에 전체 진행률 자체가 끊기거나 별도 bar로 분리되면 안 된다.

### 2.3 Visual Weight

외곽선은 기존보다 명확하게 두껍게 한다.

권장 CSS 기준:

- Desktop / large mobile: 8~12px visual stroke
- Small mobile / PiP: 6~9px visual stroke
- Frame inset: 가능한 최외곽에 가깝게 4~8px

과도한 bloom/neon은 금지한다.
색 자체보다 두께와 대비로 진행 상태를 읽을 수 있어야 한다.

### 2.4 No Second Progress SSOT

화면 중앙에 원형 ring 또는 장식이 존재하더라도 별도의 진행률 SSOT로 사용하지 않는다.

실제 진행률 SSOT는 화면 최외곽 Perimeter 하나다.

중앙 원형 요소를 사용할 경우:

- 금액을 감싸는 visual container
- 상태 배경
- subtle decoration

역할만 허용한다.

---

## 3. State Theme System

세 상태는 Layout 구조는 유지하고 Accent Theme만 명확하게 바뀐다.

### 3.1 WORKING

의미:
정상 유급 근무 진행 중.

Theme:
차분한 Teal / Cyan-Green.

권장 초기 token:

- `--state-working: #35B7AA`
- `--state-working-soft: #1D6E68`

느낌:

- 안정적
- 정상
- 차분함
- 과도하게 형광색처럼 보이지 않음

### 3.2 LOAFING

의미:
유급시간 안에서 LOAFING 상태.

Theme:
Muted Amber / Orange.

권장 초기 token:

- `--state-loafing: #D89335`
- `--state-loafing-soft: #7A4D1F`

WORKING과 즉시 구분되어야 한다.

### 3.3 FREE WORK

의미:
Scheduled End 이후 Clock Out 전 무급 시간.

Theme:
Deep Crimson / Red.

권장 초기 token:

- `--state-freework: #D94C59`
- `--state-freework-strong: #F05A67`
- `--state-freework-soft: #742933`

무료봉사는 경고창처럼 번쩍이지 않는다.
다만 다른 두 상태보다 강한 의미를 가지므로 메인 숫자와 Perimeter Accent에 Red 계열을 사용한다.

### 3.4 Shared Neutral

권장:

- Background: `#0D1117` 계열
- Surface: `#151B22` 계열
- Secondary Surface: `#1B222B` 계열
- Primary Text: `#F2F5F7`
- Secondary Text: `#929BA6`
- Inactive Timeline: `#28313A`

색상은 Retention Test에서 미세조정할 수 있으나 상태 간 역할은 변경하지 않는다.

---

## 4. WORKING Screen

### 4.1 Main Hierarchy

가장 큰 요소:

`todayEarnedMicroKrw`

예:

`₩ 86,420`

표시하지 않는 Label:

`오늘 번 돈`

상태 배지:

`업무 중`

보조 상태:

`정상 적립 중`

### 4.2 Loafing Amount Is Always Visible

업무중 상태에서도 현재까지 누적된 루팡 금액을 하단 보조 영역에 표시한다.

권장:

- Label: `루팡 누적액`
- Value: `₩ 3,280`

값이 0이면:

`₩ 0`

으로 안정적으로 표시한다.

업무중 화면에서 루팡액을 숨기지 않는다.

### 4.3 Action

Primary:

`루팡 모드`

Secondary:

`상세 보기`

---

## 5. LOAFING Screen

메인 총액은 WORKING과 동일하게:

`todayEarnedMicroKrw`

를 가장 크게 보여준다.

LOAFING은 급여 총액을 대체하는 별도 Pay가 아니다.

상태 배지:

`루팡 모드`

보조 금액:

- Label: `루팡 누적액`
- Value: `₩ 3,280`

루팡 누적액은 WORKING 화면보다 Accent를 조금 더 줄 수 있으나 메인 총액보다 커지면 안 된다.

Primary Action은 기존 Activity Toggle 의미를 따른다.

실제 Action label은:

`업무 복귀`

가 기본이다.

Secondary:

`상세 보기`

---

## 6. FREE WORK Screen

### 6.1 Main Hierarchy Changes

무료봉사 상태에서는 정보 우선순위가 바뀐다.

가장 큰 요소:

`freeWorkReferenceValueMicroKrw`

표시:

`₩ 12,500`

중요:

- `+` 기호를 붙이지 않는다.
- 금액 숫자는 Crimson / Red 계열로 표시한다.
- 기본 화면에서 `실제 지급액 아님` 문구를 표시하지 않는다.

상태 배지:

`무료봉사 중`

Title:

`무료봉사 WALLET`

### 6.2 Free Work Time

메인 금액 아래에 표시한다.

Label:

`무료봉사 시간`

Value 예:

`01:12:40`

금액보다 작은 위계다.

### 6.3 Regular Earned Summary

정상 유급 근무에서 이미 적립된 금액은 보조 카드에 표시한다.

Label:

`정상 적립 금액`

Value:

`₩ 86,420`

메인 무료봉사 금액보다 명확히 작아야 한다.

### 6.4 Actions

Primary:

`퇴근`

Secondary:

`상세 내역 보기`

---

## 7. Portrait Layout

Portrait는 세 상태 모두 같은 기본 skeleton을 사용한다.

1. Header
2. Main Meter Area
3. Secondary Amount Area
4. Primary Action
5. Detail Action

### Main Meter Area

WORKING:

- 업무 중
- Main Earned Amount
- 정상 적립 중

LOAFING:

- 루팡 모드
- Main Earned Amount
- 루팡 누적액

FREE WORK:

- 무료봉사 중
- 무료봉사 WALLET
- Free Work Amount
- Free Work Duration

세 상태 전환 시 큰 Layout Shift를 최소화한다.

---

## 8. Landscape Layout

Landscape는 단순 축소가 아니라 Two-Column layout을 사용한다.

### 8.1 Left Main Zone

약 52~58% width.

포함:

- State badge
- Main Amount
- State-specific secondary info
- optional central visual container

### 8.2 Right Action Zone

약 42~48% width.

포함:

- secondary amount card
- Primary Action
- Detail Action
- Privacy / Settings

### 8.3 FREE WORK Landscape

Left:

- `무료봉사 중`
- `무료봉사 WALLET`
- `₩ 12,500`
- `무료봉사 시간 01:12:40`

Right:

- `정상 적립 금액 ₩ 86,420`
- `퇴근`
- `상세 내역 보기`

무료봉사 금액은 Landscape에서도 화면에서 가장 큰 숫자다.

### 8.4 Responsive Trigger

권장:

- Portrait: width < height
- Landscape: width >= height
- Small-height landscape에서는 decorative element를 우선 줄이고 금액과 Action을 보존한다.

---

## 9. Amount Typography

Priority:

1. State Main Amount
2. Secondary Amount
3. State
4. Supporting Text

권장:

- Main Amount: clamp 44~76px
- Landscape Main Amount: clamp 46~82px
- Secondary Amount: 20~32px
- Status: 14~20px

숫자는 tabular nums를 유지한다.

---

## 10. Optional Display Theme — 7 Segment

표시 테마 옵션으로 7 Segment 계열을 허용한다.

이 옵션은 정보 구조를 바꾸지 않는다.

변경되는 것:

- Main Amount digit face
- Secondary Amount digit face
- Free Work Duration digit face

변경되지 않는 것:

- State Theme color
- Perimeter semantics
- Amount hierarchy
- Layout
- Domain calculation

7 Segment는 장식적 HUD 전체 테마가 아니라 숫자 표시 스타일 옵션으로 제한한다.

과도한 grid, scanline, cyberpunk decoration은 기본 테마에 포함하지 않는다.

---

## 11. Privacy

Privacy Mode에서는 모든 금액을 동일하게 mask한다.

포함:

- Main Earned
- Loafing Amount
- Free Work Amount
- Regular Earned Summary

상태와 Perimeter 진행은 유지한다.

---

## 12. P1R Domain Contract Preservation

이 디자인 변경으로 다음 Domain 의미를 바꾸지 않는다.

- `todayEarnedMicroKrw`
- `loafingEarnedValueMicroKrw`
- `scheduledProgressRatio`
- `perimeterSegments`
- `freeWorkDurationMs`
- `freeWorkReferenceValueMicroKrw`
- `baseVisualizationRateMilliKrwPerSecond`
- Clock Out contract
- Break exclusion
- Tick independence

이번 변경은 Presentation / ViewModel 중심이다.

---

## 13. Explicitly Removed From Main Timer

다음은 기본 Money Timer에서 보여주지 않는다.

- Progress percentage number
- Remaining-to-clock-out time
- Today Target
- `오늘 번 돈` label
- Loafing ratio
- Current detailed rate
- Consumer Value
- Free Work `+` prefix
- Free Work `실제 지급액 아님` text

필요한 상세 정보는 Detail/Dashboard에서 제공한다.

---

## 14. Acceptance Checklist

### Common

- [ ] Percentage number 없음
- [ ] Remaining time 없음
- [ ] `오늘 번 돈` 없음
- [ ] Main amount가 가장 큼
- [ ] Outer Perimeter 한 바퀴 = 100%
- [ ] Outer Perimeter가 충분히 두꺼움
- [ ] Portrait 정상
- [ ] Landscape 정상

### WORKING

- [ ] Teal theme
- [ ] Main amount = Today Earned
- [ ] `업무 중`
- [ ] 루팡 누적액 하단 표시

### LOAFING

- [ ] Amber theme
- [ ] Main amount = Today Earned
- [ ] `루팡 모드`
- [ ] 루팡 누적액 표시
- [ ] WORKING과 색으로 즉시 구분

### FREE WORK

- [ ] Crimson/Red theme
- [ ] Main amount = Free Work value
- [ ] 메인 숫자 Red
- [ ] `+` 없음
- [ ] `실제 지급액 아님` 없음
- [ ] Free Work Duration 표시
- [ ] Regular Earned는 보조 카드
- [ ] Perimeter 100%

---

## 15. Final Decision

이 문서의 디자인 방향을 P1R Retention Test용 최종 Money Timer UI 기준으로 확정한다.

최종 상태:

`P1R_FINAL_UI_DESIGN_READY`

구현 완료 후 바로 P2로 이동하지 않는다.

먼저 이 UI로 실제 업무 중 `P1R_RETENTION_TEST`를 수행한다.


---

## 16. 2026-09-19 Final Visual Correction

실제 Android/PWA 사용 피드백에 따라 다음 사항을 최종 우선 규칙으로 확정한다.

### 16.1 Center Meter

- 중앙 원형 Meter / Ring UI는 제거한다.
- 진행률을 표현하는 원형 Progress UI를 추가하지 않는다.
- 메인 화면의 진행률 시각화는 화면 최외곽 Perimeter 하나만 사용한다.
- 메인 금액은 중앙 공간을 더 크게 사용한다.

### 16.2 Perimeter Simplification

이전의 WORKING / LOAFING historical segment 다중 stroke 표현은 기본 화면에서 제거한다.

최종 표현:

- 한 바퀴 전체 = 100%
- 하나의 inactive base line
- 하나의 continuous elapsed progress line
- source = `scheduledProgressRatio`
- 시작 = 상단 중앙
- 방향 = 시계 방향
- 현재 WORKING = Teal progress line
- 현재 LOAFING = Amber progress line
- FREE WORK = Red 100% progress line
- unpaid break 중 ratio freeze

외곽 진행선이 여러 조각 또는 등분된 progress로 보이면 실패다.

### 16.3 State Label Position

상태는 PayMeter Logo 바로 아래에 표시한다.

표시 문구:

- WORKING: `업무중`
- LOAFING: `루팡중`
- AFTER_SCHEDULE_UNPAID: `봉사중`

상태를 메인 금액 내부나 중앙 별도 Ring 안에 배치하지 않는다.

### 16.4 Removed Copy

기본 화면에서 추가 제거:

- `정상 적립 중`
- `무료봉사 WALLET`

무료봉사에서는 큰 Red 금액과 무료봉사 시간만 중심 정보로 유지한다.

### 16.5 Full Viewport / PWA

Money Timer는 Android 설치형 PWA 포함 모든 viewport에서:

- document horizontal scroll = 0
- document vertical scroll = 0
- frame width <= viewport width
- frame height <= viewport height
- refresh 후에도 동일
- safe-area inset 내부 배치

를 만족한다.

Money Timer 자체는 scroll container를 만들지 않는다.
설정 / 상세 화면만 별도 내부 scroll을 허용한다.

### 16.6 Detail Accumulation

상세 내역에는 다음 누적 요약과 그래프를 제공한다.

- 일간 누적
- 주간 누적
- 월간 누적
- 선택 Period의 cumulative line graph

P1R에서는 새 History Persistence를 만들지 않는다.
FIXED_PERIOD Prototype 기준으로:

- 오늘 = 현재 Snapshot
- 과거 근무일 = 해당 월 Daily Target allocation
- 미래 날짜 = 누적하지 않음

으로 현재까지의 정규 누적 시각화를 만든다.

이 표현은 P2/P3 정식 WorkDay History 도입 후 실제 History 기반 집계로 교체 가능하다.
