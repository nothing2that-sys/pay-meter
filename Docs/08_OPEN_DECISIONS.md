# PayMeter Open Decisions

이 문서는 아직 확정하지 않은 제품 및 계산 정책과 이미 확정된 주요 결정을 기록한다.

---

# Decided

## D3. FIXED_PERIOD 조기 퇴근

상태: DECIDED

연봉, 월급, 주급 기반 FIXED_PERIOD 사용자는 예정 근무일에 퇴근을 누르면 해당 날짜의 배정 정규 일당을 100% 확정한다.

조기퇴근은 시간 통계에 남길 수 있으나 정규 일당을 비례 삭감하지 않는다.

TIME_BASED에는 적용하지 않는다.

관련 정본:

- 01_PRODUCT_REQUIREMENTS
- 02_PAY_TIME_ENGINE_SPEC
- 07_TEST_AND_ACCEPTANCE

---

## D8. 기간 누적 의미

상태: DECIDED

두 개념을 분리한다.

- Realtime Progress: 오늘 현재 시점의 타이머형 급여 진행 표시
- Finalized Pay: 퇴근 또는 Session 종료 후 확정된 급여

FIXED_PERIOD의 Week, Month, Year 누적은 완료된 날짜의 Finalized Pay를 기준으로 한다.

현재 진행 중 오늘 값은 Dashboard에서 실시간으로 별도 합성할 수 있다.

---

## D11. 업무와 루팡 타이머

상태: DECIDED

급여 상태와 활동 상태를 분리한다.

사용자는 정규 근무 중 다음 상태를 직접 전환한다.

- WORKING
- LOAFING

루팡 상태에서도 FIXED_PERIOD 급여 진행은 계속된다.

루팡 시간과 환산 가치는 분석용 지표이며 급여 차감 또는 생산성 판정에 사용하지 않는다.

키보드, 마우스, 앱 사용량 자동 감시는 하지 않는다.

---

## D2. 정규 근무 종료 후 전환 방식

상태: DECIDED

사용자 설정으로 두 방식을 지원한다.

- MANUAL_OVERTIME: 정규 종료 즉시 무료봉사 상태로 자동 전환. 유급 추가근무는 사용자가 직접 시작.
- AUTO_OVERTIME: 정규 종료 즉시 지정된 기본 Overtime Policy로 유급 추가근무 시작.

설정이 없거나 AUTO_OVERTIME Policy가 invalid하면 MANUAL_OVERTIME처럼 무료봉사로 Fail Safe한다.

---

## D13. 현재 시각 기준

상태: DECIDED

PayMeter의 현재 시각 SSOT는 사용자 디바이스 Wall Clock이다.

페이지 실행시간이나 setInterval Tick 수를 시간의 SSOT로 사용하지 않는다.

앱 진입 및 foreground 복귀 시 디바이스 현재 시각으로 전체 Snapshot을 재계산한다.

---

# Open

## D1. 급여 배분 방식 세부

FIXED_PERIOD의 기본은 기간 급여를 예정 근무일과 예정 유급시간에 배분한다.

추가 검토:

- 월 중간 Salary Revision의 분모
- 일급의 기본 AccrualMode
- Manual Hourly Override

---

## D4. 유급휴일

FIXED_PERIOD에서 유급휴일을 어떻게 처리할지 결정 필요.

후보:

- Paid Leave State로 일당은 확정하되 근무시간은 0
- 근무일 재배분

Paid Leave State 방식이 더 자연스럽지만 미확정.

---

## D5. Overnight Schedule

예:

```
22:00 ~ 07:00
```

MVP에서는 금지하고 교대근무 Phase에서 구현하는 것을 권장.

---

## D6. 세전과 세후

V1은 입력 금액 자체를 정본으로 사용.

향후 Gross, Net 또는 둘 다 표시 검토.

---

## D7. 무료봉사 문구

기본:

```
무료봉사 중
```

향후 선택:

- 정규 근무 종료
- 초과근무 미등록
- 업무시간 초과
- 퇴근하세요
- 사용자 직접 입력

---

## D9. 휴가

연차 사용일의 처리 결정 필요.

권장 방향:

Paid Leave State를 별도로 두고 FIXED_PERIOD 일당에는 포함하되 실제 Work Timer에는 포함하지 않는다.

---

## D10. 월급 및 연봉 변경일

월 중간 Salary Revision 시 기간 배분 분모를 Revision 구간별로 계산하는 규칙을 확정해야 한다.

---

## D12. 루팡률 분모

현재 V1 권장:

```
LOAFING / (WORKING + LOAFING)
```

정규 무급 휴게는 제외.

향후 회의, 교육, 개인업무 등 Activity State 확장 시 분모 정책을 다시 결정한다.

---

## Decision Process

결정이 내려지면:

1. 상태를 DECIDED로 변경
2. 관련 상위 SSOT 반영
3. 테스트 Fixture 추가
4. 구현
