# PayMeter Data and Storage Specification

## 1. 목표

PayMeter V1은 Local First다.

급여와 Activity 기록은 기본적으로 외부 서버로 전송하지 않는다.

저장은 캐주얼 앱에 필요한 최소 구조를 유지하되 과거 결과가 현재 설정 변경으로 바뀌지 않게 한다.

## 2. localStorage

작은 UI Preference:

- appSettings pointer
- privacyMode
- milestoneEnabled
- lastRoute
- schemaVersion pointer

금액 소수점 표시와 Consumer Item은 V1 기본 Preference에서 제외한다.

## 3. IndexedDB

이력 및 이벤트:

- SalaryRevision
- ScheduleRevision
- WorkDay
- ClockEvent
- LoafingSession
- OvertimeSession
- DailyOverride
- DailySummaryCache
- migration metadata

## 4. SalaryRevision

최소:

- id
- effectiveFromLocalDate
- payBasis
- accrualMode
- amountKrw
- currency
- createdAt

과거 Revision을 덮어쓰지 않는다.

## 5. ScheduleRevision

최소:

- id
- effectiveFromLocalDate
- timeZoneAtCreation
- weekStartsOn
- day schedules
- unpaid breaks
- createdAt

이미 materialize된 과거 WorkDay를 자동 재작성하지 않는다.

## 6. WorkDay

최소:

- id
- localDate
- timeZoneSnapshot
- salaryRevisionId
- scheduleRevisionId
- scheduleSnapshot
- scheduledStartEpochMs
- scheduledEndEpochMs
- plannedPaidDurationMs
- dailyTargetPayMicroKrw
- clockInAtEpochMs
- clockOutAtEpochMs
- integrityStatus
- createdAt
- updatedAt

single-profile V1 natural key:

- localDate

## 7. DailyOverride

최소:

- id
- localDate
- startLocalTime
- endLocalTime
- unpaidBreaks
- enabled
- note
- updatedAt

금액 결과를 바꾸는 Override에는 사용자 확인이 필요하다.

## 8. ClockEvent

TIME_BASED:

- Clock In 필수
- Clock Out 권장

FIXED_PERIOD:

- Clock In 불필요
- Clock Out이 Day 종료 및 정규 Daily Target 확정 Action

동일 Day의 Clock Out은 하나만 유효하다.

## 9. LoafingSession

최소:

- id
- workDayId
- startAtEpochMs
- endAtEpochMs nullable
- createdAt
- updatedAt

WORKING Session은 저장하지 않는다.

open LoafingSession은 WorkDay당 최대 하나다.

## 10. OvertimeSession

최소:

- id
- workDayId
- startAtEpochMs
- endAtEpochMs nullable
- multiplierBasisPointsSnapshot
- baseRateSnapshot
- note
- createdAt
- updatedAt

별도 OvertimePolicy Revision 시스템은 없다.

## 11. Free Work

무료봉사 Session Store는 만들지 않는다.

Free Work는 다음 원본에서 계산한다.

- WorkDay scheduledEnd
- Clock Out
- Overtime Session
- day clamp

Free Work Wallet 금액도 별도 저장하지 않는다.

Wallet은 freeWorkReferenceValue를 표시하는 Presentation이다.

## 12. Perimeter Timeline

외곽 Timeline Segment를 별도 저장하지 않는다.

Timeline은:

- WorkDay Schedule
- LoafingSession
- Break

에서 재생성한다.

WORKING 구간 역시 저장하지 않는다.

## 13. Daily Summary Cache

예:

- workDayId
- sourceVersion
- finalizedRegularPayMicroKrw
- overtimePayMicroKrw
- workingDurationMs
- loafingDurationMs
- freeWorkDurationMs
- clockOutAtEpochMs

Cache는 SSOT가 아니다.

## 14. Timeline Correction

수정 대상:

- Clock In
- Clock Out
- Loafing start/end
- Overtime start/end

UI 기본 step:

- 5 minutes

수정 후 관련 Daily Summary Cache를 invalidate한다.

## 15. Unclosed Day

이전 WorkDay가 Clock Out 없이 날짜를 넘겼으면:

- integrityStatus = NEEDS_TIME_REVIEW
- 계산은 local midnight에서 clamp
- 다음 Day와 자동 병합하지 않음
- Timeline Correction으로 해결

## 16. Time Zone Snapshot

WorkDay materialize 시 timeZoneSnapshot을 저장한다.

현재 Device Time Zone 변경으로 과거 WorkDay 경계를 다시 계산하지 않는다.

## 17. Natural Key and Unique Index

필수 uniqueness 예:

- WorkDay.localDate unique
- open Loafing per WorkDay invariant
- open Overtime per WorkDay invariant
- Clock Out one effective value per WorkDay

## 18. Multi-tab

V1 전략:

1. IndexedDB readwrite transaction
2. 현재 WorkDay 상태 재조회
3. invariant 검증
4. write
5. commit
6. BroadcastChannel invalidate

Web Locks는 V1 필수가 아니다.

## 19. Schema Version

Migration 원칙:

- 순차 Migration
- 실패 시 원본 보존
- 자동 전체 초기화 금지
- 부분 손상 레코드 quarantine 가능

## 20. JSON Export and Import

V1 Export 대상:

- Settings
- Salary Revisions
- Schedule Revisions
- Work Days
- Daily Overrides
- Loafing Sessions
- Overtime Sessions

Consumer Item은 V1 Export 대상에서 제외한다.

## 21. Reset

분리:

- UI Preferences reset
- Activity History reset
- Work History reset
- Full Local Data reset

## 22. Privacy

- 원격 업로드 없음
- 원격 Activity telemetry 없음
- 사용자 행동 자동 감시 없음
- Local data 접근은 동일 브라우저 프로필 보안에 의존
