# PayMeter Implementation Roadmap

## 1. 개발 원칙

계산 엔진에서 UI로 진행한다.

급여 상태와 활동 상태를 분리하고 타이머는 모두 timestamp 기반으로 구현한다.

---

# Phase P0 - Repository and Toolchain

- React + TypeScript + Vite
- strict TypeScript
- ESLint
- Formatter
- Vitest
- Playwright
- PWA 기본 구성
- CI

완료: dev, build, unit, e2e smoke, CI PASS.

---

# Phase P1 - Domain Foundation

구현:

- Money type
- micro-KRW
- PayBasis
- AccrualMode
- SalaryProfile
- WeeklySchedule
- BreakWindow
- DailyOverride
- Clock
- FakeClock
- Calendar Helper

완료:

- UI 없이 테스트 가능
- Validation
- Boundary Test

---

# Phase P2 - Pay and Work State Engine

구현:

- FIXED_PERIOD
- TIME_BASED
- Allocated Daily Pay
- Visualization Rate
- Schedule Segment
- Pay State Engine
- Today Snapshot
- Clock Out Settlement

핵심:

FIXED_PERIOD 퇴근 시 해당 날짜 배정 일당 100% 확정.

완료:

- ms 경계 테스트
- 조기퇴근 확정 규칙 테스트

---

# Phase P3 - Local Storage and First Run

구현:

- localStorage Repository
- IndexedDB
- schemaVersion
- Setup Wizard
- Salary
- Accrual Mode
- Schedule
- Break
- Reload Restore

---

# Phase P4 - Realtime Dashboard

구현:

- Realtime Pay Progress
- Current Rate
- Pay State
- Main Work Timer
- Progress
- Remaining Time
- Today Expected Daily Pay
- Week, Month, Year 기본
- Responsive UI

완료:

- tick 누적 금지
- background 복귀 정확
- 18:00 Rate 0 전환

---

# Phase P5 - Activity Timer and Loafing

구현:

- Activity State Engine
- WORKING
- LOAFING
- ActivitySession
- 업무 타이머
- 루팡 타이머
- 루팡률
- 루팡 환산 가치
- Activity Toggle
- Reload Restore

완료:

- WORKING -> LOAFING -> WORKING 정확
- 휴게시간 Activity 제외
- FIXED_PERIOD 급여는 LOAFING에서도 계속 진행
- 새로고침 후 진행 Session 복원
- 퇴근 시 Session 종료

---

# Phase P6 - Free Work and Clock Out

구현:

- 무료봉사 상태
- 무료봉사 타이머
- 환산 가치
- 퇴근 Action
- FIXED_PERIOD Daily Pay Finalization
- TIME_BASED Actual Pay Finalization
- DailyWorkState
- Daily Summary

완료:

- 18:00 이후 정규 진행 정지
- 무료봉사만 증가
- 퇴근 후 모든 기본 Timer 정지
- FIXED_PERIOD 일당 100% 확정
- 기간 누적 반영

---

# Phase P7 - Paid Overtime

구현:

- OvertimePolicy
- Multiplier
- Custom Hourly
- Fixed
- Hourly Plus Fixed
- Overtime Session
- Start, Stop
- 소급 시작
- Policy Snapshot
- 추가수당 분리 표시

---

# Phase P8 - History and Daily Override

구현:

- 날짜별 History
- Daily Override
- 오늘 일정 변경
- 날짜별 Segment Detail
- 업무, 루팡, 무료봉사 통계
- Summary Cache

---

# Phase P9 - Salary Revisions and Aggregation

구현:

- Effective Salary Revision
- Schedule Revision 검토
- Month Aggregation
- Year Aggregation
- 과거 재계산

---

# Phase P10 - PWA and Offline Quality

구현:

- Manifest
- Icons
- Offline App Shell
- Install UX
- Service Worker Update
- Offline Smoke

---

# Phase P11 - Backup and Polish

구현:

- JSON Export
- JSON Import
- Reset Scope
- Accessibility
- Reduced Motion
- Error UI
- Debug Snapshot
- Performance

---

## Post V1

후보:

- 세후 추정
- 공휴일
- 유급휴가
- 교대근무
- 다중 직장
- 활동 상태 사용자 정의
- 목표 금액
- 소비 금액 노동시간 환산
- Widget
- Cloud Sync
- 월간 리포트

---

## 첫 Release 범위

MVP 권장 범위는 P0~P7.

핵심 흐름:

```
급여 설정
-> 실시간 급여와 근무 타이머
-> 업무/루팡 타이머 전환
-> 정규 종료
-> 무료봉사
-> 추가수당
-> 퇴근
-> FIXED_PERIOD 일당 확정
```
