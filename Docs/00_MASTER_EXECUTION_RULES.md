# PayMeter Master Execution Rules

## 1. 목적

PayMeter 구현에서 가장 중요한 것은 복잡한 근태 정확도가 아니라 단순한 사용 경험과 계산 재현성을 동시에 유지하는 것이다.

PayMeter는 캐주얼 Money Timer다.

기능을 추가할 때 항상 다음 질문을 먼저 한다.

- 사용자가 매일 계속 켜둘 이유가 생기는가
- 조작 횟수를 늘리지 않는가
- 원본 이벤트만으로 다시 계산 가능한가
- 기능 때문에 상태 모델이 불필요하게 커지지 않는가

## 2. Domain First

급여, Schedule, 시간 구간, Overtime 계산은 React와 분리한다.

UI는 Domain Snapshot을 표현할 뿐 계산식을 소유하지 않는다.

## 3. No Tick Accumulation

금지:

- money = money + ratePerTick
- elapsed = elapsed + interval

원칙:

- 현재 Wall Clock과 persisted input을 이용해 매번 Snapshot 재계산
- refresh loop는 표시 품질만 담당

## 4. Pure Snapshot

Snapshot 생성 함수는 Pure Function이어야 한다.

Snapshot 계산 중 다음을 하지 않는다.

- IndexedDB write
- Session 자동 생성
- Settings 변경
- Cache 강제 갱신

데이터 변경은 별도 Command 또는 Reconciliation 단계에서 수행한다.

## 5. Time Interval Standard

모든 시간 Segment는 반열린 구간으로 취급한다.

- start 포함
- end 제외

예:

- REGULAR_WORK = 09:00 이상 18:00 미만
- 18:00:00.000부터 AFTER_SCHEDULE_UNPAID 또는 PAID_OVERTIME

동일 경계 중복 계산을 허용하지 않는다.

## 6. Device Clock Authority

현재 시각 SSOT는 사용자 디바이스 Wall Clock이다.

- Background timer throttling 허용
- Foreground 복귀 즉시 재계산
- Page reload 즉시 재계산
- PWA resume 즉시 재계산
- 수동 시간 변경의 영향을 받을 수 있음을 제품 특성으로 인정

PayMeter 시간은 tamper-resistant 근태 증명이 아니다.

Clock이 뒤로 이동하거나 데이터보다 이전 시각이 되면 음수 Duration을 만들지 않고 integrityStatus를 NEEDS_TIME_REVIEW로 올린다.

## 7. Time Zone

Schedule은 Local Civil Time 기준이다.

Work Day가 생성되면 해당 Day의 timeZoneSnapshot을 저장한다.

이미 존재하는 과거 Day는 이후 디바이스 Time Zone 변경으로 재해석하지 않는다.

V1은 자정을 넘기는 Schedule을 지원하지 않는다.

## 8. Money Precision

저장 급여 입력은 integer KRW다.

내부 금액 계산은 integer micro-KRW와 BigInt 사용을 권장한다.

부동소수점 Tick 누적은 금지한다.

기간 급여 배분은 계산 중간 Rate를 float으로 반올림해서 누적하지 않는다.

기간 Daily Target 총합은 원 Period Pay와 정확히 일치하도록 deterministic remainder distribution을 사용한다.

## 9. FIXED_PERIOD

기본:

- ANNUAL
- MONTHLY
- WEEKLY

ANNUAL은 월 단위 계산을 위해 12로 나누어 Monthly allocation에 사용한다.

Period Pay는 Period의 예정 유급시간 총합에 배분한다.

요일별 근무시간이 달라도 같은 Period 안의 Visualization Rate 의미가 일관되어야 한다.

Clock Out 시 해당 Day의 정규 Daily Target을 100% 확정한다.

V1에는 조기퇴근 차감 옵션이 없다.

## 10. TIME_BASED

HOURLY는 TIME_BASED다.

실제 정규 유급시간은 Clock In과 Clock Out에서 계산한다.

Schedule만으로 Clock In을 추론하지 않는다.

## 11. Activity

V1은 WORKING Session을 저장하지 않는다.

- Activity Eligible Time 기본 = WORKING
- LOAFING만 interval로 저장
- 휴게시간은 Activity 통계에서 제외
- Break 중 Toggle 비활성
- Break가 끝나면 직전 LOAFING 의도를 유지
- FIXED_PERIOD 급여는 LOAFING 때문에 멈추지 않음

## 12. Break

V1 Scheduled Break는 unpaid break만 지원한다.

Break는 Schedule에 의해 자동 적용된다.

사용자에게 Break 시작/종료 버튼을 요구하지 않는다.

Paid Break는 V1 이후 후보로 둔다.

## 13. Post Work

AUTO_OVERTIME은 V1에 없다.

Scheduled End 이후 Clock Out 전까지 유급 Overtime Session이 없으면 무료봉사다.

무료봉사는 Derived Metric이며 별도 Session으로 저장하지 않는다.

사용자가 Overtime을 시작할 때:

- 지금부터 시작
- Scheduled End부터 소급

중 하나를 선택할 수 있다.

세부 시각은 Timeline Correction에서 5분 단위로 조정 가능하다.

## 14. Overtime

V1은 multiplier만 지원한다.

지원하지 않음:

- fixed allowance
- custom hourly overtime
- hourly plus fixed
- 자동 야간/휴일 수당
- AUTO_OVERTIME

종료된 Overtime Session은 multiplier와 base rate 계산 Snapshot을 보존한다.

## 15. Unclosed Day

Clock Out 없이 local midnight를 통과한 Day는 다음날까지 자동 누적하지 않는다.

- 해당 Day 계산은 midnight에서 임시 clamp
- NEEDS_TIME_REVIEW 표시
- 사용자는 Timeline Correction으로 실제 종료시각 수정

Unclosed Day를 숨기거나 자동 정상 처리하지 않는다.

## 16. Storage and Immutability

과거 결과를 현재 설정으로 다시 계산해 바꾸지 않는다.

최소 history:

- Salary effective history
- Schedule effective history

Materialized Work Day에는 계산에 사용한 Day Snapshot을 둔다.

Overtime Session에는 해당 Session의 계산 Snapshot을 둔다.

## 17. Multi-tab

V1 기본 도구:

- IndexedDB unique index
- readwrite transaction
- deterministic key
- BroadcastChannel

Web Locks는 실제 필요성이 확인된 뒤 도입한다.

Unique key만으로 모든 충돌이 해결된다고 가정하지 않는다.

Clock Out과 LOAFING Start 같은 다른 key Command도 같은 Day 상태 검증을 transaction 안에서 수행한다.

## 18. Error Handling

오류를 자동 전체 초기화로 해결하지 않는다.

integrityStatus 예:

- OK
- NEEDS_TIME_REVIEW
- DATA_WARNING
- STORAGE_ERROR

정상 계산이 불가능한 경우 정상 숫자를 조용히 표시하지 않는다.

## 19. Privacy

V1은 Local First다.

- 계정 없음
- 서버 Sync 없음
- 급여 및 Activity 원격 업로드 없음
- 키보드/마우스 감시 없음

상시 화면 노출 대응을 위해 Privacy Mode를 V1에 포함한다.

## 20. Scope Control

V1에서 제외:

- AUTO_OVERTIME
- 복합 수당
- Paid Break
- 공휴일
- 연차
- 교대근무
- 복수직장
- 연간 통계
- 정밀 세후 계산
- 위치기반 출퇴근
- 회사 근태 연동
- 법률 위반 판정

## 21. 완료 기준

각 기능은 다음을 만족해야 완료다.

1. Domain Contract 일치
2. Unit Test
3. Boundary Test
4. Reload Restore
5. Multi-tab 핵심 충돌 Test
6. 모바일 및 데스크톱 기본 UX
7. 문서와 동작 일치
