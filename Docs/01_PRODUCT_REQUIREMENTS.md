# PayMeter Product Requirements

## 1. Product Vision

PayMeter는 시간을 돈의 흐름으로 보여주는 개인용 Money Timer다.

정밀 근태 시스템보다 "오늘이 얼마나 진행됐고, 그 시간 중 얼마를 일했고 얼마를 루팡했는지"를 작은 위젯에서 바로 느끼게 하는 것이 목적이다.

핵심 경험:

- 화면 외곽만 봐도 오늘 진행률을 알 수 있음
- 외곽선의 색 구간으로 정상근무와 LOAFING 시간 흐름을 알 수 있음
- 오늘 지금까지 번 돈을 확인
- 그중 루팡 상태에서 번 돈을 별도로 확인
- Current Rate는 작은 보조 계측값으로 확인
- 정규 종료 후에는 무료봉사 Wallet이 실시간으로 증가
- 앱이 무료봉사 상황을 가볍게 비꼬는 캐릭터를 가짐
- 작은 PiP로 화면 구석에 계속 띄울 수 있음
- 잘못 기록한 시간은 Timeline에서 간단히 보정

## 2. Product Principle

이 앱의 최대 리스크는 계산식 복잡도가 아니라 계속 띄워둘 가치가 있는가이다.

따라서 V1은:

- 한눈에 읽히는 상태
- 적은 숫자
- 적은 설정
- 적은 조작
- 강한 시각적 진행감
- 유머가 있는 상태 피드백

을 우선한다.

## 3. Supported Pay Types

V1:

- ANNUAL
- MONTHLY
- WEEKLY
- HOURLY

기본 AccrualMode:

- ANNUAL -> FIXED_PERIOD
- MONTHLY -> FIXED_PERIOD
- WEEKLY -> FIXED_PERIOD
- HOURLY -> TIME_BASED

DAILY pay basis는 V1에서 제외한다.

## 4. FIXED_PERIOD Allocation

기간 급여를 단순 근무일 수로 나누지 않는다.

기간 예정 유급시간 총합으로 Visualization Rate를 정한다.

- Monthly: 해당 월 Planned Paid Duration
- Weekly: 해당 주 Planned Paid Duration
- Annual: Annual / 12를 Monthly Pay로 정규화한 뒤 월 기준 사용

각 Day Target은 해당 날짜의 Planned Paid Duration 비율로 배정한다.

Daily Target은 계산에 필요하지만 기본 화면에는 보여주지 않는다.

## 5. FIXED_PERIOD Experience

정규 근무 중 사용자가 보는 핵심 금액:

### 오늘 번 돈

현재까지 유급 진행시간에 대응하는 정규 진행 금액.

### 루팡으로 번 돈

오늘 Activity Eligible Time 중 LOAFING으로 기록된 유급시간에 대응하는 금액.

이 값은 오늘 번 돈의 일부이며 추가로 더하는 돈이 아니다.

Clock Out 시 FIXED_PERIOD의 해당 Day 정규 급여는 Daily Target 100%로 확정한다.

## 6. TIME_BASED Experience

HOURLY 사용자는 Clock In과 Clock Out을 사용한다.

Clock In 이후 실제 정규 유급시간만 Base Pay에 포함한다.

## 7. Work Schedule

V1 지원:

- 요일별 근무 여부
- 출근 시각
- 퇴근 시각
- unpaid break
- 날짜별 간단 Override
- 자정을 넘기지 않는 Schedule

## 8. Activity

기본 상태는 Inferred WORKING이다.

Persist하는 Activity는 LOAFING interval뿐이다.

Money Timer에서:

- 루팡 시작
- 업무 복귀

한 번의 Action으로 전환한다.

LOAFING은 FIXED_PERIOD 급여를 중단시키지 않는다.

## 9. Break

Scheduled unpaid break는 자동 적용한다.

Break 중:

- 정규 급여 진행 정지
- 외곽 Progress 정지
- Activity 집계 제외
- Activity Toggle 비활성

LOAFING intent는 Break 이후 이어질 수 있다.

## 10. Perimeter Workday Timeline

기본 Money Timer 화면의 외곽 전체를 오늘 Planned Paid Duration 100%로 사용한다.

권장 시작점:

- 화면 상단 중앙
- 시계 방향 진행

시간 Segment는 실제 순서대로 외곽선에 표현한다.

예:

- WORKING
- WORKING
- LOAFING
- WORKING
- 현재 위치

WORKING과 LOAFING은 서로 다른 Design Token 색상을 사용한다.

Break는 외곽선에 별도 길이를 차지하지 않는다.

현재 위치는 얇은 glow 또는 marker로 강조할 수 있다.

## 11. Default Money Timer Information

기본 화면:

- Pay State
- 진행률 %
- 퇴근까지 남은 시간
- 오늘 번 돈
- 루팡으로 번 돈
- 작은 Current Rate
- Activity Toggle
- Privacy Toggle

기본 화면에서 제거:

- Today Target 금액
- "200,000원 중 175,000원" 형태
- Consumer Value
- 루팡률 숫자
- Week/Month Card
- 상세 Rate Breakdown

루팡률과 상세 통계는 Dashboard에서 본다.

## 12. Free Work

AUTO_OVERTIME은 없다.

Scheduled End 이후 Clock Out 전까지 유급 Overtime이 없다면 무료봉사 상태다.

정규 급여 진행은 멈춘다.

무료봉사 시간과 Base Visualization Rate 기준 환산 가치만 별도로 증가한다.

## 13. Free Work Wallet

무료봉사 상태에서는 기본 화면의 주인공을 Free Work Wallet으로 바꾼다.

필수:

- 외곽 Workday Progress = 100%
- 오늘 번 돈은 완료된 정규 금액으로 작게 유지
- Free Work Wallet을 크게 표시
- 무료봉사 시간
- 무료봉사 환산 가치
- 무상 제공 Rate
- 실제 지급액이 아니라는 의미
- 퇴근 Action
- 이후 Manual Overtime Action

Wallet 예:

무료봉사 WALLET
₩ 18,742
00:44:58
+ ₩6.944 / sec 상당 무상 제공

무료봉사 금액은 실제 급여 총액에 포함하지 않는다.

## 14. Free Work Voice

무료봉사 화면은 단순 경고가 아니라 PayMeter의 캐릭터가 드러나는 상태다.

톤:

- 약간 냉소적
- 상황을 비꼼
- 짧음
- 같은 문구를 계속 반복하지 않음

금지:

- 사용자 개인 비하
- 능력/성격 조롱
- 모욕
- 공격적인 욕설

예:

- 정규 근무는 끝났는데 아직 여기 계시네요.
- 회사 입장에서는 아주 좋은 시간대입니다.
- 월급은 멈췄지만 당신의 시간은 계속 나가고 있습니다.
- 무료봉사 Wallet이 건강하게 자라고 있습니다.
- 퇴근 버튼은 아직 정상 작동합니다.

카피는 매초/매분 바꾸지 않는다.

금액 또는 시간 Threshold를 넘을 때 대표 문구가 바뀌는 방식을 권장한다.

## 15. Manual Overtime

V1 Overtime은 사용자 명시적 시작만 지원한다.

Policy는 multiplier 하나다.

무료봉사 중 Overtime 시작 시:

- 지금부터
- Scheduled End부터 소급

중 하나를 선택할 수 있다.

소급 전환 시 같은 구간의 Free Work Wallet 가치는 재계산되어 줄거나 0이 된다.

## 16. Money Timer Rate

Current Rate는 보조 정보다.

작은 폰트로 화면 가장자리 또는 하단 구석에 둔다.

REGULAR_WORK일 때만 정규 증가율을 표시한다.

비유급 상태에서는 0 또는 비활성 표현을 사용한다.

## 17. Document PiP

지원 데스크톱에서 동일 Money Timer를 Always-on-top 위젯으로 제공한다.

PiP에서도:

- 외곽 Progress 개념
- 진행률
- 오늘 번 돈
- 루팡으로 번 돈
- Activity Toggle
- Privacy
- 작은 Rate

를 유지한다.

공간이 부족하면 상태 문구와 남은 시간을 축약할 수 있다.

## 18. Privacy Mode

Money Timer와 PiP에서 즉시 금액을 숨길 수 있어야 한다.

Progress와 시간은 유지할 수 있다.

## 19. Milestone

10,000원 단위 하나만 지원한다.

PiP에서는 Effect를 비활성화한다.

Background catch-up Effect는 재생하지 않는다.

새 외곽 Timeline을 방해하지 않는 짧은 Highlight만 사용한다.

## 20. Settings

Settings는 세 그룹만 기본 노출한다.

### 급여 / 근무

- 급여
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

금액 소수점 표시를 사용자 설정으로 두지 않는다.

제품이 화면별 기본 Precision을 결정한다.

## 21. Consumer Value

초기 P1의 Consumer Value는 PAUSED_EXPERIMENT로 변경한다.

이유:

- 기본 Money Timer의 핵심 메시지와 연결이 약함
- 설정이 복잡해짐
- 오늘 진행 / 루팡 / 무료봉사보다 우선순위가 낮음

V1 기본 UI와 Settings에서 제거한다.

향후 Retention Test에서 필요성이 다시 확인될 때만 재검토한다.

## 22. Timeline Correction

오늘 또는 최근 Day의:

- Clock In
- Clock Out
- LOAFING
- Overtime

시간을 5분 단위로 수정할 수 있다.

## 23. Statistics

V1:

- Today
- Week
- Month

Year는 제외한다.

Rate Detail은 Dashboard에서 hour/minute/second를 지원할 수 있으나 기본 Money Timer에는 Current Rate 하나만 작게 표시한다.

## 24. Non Goals

- 정밀 근태 증명
- 법적 임금 계산
- 세금 신고
- 회사 근태 시스템 대체
- 생산성 판정
- 자동 사용자 감시
- AUTO_OVERTIME
- 공휴일
- 연차
- 교대근무
- 복수직장
- Cloud Sync
