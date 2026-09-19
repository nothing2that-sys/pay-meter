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

## 16. Primary Screen Simplification

기본 화면은 상세 Dashboard가 아니다.

PayMeter를 장시간 켜두는 사용 패턴을 우선하여 기본 화면에는 최소 정보만 표시한다.

### 기본 레이아웃

```
          돈 버는 중

       ₩ 142,381.72
       + ₩ 6.944 / sec

  05:37:18      퇴근까지 02:22
```

시각적 비중:

1. 현재 누적 금액
2. 현재 상태
3. 현재 증가율
4. 근무 경과시간 또는 퇴근까지 남은 시간

그 외 정보는 기본 화면에서 작은 보조 정보 또는 Detail 진입 후 표시한다.

기본 화면에서 다음 정보를 동시에 카드 형태로 펼쳐놓지 않는다.

- 주 누적
- 월 누적
- 연 누적
- 업무시간 상세
- 루팡률
- 루팡 환산 가치
- 무료봉사 환산 가치
- 추가수당 세부 Breakdown

이 정보는 화면 Tap, Detail Button, Sheet 또는 별도 Statistics 화면에서 확인한다.

---

## 17. Compact and Corner Display

PayMeter는 브라우저를 작은 크기로 줄여 화면 한쪽에 계속 띄워두는 사용을 지원해야 한다.

좁은 폭에서는 자동으로 Compact Layout으로 전환한다.

예:

```
₩142,381.72
+₩6.944/s
05:37:18
```

최소 폭에서도 가로 Scroll이 생기지 않아야 한다.

Compact Mode에서는 Navigation과 상세 Card를 숨기고 필요한 경우 한 개의 Menu Action만 제공한다.

모바일에서도 첫 화면의 대부분을 큰 금액 숫자가 차지하도록 한다.

---

## 18. Milestone Effects

누적 금액이 특정 Threshold를 처음 통과하는 순간 짧은 효과를 보여준다.

V1 기본 Threshold 후보:

```
5,000 KRW
10,000 KRW
```

구현 방식은 Threshold의 배수 Crossing으로 판정한다.

예:

```
49,998 -> 50,003
```

일 경우 50,000원 Milestone을 1회 발생시킨다.

화면 Refresh가 느려 여러 Threshold를 한 번에 통과한 경우 동일 금액 Milestone을 중복 재생하지 않는다.

권장 효과:

- 금액 숫자 짧은 Scale Pulse
- 주변 Ring 확산
- 작은 Particle 또는 Spark
- 짧은 Highlight

금지:

- 긴 전체 화면 Animation
- 실제 금액 표시를 가리는 효과
- Threshold마다 Sound 강제 재생
- 백그라운드 복귀 시 지나간 Milestone을 연속 재생

설정:

- Effect On/Off
- Threshold: 5,000 / 10,000 / Custom 향후 지원
- Reduced Motion에서는 최소 Highlight 또는 효과 없음

---

## 19. Detail Disclosure

기본 화면에서 한 번의 Tap 또는 Detail Action으로 다음을 확인한다.

- 오늘 예상 또는 확정 일당
- 업무시간
- 루팡시간
- 루팡률
- 무료봉사
- 추가수당
- 주, 월, 연 누적

즉 정보 구조는 다음과 같다.

```
Default
  Current Money
  Current State
  Current Rate
  Small Timer

Detail
  Today
  Activity
  Overtime
  Free Work
  Period Statistics
```

PayMeter의 기본 인상은 Dashboard가 아니라 Money Timer여야 한다.

## 20. Two-Level Surface Contract

PayMeter는 기본 화면과 상세 Dashboard를 둘 다 유지한다.

### Money Timer

항상 띄워두는 최소 화면.

필수 요소:

- 큰 실시간 누적 금액
- 현재 Rate
- 작은 Timer
- 현재 Activity 상태
- Activity Toggle
- Full Dashboard 진입 Action

WORKING:

```
돈 버는 중

₩142,381.72
+₩6.944 / sec

05:37:18

[루팡 시작]  [상세]
```

LOAFING:

```
루팡 중

₩143,022.14
+₩6.944 / sec

루팡 00:13:42

[업무 복귀]  [상세]
```

LOAFING 전환은 급여 Counter를 멈추지 않는다.

### Full Dashboard

기존 상세 Dashboard는 삭제하지 않는다.

다음 정보를 한 화면 또는 섹션별로 제공한다.

- 오늘 급여 진행
- 오늘 예상 또는 확정 일당
- 근무 진행률
- 업무시간
- 루팡시간
- 루팡률
- 루팡 환산 가치
- 무료봉사 시간 및 환산 가치
- 추가수당
- 오늘, 주, 월, 연 누적
- 시간당, 분당, 초당, ms당 Rate
- History 진입

사용자는 Money Timer에서 한 번의 Action으로 Full Dashboard에 진입하고 다시 Timer로 돌아올 수 있어야 한다.

### Compact Mode Activity Toggle

Corner Display처럼 작은 폭에서도 Activity Toggle은 숨기지 않는다.

공간이 매우 좁으면 Label을 단축할 수 있다.

```
[루팡]
[복귀]
```

상태 변경은 최대 한 번의 Tap 또는 Click으로 완료되어야 한다.

## 21. Default Navigation

기본 진입 화면:

```
Money Timer
```

주요 이동:

```
Money Timer
  -> Full Dashboard
  -> History
  -> Settings
```

Full Dashboard는 보조 기능이 아니라 PayMeter의 정식 주요 화면으로 유지한다.

## 22. Work Schedule and Post-Work Settings

설정 화면에서 기본 근무시간을 명확하게 지정한다.

예:

```
출근 09:00
퇴근 18:00
```

정규 퇴근 이후 동작:

```
○ 무료봉사로 전환
   추가근무는 내가 직접 시작

○ 추가근무 자동 시작
   기본 수당: 연장근무 1.5x
```

첫 번째 옵션이 V1 기본값이다.

AUTO_OVERTIME 선택 시 기본 추가수당 정책 선택을 필수로 한다.

## 23. Background and Reopen UX

앱을 오랫동안 보지 않다가 다시 열어도 중간 과정을 애니메이션으로 빠르게 재생하지 않는다.

즉시 현재 Snapshot을 보여준다.

MANUAL_OVERTIME 예:

```
무료봉사 중

₩ 200,000
정규급여 정지

무료봉사
01:00:00

환산 가치
₩ 25,000

[추가근무 시작] [퇴근]
```

AUTO_OVERTIME 예:

```
추가근무 중

₩ 237,500

추가근무
01:00:00

추가수당
₩ 37,500
```

사용자가 실제로 더 일하지 않고 이미 퇴근했는데 퇴근 버튼을 누르지 않았던 경우를 위해 History 또는 당일 수정에서 실제 퇴근 시각을 보정할 수 있는 구조를 유지한다.

## 24. Device Time Display

필요 시 상세 화면 또는 설정에서 현재 계산 기준을 확인할 수 있게 한다.

예:

```
시간 기준
디바이스 시간

시간대
Asia/Seoul
```

PayMeter 자체 서버 시간을 사용자에게 강제하지 않는다.
