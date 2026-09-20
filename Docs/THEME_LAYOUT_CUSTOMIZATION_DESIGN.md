# PayMeter Theme and Layout Customization Design

## 0. Status

- Repository: `nothing2that-sys/pay-meter`
- Branch: `main`
- Design baseline HEAD: `57226cae57954aa515301ea72ed8730e13b2969b`
- Scope: P1R Presentation and display preferences
- Domain contract: unchanged
- P2: blocked
- Result: `THEME_LAYOUT_PHASE_1_READY`

## 1. Purpose

현재 Money Timer의 기능 구조는 유지하면서 다크 대시보드 특유의 과도한 글로우, 캡슐형 카드, 둥근 버튼 중첩과 넓은 공백을 정리한다.

테마와 레이아웃을 분리한다.

- Theme: 색상, 표면, 모서리, 그림자, 시각 밀도
- Layout: 메인 금액과 액션 영역의 배치
- Domain: 급여, 상태, Perimeter, 루팡 및 무료봉사 계산 의미

## 2. Invariants

다음 계약은 테마나 레이아웃으로 변경하지 않는다.

- Perimeter 한 바퀴는 Planned Paid Duration 100%
- unpaid break는 Perimeter 길이 0이고 진행을 멈춤
- WORKING과 LOAFING은 시간순 Segment
- 루팡 누적액은 정규 급여 내부 Breakdown이며 중복 합산 금지
- 무료봉사 환산 가치는 실제 지급액과 분리
- 메인 화면은 현재 총액이 가장 큰 정보
- 퍼센트와 퇴근까지 남은 시간은 기본 화면에 다시 추가하지 않음
- 상세보기는 일간, 주간, 월간, 연간 구조 유지

## 3. Phase 1 Themes

### 3.1 Meter Dark

기본값이다.

- 기존 Teal, Amber, Crimson 의미 유지
- 배경 그라데이션과 Perimeter bloom을 절제
- 원형 헤더 버튼을 정돈된 사각형 버튼으로 변경
- 루팡 금액 캡슐을 단순한 보조 정보 블록으로 변경
- Primary Action은 꽉 찬 형광색 대신 어두운 표면과 Accent border 사용
- 모서리 반경과 선 굵기를 제한된 토큰으로 통일

### 3.2 Mono

장시간 상시 표시를 위한 저자극 테마다.

- 배경과 표면을 무채색으로 통일
- 글로우 제거
- Perimeter와 상태는 명도 차와 텍스트를 함께 사용
- 의미 전달에 필요한 최소한의 Loafing 및 Free Work Accent만 유지
- 상세 화면에도 동일한 표면과 텍스트 토큰 적용

후속 Phase에서 Pocket과 Ledger를 추가할 수 있으나 Phase 1 완료 전 혼합하지 않는다.

## 4. Layout Presets

### Auto

기본값이다.

- Portrait: 금액 위, 액션 아래
- Landscape: 금액 왼쪽, 액션 오른쪽
- PiP: Compact 자동 적용

### Focus

금액 중심이다.

- Portrait와 Landscape 모두 금액과 보조 금액을 중앙에 유지
- 액션은 하단으로 이동
- 넓은 화면에서도 과도하게 분리하지 않음

### Split

업무용 가로 화면에 적합하다.

- Landscape에서 금액과 액션을 명확한 2열로 배치
- 좁은 Portrait에서는 안전하게 세로 배치로 fallback
- 사용자 임의 drag, resize는 허용하지 않음

## 5. Current Rate

표시 형식:

- 적립 중: `+₩6.944/초`
- 적립 정지: `₩0.000/초`
- Privacy: 금액 마스킹

Source:

- `PaySnapshot.currentRateMilliKrwPerSecond`

상태 계약:

- REGULAR_WORK: 실제 Current Rate
- BEFORE_WORK: 0
- UNPAID_BREAK: 0
- AFTER_SCHEDULE_UNPAID: 0
- OFF_DAY: 0
- CLOCKED_OUT: 0

무료봉사 기준 환산 Rate와 Current Rate를 합치지 않는다.

위치는 Header의 좌측 모서리 정보군이며 Brand, State 다음 위계다. 메인 금액과 경쟁하지 않는 작은 계측값으로 표시한다.

## 6. Settings

설정 화면에 `화면 스타일` Section을 추가한다.

- Theme: Meter Dark, Mono
- Layout: 자동, 집중형, 분할형
- 현재 선택 상태를 aria-pressed와 시각적 preview로 표시
- 저장 전 Draft에서 즉시 선택 가능
- 저장 후 main, detail, PiP에 동일 Theme 적용
- 알 수 없는 legacy 값은 Meter Dark와 Auto로 normalize

## 7. Storage

기존 settings key를 유지한다.

`display`에 다음을 추가한다.

- `theme: 'meter-dark' | 'mono'`
- `layout: 'auto' | 'focus' | 'split'`

새 DB나 별도 migration은 만들지 않는다. 기존 데이터는 load normalization으로 안전하게 보강한다.

## 8. Acceptance

- Meter Dark가 기본값
- Theme 및 Layout 선택이 reload 후 유지
- Current Rate가 상태별 계약과 일치
- Privacy에서 Rate도 마스킹
- Portrait, Landscape, PiP에서 overflow 없음
- 기존 Perimeter, Loafing, Free Work 계약과 테스트 유지
- Unit, E2E, lint, format, build 통과
