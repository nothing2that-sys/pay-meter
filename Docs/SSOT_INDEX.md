# PayMeter Documentation SSOT Index

이 문서는 PayMeter 구현과 검토에서 사용하는 문서 정본의 시작점이다.

## 문서 우선순위

문서 간 내용이 충돌할 경우 아래 순서를 따른다.

1. `00_MASTER_EXECUTION_RULES.md`
2. `01_PRODUCT_REQUIREMENTS.md`
3. `02_PAY_TIME_ENGINE_SPEC.md`
4. `03_DATA_STORAGE_SPEC.md`
5. `04_UI_UX_SPEC.md`
6. `05_TECHNICAL_ARCHITECTURE.md`
7. `06_IMPLEMENTATION_ROADMAP.md`
8. `07_TEST_AND_ACCEPTANCE.md`
9. `08_OPEN_DECISIONS.md`

충돌 또는 해석 불가능한 요구사항은 임의로 구현하지 않고 문서를 먼저 수정한다.

`08_OPEN_DECISIONS.md`는 아직 확정되지 않은 항목의 기록이며, 확정된 계산 Contract보다 우선하지 않는다. 결정이 내려지면 관련 상위 SSOT 문서와 테스트 기준으로 승격한다.

## 현재 제품 정의

- 제품명: PayMeter
- 형태: Local First 실시간 급여 모니터링 웹앱
- 기본 실행 형태: 반응형 Web + PWA
- 기본 표시 형태: Money Timer
- 상세 표시 형태: Full Dashboard
- 기본 저장 방식: 로컬 저장
- V1 서버: 없음
- V1 로그인 및 계정: 없음
- 현재 시각 SSOT: 사용자 디바이스 Wall Clock
- 핵심 입력: 급여, 근무 일정, 휴게시간, 정규 종료 후 전환 방식, 추가수당 정책
- 핵심 출력: 실시간 급여, 기간별 누적, 근무 상태, 업무 및 루팡 시간, 무료봉사, 추가수당

## 핵심 상태 축

### Pay State

- BEFORE_WORK
- REGULAR_WORK
- PAID_BREAK
- UNPAID_BREAK
- AFTER_SCHEDULE_UNPAID
- PAID_OVERTIME
- CLOCKED_OUT
- OFF_DAY

### Activity State

- WORKING
- LOAFING

Pay State와 Activity State는 서로 독립적으로 관리한다.

LOAFING 상태가 FIXED_PERIOD 급여 진행을 중지시키지 않는다.

## 정규 종료 후 전환 방식

사용자 설정:

- MANUAL_OVERTIME
- AUTO_OVERTIME

### MANUAL_OVERTIME

정규 종료 즉시 무료봉사 상태로 전환.

사용자가 직접 추가근무를 시작하기 전까지:

- 정규급여 Rate = 0
- 무료봉사 시간 증가
- 무료봉사 환산 가치 증가

### AUTO_OVERTIME

정규 종료 즉시 지정된 기본 Overtime Policy로 유급 추가근무를 시작.

유효한 Policy가 없으면 MANUAL_OVERTIME과 동일하게 무료봉사로 Fail Safe.

V1 기본값:

```
MANUAL_OVERTIME
```

## 시간 계산 핵심 계약

- UI Tick 수로 돈이나 시간을 누적하지 않는다.
- 디바이스 현재 시각과 persisted event를 기준으로 Snapshot을 재계산한다.
- 최초 진입, 새로고침, visibility 복귀, focus 복귀, pageshow, PWA 재실행 시 즉시 재계산한다.
- background Timer throttling은 결과에 영향을 주지 않는다.
- Schedule 경계는 Local Civil Time 기준이다.
- 09:00~18:00 설정이면 페이지를 언제 열었는지와 무관하게 18:00이 정규 종료 경계다.
- 이미 퇴근 기록이 있으면 해당 시각 이후 자동 무료봉사 또는 자동 추가근무를 발생시키지 않는다.
- 디바이스 시간이 역행해도 음수 Duration 또는 과거 확정 급여 자동 감소를 만들지 않는다.

## 급여 누적 핵심 계약

### FIXED_PERIOD

연봉, 월급, 주급 기본.

- 근무 중: 배정 일당을 예정 유급시간에 배분하여 실시간 진행 표시
- 퇴근 시: 해당 날짜 배정 일당 100% 확정
- 조기퇴근도 정규 일당을 비례 삭감하지 않음

### TIME_BASED

시급 기본.

- 실제 유급 Segment만큼 급여 확정

## UI 핵심 계약

### Money Timer

기본 진입 화면.

필수:

- 큰 실시간 누적 금액
- 현재 Rate
- 작은 Timer
- 현재 상태
- 루팡 시작 또는 업무 복귀
- Full Dashboard 진입

### Full Dashboard

유지 필수.

표시:

- 오늘 급여 진행
- 오늘 예상 또는 확정 일당
- 근무 진행률
- 업무시간
- 루팡시간
- 루팡률
- 루팡 환산 가치
- 무료봉사
- 추가수당
- 오늘, 주, 월, 연 누적
- Rate 상세
- History 진입

Money Timer를 단순화하기 위해 Full Dashboard를 제거하거나 축소하지 않는다.

## 핵심 불변 조건

- 모든 금액과 시간은 원본 설정 및 이벤트에서 재현 가능해야 한다.
- 정규 근무 종료 이후 정규급여 Rate는 즉시 0이 된다.
- 정규 종료 이후의 유급 여부는 PostWorkTransitionMode와 Overtime Policy로 결정한다.
- 법정 수당 배율을 앱이 임의로 결정하지 않는다.
- 자동 Overtime Policy가 invalid하면 무료봉사로 Fail Safe한다.
- 추가근무 Session은 시작 당시 Policy Snapshot을 보존한다.
- 새로고침, background, PWA 재실행이 결과를 바꾸지 않아야 한다.
- 월, 주, 일 경계와 시간대 변경을 테스트 가능한 구조로 만든다.
- Milestone Effect는 계산과 분리된 Presentation 기능이다.

## 구현 상태

현재 상태:

```
DESIGN BASELINE
```

기능 구현보다 문서와 계산 Contract를 먼저 확정하는 단계다.

## 문서 변경 규칙

계산 결과 또는 상태 전이에 영향을 주는 변경은 관련 문서를 함께 갱신한다.

- 급여 계산 규칙
- 시간 및 Clock 규칙
- 상태 전이 규칙
- 저장 스키마
- UI 의미
- 테스트 기대값
- 구현 Phase 범위

계산 의미 변경을 코드만 수정해서 처리하지 않는다.
