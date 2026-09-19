# PayMeter Implementation Roadmap

## 1. 개발 원칙

Phase는 계산 엔진에서 UI로 진행한다.

다음 Phase를 먼저 구현해서 앞 단계의 계산 Contract를 우회하지 않는다.

---

# Phase P0 - Repository and Toolchain

## 목표

프로젝트 실행과 테스트 기반 마련.

## 구현

- React + TypeScript + Vite
- strict TypeScript
- ESLint
- Formatter
- Vitest
- Playwright 기본 구성
- PWA 기본 Plugin
- 기본 폴더 구조
- CI Workflow

## 완료 조건

- dev 실행
- production build 성공
- unit test 실행 성공
- e2e smoke 실행 성공
- CI green

---

# Phase P1 - Domain Foundation

## 목표

Money, Time, Schedule의 순수 Domain Model 완성.

## 구현

- Money type
- micro-KRW 계산
- PayBasis
- SalaryProfile
- WeeklySchedule
- BreakWindow
- DailyOverride
- Clock interface
- FakeClock
- 날짜 및 기간 Helper

## 완료 조건

- UI 없이 테스트 가능
- 잘못된 금액 입력 거부
- Schedule validation
- Break overlap validation
- boundary unit tests

---

# Phase P2 - Pay and Work State Engine

## 목표

현재 시각의 Work State와 급여 Snapshot 계산.

## 구현

- Schedule Segment generation
- Work State Engine
- Base Rate calculation
- Period Allocation
- Today Snapshot
- Regular Work
- Paid Break
- Unpaid Break
- After Schedule Unpaid
- Clocked Out

## 핵심 검증

09:00 시작이면 08:59:59와 09:00:00 결과가 달라야 한다.

18:00 종료이면:

- 17:59:59 Regular
- 18:00:00 After Schedule
- 18:00 이후 Regular Earned 증가 없음

## 완료 조건

정해진 Fixture에 대해 ms 단위 경계 테스트 PASS.

---

# Phase P3 - Local Storage and First Run Setup

## 목표

사용자가 자신의 급여 및 근무 설정을 저장하고 다시 열 수 있게 한다.

## 구현

- localStorage Settings Repository
- IndexedDB Database 초기화
- schemaVersion
- First Run Wizard
- Salary Settings
- Weekly Schedule
- Break Settings
- Reload Restore

## 완료 조건

- 설정 후 새로고침 복원
- 브라우저 재실행 복원
- Invalid stored data 안전 처리
- Migration 기반 마련

---

# Phase P4 - Realtime Dashboard

## 목표

PayMeter의 핵심 사용자 경험 완성.

## 구현

- Realtime Current Earned
- Current Rate
- Work State
- Work Progress
- Remaining Time
- Today Summary
- Week, Month, Year Summary 기본
- 반응형 UI

## 완료 조건

- Dashboard가 tick 누적을 사용하지 않음
- 백그라운드 복귀 후 즉시 정확한 Snapshot
- 모바일 및 Desktop 표시
- 18:00 경계에서 실시간 Rate 0 전환

이 Phase부터 제품의 기본 형태가 사용 가능해야 한다.

---

# Phase P5 - Free Work and Clock Out

## 목표

정규 근무 종료 후 상태를 명확히 관리.

## 구현

- 무료봉사 상태
- 무료봉사 경과시간
- 기본 급여 환산 가치
- 퇴근 Action
- DailyWorkState 저장
- 다음날 State Reset

## 완료 조건

- 18:00 이후 실제 급여 증가 정지
- 무료봉사 시간만 증가
- 퇴근 후 무료봉사 시간 정지
- 새로고침 후 상태 유지

---

# Phase P6 - Paid Overtime

## 목표

사용자 정의 추가수당 실시간 반영.

## 구현

- OvertimePolicy
- Multiplier
- Custom Hourly
- Fixed Allowance
- Hourly Plus Fixed
- Overtime Session
- Start, Stop
- 시작 시각 수정
- Policy Snapshot
- 정규급여와 추가수당 분리 표시

## 완료 조건

- 1.5x Fixture 정확성
- 현재 정책 변경 후 과거 Session 금액 불변
- 추가근무 시작 전 무급시간과 유급시간 분리
- 새로고침 중 Active Session 복원

---

# Phase P7 - History and Daily Override

## 목표

실제 사용에서 일정 예외와 과거 확인 지원.

## 구현

- 날짜별 History
- Daily Override
- 오늘 퇴근시간 변경
- 휴무일 변경
- 날짜별 Segment Detail
- Summary Cache

## 완료 조건

- Override가 기본 Schedule보다 우선
- 기본 Schedule은 변경되지 않음
- History에서 정규, 추가, 무급 시간 구분

---

# Phase P8 - Salary Revisions and Accurate Aggregation

## 목표

급여가 변경되어도 과거 누적을 정확히 보존.

## 구현

- effective dated Salary Revision
- Schedule Revision 검토 및 구현
- Month Aggregation
- Year Aggregation
- 과거 재계산

## 완료 조건

연봉 또는 월급 변경일 전후로 올바른 Profile이 적용되어야 한다.

---

# Phase P9 - PWA and Offline Quality

## 목표

모바일에서 설치형 앱처럼 사용.

## 구현

- Manifest
- Icons
- Offline App Shell
- Install UX
- Service Worker update flow
- Offline smoke tests

## 완료 조건

- 설치 가능
- Offline Dashboard 진입 가능
- Local data 사용 가능
- 업데이트 후 저장 데이터 유지

---

# Phase P10 - Backup and Polish

## 목표

장기 사용 안전성과 제품 완성도 향상.

## 구현

- JSON Export
- JSON Import
- Reset Scope
- Accessibility
- Reduced Motion
- Error UI
- Debug Snapshot
- Performance profiling

## 완료 조건

- Export 후 초기화 후 Import 복원
- 손상 Backup 거부
- 사용자 데이터 자동 손실 없음

---

## 2. Post V1 Candidate

V1 완료 이후 검토:

- 세후 추정
- 한국 공휴일
- 유급휴가
- 교대근무
- 다중 직장
- 목표 금액
- 소비 금액 노동시간 환산
- Widget
- Cloud Sync
- 공유 가능한 월간 리포트

---

## 3. 권장 첫 Release 범위

최초 공개 가능한 MVP는 P0~P6까지로 본다.

이 범위에서 이미 다음 핵심 경험이 완성된다.

```
급여 설정
-> 근무 시작
-> 실시간 급여 증가
-> 정규 퇴근시간에서 증가 정지
-> 무료봉사 표시
-> 추가수당 시작
-> 추가 급여 실시간 증가
-> 퇴근
```

History와 장기 이력은 그 다음 Release에서 강화할 수 있다.
