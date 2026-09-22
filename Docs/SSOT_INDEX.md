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

P1R 단계의 상세 구현 정본은 `P1R_RETENTION_UX_REWORK_DESIGN.md`다. 이 문서는 P1R 범위에서 `04_UI_UX_SPEC.md`를 구체화하며, 00~04 상위 SSOT를 덮어쓸 수 없다. P1R 구현 중 05~08의 일반 표현과 상세 설계가 충돌하면 P1R 범위에서는 상세 설계를 따른다.

P1R Retention Test 직전 확정된 Money Timer의 최신 Presentation 기준은 `P1R_FINAL_UI_DESIGN.md`다. 이 문서는 Domain 계산 Contract를 변경하지 않으며, Money Timer의 정보 위계, 상태별 색상, 외곽 Perimeter 표현, Portrait/Landscape 구성에 대해서는 기존 P1R Presentation 표현보다 우선한다.

상세보기의 일간/주간/월간/연간 보고, History 집계, 장기 데이터 누적 및 Cache 전략의 최신 상세 기준은 `DETAIL_REPORTING_AND_HISTORY_DESIGN.md`다. 이 문서는 Detail/History 범위에서 `P1R_FINAL_UI_DESIGN.md`의 임시 Detail Accumulation 규칙을 구체화한다. 정식 History Persistence가 없는 P1R의 synthetic accumulation은 실제 측정 History로 간주하지 않으며, Raw WorkDay/Event가 SSOT이고 DailySummaryCache는 rebuild 가능한 Cache라는 상위 원칙을 변경하지 않는다. 이 문서 추가만으로 P2 착수 조건이 해제되지는 않는다.

상세보기 구현 및 검증 결과는 `DETAIL_REPORTING_IMPLEMENTATION_CLOSEOUT.md`를 따른다. Verified Code HEAD는 `[legacy-sha-removed]`, Verification CI Run ID는 `[legacy-ci-run-removed]`이며 현재 상태는 `DETAIL_REPORTING_IMPLEMENTED`다. 이 완료 상태는 Detail Reporting의 현재 P1R 범위에 한하며 정식 P2 History Persistence 완료를 의미하지 않는다. P2는 기존 Gate에 따라 계속 BLOCKED 상태다.

현재 Detail Reporting의 실사용 보정 단계는 `DETAIL_REPORTING_REWORK_PLAN.md`를 따른다. 최신 운영 검토에서 확인된 날짜별 기록 보존, Period 집계 정확성, 휴게 없음 설정, 모바일 가독성 및 그래프 표현 수정은 Verified Implementation HEAD `[legacy-sha-removed]`, CI Run `[legacy-ci-run-removed]`에서 검증되었으며 상태는 `DETAIL_REPORTING_REWORK_APPROVED`다. P1R 호환 Archive는 정식 P2 IndexedDB 모델을 대체하지 않으며, P2 전체 Gate는 계속 BLOCKED 상태를 유지한다. 상세 결과는 `DETAIL_REPORTING_REWORK_CLOSEOUT.md`를 따른다.

Theme과 Layout 사용자 설정 및 Current Rate 표시의 최신 Presentation 기준은 `THEME_LAYOUT_CUSTOMIZATION_DESIGN.md`를 따른다. Dark/Light Base와 Meter/Mono/Pocket/Ledger Theme를 독립 조합하며, Theme Phase 1은 Meter와 Mono를, Theme Phase 2는 Pocket과 Ledger를 제공한다. Auto/Focus/Split Layout과 Domain 계산 Contract 및 Product P2 Gate는 변경하지 않는다.

충돌하거나 해석할 수 없는 계산 Contract는 코드에서 임의 결정하지 않고 문서를 먼저 수정한다.

## 2. 제품 정의

PayMeter는 정밀 근태 도구가 아니라 상시 띄워두는 캐주얼 Money Timer다.

우선순위:

1. 계속 켜두고 싶은가
2. 현재 하루 진행상태가 한눈에 보이는가
3. 돈 정보가 과하지 않고 재미를 주는가
4. 조작이 적은가
5. 같은 원본 데이터에서 같은 결과가 재현되는가

## 3. 핵심 Surface

- Money Timer
- Document PiP Widget
- Full Dashboard
- Timeline and History
- Settings

Money Timer가 기본 화면이며 Full Dashboard는 삭제하지 않는다.

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

시간 오류나 데이터 손상은 별도 integrityStatus로 표시한다.

## 6. Activity Contract

- 유급 활동 가능 시간의 기본 상태는 WORKING
- 사용자는 LOAFING만 명시적으로 기록
- WORKING Session 자체는 저장하지 않음
- WORKING 시간은 Activity Eligible Time에서 LOAFING 시간과 무급 휴게를 제외해 계산
- 휴게시간에는 Activity Toggle 비활성
- 휴게가 끝나면 휴게 직전의 LOAFING 의도를 유지
- LOAFING은 FIXED_PERIOD 급여를 중단시키지 않음

## 7. FIXED_PERIOD Contract

ANNUAL, MONTHLY, WEEKLY는 기본 FIXED_PERIOD다.

기간 급여를 근무일 수로 나누지 않는다.

- Period Visualization Rate = Period Pay / Planned Paid Duration Of Period
- Daily Target Pay = Period Pay × Planned Paid Duration Of Day / Planned Paid Duration Of Period

Daily Target Pay는 계산용 Domain 값이다.

기본 Money Timer에 목표 금액 자체를 표시하지 않는다.

Clock Out 시 해당 날짜의 정규 Daily Target은 100% 확정한다.

## 8. TIME_BASED Contract

HOURLY는 기본 TIME_BASED다.

실제 정규 유급시간은 Clock In과 Clock Out을 기준으로 한다.

## 9. Money Timer Presentation Contract

기본 화면의 정보 우선순위:

1. 화면 외곽 Progress Timeline
2. 현재 상태
3. 오늘 진행률
4. 퇴근까지 남은 시간
5. 오늘 번 돈
6. 루팡으로 번 돈
7. 작은 Current Rate
8. Activity Toggle

기본 화면에서 다음은 제거한다.

- Today Target 금액 표시
- Consumer Value
- 과도한 Rate 상세
- 카드형 통계 나열

## 10. Perimeter Timeline Contract

화면 외곽 한 바퀴는 해당 Day의 Planned Paid Duration 100%를 뜻한다.

- 정상근무 구간과 LOAFING 구간은 서로 다른 색으로 표시
- 시간 순서대로 Segment가 외곽선에 누적
- unpaid break는 100% 분모와 Segment 진행에서 제외
- Break 동안 Timeline 진행이 멈춤
- Scheduled End에 도달하면 100% 완료
- Presentation은 SVG 또는 동등한 normalized path 기반 구현 권장

색상 값 자체는 UX 구현에서 조정 가능하지만 두 상태는 명확히 구분되어야 한다.

## 11. Money Semantics

기본 화면의 돈 정보는 두 개를 핵심으로 한다.

### Today Earned

현재 시점까지 정규/유급 규칙에 따라 인정되는 오늘의 진행 금액.

### Loafing Earned Value

Activity Eligible Time 중 LOAFING 구간에 대응하는 급여 가치.

이는 Today Earned 안에 포함되는 참고 Breakdown이며 추가수당이나 별도 급여가 아니다.

## 12. Current Rate

Current Rate는 보조 계측값이다.

- REGULAR_WORK: Base Visualization Rate
- BEFORE_WORK: 0
- UNPAID_BREAK: 0
- AFTER_SCHEDULE_UNPAID: 0 regular rate
- OFF_DAY: 0

기본 화면 구석에 작게 표시한다.

## 13. Free Work Contract

AUTO_OVERTIME은 V1에 없다.

Scheduled End 이후 Clock Out 전까지 유급 Overtime이 없으면 AFTER_SCHEDULE_UNPAID다.

무료봉사는 저장 Session이 아니라 Schedule End, Clock Out, Overtime Session에서 파생한다.

무료봉사 금액은 실제 지급 급여가 아니다.

## 14. Free Work Wallet Contract

AFTER_SCHEDULE_UNPAID에서는 일반 Money Timer를 그대로 연장하지 않는다.

- 외곽 Progress Timeline은 100% 완료 상태 유지
- Today Earned의 정규 증가 정지
- Free Work Wallet을 주요 UI로 전환
- Wallet에 freeWorkDuration과 freeWorkReferenceValue 표시
- freeWorkReferenceValue는 Base Visualization Rate 기준
- 실제 지급액과 명확히 분리
- 상황을 비꼬는 짧은 카피를 함께 표시

조롱의 대상은 사용자가 아니라 "정규 근무가 끝났는데 무상 노동 가치가 쌓이는 상황"이다.

개인 비하, 모욕, 공격적 표현은 사용하지 않는다.

## 15. Overtime Contract

V1 추가근무는 multiplier 하나만 지원한다.

Overtime Session에는:

- multiplierBasisPointsSnapshot
- baseRateSnapshot

을 저장한다.

무료봉사 구간을 Overtime으로 소급 전환하면 Free Work Wallet은 원본 Segment 재계산 결과에 따라 줄어들거나 0이 된다.

## 16. Day and Time Zone Contract

Work Day가 materialize될 때 timeZoneSnapshot과 Schedule Snapshot을 고정한다.

과거 Day는 현재 Device Time Zone으로 재해석하지 않는다.

V1은 Overnight Schedule을 지원하지 않는다.

## 17. 저장 원칙

- 현재 표시 금액을 Tick마다 저장하지 않는다.
- 무료봉사 Session을 저장하지 않는다.
- WORKING Session을 저장하지 않는다.
- 원본 Event와 계산에 필요한 Snapshot만 저장한다.
- Daily Summary는 Cache이며 SSOT가 아니다.
- Snapshot 계산 함수는 저장 부작용이 없는 Pure Function이어야 한다.

## 18. Multi-tab Contract

V1 우선 도구:

- deterministic natural key
- IndexedDB unique index
- IndexedDB readwrite transaction
- BroadcastChannel invalidation

Web Locks는 필수가 아니다.

## 19. Settings Contract

V1 Settings는 다음 세 그룹으로 제한한다.

### 급여 / 근무

- 급여
- 근무요일
- 출근
- 퇴근
- unpaid break

### 화면

- Privacy Mode
- Milestone On/Off

### 데이터

- Export
- Reset

Consumer Item과 금액 소수 표시 같은 저가치 설정은 기본 Settings에서 제거한다.

## 20. Paused Experiment

Consumer Value는 초기 Prototype 실사용에서 제품 흐름과 어울림이 낮다는 피드백으로 PAUSED_EXPERIMENT 상태다.

기본 UI, Settings, V1 Release Scope에서 제외한다.

## 21. 핵심 불변 조건

- 같은 입력과 같은 now에는 같은 Snapshot
- UI refresh 빈도는 금액에 영향 없음
- Today Earned와 Loafing Earned Value는 중복 합산하지 않음
- Free Work Wallet은 실제 급여 합계에 포함하지 않음
- 무료봉사 중 정규 Current Rate는 0
- 외곽 Timeline의 100%는 Planned Paid Duration 기준
- unpaid break는 외곽 진행률에서 제외
- 과거 Day는 현재 Time Zone으로 재해석하지 않음
- 손상 데이터는 정상 숫자로 조용히 표시하지 않음

## 22. 현재 P1R 상태

P1R_RETENTION_TEST_READY

P1R 상세 설계 구현과 최종 Verification Gate를 완료했다.

검증 근거는 `Docs/P1R_VERIFICATION_CLOSEOUT.md`를 따른다.

다음 단계는 실제 업무 중 `P1R_RETENTION_TEST`다. Retention 결과가 확인되기 전까지 P2는 착수하지 않는다.
