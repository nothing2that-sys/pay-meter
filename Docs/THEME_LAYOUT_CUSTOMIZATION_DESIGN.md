# PayMeter Theme and Layout Customization Design

## 0. Status

- Repository: `nothing2that-sys/pay-meter`
- Branch: `main`
- Design baseline HEAD: `[legacy-sha-removed]`
- Scope: P1R Presentation and display preferences
- Domain contract: unchanged
- Product P2: blocked
- Theme Phase 2: implemented
- Result: `THEME_LAYOUT_LIGHT_BASE_READY`

## 1. Purpose

현재 Money Timer의 기능 구조는 유지하면서 다크 대시보드 특유의 과도한 글로우, 캡슐형 카드, 둥근 버튼 중첩과 넓은 공백을 정리한다.

테마와 레이아웃을 분리한다.

- Base: 전체 표면의 명도 체계(Dark, Light)
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
- Perimeter는 콘텐츠를 침범하지 않으며, 모든 viewport에서 painted edge와 콘텐츠 사이 최소 10px 간격 유지

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

## 4. Theme Phase 2 Themes

### 4.1 Pocket

개인 지갑처럼 부드럽고 친근한 표면을 사용한다.

- 깊은 forest 배경과 절제된 mint Working Accent
- 카드와 버튼은 중간 정도의 모서리 반경과 얕은 표면 대비 사용
- Loafing과 Free Work의 기존 의미 색은 유지
- 금액 위계를 흐리는 장식과 강한 glow는 추가하지 않음

### 4.2 Ledger

수치 확인과 기록 열람에 초점을 둔 장부형 테마다.

- 차가운 ink 배경, blue-gray 구조선, 저채도 teal Working Accent
- 얇은 grid, 각진 모서리, 선형 구분 사용
- 주요 금액과 Rate에는 tabular monospace 계열 적용
- 차트와 달력도 동일한 장부 표면을 사용하되 상태 의미 색은 유지

Pocket과 Ledger는 Theme만 확장하며 Layout과 Domain 계약을 추가하지 않는다.

## 5. Color Base

모든 Theme는 Dark와 Light 두 Base에서 동작한다. Theme를 8개로 복제하지 않고 Base와 Theme를 독립 저장하여 `2 × 4` 조합을 만든다.

- Dark: 기존 구현과 기존 저장 데이터의 기본값
- Light: 밝은 배경, 어두운 본문, 낮은 채도의 구조선 사용
- Meter는 선택한 Base에 따라 UI에 `Meter Dark` 또는 `Meter Light`로 표시
- Mono는 무채색, Pocket은 warm white와 mint, Ledger는 밝은 paper와 blue-gray grid 성격 유지
- Working, Loafing, Free Work의 의미 색과 정보 위계는 Base 변경으로 바꾸지 않음

기존 데이터에 Base 값이 없거나 알 수 없는 값이면 `dark`로 normalize한다.

## 6. Layout Presets

### Perimeter Safe Inset

Perimeter는 viewport 내부 `0.7%` 경로에 그려지므로 고정 padding만 사용하지 않는다.

- 콘텐츠 시작점은 `Perimeter path center + 최대 stroke 절반 + 10px` 바깥으로 배치
- 상하단은 `0.7dvh`, 좌우는 `0.7dvw`를 반영해 viewport가 커질수록 safe inset도 증가
- OS safe-area가 더 크면 `safe-area-inset + 10px`를 우선
- Desktop, Portrait, compact landscape, PiP에 같은 최소 간격 계약 적용

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

## 7. Current Rate

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

## 8. Settings

설정 화면에 `화면 스타일` Section을 추가한다.

- Base: 다크, 라이트
- Theme: Meter, Mono, Pocket, Ledger
- Layout: 자동, 집중형, 분할형
- 현재 선택 상태를 aria-pressed와 시각적 preview로 표시
- 저장 전 Draft에서 즉시 선택 가능
- 저장 후 main, detail, PiP에 동일 Theme 적용
- 알 수 없는 legacy 값은 Meter Dark와 Auto로 normalize

## 9. Storage

기존 settings key를 유지한다.

`display`에 다음을 추가한다.

- `colorMode: 'dark' | 'light'`
- `theme: 'meter-dark' | 'mono' | 'pocket' | 'ledger'`
- `layout: 'auto' | 'focus' | 'split'`

새 DB나 별도 migration은 만들지 않는다. 기존 데이터는 load normalization으로 안전하게 보강한다.

## 10. Acceptance

- Dark + Meter가 기본값
- Light Base에서 Meter, Mono, Pocket, Ledger가 각각 고유한 표면을 유지
- Pocket과 Ledger가 main, detail, PiP에 동일하게 적용
- Theme 및 Layout 선택이 reload 후 유지
- Current Rate가 상태별 계약과 일치
- Privacy에서 Rate도 마스킹
- Portrait, Landscape, PiP에서 overflow 없음
- Desktop, Portrait, compact landscape, PiP에서 Perimeter와 콘텐츠 간격 10px 이상
- 실제 Chrome Document PiP의 stylesheet 복제와 portal rendering은 release smoke로 확인
- 기존 Perimeter, Loafing, Free Work 계약과 테스트 유지
- Unit, E2E, lint, format, build 통과
