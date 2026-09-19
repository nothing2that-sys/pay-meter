# PayMeter UI and UX Specification

## 1. 방향

PayMeter의 기본 인상은 Dashboard가 아니라 Money Timer다.

키워드:

- 작은 화면
- 항상 보임
- 숫자 중심
- 적은 조작
- 캐주얼
- 재미
- 사후 보정 가능

## 2. Money Timer

기본 화면 예:

돈 버는 중

175,000원
오늘 200,000원 중 87.5%

+6.944원 / sec

05:37:18

[루팡 시작] [상세]

FIXED_PERIOD는 단순 현재 금액보다 오늘 목표를 채워가는 Progress를 함께 보여준다.

퇴근 시 100% 확정이 갑작스러운 금액 점프보다 목표가 채워지는 경험으로 읽히게 한다.

## 3. Compact Mode

좁은 창:

175,000원
87.5%
+6.944/s
05:37:18
[루팡]

가로 Scroll 금지.

Activity Toggle은 Compact에서도 유지한다.

## 4. Document PiP Widget

데스크톱 지원 환경에서는 사용자가 명시적으로:

- 위젯으로 열기

Action을 눌러 Document PiP를 연다.

지원 판단은 feature detection으로 한다.

PiP 내용:

- Current Pay
- Today Progress
- Small Timer
- Current State
- Activity Toggle
- Privacy Toggle

PiP에서 제거:

- Milestone animation
- 상세 Card
- 복잡한 Navigation

PiP를 닫아도 Session은 종료되지 않는다.

## 5. Full Dashboard

Full Dashboard는 정식 Surface로 유지한다.

표시:

- Today Pay
- Today Target and Progress
- Week
- Month
- Working Time
- Loafing Time
- Loafing Ratio
- Loafing Reference Value
- Free Work
- Overtime
- Hour / Minute / Second Rate
- Consumer Value
- Timeline
- History

Year와 ms Rate는 표시하지 않는다.

## 6. FIXED_PERIOD State

퇴근 전:

오늘 급여 진행
175,000 / 200,000
87.5%

퇴근 후:

오늘 목표 완료
200,000 / 200,000
100%
확정

조기퇴근 차감 옵션은 노출하지 않는다.

## 7. TIME_BASED Clock In

HOURLY 사용자는 정규 시작 전후 Money Timer에 Clock In Action을 제공한다.

미출근 상태:

출근 대기
현재 급여 0원
[출근]

Clock In 후 실제 유급시간 계산을 시작한다.

Clock Out 후 종료한다.

## 8. Activity Toggle

정규 Activity eligible 구간:

WORKING inferred:
- [루팡 시작]

LOAFING:
- [업무 복귀]

FIXED_PERIOD Pay는 LOAFING 중 계속 진행한다.

## 9. Break

Scheduled unpaid break는 자동 적용한다.

표시:

휴게시간
정규 급여 진행 일시정지
Activity 집계 제외

Break 중 Activity Toggle 비활성.

Break 직전 LOAFING이었다면 Break 종료 후 다시 루팡 상태 표현으로 돌아갈 수 있다.

## 10. Free Work

Scheduled End 이후:

무료봉사 중

정규 급여
200,000원
증가 정지

무료봉사
01:00:00

환산 가치
25,000원

[추가근무 시작]
[퇴근]

무료봉사 환산 가치는 실제 급여 Total에 포함하지 않는다.

## 11. Overtime Start

추가근무 시작 Action 시:

추가근무를 언제부터 계산할까요?

- 지금부터
- 정규 종료 18:00부터

선택 후 multiplier를 확인한다.

세부 수정은 Timeline에서 한다.

## 12. Overtime

추가근무 중:

추가근무 중
1.5x

추가근무 01:00:00
추가수당 37,500원

[추가근무 종료]
[퇴근]

복합 정책 UI는 없다.

## 13. Timeline Correction

Timeline은 정밀 편집기가 아니라 실수 복구 도구다.

하루 목록 예:

09:05 출근
10:30 루팡 시작
10:50 업무 복귀
18:00 정규 종료
18:20 추가근무 시작
20:10 퇴근

각 항목은 기본 5분 단위 앞/뒤 조정.

금액이 변하는 수정은 저장 전 간단한 결과 Preview를 보여준다.

## 14. Unclosed Day UX

이전 Day가 미마감이면:

시간 확인 필요

어제 퇴근 처리가 없습니다.
임시로 자정까지만 계산했습니다.

[시간 수정]

정상 급여 화면처럼 조용히 넘어가지 않는다.

## 15. Privacy Mode

Money Timer와 PiP에 빠른 금액 숨김 Action을 둔다.

예:

돈 버는 중
••••••원
87.5%
05:37:18

Privacy Mode 여부는 로컬에 보존할 수 있다.

## 16. Milestone

V1:

- 10,000원 배수 하나만
- foreground Money Timer에서 짧은 Effect
- PiP에서는 비활성
- background 복귀 catch-up 재생 금지
- 동일 threshold 중복 금지
- Reduced Motion 대응

## 17. Consumer Value

사용자가 직접 소비재를 등록한다.

예:

커피 5,000
점심 12,000
치킨 25,000

표현:

점심값 벌었음
치킨까지 3,420원

과도한 알림 대신 Money Timer 하단의 짧은 문구나 Dashboard Card로 제공한다.

## 18. Estimated Net

옵션으로 단일 예상 공제율을 입력할 수 있다.

표시는 반드시 추정치임을 명시한다.

정밀 세금 또는 보험 계산처럼 보이게 하지 않는다.

## 19. Error and Integrity UI

integrityStatus가 정상이 아니면 작은 Badge를 우선 노출한다.

예:

- 시간 확인 필요
- 데이터 확인 필요
- 저장 오류

정상 숫자를 확신하는 것처럼 보여주지 않는다.

## 20. Background Resume

오랫동안 보지 않다가 돌아오면 중간 Animation을 빠르게 재생하지 않는다.

즉시 현재 Snapshot을 표시한다.

Milestone도 지나간 모든 threshold를 재생하지 않는다.

## 21. Accessibility

- 색만으로 상태 전달 금지
- 충분한 contrast
- Touch Target 확보
- Screen Reader label
- Reduced Motion
- tabular numeric font 권장
