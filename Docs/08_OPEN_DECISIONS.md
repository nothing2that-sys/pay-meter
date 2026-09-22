# PayMeter Open Decisions

이 문서는 결정된 설계 방향, 변경된 결정, 보류 실험을 기록한다.

상위 SSOT와 충돌하면 상위 문서가 우선한다.

# Decided

## D1. 제품 성격

상태: DECIDED

PayMeter는 정밀 근태 도구가 아니라 상시 띄워두는 캐주얼 Money Timer다.

## D2. FIXED_PERIOD 배분

상태: DECIDED

Period 예정 유급시간 총합으로 배분한다.

## D3. FIXED_PERIOD 조기퇴근

상태: DECIDED

Clock Out 시 정규 Daily Target 100% 확정.

## D4. TIME_BASED Clock In

상태: DECIDED

HOURLY는 Clock In 없이 실제 정규 유급시간을 생성하지 않는다.

## D5. Activity

상태: DECIDED

Inferred WORKING.

Persist Activity는 LOAFING interval뿐.

## D6. Break

상태: DECIDED

V1 break는 unpaid only.

## D7. Post Work

상태: DECIDED

AUTO_OVERTIME 없음.

Scheduled End 이후 기본은 무료봉사.

## D8. Overtime

상태: DECIDED

multiplier only.

Overtime Session에 multiplier/baseRate calculation snapshot 저장.

## D9. Retroactive Overtime

상태: DECIDED

now 또는 Scheduled End부터 시작.

## D10. Timeline Correction

상태: DECIDED

5분 단위 사후 보정.

## D11. Unclosed Day

상태: DECIDED

midnight clamp + NEEDS_TIME_REVIEW.

## D12. Time Zone

상태: DECIDED

WorkDay 생성 시 snapshot 고정.

## D13. Document PiP

상태: DECIDED

핵심 데스크톱 Surface.

## D14. Milestone

상태: DECIDED

10,000원 단위, PiP 비활성.

## D15. Statistics

상태: DECIDED

Today / Week / Month.

Year 없음.

## D16. Consumer Value

상태: PAUSED_EXPERIMENT

초기 P1에 포함했으나 실제 화면 사용 피드백에서 제품 흐름과 어색하고 Settings를 복잡하게 만든다고 판단.

V1 기본 UI와 Settings에서 제거한다.

필요성이 다시 확인될 때만 별도 실험으로 재검토한다.

## D17. Privacy

상태: DECIDED

V1 포함.

## D18. Estimated Net

상태: DEFERRED

정밀 세금 엔진은 만들지 않는다.

기본 Settings에는 노출하지 않는다.

## D19. Multi-tab

상태: DECIDED

IndexedDB transaction + deterministic key + unique index + BroadcastChannel 우선.

## D20. Snapshot Side Effect

상태: DECIDED

Snapshot은 Pure Function.

## D21. JSON Export

상태: DECIDED

V1 포함.

## D22. Default Money Information

상태: DECIDED

기본 Money Timer의 핵심 돈 정보:

- Today Earned
- Loafing Earned Value

Today Target 금액은 UI에 표시하지 않는다.

Loafing Earned는 Today Earned에 포함된 Breakdown이며 추가 합산하지 않는다.

## D23. Perimeter Timeline

상태: DECIDED

화면 외곽 한 바퀴를 Planned Paid Duration 100%로 사용한다.

WORKING / LOAFING은 다른 색.

Break는 분모와 Segment에서 제외.

시간 순서를 외곽 Segment로 유지한다.

## D24. Current Rate Placement

상태: DECIDED

Current Rate는 기본 화면 구석의 작은 보조 계측값.

메인 숫자로 사용하지 않는다.

## D25. Free Work Wallet

상태: DECIDED

AFTER_SCHEDULE_UNPAID에서:

- 외곽 100% 완료
- 정규 Pay 증가 정지
- Free Work Wallet 표시
- duration/value 증가
- 실제 지급액 아님 명확히 표시

Wallet value는 실제 Pay Total에 포함하지 않는다.

## D26. Free Work Voice

상태: DECIDED

무료봉사 상태는 상황을 약간 조롱하는 Product Voice를 사용한다.

개인 비하 금지.

Threshold 기반 copy 변경.

매 Tick random 변경 금지.

## D27. Settings Simplification

상태: DECIDED

기본 Settings:

- Pay/Work
- Display
- Data

Consumer Editor와 decimal precision toggle 제거.

# Deferred Beyond V1

- Paid Break
- Holiday
- Leave
- Overnight Schedule
- Multi Job
- Cloud Sync
- 법정 수당 자동 판정
- 정밀 세금/보험
- Year Statistics

# Open

## O1. Perimeter Color Tokens

실제 화면을 본 뒤 WORKING/LOAFING 색 대비와 saturation을 결정한다.

색만으로 상태를 전달하지는 않는다.

## O2. Free Work Copy Tone

현재는 약간 냉소적인 상황 조롱으로 결정했으나 실제 사용하면서:

- 너무 약한지
- 너무 자주 보이는지
- 불쾌한지
- 재미가 유지되는지

를 검토한다.

# P1R Additional Decisions

## D28. MoneyTimerFrame Boundary

상태: DECIDED

Perimeter Timeline은 browser viewport 전체가 아니라 MoneyTimerFrame 외곽을 사용한다.

Desktop 권장 Frame은 width 520~580px, height 600~720px다.

## D29. Free Work Copy Threshold

상태: DECIDED

Free Work Copy는 급여 수준의 영향을 피하기 위해 금액이 아니라 Duration Bucket을 사용한다.

- FW0: 0~15분
- FW1: 15~30분
- FW2: 30~60분
- FW3: 60분 이상

같은 localDate와 같은 Bucket에서는 deterministic한 같은 Copy를 유지한다.

## D30. Rate Zero Presentation

상태: DECIDED

비유급 상태에서 regular current rate를 숨기지 않는다.

0 값을 Dimmed 상태로 표시한다.

Free Work Wallet의 reference rate와 regular current rate는 다른 의미로 표현한다.

## D31. P1R Overtime Scope

상태: DECIDED

P1R functional gate는 Clock Out까지다.

P1R에서는 Overtime multiplier source를 새로 만들지 않는다.

작동하지 않는 Overtime CTA를 노출하지 않는다.

Overtime Interaction 방향은 설계로 보존하고 실제 금액 산정/Settlement는 P6에서 구현한다.

# Decision Process

1. 이 문서에서 상태 결정
2. 상위 SSOT 반영
3. 테스트 추가
4. 구현
