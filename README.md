# PayMeter

PayMeter는 사용자가 설정한 급여와 근무시간을 기준으로 지금 벌고 있는 금액을 타이머처럼 보여주는 Local First Money Timer 웹앱입니다.

PayMeter는 정밀 근태 시스템이나 급여 명세서 생성기가 아닙니다. 핵심은 작은 화면을 오래 띄워두고, 오늘의 시간을 돈의 흐름으로 가볍게 체감하는 것입니다.

## 핵심 경험

- 기본 화면은 Money Timer
- 데스크톱 지원 브라우저에서는 Document Picture-in-Picture 위젯 제공
- 모바일에서는 책상 위에 세워두는 상시 표시 경험 우선
- FIXED_PERIOD 월급형은 오늘 목표 일당을 진행률로 채워가는 방식
- TIME_BASED 시급형은 Clock In 이후 실제 유급시간 기준
- WORKING은 기본 추론하고 LOAFING만 사용자가 직접 기록
- 정규 근무 종료 후에는 무료봉사 상태로 전환
- 유급 추가근무는 사용자가 직접 시작하며 단일 배율만 지원
- 무료봉사 구간을 추가근무 시작 시 정규 종료 시각까지 소급 전환 가능
- 하루 타임라인을 5분 단위로 사후 보정
- 오늘, 이번 주, 이번 달 통계
- 10,000원 단위 Milestone Effect
- 소비재 금액 환산
- Privacy Mode
- JSON Export
- PWA 및 Offline App Shell

## 시간 기준

현재 시각의 SSOT는 사용자 디바이스 Wall Clock입니다.

PayMeter는 setInterval 호출 횟수나 UI Tick 수로 돈과 시간을 누적하지 않습니다. 현재 디바이스 시각, Schedule, Clock In/Out, LOAFING 구간, Overtime Session 같은 원본 데이터를 기준으로 Snapshot을 다시 계산합니다.

따라서 background throttling, 새로고침, 모바일 sleep, PWA 재실행이 계산 결과를 바꾸면 안 됩니다.

## V1 단순화 원칙

V1에서는 다음을 하지 않습니다.

- AUTO_OVERTIME
- 복합 추가수당 정책
- 고정 추가수당
- 야간 수당 자동 판정
- 공휴일 및 연차 자동 처리
- 교대근무 및 자정 넘김 Schedule
- 복수 직장
- 연간 통계
- ms당 급여 표시
- 정밀 세금 및 4대보험 계산
- 법정 수당 자동 판정

추가근무는 사용자가 직접 시작하고, 배율 하나만 사용합니다.

## 화면 구조

### Money Timer

항상 띄워두는 기본 화면입니다.

- 현재 진행 금액
- 오늘 목표 금액과 진행률
- 현재 Rate
- 작은 Timer
- 현재 상태
- 루팡 시작 또는 업무 복귀
- 상세 Dashboard 진입
- Privacy Mode

### Document PiP

지원 브라우저에서 사용자가 명시적으로 위젯을 열면 작은 Always-on-top 창으로 Money Timer를 표시합니다.

지원 여부는 User Agent 문자열이 아니라 API feature detection으로 판단합니다.

PiP에서는 Milestone Effect를 비활성화합니다.

### Full Dashboard

- 오늘 급여
- 이번 주
- 이번 달
- 업무시간
- 루팡시간
- 루팡률
- 무료봉사
- 추가근무
- 소비재 환산
- Timeline 및 History 진입

## 문서 정본

구현과 검토는 Docs/SSOT_INDEX.md에서 시작합니다.

## Repository

- Project: PayMeter
- Repository: nothing2that-sys/pay-meter
