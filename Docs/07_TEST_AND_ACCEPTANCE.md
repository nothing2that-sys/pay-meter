# PayMeter Test and Acceptance Plan

## 1. 목표

PayMeter의 핵심 테스트 목표:

- refresh 빈도와 계산 독립
- 과거 결과 불변
- 간단한 조작 복원
- 시간 경계 안전
- Multi-tab에서 중복/충돌 방지
- UI와 Domain 의미 일치

## 2. Test Layers

Unit:

- Money
- Allocation
- Schedule
- Pay State
- WorkDay
- Activity
- Overtime
- Clock
- Integrity
- Aggregation

Integration:

- Settings -> WorkDay
- Storage -> Restore -> Snapshot
- Commands -> Transaction -> Snapshot
- Timeline Correction -> Rebuild
- Multi-tab invalidate

E2E:

- Setup
- Money Timer
- PiP feature path
- LOAFING
- Break
- Free Work
- Overtime
- Clock Out
- Hourly Clock In
- Timeline correction
- Export

## 3. FIXED_PERIOD Fixture

Monthly Pay:

- 4,000,000 KRW

Schedule example:

- Monday 8 paid hours
- Tuesday 4 paid hours
- other configured days

검증:

- Visualization Rate는 Period planned paid duration 기준
- 짧은 날과 긴 날의 시간당 시각화 의미가 동일
- Daily Target 합계는 정확히 Period Pay와 일치

## 4. Remainder

기간 급여가 Daily Target으로 정확히 나누어지지 않는 Fixture를 둔다.

검증:

- micro-KRW 합계가 원 Period Pay와 정확히 동일
- 같은 입력이면 같은 Day에 같은 remainder 배정
- 정렬 순서가 변해도 결과가 deterministic

## 5. Boundary

필수:

- start - 1ms
- start
- break start - 1ms
- break start
- break end - 1ms
- break end
- scheduled end - 1ms
- scheduled end
- clock out exact boundary

반열린 interval을 검증한다.

## 6. Tick Independence

동일 now에서:

- 16ms refresh
- 100ms
- 1000ms
- no intermediate refresh
- background resume

결과 동일.

## 7. FIXED_PERIOD Early Clock Out

17:00 Clock Out.

기대:

- final regular pay = Daily Target 100%
- realtime progress 종료
- Day Progress = 100% finalized
- 이후 regular amount 증가 없음

## 8. Activity

기본 WORKING inferred.

10:30 LOAFING
11:00 return

검증:

- WORKING Session 저장 없음
- LOAFING 30m
- Working = eligible - loafing
- FIXED_PERIOD pay 지속

## 9. Break and LOAFING

11:50 LOAFING
12:00-13:00 Break
13:20 Return

기대:

- Loafing counted = 10m + 20m
- Break 60m 제외
- Break 동안 Toggle disabled
- Break 종료 후 LOAFING intent 유지

## 10. Free Work

18:00 scheduled end
18:30 now

기대:

- state AFTER_SCHEDULE_UNPAID
- regular rate 0
- free work 30m
- free work value는 total pay에 포함되지 않음

## 11. Manual Overtime

18:30 Start from now:

- 18:00-18:30 free work 유지
- 18:30 이후 overtime

18:30 Start retroactive to 18:00:

- 18:00 이후 overtime
- 같은 구간 free work 0

## 12. Overtime Snapshot

1.5x Session 저장 후 Settings multiplier를 2.0으로 변경.

기대:

- 기존 Session은 1.5x 유지
- baseRateSnapshot 유지
- 과거 earned 변경 없음

## 13. TIME_BASED Clock In

Schedule 09:00-18:00.

10:00 Clock In.

기대:

- 09:00-10:00 regular earned = 0
- 10:00부터 payable
- unpaid break 제외

Clock In 없는 Day는 regular earned = 0.

## 14. Exact Timestamp Conflict

18:00 Clock Out과 18:00 Overtime Start가 경쟁.

기대:

- Clock Out 우선
- Overtime 생성/지속 없음

같은 timestamp precedence 문서와 일치해야 한다.

## 15. Reload

다음 상태에서 reload 전후 동일:

- regular inferred WORKING
- LOAFING
- break
- free work
- paid overtime
- clocked out
- awaiting clock in

## 16. Background Resume

17:50 background
19:00 resume

AUTO_OVERTIME은 없으므로 기대:

- regular stops at 18:00
- free work = 1h
- catch-up tick 없음

## 17. Clock Forward

Active Day에서 device time +1h.

기대:

- 새 Wall Clock 기준 계산
- NaN 없음
- invariant 위반 시 NEEDS_TIME_REVIEW
- finalized past pay 감소 없음

## 18. Clock Backward

Open Session start보다 now가 과거로 이동.

기대:

- negative duration 없음
- NEEDS_TIME_REVIEW
- 과거 finalized pay 자동 수정 없음

## 19. Time Zone Change

WorkDay materialize 후 Device Time Zone 변경.

기대:

- 기존 Day scheduled boundary 불변
- timeZoneSnapshot 불변
- 새 미래 Day만 새 Time Zone을 사용할 수 있음

## 20. Unclosed Day

전날 Clock Out 없음.

다음날 실행.

기대:

- 전날은 local midnight clamp
- 다음날까지 free work/overtime 자동 연장 없음
- NEEDS_TIME_REVIEW
- Timeline 수정 Action 노출

## 21. Timeline Correction

5분 단위로:

- Clock In
- Clock Out
- Loafing
- Overtime

수정.

검증:

- invalid end < start 거부
- overlap invariant
- 금액 preview
- cache invalidate
- reload 후 동일

## 22. Multi-tab Loafing

두 탭에서 동시에 LOAFING Start.

기대:

- open Loafing 하나만
- 중복 Session 없음
- 실패한 Command는 최신 상태 reload

## 23. Multi-tab Conflicting Commands

탭 A Clock Out
탭 B Overtime Start

동시 실행.

기대:

- transaction 순서에 따라 하나가 먼저 commit
- 뒤 Command는 최신 WorkDay 상태 재검증
- Clock Out 이후 Overtime 생성 금지

## 24. Storage Corruption

Fixture:

- invalid localStorage
- invalid WorkDay
- orphan Session
- end < start
- invalid multiplier
- unknown schemaVersion

기대:

- 전체 자동 reset 금지
- 가능한 레코드 유지
- DATA_WARNING 또는 recovery path

## 25. Milestone

- 9,998 -> 10,003
- 19,000 -> background -> 45,000
- reload
- PiP
- Effect Off
- Reduced Motion

기대:

- threshold 1회
- background catch-up 폭주 없음
- PiP effect 없음

## 26. Consumer Value

Consumer Item은 Pay Snapshot 원본 금액을 바꾸지 않아야 한다.

가격 수정은 과거 Pay를 변경하지 않는다.

## 27. Privacy

Money Timer와 PiP 모두 금액 masking 가능.

reload 후 preference restore.

## 28. JSON Export

검증:

- schemaVersion 포함
- Salary/Schedule History 포함
- WorkDay 포함
- Sessions 포함
- Consumer Items 포함
- export가 DB를 변경하지 않음

## 29. PiP

지원 환경:

- user action으로 open
- 동일 Snapshot 표시
- Activity Toggle 동작
- close가 Session 종료하지 않음

미지원 환경:

- crash 없이 compact fallback
- PiP Action 숨김 또는 안내

## 30. Release Gate

- Unit PASS
- Integration PASS
- Core E2E PASS
- Allocation Precision PASS
- Tick Independence PASS
- FIXED Settlement PASS
- Hourly Clock In PASS
- Break/Activity PASS
- Manual Overtime PASS
- Timeline Correction PASS
- Unclosed Day PASS
- Time Zone Snapshot PASS
- Multi-tab Conflict PASS
- Storage Corruption PASS
- PiP/Fallback PASS
- Privacy PASS
- Export PASS
- Mobile Smoke PASS
- Desktop Smoke PASS
- Documentation Match PASS
