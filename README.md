# PayMeter

PayMeter는 사용자가 설정한 급여와 근무시간을 기준으로 현재 벌고 있는 금액을 타이머처럼 실시간으로 보여주는 Local First 급여 모니터링 웹앱입니다.

기본 화면은 작은 브라우저 창이나 휴대폰에 계속 띄워둘 수 있는 Money Timer 형태로 동작하고, 필요할 때 Full Dashboard에서 세부 통계를 확인합니다.

## 핵심 경험

- 현재 누적 급여를 실시간 Money Timer로 표시
- 초당, 분당, 시간당, ms당 급여 가치 확인
- 근무 경과시간과 퇴근까지 남은 시간 표시
- 한 번의 버튼으로 WORKING / LOAFING 상태 전환
- 루팡 중에도 FIXED_PERIOD 급여 진행은 계속
- 오늘, 이번 주, 이번 달, 올해 누적 금액 확인
- 정규 근무 종료 후 무료봉사 시간과 환산 가치 확인
- 연장근무, 야간근무, 휴일근무 등 사용자 정의 추가수당 지원
- 5,000원 또는 10,000원 단위 Milestone Effect
- Compact Mode 및 Corner Display
- 상세 Full Dashboard와 History 제공

## 시간 기준

PayMeter의 현재 시각 SSOT는 사용자의 디바이스 Wall Clock입니다.

브라우저가 열려 있지 않거나 background Timer가 중단되어도 마지막 Tick에서 이어 더하지 않습니다.

다시 열었을 때 현재 디바이스 시각과 저장된 Schedule, Session, Event를 기준으로 현재 상태와 금액을 재계산합니다.

예:

```
17:50 화면 이탈
18:00 정규 퇴근
19:00 다시 실행
```

정규 종료 후 설정에 따라 18:00부터 19:00까지의 상태를 무료봉사 또는 추가근무로 재구성합니다.

## 정규 근무 종료 후 동작

사용자가 기본 설정에서 선택합니다.

### MANUAL_OVERTIME

정규 퇴근 시간이 지나면 자동으로 무료봉사 상태로 전환합니다.

- 정규급여 증가 정지
- 무료봉사 시간 증가
- 무료봉사 환산 가치 증가
- 사용자가 직접 추가근무 시작 가능

### AUTO_OVERTIME

정규 퇴근 시간이 지나면 사용자가 지정한 기본 Overtime Policy로 추가근무를 자동 시작합니다.

유효한 Overtime Policy가 없으면 무료봉사 상태로 Fail Safe합니다.

V1 기본값은 MANUAL_OVERTIME입니다.

## 급여 누적 방식

### FIXED_PERIOD

연봉, 월급, 주급 사용자를 기본 대상으로 합니다.

근무 중에는 오늘 배정 일당이 시간에 따라 진행되는 형태로 보여주고, 사용자가 퇴근하면 해당 근무일의 정규 일당을 100% 확정합니다.

### TIME_BASED

시급 사용자를 기본 대상으로 합니다.

실제 유급시간만큼 급여가 확정됩니다.

## 기본 원칙

- Local First
- 계정 없이 사용 가능
- V1은 서버 없이 동작
- 설정과 이력은 사용자 기기 로컬에 저장
- 디바이스 Wall Clock을 현재 시각 기준으로 사용
- 금액 계산은 UI Tick 누적이 아니라 timestamp와 시간 Segment 기반
- Pay State와 Activity State를 분리
- 정규 근무 종료 후 동작은 사용자 설정으로 결정
- 추가수당은 사용자 정의 Overtime Policy만 사용
- 법정 수당을 앱이 임의로 확정하지 않음
- 새로고침, background, PWA 재실행 후에도 재현 가능한 계산
- 기본 Money Timer와 Full Dashboard를 모두 유지
- PWA 설치 지원

## 문서 정본

구현 기준은 `Docs/SSOT_INDEX.md`를 시작점으로 사용합니다.

## Repository

- Project: PayMeter
- Repository: nothing2that-sys/pay-meter
