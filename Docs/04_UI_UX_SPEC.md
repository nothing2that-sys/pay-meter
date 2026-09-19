# PayMeter UI and UX Specification

## 1. UI 방향

PayMeter의 기본 화면은 카드형 Dashboard가 아니라 한 장짜리 계측기다.

핵심 시각 요소는 화면 외곽을 따라 진행하는 Workday Timeline이다.

우선순위:

1. 하루 진행
2. 현재 상태
3. 오늘 번 돈
4. 그중 루팡으로 번 돈
5. 남은 시간
6. 작은 Current Rate
7. Activity Toggle

## 2. Default Money Timer

기본 개념:

- 화면 외곽 = 오늘 Planned Paid Duration 100%
- 중앙 = 현재 상태 + 진행률 + 남은 시간
- 하단 또는 중앙 보조 = 오늘 번 돈 + 루팡으로 번 돈
- 구석 = Current Rate
- 하단 Action = 루팡 시작 / 업무 복귀

예:

업무 중

62.4%
퇴근까지 02:41

오늘 번 돈
₩124,800

루팡으로 번 돈
₩21,350

[루팡 시작]

+₩6.944/s

Today Target 금액은 표시하지 않는다.

## 3. Perimeter Timeline

화면의 Rounded Rectangle 외곽 path를 normalized 0~100% Timeline으로 사용한다.

권장:

- 시작점: 상단 중앙
- 방향: 시계방향
- Scheduled paid duration 100%
- 현재 위치에 작은 glow/marker

Timeline 색상:

- WORKING token
- LOAFING token
- inactive/unelapsed token

실제 색상 값은 화면을 보고 조정한다.

중요한 것은 WORKING과 LOAFING이 즉시 구분되는 것이다.

## 4. Segment Mapping

외곽선은 단순 누적 색이 아니라 시간 순서를 보존한다.

예:

WORKING
-> LOAFING
-> WORKING
-> LOAFING
-> 현재

이면 외곽선도 같은 순서로 색 구간이 이어져야 한다.

unpaid break는 별도 색 구간을 만들지 않는다.

Break는 100% 분모에서 제외되므로 외곽 진행이 멈췄다가 Break 종료 후 이어진다.

## 5. Center Information

중앙의 가장 큰 숫자:

- scheduledProgressRatio %

상태:

- 업무 중
- 루팡 중
- 휴게 중
- 출근 전
- 오늘 근무 완료

보조:

- 퇴근까지 HH:MM

루팡률 숫자는 기본 화면에 표시하지 않는다.

## 6. Money Information

기본 화면의 돈 정보는 두 개다.

### 오늘 번 돈

현재까지 인정되는 Pay.

### 루팡으로 번 돈

그중 LOAFING 시간에 대응하는 Pay Value.

두 값을 더해서 새로운 Total을 만들지 않는다.

"루팡으로 번 돈"은 Today Earned 안에 포함된 Breakdown이다.

## 7. Current Rate

Current Rate는 구석에 작은 계측값으로 표시한다.

예:

+₩6.944/s

시각적 우선순위는 낮게 둔다.

비유급 상태에서는:

- ₩0.000/s
- 또는 비활성/Dimmed Rate

중 구현 화면에서 더 자연스러운 방식을 선택한다.

## 8. Activity Toggle

WORKING:

[루팡 시작]

LOAFING:

[업무 복귀]

한 번의 Tap/Click.

LOAFING 중에도 FIXED_PERIOD Today Earned는 계속 증가한다.

## 9. Break

Scheduled unpaid break는 자동 적용한다.

Break 중:

- Progress 정지
- Current Rate 0
- Activity Toggle 비활성
- Activity 집계 제외

Break 전 LOAFING이었다면 Break 후 LOAFING 상태 표현으로 복귀 가능하다.

## 10. Privacy Mode

금액 두 개를 모두 즉시 마스킹한다.

예:

오늘 번 돈
₩••••••

루팡으로 번 돈
₩••••••

Progress, 상태, 시간은 유지한다.

## 11. Free Work Transition

Scheduled End 도달 시:

- 외곽 Timeline = 100%
- 정상/루팡 Segment 이력은 그대로 유지
- 정규 Today Earned 증가 정지
- Current regular Rate = 0
- 화면의 주인공을 Free Work Wallet으로 전환

기존 외곽 Timeline을 다시 돌리거나 100% 이상 확장하지 않는다.

## 12. Free Work Wallet

예:

오늘 근무 완료
100%

오늘 번 돈
₩200,000

무료봉사 WALLET

₩18,742
00:44:58

+₩6.944/s 상당
실제 지급액 아님

[추가근무]
[퇴근]

Wallet은 실제 금융 지갑처럼 정돈된 카드/패널 느낌을 사용할 수 있다.

단, 실제 급여와 혼동되지 않게 Label을 명확하게 한다.

## 13. Free Work Personality

무료봉사 상태에서는 PayMeter가 상황을 약간 비꼬는 캐릭터를 보여준다.

원칙:

- 사용자를 공격하지 않는다.
- "무상 노동 가치가 계속 쌓이고 있는 상황"을 조롱한다.
- 짧고 건조한 문장이 좋다.
- 매 Tick마다 바꾸지 않는다.
- 금액 또는 시간 Threshold에서 문구를 변경한다.

초기 카피 후보:

0~5,000원:
- 무료 체험이 시작됐습니다.
- 정규 근무는 끝났습니다. 참고로요.

5,000~15,000원:
- 회사 입장에서는 꽤 좋은 시간대입니다.
- 월급은 멈췄지만 시간은 계속 나가고 있습니다.

15,000~30,000원:
- 무료봉사 Wallet이 제법 건강해졌습니다.
- 퇴근 버튼은 아직 정상 작동합니다.

30,000원 이상:
- 무상 노동 포트폴리오가 커지고 있습니다.
- 이 Wallet은 출금 기능이 없습니다.

카피는 UX 테스트 후 계속 조정한다.

## 14. Overtime Conversion

무료봉사 중 [추가근무] 선택:

추가근무를 언제부터 계산할까요?

- 지금부터
- 정규 종료부터

Scheduled End부터 소급 전환하면 Wallet 금액은 Segment 재계산 결과에 따라 감소하거나 0이 된다.

돈을 실제 Wallet에서 Overtime으로 옮기는 애니메이션은 가능하지만 Domain에서는 재분류 계산일 뿐이다.

## 15. CLOCKED_OUT

Clock Out 후:

- 외곽 Timeline은 완료 상태
- 실시간 Rate 정지
- Wallet 정지
- 오늘 결과 요약
- Dashboard/History 진입

FIXED_PERIOD 정규 Pay는 Daily Target 100% 확정.

## 16. Document PiP

PiP도 같은 디자인 언어를 사용한다.

최소:

- 외곽 Timeline
- Progress %
- 상태
- 오늘 번 돈
- 루팡으로 번 돈
- Activity Toggle
- Privacy
- 작은 Rate

Free Work 시:

- 100% 외곽
- Free Work Wallet value
- Free Work Duration
- 짧은 카피
- 퇴근/추가근무 Action은 공간에 따라 축약

PiP에서는 Milestone Effect를 비활성화한다.

## 17. Full Dashboard

기본 Money Timer에 제거한 상세 정보를 Dashboard에서 제공한다.

- Today Earned
- Loafing Earned
- Working Time
- Loafing Time
- Loafing Ratio
- Free Work
- Overtime
- Week
- Month
- Rate Detail
- Timeline
- History

## 18. Milestone

10,000원 단위.

새 외곽 Timeline보다 강하게 튀지 않는 짧은 Highlight만 허용한다.

PiP에서는 비활성.

## 19. Settings

설정 화면을 관리도구처럼 만들지 않는다.

### 급여 / 근무

- 월급 또는 Pay Basis
- 근무요일
- 출근
- 퇴근
- 휴게

### 화면

- Privacy
- Milestone

### 데이터

- Export
- Reset

기본 화면에서 필요 없는 세부 Display 설정을 늘리지 않는다.

금액 소수점 표시는 제품 기본값으로 결정한다.

## 20. Consumer Value

Consumer Value UI와 Settings는 제거한다.

상태:

PAUSED_EXPERIMENT

향후 실제 사용 중 "금액 숫자가 다시 무감각해진다"는 문제가 확인될 경우 별도 실험으로 재검토한다.

## 21. Integrity UI

정상 계산이 어려우면:

- 시간 확인 필요
- 데이터 확인 필요
- 저장 오류

Badge를 표시한다.

## 22. Accessibility

- 색만으로 상태 의미를 전달하지 않음
- WORKING/LOAFING text/label 제공
- 충분한 contrast
- Reduced Motion
- Screen Reader label
- tabular nums


## 23. P1R Detailed Design Binding

P1R 구현은 `Docs/P1R_RETENTION_UX_REWORK_DESIGN.md`를 상세 기준으로 사용한다.

추가 확정 사항:

- Timeline은 browser viewport 전체가 아니라 MoneyTimerFrame 외곽을 따른다.
- Desktop Frame 권장 크기는 width 520~580px, height 600~720px.
- Perimeter 시작점은 상단 중앙, 진행 방향은 시계 방향.
- 100%에서는 moving current marker를 제거한다.
- 상태별 시간 Label:
  - BEFORE_WORK: 출근까지
  - REGULAR_WORK / LOAFING: 퇴근까지
  - UNPAID_BREAK: 휴게 종료까지
- 비유급 상태의 regular rate는 숨기지 않고 0 값으로 Dimmed 표시한다.
- Free Work Copy Bucket은 금액이 아니라 duration 기준을 사용한다:
  - FW0: 0~15분
  - FW1: 15~30분
  - FW2: 30~60분
  - FW3: 60분 이상
- 같은 날짜/같은 Bucket에서는 deterministic하게 같은 문구를 유지한다.
- P1R functional gate는 Clock Out까지다.
- P1R에서는 Overtime multiplier source를 임의로 만들지 않는다.
- 따라서 P1R Test Build에서는 작동하지 않는 [추가근무] CTA를 노출하지 않는다.
- 이 문서의 Overtime Conversion UX는 정식 V1/P6 구현 방향이며 P1R에서 기능 구현하지 않는다.
