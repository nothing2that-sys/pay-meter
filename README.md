# PayMeter

PayMeter는 사용자가 설정한 급여와 근무시간을 기준으로 오늘 하루의 진행과 돈의 흐름을 작은 위젯처럼 보여주는 Local First Money Timer 웹앱입니다.

PayMeter는 정밀 근태 시스템이나 급여 명세서 생성기가 아닙니다. 핵심은 작은 화면을 오래 띄워두고, 오늘이 얼마나 진행됐는지와 그 시간의 금전적 가치를 직관적으로 체감하는 것입니다.

## 핵심 경험

- 기본 화면은 Money Timer
- 화면 외곽 한 바퀴가 오늘 예정 유급시간 100%를 나타내는 Progress Timeline
- 외곽 Timeline에서 정상근무와 LOAFING 구간을 서로 다른 색으로 표현
- 중앙에는 현재 상태, 오늘 진행률, 퇴근까지 남은 시간 표시
- 돈 정보는 기본 화면에서 "오늘 번 돈"과 "그중 루팡으로 번 돈" 두 개를 핵심으로 표시
- 현재 Rate는 구석에 작은 계측값으로 표시
- WORKING은 기본 추론하고 LOAFING만 사용자가 직접 기록
- 무급 휴게시간은 Progress와 Activity 집계에서 제외
- 정규 근무 종료 후 외곽 Progress는 100%에서 완료되고 무료봉사 Wallet 모드로 전환
- 무료봉사 Wallet에는 실제 지급액이 아닌 무상 노동 환산 가치가 실시간으로 증가
- 무료봉사 상태에서는 사용자가 아니라 상황을 비꼬는 짧은 카피를 사용
- 데스크톱 지원 브라우저에서는 Document Picture-in-Picture 위젯 제공
- Privacy Mode
- 10,000원 단위 Milestone Effect
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

## 기본 화면

정규 근무 중:

- 외곽 Progress Timeline
- 정상근무 / LOAFING 색상 Segment
- 현재 상태
- 오늘 진행률
- 퇴근까지 남은 시간
- 오늘 번 돈
- 그중 루팡으로 번 돈
- 작은 Current Rate
- 루팡 시작 / 업무 복귀
- Privacy Mode

Daily Target Pay는 계산에 필요하지만 기본 화면에는 표시하지 않습니다.

## 무료봉사 모드

Scheduled End 이후 Clock Out 전까지 유급 Overtime이 없으면 무료봉사 상태입니다.

- 정규 Progress는 100%에서 완료
- 오늘 정규 급여 증가는 정지
- 무료봉사 Wallet이 별도 표시
- Wallet에는 무료봉사 시간과 기준 급여 환산 가치가 증가
- Wallet 금액은 실제 급여 총액에 포함되지 않음
- UI에는 "실제 지급액 아님" 의미를 명확히 표시
- 짧은 상황 조롱 카피를 Threshold 기반으로 노출

예:

- "정규 근무는 끝났는데 왜 아직 여기 계시죠?"
- "현재 회사에 무상 노동 가치 제공 중"
- "월급은 멈췄지만 시간은 계속 나가고 있습니다."

## Document PiP

지원 브라우저에서 사용자가 명시적으로 위젯을 열면 작은 Always-on-top 창으로 Money Timer를 표시합니다.

지원 여부는 User Agent 문자열이 아니라 API feature detection으로 판단합니다.

PiP에서도 동일한 Domain Snapshot과 외곽 Progress 개념을 사용합니다.

## Full Dashboard

- 오늘 번 돈
- 루팡으로 번 돈
- 이번 주
- 이번 달
- 업무시간
- 루팡시간
- 루팡률
- 무료봉사
- 추가근무
- Timeline 및 History 진입

## 보류된 실험

Consumer Value는 초기 P1에서 실험했으나 기본 화면과 제품 흐름을 복잡하게 만든다는 초기 사용 피드백으로 V1 핵심 기능에서 일단 제외합니다.

필요성이 다시 확인되기 전까지 기본 UI와 설정에서 노출하지 않습니다.

## 문서 정본

구현과 검토는 Docs/SSOT_INDEX.md에서 시작합니다.

## Repository

- Project: PayMeter
- Repository: nothing2that-sys/pay-meter
