# PayMeter UI and UX Specification

## 1. UI 방향

PayMeter는 급여 계산기보다 실시간 계측 Dashboard에 가깝게 보이도록 한다.

키워드:

- 실시간
- 타이머
- 계측기
- 숫자 중심
- 재미있는 자기 관찰
- 모바일 우선
- Desktop 확장

---

## 2. Dashboard 최상위 구조

메인 화면에서 최소 세 가지가 동시에 보여야 한다.

```
돈
시간
상태
```

Hero 예:

```
돈 버는 중

₩ 184,375.428
+ ₩ 6.944 / sec

근무  06:42:18.382
```

하단 Activity Timer:

```
업무   05:31:04
루팡   01:11:14
루팡률 17.7%
```

---

## 3. 실시간 타이머 UX

타이머는 최소 다음을 지원한다.

- 근무 타이머
- 업무 타이머
- 루팡 타이머
- 무료봉사 타이머
- 추가근무 타이머

표시는 필요에 따라:

```
HH:MM:SS
HH:MM:SS.mmm
```

고정밀 표시는 설정 가능하게 한다.

내부 계산은 표시 refresh와 독립적이다.

---

## 4. 활동 전환

정규 근무 중 주요 Action:

WORKING 상태:

```
[루팡 시작]
```

LOAFING 상태:

```
[업무 복귀]
```

버튼을 누르면 즉시 타이머가 전환된다.

급여 카운터는 FIXED_PERIOD에서 계속 증가한다.

예:

```
루팡 중

₩ 112,528.61
+ ₩ 6.944 / sec

루팡
00:23:18.442

오늘 루팡으로 번 가치
₩ 9,715
```

`루팡으로 번 가치`는 참고 환산값이며 급여 차감 항목이 아니다.

---

## 5. 상태별 메인 화면

### BEFORE_WORK

```
출근 전
09:00 시작
출근까지 00:42:18
```

### REGULAR_WORK + WORKING

```
돈 버는 중

₩ 184,375.428
+ ₩ 6.944 / sec

근무 06:42:18
업무 05:31:04
루팡 01:11:14

[루팡 시작]
```

### REGULAR_WORK + LOAFING

```
루팡 중

₩ 184,375.428
+ ₩ 6.944 / sec

루팡 01:11:14
루팡률 17.7%

[업무 복귀]
```

### UNPAID_BREAK

```
휴게시간
급여 진행 일시정지
활동 타이머 제외
```

### AFTER_SCHEDULE_UNPAID

```
무료봉사 중

정규 급여
₩ 200,000
증가 정지

무료봉사
00:24:31.222

환산 가치
₩ 10,208

[추가근무 시작]
[퇴근]
```

### PAID_OVERTIME

```
추가수당 적용 중

오늘 총 진행
₩ 218,762.500

추가근무
00:30:01

추가수당
₩ 18,762
```

### CLOCKED_OUT - FIXED_PERIOD

퇴근 버튼을 누른 순간 일당 확정 애니메이션은 짧고 명확하게 한다.

예:

```
오늘 근무 종료

오늘 확정 일당
₩ 200,000

추가수당
₩ 18,762

오늘 총 급여
₩ 218,762

근무 체류
08:24:31

업무
06:48:17

루팡
01:11:43

무료봉사
00:24:31
```

조기 퇴근이어도 FIXED_PERIOD의 정규 일당은 설정된 배정 일당으로 확정한다.

---

## 6. Dashboard Cards

Priority 1:

- Current Pay
- Pay State
- Current Rate
- Main Timer
- Activity Toggle

Priority 2:

- Today Final or Expected Daily Pay
- Working Timer
- Loafing Timer
- Loafing Ratio
- Remaining Time

Priority 3:

- Week
- Month
- Year
- Overtime
- Free Work
- Loafing Reference Value

---

## 7. 숫자 표시

Current Pay:

- 정수 원
- 소수 2자리
- Dynamic Precision

Timer:

- 기본 HH:MM:SS
- 고정밀 옵션 HH:MM:SS.mmm

숫자는 tabular-nums 사용 권장.

---

## 8. 월급쟁이 진행값과 확정값

퇴근 전:

```
오늘 급여 진행
₩ 175,000 / ₩ 200,000
```

퇴근 후:

```
오늘 확정 일당
₩ 200,000
```

두 의미를 동일 Label로 섞지 않는다.

---

## 9. 설정 UX

그룹:

1. 급여
2. 급여 누적 방식
3. 근무 일정
4. 휴게시간
5. 추가수당
6. 타이머 표시
7. 데이터

타이머 설정:

- milliseconds 표시
- 루팡 지표 표시
- 루팡 환산 가치 표시
- 상태 문구

---

## 10. 추가근무 UX

정규 종료 후:

```
[추가근무 시작]
```

정책과 시작 시각을 확인하고 시작한다.

소급 시작 시각 수정 가능.

---

## 11. 퇴근 UX

`퇴근`은 그날의 Session 마감 Action이다.

FIXED_PERIOD:

- Activity Session 종료
- 무료봉사 Session 종료
- 진행 중 Overtime 확인
- 정규 일당 100% 확정
- Daily Summary 생성

TIME_BASED:

- 실제 유급시간 기준 정규급여 확정

---

## 12. History

날짜별:

- 확정 정규급여
- 추가수당
- 업무시간
- 루팡시간
- 루팡률
- 무료봉사
- 퇴근 시각

상세 예:

```
2026-09-19

업무      06:48:17
루팡      01:11:43
무료봉사  00:24:31

확정 일당
₩200,000

추가수당
₩41,250

루팡 환산 가치
₩29,896
```

---

## 13. 표현 원칙

`루팡`은 제품의 유머 요소다.

사용자가 불편하면 향후 다음 표현으로 변경 가능하게 한다.

- 딴짓
- 휴식
- 개인시간
- 비업무
- 사용자 지정

앱은 루팡 시간을 생산성 또는 근무 태도 평가로 단정하지 않는다.

---

## 14. 모션

실시간 숫자와 Timer는 자연스럽게 갱신하되 catch-up animation으로 실제값을 지연시키지 않는다.

상태 전환 시 짧은 Transition만 사용한다.

---

## 15. 접근성

- 상태는 텍스트로 제공
- 색만으로 의미 전달 금지
- 충분한 Contrast
- Touch Target 확보
- Reduced Motion
- Screen Reader Label
