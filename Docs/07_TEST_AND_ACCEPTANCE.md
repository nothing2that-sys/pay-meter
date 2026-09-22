# PayMeter Test and Acceptance Plan

## 1. 목표

- refresh 빈도와 계산 독립
- 시간 경계 안전
- UI와 Domain 의미 일치
- Perimeter Timeline 정확성
- Today Earned / Loafing Earned 관계 정확성
- Free Work Wallet과 실제 급여 분리
- 단순 Settings 유지

## 2. Test Layers

Unit:

- Money
- Allocation
- Schedule
- Pay State
- Activity
- Perimeter Segment Mapping
- Free Work
- Overtime
- Clock
- Integrity

Integration:

- Settings -> Snapshot
- Storage -> Restore -> Snapshot
- Activity -> Perimeter
- Free Work -> Wallet
- Timeline Correction -> Perimeter rebuild

E2E:

- Setup
- Money Timer
- Perimeter Timeline
- LOAFING
- Break
- Free Work Wallet
- Clock Out
- PiP
- Privacy

## 3. Allocation

Monthly Pay 4,000,000 KRW.

검증:

- Planned Paid Duration 기준
- Daily Target 합계 = Period Pay
- Daily Target은 기본 Money Timer에 노출하지 않음

## 4. Boundary

필수:

- start - 1ms
- start
- break start - 1ms
- break start
- break end - 1ms
- break end
- scheduled end - 1ms
- scheduled end

## 5. Tick Independence

같은 now에서 refresh cadence와 무관하게 동일 Snapshot.

## 6. Perimeter Progress

09:00~18:00, 12:00~13:00 unpaid.

검증:

- 8 paid hours = 100%
- 12~13시 Progress 정지
- 18:00 = 100%
- 100% 초과 금지

## 7. Perimeter Segment Color Semantics

예:

09:00~10:30 WORKING
10:30~11:00 LOAFING
11:00~12:00 WORKING

검증:

- Segment 시간 순서 유지
- LOAFING 구간만 loafing token
- 나머지 eligible 구간 working token
- Break는 Segment 길이 없음

## 8. Today Earned and Loafing Earned

LOAFING 30분.

검증:

- Today Earned는 LOAFING 여부 때문에 감소하지 않음
- Loafing Earned Value > 0
- Today Earned + Loafing Earned를 합계로 사용하지 않음
- Loafing Earned는 Breakdown임

## 9. Break and LOAFING

11:50 LOAFING
12:00~13:00 Break
13:20 Return

기대:

- Loafing counted = 30m
- Break 60m 제외
- Break 동안 perimeter/rate/activity 정지
- Break 후 LOAFING intent 유지

## 10. Current Rate

- BEFORE_WORK = 0
- REGULAR_WORK > 0
- UNPAID_BREAK = 0
- AFTER_SCHEDULE_UNPAID regular rate = 0
- OFF_DAY = 0

## 11. Free Work Wallet

18:00 scheduled end.
18:30 now.

기대:

- payState = AFTER_SCHEDULE_UNPAID
- perimeter = 100%
- Today Earned regular 증가 정지
- freeWorkDuration = 30m
- freeWorkReferenceValue > 0
- freeWorkReferenceValue가 totalRecognizedPay에 포함되지 않음

## 12. Free Work Copy

Threshold bucket test.

검증:

- 같은 bucket에서 매 Tick random 변경 없음
- Threshold를 넘으면 허용된 새 copy 선택 가능
- 사용자 개인 비하 표현 없음
- "실제 지급액 아님" 의미가 Wallet에 노출

## 13. Clock Out from Free Work

Clock Out 이후:

- Wallet 증가 정지
- Free Work Duration 고정
- Current Rate 0

P1R Prototype에서는 최소 stop marker로 검증 가능.

## 14. Overtime Scope Boundary

정식 V1/P6에서는 소급 Overtime 계약을 검증한다.

P1R 구현 Gate에서는 실제 Overtime 금액 기능을 구현하거나 테스트하지 않는다.

P1R에서는:

- 작동하지 않는 Overtime CTA 비노출
- Clock Out까지 실제 기능 검증
- Free Work Wallet과 실제 급여 분리 검증

을 수행한다.

## 15. Reload

- LOAFING
- Break
- Free Work
- Clocked Out

복원 결과 동일.

## 16. Background Resume

17:50 background
19:00 resume.

기대:

- perimeter 100%
- Free Work = 1h
- catch-up animation 없음

## 17. PiP

지원 환경:

- 같은 perimeter progress
- 같은 Today Earned
- 같은 Loafing Earned
- 같은 Activity state
- Privacy 공유
- Free Work Wallet 상태 공유

## 18. Privacy

Today Earned와 Loafing Earned 모두 masking.

Progress/시간 유지.

## 19. Settings Simplification

기본 Settings에 다음만 존재하는지 확인:

- Pay/Work
- Display
- Data

Consumer Item Editor 없음.

금액 소수점 사용자 Toggle 없음.

## 20. Consumer Value Removal

기본 Money Timer, Dashboard 핵심 Surface, Settings에서 Consumer Value가 노출되지 않아야 한다.

기존 P1 localStorage 데이터가 남아 있어도 새 UI가 crash하면 안 된다.

## 21. Milestone

- 10,000원 crossing 1회
- background 폭주 없음
- PiP 비활성
- perimeter 가독성 방해 금지

## 22. Multi-tab

정식 V1에서는:

- open LOAFING 중복 방지
- Clock Out vs Overtime 충돌 방지

## 23. Storage Corruption

전체 자동 reset 금지.

## 24. Release Gate

- Unit PASS
- Integration PASS
- Perimeter PASS
- Today/Loafing Earned PASS
- Break PASS
- Current Rate PASS
- Free Work Wallet PASS
- Free Work Copy PASS
- Clock Out PASS
- PiP PASS
- Privacy PASS
- Settings Simplification PASS
- Consumer Value Removal PASS
- Mobile Smoke PASS
- Desktop Smoke PASS
- Documentation Match PASS


## 25. P1R Detailed Test Matrix

상세 Matrix는 `Docs/P1R_RETENTION_UX_REWORK_DESIGN.md`를 구현 기준으로 사용한다.

P1R 추가 필수:

- Frame perimeter 0 / 25 / 50 / 100 percent
- Break paid-coordinate freeze
- one/multiple LOAFING segment mapping
- 100 percent current marker hidden
- state-specific time label
- Free Work duration buckets FW0/FW1/FW2/FW3
- same day + same bucket deterministic copy
- idempotent Prototype Clock Out
- reload after Clock Out does not resume Wallet
- legacy consumerItems/showDecimals data does not crash
- 360x440 PiP overflow none
- 320x568 mobile safe-area smoke
- 560x680 desktop frame smoke

P1R Gate에서 Overtime settlement는 제외한다.
