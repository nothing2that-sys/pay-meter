# PayMeter Product Requirements

## 1. Product Vision

PayMeter는 시간을 돈의 흐름으로 보여주는 개인용 Money Timer다.

정밀 근태 시스템을 목표로 하지 않는다.

핵심 경험은 다음과 같다.

- 지금 얼마가 채워지고 있는지 본다.
- 오늘 목표 급여 중 얼마나 진행됐는지 본다.
- 루팡 시간을 한 번의 버튼으로 기록한다.
- 퇴근 후 남아 있는 시간을 무료봉사 가치로 본다.
- 필요할 때만 추가근무를 유급으로 전환한다.
- 작은 PiP 위젯으로 화면 구석에 계속 띄워둔다.
- 소비재 가격과 비교하며 돈이 쌓이는 체감을 유지한다.
- 잘못 누르거나 늦게 누른 기록은 하루 Timeline에서 간단히 고친다.

## 2. Primary Product Principle

이 앱의 최대 리스크는 계산식의 복잡도가 아니라 사용자가 일주일 뒤에도 켜는가이다.

따라서 V1은 다음을 우선한다.

- 적은 조작
- 항상 보이는 Money Timer
- 짧은 재미 피드백
- 간단한 사후 보정
- Local First
- 이해 가능한 계산

## 3. Supported Pay Types

V1 급여 입력:

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

## 4. FIXED_PERIOD Experience

FIXED_PERIOD는 오늘 목표 금액을 채우는 경험으로 표현한다.

예:

- 오늘 목표 200,000원
- 현재 진행 175,000원
- 진행률 87.5%

사용자가 조기 퇴근하더라도 Clock Out 시 오늘 정규 Daily Target은 100% 확정한다.

이는 법적 일당 판정이 아니라 PayMeter의 기간 급여 시각화 규칙이다.

## 5. FIXED_PERIOD Allocation

기간 급여를 단순 근무일 수로 나누지 않는다.

기간 예정 유급시간 총합으로 Visualization Rate를 정한다.

- Monthly: 해당 월 Planned Paid Duration
- Weekly: 해당 주 Planned Paid Duration
- Annual: Annual / 12를 Monthly Pay로 정규화한 뒤 월 기준 사용

각 Day Target은 해당 날짜의 Planned Paid Duration 비율로 배정한다.

## 6. TIME_BASED Experience

HOURLY 사용자는 Clock In과 Clock Out을 사용한다.

Clock In 이후 실제 정규 유급시간만 Base Pay에 포함한다.

Schedule은 다음 용도로 사용한다.

- 예정 시작/종료 표시
- Break 자동 적용
- 정규 종료 후 무료봉사 경계
- Overtime 경계

Clock In 없이 Schedule만으로 실제 유급시간을 생성하지 않는다.

## 7. Work Schedule

V1 지원:

- 요일별 근무 여부
- 출근 시각
- 퇴근 시각
- unpaid break 0개 이상
- 날짜별 간단 Override
- 자정을 넘기지 않는 Schedule

지원하지 않음:

- paid break
- overnight shift
- rotating shift
- holiday calendar
- paid leave

## 8. Activity

Activity는 최소 조작을 목표로 한다.

기본 상태는 Inferred WORKING이다.

사용자가 명시적으로 기록하는 것은 LOAFING뿐이다.

Money Timer에서:

- 루팡 시작
- 업무 복귀

버튼을 한 번 누르면 된다.

WORKING Session은 별도로 저장하지 않는다.

LOAFING 시간은 실제 급여 차감에 사용하지 않는다.

## 9. Break

Scheduled Break는 자동 적용한다.

Break 중:

- 정규 FIXED_PERIOD 진행은 unpaid break이므로 정지
- TIME_BASED 정규급여도 정지
- Activity 통계에서 제외
- Activity Toggle 비활성

Break 직전에 LOAFING이었다면 Break 종료 후 다시 LOAFING 의도를 이어간다.

## 10. Post Work and Free Work

V1에는 AUTO_OVERTIME이 없다.

Scheduled End가 지나고 Clock Out하지 않았으며 유급 Overtime Session이 없다면 무료봉사다.

무료봉사:

- 실제 Pay Total에 포함하지 않음
- 시간 표시
- Base Visualization Rate 기준 참고 가치 표시

## 11. Manual Overtime

V1 Overtime은 사용자 명시적 시작만 지원한다.

정책은 multiplier 하나다.

예:

- 1.0x
- 1.5x
- 2.0x

사용자가 Scheduled End 이후 늦게 Overtime을 시작하면:

- 지금부터 시작
- Scheduled End부터 소급

중 하나를 빠르게 선택할 수 있다.

Timeline에서 이후 5분 단위로 보정할 수 있다.

## 12. Timeline Correction

사용자는 오늘 또는 최근 Day의 핵심 시간 기록을 5분 단위로 수정할 수 있다.

대상:

- Clock In
- Clock Out
- LOAFING start/end
- Overtime start/end

목적은 정밀 근태 편집이 아니라 버튼을 늦게 누른 실수를 빠르게 복구하는 것이다.

하루 Session 목록과 간단한 앞/뒤 이동 UI 정도로 제한한다.

## 13. Unclosed Day

Clock Out하지 않은 채 날짜가 바뀌면 PayMeter는 전날을 다음날까지 자동 연장하지 않는다.

전날 Day는 midnight에서 임시 종료된 것처럼 계산하고:

- 시간 확인 필요

배지를 표시한다.

사용자가 Timeline Correction으로 실제 종료시간을 정한다.

## 14. Information Architecture

### Money Timer

필수:

- 현재 진행 금액
- 오늘 목표 금액
- Today Progress
- 현재 초당 Rate
- 작은 Timer
- Pay State
- Activity Toggle
- Privacy Mode
- Dashboard 진입

### Document PiP

지원 브라우저의 데스크톱에서 Money Timer를 Always-on-top 형태로 제공한다.

API 지원 여부를 feature detection으로 확인한다.

PiP는 사용자의 명시적 Action으로 연다.

### Full Dashboard

필수:

- Today
- Week
- Month
- Working Time
- Loafing Time
- Loafing Ratio
- Free Work
- Overtime
- Consumer Value
- Timeline
- History

Year 통계는 V1에서 제외한다.

## 15. Milestone

V1 Milestone은 10,000원 단위 하나만 지원한다.

조건:

- foreground Money Timer에서만 Effect
- PiP에서는 Effect 비활성
- background 복귀 시 지나간 수십 개 Effect 재생 금지
- 같은 threshold 중복 재생 금지
- Reduced Motion 지원

## 16. Consumer Value

사용자는 소비재 이름과 금액을 직접 등록할 수 있다.

예:

- 커피 5,000원
- 점심 12,000원
- 치킨 25,000원

표현 예:

- 점심값 벌었음
- 치킨까지 3,420원

Consumer Value는 Pay Domain에 영향을 주지 않는 Presentation Derived Feature다.

## 17. Privacy Mode

Money Timer와 PiP에서 빠르게 금액을 숨길 수 있어야 한다.

Privacy Mode에서도 Timer와 상태는 선택적으로 유지할 수 있다.

상시 띄워놓는 화면의 어깨너머 노출을 주요 개인정보 위험으로 본다.

## 18. Estimated Net

정밀 세금 엔진은 만들지 않는다.

선택적으로 사용자가 단일 예상 공제율을 설정할 수 있다.

Estimated Net은 Presentation Derived Value이며 Gross Pay 원본을 변경하지 않는다.

## 19. Statistics

V1 기간 통계:

- Today
- Week
- Month

제외:

- Year

Rate Detail:

- hour
- minute
- second

제외:

- millisecond

## 20. Export

V1은 JSON Export를 지원한다.

Local First 제품에서 브라우저 데이터 삭제나 기기 변경에 대비하기 위한 신뢰 기능이다.

JSON Import는 Migration 안정성이 확보되는 후반 V1 Phase에서 제공한다.

## 21. Non Goals

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
