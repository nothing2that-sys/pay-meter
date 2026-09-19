# PayMeter Documentation SSOT Index

이 문서는 PayMeter 구현과 검토에서 사용하는 문서 정본의 시작점이다.

## 1. 문서 우선순위

문서 간 충돌 시 다음 순서를 따른다.

1. 00_MASTER_EXECUTION_RULES.md
2. 01_PRODUCT_REQUIREMENTS.md
3. 02_PAY_TIME_ENGINE_SPEC.md
4. 03_DATA_STORAGE_SPEC.md
5. 04_UI_UX_SPEC.md
6. 05_TECHNICAL_ARCHITECTURE.md
7. 06_IMPLEMENTATION_ROADMAP.md
8. 07_TEST_AND_ACCEPTANCE.md
9. 08_OPEN_DECISIONS.md

충돌하거나 해석할 수 없는 계산 Contract는 코드에서 임의 결정하지 않고 문서를 먼저 수정한다.

## 2. 제품 정의

PayMeter는 정밀 근태 도구가 아니라 상시 띄워두는 캐주얼 Money Timer다.

우선순위는 다음과 같다.

1. 계속 켜두고 싶은가
2. 조작이 적은가
3. 실수해도 쉽게 보정 가능한가
4. 같은 원본 데이터에서 같은 금액이 재현되는가
5. 세부 통계가 이해하기 쉬운가

법적 급여 계산, 회사 근태 시스템 대체, 생산성 감시는 목표가 아니다.

## 3. 핵심 Surface

- Money Timer
- Document PiP Widget
- Full Dashboard
- Timeline and History
- Settings

Money Timer가 기본 화면이며 Full Dashboard는 삭제하지 않는다.

Document PiP는 지원 브라우저의 데스크톱 상시 표시 수단이다. 지원하지 않는 환경에서는 일반 Money Timer를 사용한다.

## 4. 시간 SSOT

현재 시각의 SSOT는 사용자 디바이스 Wall Clock이다.

금지:

- money += ratePerTick
- elapsed += interval
- requestAnimationFrame 누적값을 급여 시간으로 사용
- background 동안 놓친 Tick 수로 복구

허용:

- persisted event와 현재 Wall Clock을 사용한 Snapshot 재계산

## 5. V1 Pay State

- OFF_DAY
- BEFORE_WORK
- AWAITING_CLOCK_IN
- REGULAR_WORK
- UNPAID_BREAK
- AFTER_SCHEDULE_UNPAID
- PAID_OVERTIME
- CLOCKED_OUT

AWAITING_CLOCK_IN은 TIME_BASED에서만 사용한다.

시간 오류나 데이터 손상은 Pay State에 섞지 않고 별도 integrityStatus로 표시한다.

## 6. Activity Contract

V1 Activity 의미는 단순화한다.

- 유급 활동 가능 시간의 기본 상태는 WORKING
- 사용자는 LOAFING만 명시적으로 기록
- WORKING Session 자체는 저장하지 않음
- WORKING 시간은 Activity Eligible Time에서 LOAFING 시간과 무급 휴게를 제외해 계산
- 휴게시간에는 Activity Toggle 비활성
- 휴게가 끝나면 휴게 직전의 LOAFING 의도를 유지
- LOAFING은 FIXED_PERIOD 급여를 중단시키지 않음

## 7. FIXED_PERIOD 핵심 Contract

ANNUAL, MONTHLY, WEEKLY는 기본 FIXED_PERIOD다.

기간 급여를 근무일 수로 나누지 않는다.

기간의 예정 유급시간 총합을 기준으로 일정한 Visualization Rate를 만든다.

- Period Visualization Rate = Period Pay / Planned Paid Duration Of Period
- Daily Target Pay = Period Pay × Planned Paid Duration Of Day / Planned Paid Duration Of Period

퇴근 처리 시 FIXED_PERIOD의 해당 날짜 정규 Daily Target은 100% 확정한다.

조기퇴근 차감 옵션은 V1에 없다.

ANNUAL은 V1에서 월 단위 배분을 위해 Annual / 12의 월 급여로 정규화한다.

## 8. TIME_BASED 핵심 Contract

HOURLY는 기본 TIME_BASED다.

실제 정규 유급시간은 Clock In과 Clock Out을 기준으로 한다.

Clock In 없이 Schedule만으로 실제 유급시간을 추정하지 않는다.

## 9. 정규 종료 후 Contract

AUTO_OVERTIME은 V1에 없다.

Scheduled End 이후 Clock Out 전까지 기본 상태는 AFTER_SCHEDULE_UNPAID다.

무료봉사는 저장 Session이 아니라 Schedule End, Clock Out, Overtime Session에서 파생한다.

사용자가 추가근무를 시작하면 단일 multiplier가 적용된 PAID_OVERTIME이 된다.

추가근무 시작 시 사용자는 현재 시각 또는 정규 종료 시각부터 소급 시작을 선택할 수 있다.

## 10. Overtime Contract

V1 추가근무 정책은 multiplier 하나뿐이다.

예:

- 1.0x
- 1.5x
- 2.0x

별도 Policy Version 시스템은 두지 않는다.

다만 Overtime Session에는 과거 금액 불변성을 위해 다음 계산 Snapshot을 저장한다.

- multiplierBasisPointsSnapshot
- baseRateSnapshot

설정을 바꿔도 종료된 Session의 금액은 바뀌지 않는다.

## 11. Day and Time Zone Contract

Schedule은 Local Civil Time 기준이다.

Work Day가 materialize될 때 timeZoneSnapshot과 해당 Day의 Schedule Snapshot을 고정한다.

이후 디바이스 Time Zone이 바뀌어도 이미 존재하는 과거 Day를 다시 해석하지 않는다.

V1은 자정을 넘기는 Schedule을 지원하지 않는다.

이전 Day가 Clock Out 없이 자정을 넘기면 자동으로 다음날까지 연장 계산하지 않는다.

- 계산 구간은 해당 Day의 local midnight에서 임시 clamp
- integrityStatus = NEEDS_TIME_REVIEW
- Timeline Correction으로 실제 종료 시각을 보정

## 12. 과거 데이터 불변성

다음은 과거 결과를 바꾸면 안 된다.

- 급여 설정 변경
- Weekly Schedule 변경
- Overtime multiplier 변경
- Time Zone 변경

이를 위해 Salary와 Schedule은 effective history를 유지하고, materialized Work Day는 해당 날짜의 계산 Snapshot을 가진다.

## 13. 저장 원칙

- 현재 표시 금액을 Tick마다 저장하지 않는다.
- 무료봉사 Session을 저장하지 않는다.
- WORKING Session을 저장하지 않는다.
- 원본 Event와 계산에 필요한 Snapshot만 저장한다.
- Daily Summary는 Cache이며 SSOT가 아니다.
- Snapshot 계산 함수는 저장 부작용이 없는 Pure Function이어야 한다.
- 상태 변경 Command는 IndexedDB transaction 안에서 검증과 쓰기를 함께 수행한다.

## 14. Multi-tab Contract

V1은 Web Locks를 필수로 하지 않는다.

우선 사용:

- deterministic natural key
- IndexedDB unique index
- IndexedDB readwrite transaction
- BroadcastChannel invalidation

동일 Day에서 서로 충돌하는 Command는 같은 transaction 안에서 현재 상태를 검증한다.

## 15. UI 핵심 Contract

Money Timer:

- 큰 현재 금액
- 오늘 목표와 진행률
- 초당 Rate
- Timer
- Activity Toggle
- Privacy Mode
- Full Dashboard 진입

Full Dashboard:

- Today
- Week
- Month
- Activity
- Free Work
- Overtime
- Consumer Value
- Timeline and History

Year와 ms당 Rate는 V1에서 제외한다.

## 16. Retention Features

V1의 재미와 지속 사용을 위해 다음을 핵심 기능으로 취급한다.

- 10,000원 Milestone
- 소비재 환산
- Document PiP
- Privacy Mode
- Today Progress
- LOAFING Toggle

Milestone은 PiP에서 비활성화한다.

## 17. 핵심 불변 조건

- 같은 입력과 같은 now에는 같은 Snapshot
- UI refresh 빈도는 금액에 영향 없음
- FIXED_PERIOD 조기퇴근은 Daily Target 100% 확정
- TIME_BASED는 Clock In 없는 시간을 실제 유급시간으로 만들지 않음
- 무료봉사는 실제 급여 합계에 포함하지 않음
- Overtime은 사용자가 명시적으로 시작
- 과거 종료 Overtime은 현재 multiplier 변경으로 변하지 않음
- 이전 Day 미마감은 다음날로 자동 연장하지 않음
- 과거 Day는 현재 Time Zone으로 재해석하지 않음
- 손상 데이터는 정상 숫자로 조용히 표시하지 않음

## 18. 현재 설계 상태

DESIGN REWORK BASELINE

Retention Prototype을 먼저 구현해 제품 지속 사용 가능성을 확인한 뒤 V1 전체를 확장한다.
