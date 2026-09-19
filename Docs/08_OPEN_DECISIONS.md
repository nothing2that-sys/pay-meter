# PayMeter Open Decisions

이 문서는 결정된 설계 방향과 V1 밖으로 미룬 항목을 기록한다.

상위 SSOT와 충돌하면 상위 문서가 우선한다.

# Decided

## D1. 제품 성격

상태: DECIDED

PayMeter는 정밀 근태 도구가 아니라 상시 띄워두는 캐주얼 Money Timer다.

Retention과 낮은 조작 비용을 우선한다.

## D2. FIXED_PERIOD 배분

상태: DECIDED

근무일 수가 아니라 Period 예정 유급시간 총합으로 배분한다.

Daily Target은 Day 예정 유급시간 비율로 계산한다.

Daily Target 합계는 정확히 Period Pay와 같아야 한다.

## D3. FIXED_PERIOD 조기퇴근

상태: DECIDED

Clock Out 시 해당 Day의 정규 Daily Target 100% 확정.

차감 옵션 없음.

## D4. TIME_BASED Clock In

상태: DECIDED

HOURLY는 Clock In 없이는 실제 정규 유급시간을 생성하지 않는다.

## D5. Activity

상태: DECIDED

Inferred WORKING을 사용한다.

Persist하는 Activity는 LOAFING interval뿐이다.

## D6. Break

상태: DECIDED

V1 Scheduled Break는 unpaid only.

자동 적용하며 Break 중 Activity Toggle을 비활성화한다.

Break 이전 LOAFING intent는 Break 이후 유지한다.

## D7. Post Work

상태: DECIDED

AUTO_OVERTIME 삭제.

Scheduled End 이후 기본은 무료봉사.

유급 Overtime은 사용자 명시적 Action으로만 시작한다.

## D8. Overtime Policy

상태: DECIDED

V1은 multiplier만 지원한다.

삭제:

- fixed allowance
- custom hourly overtime
- hourly plus fixed
- automatic night/holiday rule

별도 Policy Revision system은 만들지 않는다.

Overtime Session에는 multiplier와 base rate 계산 Snapshot만 남긴다.

## D9. Retroactive Overtime

상태: DECIDED

Overtime Start 시:

- now
- Scheduled End

중 하나를 선택할 수 있다.

추후 Timeline에서 5분 단위 수정 가능.

## D10. Timeline Correction

상태: DECIDED

Clock In/Out, LOAFING, Overtime을 5분 단위로 사후 보정한다.

정밀 근태 editor로 확장하지 않는다.

## D11. Unclosed Day

상태: DECIDED

Clock Out 없이 날짜가 바뀌면 이전 Day를 local midnight에서 임시 clamp한다.

NEEDS_TIME_REVIEW를 표시하고 Timeline Correction으로 해결한다.

다음날까지 자동 연장하지 않는다.

## D12. Time Zone

상태: DECIDED

WorkDay 생성 시 timeZoneSnapshot 고정.

과거 Day는 이후 Device Time Zone으로 재해석하지 않는다.

## D13. Document PiP

상태: DECIDED

데스크톱 지원 환경의 핵심 상시 표시 Surface로 포함한다.

지원 여부는 feature detection.

미지원 환경은 일반 Compact Money Timer.

## D14. Milestone

상태: DECIDED

10,000원 단위 하나만 지원.

PiP에서는 Effect 비활성.

Background catch-up Effect 없음.

## D15. Statistics

상태: DECIDED

V1 기간:

- Today
- Week
- Month

Year 삭제.

Rate는 hour/minute/second만 표시.

ms rate 삭제.

## D16. Consumer Value

상태: DECIDED

V1 Retention 기능으로 포함.

사용자가 이름과 가격을 직접 등록한다.

Pay Domain에는 영향 없음.

## D17. Privacy

상태: DECIDED

Privacy Mode를 V1에 포함한다.

상시 화면 노출 위험을 핵심 Privacy 문제로 취급한다.

## D18. Estimated Net

상태: DECIDED

정밀 세금 엔진 삭제.

선택적 단일 공제율 기반 추정치만 지원 가능.

Gross Pay SSOT는 변경하지 않는다.

## D19. Multi-tab

상태: DECIDED

V1은:

- IndexedDB transaction
- deterministic key
- unique index
- BroadcastChannel

을 우선한다.

Web Locks는 필요성이 확인되면 추가한다.

## D20. Snapshot Side Effect

상태: DECIDED

Pay Snapshot 계산은 Pure Function.

Session 생성과 저장은 Command/Reconciliation에서 수행.

## D21. JSON Export

상태: DECIDED

Local First 신뢰 기능으로 V1 포함.

# Deferred Beyond V1

다음은 V1에서 설계 확장을 하지 않는다.

- Paid Break
- 공휴일 자동처리
- 연차
- 교대근무
- Overnight Schedule
- 복수직장
- Cloud Sync
- 법정 수당 자동 판정
- 정밀 세금/보험
- 위치 기반 출퇴근
- 조직 관리자
- Year Statistics

# Open

## O1. Retention Gate 기준

P1 Prototype 사용 후 다음을 확인한다.

- 실제 상시 사용 빈도
- PiP 유지 사용 여부
- LOAFING Toggle 사용 여부
- Consumer Value 유효성
- Milestone 피로도

구체적 수치 Gate는 Prototype 사용 결과를 보고 정한다.

## O2. Consumer Value 기본 Preset

사용자가 처음부터 직접 등록하게 할지, 커피/점심 같은 예시 Preset을 제공할지 구현 전에 결정 가능하다.

## O3. Estimated Net 기본 노출

기능을 기본 숨김 Advanced Setting으로 둘지 일반 Settings에 둘지 UX Prototype 후 결정한다.

# Decision Process

새 결정은 다음 순서로 반영한다.

1. 이 문서에서 DECIDED
2. 상위 SSOT 반영
3. 테스트 추가
4. 구현
