# PayMeter P1 Prototype Retention Gate

## 1. 목적

P1은 PayMeter 전체 V1 구현이 아니다.

이 단계의 목적은 Money Timer를 실제 업무 중 계속 띄워놓을 가치가 있는지 확인하는 것이다. Retention 검증 전에는 P2 이후의 정식 Domain, Revision, IndexedDB, Overtime, Timeline, History를 확장하지 않는다.

## 2. P1 구현 범위

- React + TypeScript strict + Vite
- ESLint + Prettier
- Vitest + Playwright
- GitHub Actions CI
- PWA manifest + Service Worker App Shell
- MONTHLY FIXED_PERIOD only
- 월급과 월 예정 유급시간 기반 Daily Target
- Device Wall Clock 기반 Snapshot 재계산
- 기본 요일 Schedule, 출퇴근 시각, unpaid break
- Today Target, Today Progress, current money, second rate, work timer
- Inferred WORKING
- persisted LOAFING timestamp interval
- break 교집합을 제외한 Activity 계산
- 10,000원 Milestone Effect
- Consumer Value
- Privacy Mode
- Compact Mode
- Document Picture-in-Picture feature detection 및 동일 Snapshot 렌더링
- localStorage reload restore
- background/sleep 복귀 시 Wall Clock 재계산
- 최소 Today Dashboard

## 3. 의도적으로 제외한 범위

- HOURLY 및 Clock In
- AUTO_OVERTIME
- Manual Overtime
- 무료봉사 정식 기능
- Timeline Correction
- History
- Week/Month 정식 Aggregation
- Salary/Schedule Revision
- IndexedDB 정식 Schema
- Multi-tab hardening
- JSON Import
- 휴일, 연차, 교대근무, 복수직장, 연간 통계
- 정밀 세금 계산
- 서버, 로그인, Cloud DB, 원격 Analytics

## 4. 기본 테스트 절차

1. 처음 실행하고 월급, 근무 요일, 출근/퇴근, unpaid break를 저장한다.
2. Money Timer에서 현재 금액과 Today Progress가 Wall Clock에 따라 증가하는지 본다.
3. 루팡 시작을 한 번 누르고 시간이 지난 뒤 업무 복귀를 누른다.
4. LOAFING 중에도 FIXED_PERIOD 금액은 계속 증가하는지 확인한다.
5. unpaid break 동안 급여 진행과 Activity 집계가 정지하고 Toggle이 비활성인지 확인한다.
6. 새로고침 후 설정과 open LOAFING 상태가 복원되는지 확인한다.
7. 탭을 background로 보냈다가 돌아와 catch-up animation 없이 현재 시각 기준 값으로 즉시 맞는지 확인한다.
8. Privacy Mode를 켜고 Money Timer 금액이 즉시 가려지는지 확인한다.
9. 창 폭을 작게 줄이고 가로 스크롤, 숫자 잘림, Activity/Privacy 접근성을 확인한다.
10. Consumer Item을 추가하고 earned/remaining 문구가 자연스러운지 확인한다.
11. 10,000원 경계를 통과할 때 짧은 Effect가 한 번만 보이는지 확인한다.

## 5. Document PiP 수동 Smoke

Document Picture-in-Picture는 브라우저와 자동화 환경 제약이 있으므로 실제 지원 브라우저에서 다음을 확인한다.

1. 지원 브라우저에서 `위젯으로 열기`가 표시되는지 확인한다.
2. 사용자 클릭으로 PiP 창을 연다.
3. 본문과 PiP의 Current Money, Today Progress, Timer, State가 같은 Snapshot인지 확인한다.
4. PiP에서 루팡 시작/업무 복귀를 전환하고 본문 상태가 즉시 같은 값으로 바뀌는지 확인한다.
5. PiP에서 Privacy를 전환하고 본문과 PiP가 함께 마스킹되는지 확인한다.
6. PiP를 닫아도 LOAFING Session이 자동 종료되거나 생성되지 않는지 확인한다.
7. PiP에서는 Milestone Effect가 재생되지 않는지 확인한다.
8. 미지원 브라우저에서는 기능 버튼 때문에 오류가 발생하지 않고 Compact Money Timer를 계속 사용할 수 있는지 확인한다.

## 6. 1일 사용 확인

- 업무 시작 후 Money Timer를 몇 번 다시 보게 되는가
- 브라우저 탭보다 PiP 또는 작은 창을 유지하는 편이 자연스러운가
- 루팡 버튼을 실제 행동 전환 시 누르게 되는가
- Privacy 전환이 충분히 빠른가
- Consumer Value가 금액을 더 직관적으로 느끼게 하는가
- Milestone이 재미인지 방해인지 기록한다

구체적인 성공 수치는 사전에 임의로 정하지 않는다.

## 7. 3일 사용 확인

- 첫날의 신기함이 줄어든 뒤에도 화면을 켜두는가
- LOAFING 기록이 번거로워져 사용을 포기하지 않는가
- Compact/PiP의 정보량이 과하거나 부족하지 않은가
- Consumer Item을 실제 생활 가격으로 바꾸게 되는가
- Milestone을 끄고 싶어지는지 확인한다
- 설정 화면을 다시 열어야 하는 빈도를 기록한다

## 8. 7일 사용 확인

- 일주일 뒤에도 업무 중 자발적으로 PayMeter를 실행하는가
- PiP를 계속 사용하는가, 일반 작은 창이면 충분한가
- Today Progress가 유지 사용 이유가 되는가
- LOAFING 데이터가 재미/회고에 의미가 있는가
- Consumer Value와 Milestone 중 남겨야 할 기능이 무엇인지 정리한다
- 불필요하거나 시선을 방해하는 요소를 제거 후보로 기록한다

## 9. P2 진행 판단

다음 질문에 실제 사용 근거로 답한 뒤 P2 진행 여부를 결정한다.

- Money Timer 자체를 계속 켜두고 싶은가
- Document PiP가 retention에 실질적으로 기여하는가
- Today Target/Progress가 단순 현재 금액보다 유용한가
- LOAFING Toggle의 조작 비용이 충분히 낮은가
- Consumer Value가 반복 사용 가치가 있는가
- Milestone이 피로감을 만들지 않는가
- Privacy Mode가 상시 표시 불안을 충분히 낮추는가
- 현재 Prototype에서 제거해야 할 기능은 무엇인가
- P2 정식 Domain으로 교체할 가치가 확인됐는가

## 10. Gate 결과 기록 형식

실사용 후 다음 중 하나로 기록한다.

- RETENTION_CONFIRMED
- RETENTION_MIXED
- RETENTION_NOT_CONFIRMED

수치 기준은 P1 사용 결과를 본 뒤 별도 결정한다.
