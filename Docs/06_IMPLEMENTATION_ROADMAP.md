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

## UI Delivery Rule

P4 Realtime Dashboard 구현 시 실제 기본 화면은 Full Dashboard가 아니라 Minimal Money Timer로 구현한다.

P4 필수:

- 큰 실시간 누적 금액
- 현재 Rate
- 작은 근무 Timer
- 상태 표시
- Responsive Compact Layout
- 작은 브라우저 폭에서 Corner Display 형태 유지

P5 이후 추가되는 업무, 루팡, 무료봉사 통계는 기본 화면을 확장하는 대신 Detail View에 우선 배치한다.

Milestone Effect는 P4 또는 별도 P4.1 범위로 구현한다.

필수 검증:

- 5,000원 또는 10,000원 Threshold Crossing 1회 Effect
- Refresh 간격이 Threshold를 건너뛰어도 정확히 1회
- Background 복귀 시 과거 Effect 폭주 없음
- Effect Off 설정
- Reduced Motion 대응

## Surface Implementation Contract

P4에서 두 화면을 모두 구현 대상으로 유지한다.

### P4A Money Timer

- Default route 또는 default surface
- 실시간 누적 금액
- 현재 Rate
- Timer
- Compact Mode
- Milestone Effect
- Full Dashboard 진입

### P4B Full Dashboard

- 기존 상세 Dashboard 유지
- Today summary
- Work progress
- Week, Month, Year
- Rate details
- 이후 Phase에서 Activity, Free Work, Overtime 상세를 점진적으로 연결

P5 Activity Timer 구현 시 Money Timer에도 Activity Toggle을 추가한다.

필수:

- WORKING 상태에서 `루팡 시작`
- LOAFING 상태에서 `업무 복귀`
- 상태 전환 중에도 FIXED_PERIOD 급여 증가 지속
- Full Dashboard와 Money Timer가 동일 Activity Session을 공유
- 화면 이동 때문에 Session이 끊기거나 중복 생성되지 않음

Money Timer를 단순화하기 위해 Full Dashboard를 삭제하거나 기능 축소해서는 안 된다.

## Device Time and Post-Work Implementation

### P1 추가

- Production DeviceClock
- FakeClock
- Local Time Zone Adapter
- Clock jump validation

### P2 추가

- PostWorkTransitionMode
- MANUAL_OVERTIME
- AUTO_OVERTIME
- Scheduled End boundary transition
- Missing Overtime Policy Fail Safe
- background reconstruction logic

### P3 추가

First Run 및 Settings에서:

- 기본 출근 시각
- 기본 퇴근 시각
- 정규 종료 후 동작 선택
- AUTO_OVERTIME 기본 Policy 선택

### P4 추가

다음 이벤트에서 Snapshot 강제 갱신:

- initial load
- visibility visible
- focus
- pageshow

백그라운드 시간에 대한 catch-up animation은 만들지 않는다.

### P7 추가

AUTO_OVERTIME Session 재구성 및 중복 방지 검증을 포함한다.
