# PayMeter P1 Prototype Retention Gate

## 1. 목적

P1은 PayMeter 전체 V1 구현이 아니다.

실제 업무 중 Money Timer를 계속 띄워놓을 가치가 있는지 확인하고, 사용하면서 나온 피드백을 다음 UI 설계에 즉시 반영한다.

## 2. P1 구현 완료 상태

P1과 Closeout은 완료됐다.

Closeout 이후 실제 화면 사용에서 첫 UX 피드백이 발생했다.

## 3. 2026-09-19 Early Usage Findings

실제 화면을 본 뒤 다음 문제를 확인했다.

### F1. Today Target 금액이 불필요함

"오늘 200,000원 중 124,800원"처럼 목표 금액을 직접 보여주는 정보가 기본 화면에서 과함.

결론:

- Daily Target은 계산에 유지
- 기본 UI에서는 숨김
- 진행은 %로 표현

### F2. 현재 진행을 화면 외곽으로 보고 싶음

단순 Progress Bar보다 화면 외곽 한 바퀴를 100%로 사용하는 방식이 더 위젯/계측기 성격에 적합.

결론:

- Perimeter Timeline 도입
- WORKING / LOAFING 색 구분
- 실제 시간 순서 Segment 유지
- Break 제외

### F3. 돈 정보는 두 개면 충분함

기본 화면에서 필요한 돈:

- 오늘 번 돈
- 그중 루팡으로 번 돈

Rate는 구석에 작은 보조 계측값으로 유지.

### F4. Consumer Value가 어색함

Consumer Item 비교가 핵심 화면의 메시지와 잘 연결되지 않음.

결론:

- PAUSED_EXPERIMENT
- 기본 UI/Settings에서 제거
- 나중에 필요성이 확인될 때만 재검토

### F5. Settings가 난잡함

Display/Consumer 관련 설정이 많아 관리도구처럼 느껴짐.

결론:

기본 Settings를:

- 급여 / 근무
- 화면
- 데이터

세 그룹으로 축소.

### F6. Free Work가 반드시 필요함

정규 근무가 끝난 뒤 무료봉사 가치가 증가하는 상태가 PayMeter의 중요한 개성.

결론:

- Scheduled End 이후 Perimeter 100%
- Free Work Wallet 표시
- 실제 지급액과 분리
- Wallet value가 실시간 증가

### F7. Free Work 상태에 Product Personality 필요

단순 경고보다 앱이 현재 상황을 가볍게 비꼬는 느낌이 더 PayMeter답다.

결론:

- 상황 조롱
- 개인 비하 금지
- Threshold 기반 카피
- 너무 자주 바꾸지 않음

## 4. P1R Required

현재 Retention Test를 그대로 계속하기보다 P1 UX Rework를 먼저 수행한다.

P1R 필수:

- Perimeter Timeline
- WORKING / LOAFING segment color
- Today Target UI 제거
- Today Earned
- Loafing Earned
- small Current Rate
- Free Work Wallet
- Free Work copy
- Settings simplification
- Consumer Value 제거
- PiP 대응

## 5. P1R Manual Smoke

### Regular Work

확인:

- 외곽 진행률 직관성
- 정상/루팡 구간 식별
- Today Earned 가독성
- Loafing Earned 의미 이해
- Rate가 지나치게 튀지 않음

### Break

- Perimeter 정지
- Rate 정지
- Toggle 비활성

### Free Work

- Perimeter 100%
- Wallet 증가
- Today Earned 정규 증가 정지
- Wallet을 실제 급여로 오해하지 않음
- 조롱 카피가 재미있고 불쾌하지 않음

### PiP

- 작은 크기에서도 외곽 Timeline이 읽힘
- 돈 두 개와 Rate가 과밀하지 않음
- Free Work Wallet 상태가 이해됨

### Settings

- 첫 P1보다 단순하게 느껴짐
- Consumer Item Editor 없음
- 자주 쓰지 않는 Display 설정 없음

## 6. Retention Test Restart

P1R 구현 후 다시 실제 업무 중 사용한다.

확인:

- 화면 외곽 Timeline을 실제로 자주 보는가
- Today Earned와 Loafing Earned만으로 돈 정보가 충분한가
- LOAFING 색 구간이 재미/회고에 의미가 있는가
- Free Work Wallet이 기억에 남는가
- 무료봉사 카피가 피로하지 않은가
- PiP가 계속 켜두기에 적합한가
- Settings를 다시 열 일이 줄었는가

## 7. Gate

P1R 이후 다음 중 하나를 기록한다.

- RETENTION_CONFIRMED
- RETENTION_MIXED
- RETENTION_NOT_CONFIRMED

P2는 이 결과를 보기 전에 시작하지 않는다.

## 8. Current Status

**P1R_RETENTION_TEST_READY**

P1R 상세 설계 구현과 최종 Verification Gate를 완료했다.

검증 근거는 `Docs/P1R_VERIFICATION_CLOSEOUT.md`에 기록한다.

다음 단계는 실제 업무 중 `P1R_RETENTION_TEST`다. 이 단계에서 `RETENTION_CONFIRMED`, `RETENTION_MIXED`, `RETENTION_NOT_CONFIRMED` 중 하나를 기록한다.

P2는 Retention Test 결과 전까지 착수하지 않는다.
