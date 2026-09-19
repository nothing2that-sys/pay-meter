# PayMeter Data and Storage Specification

## 1. 목표

PayMeter V1은 Local First다.

급여와 Activity 기록은 기본적으로 외부 서버로 전송하지 않는다.

저장은 캐주얼 앱에 필요한 최소 구조를 유지하되 과거 결과가 현재 설정 변경으로 바뀌지 않게 한다.

## 2. localStorage

UI 및 현재 설정 접근에 적합한 작은 데이터:

- appSettings pointer
- displayPreferences
- privacyMode
- milestoneEnabled
- consumerItems
- lastRoute
- schemaVersion pointer

급여 결과의 과거 재현에 필요한 유일한 SSOT를 localStorage 현재값 하나에만 두지 않는다.

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

V1에서 FIXED_PERIOD 설정 변경 UX는 다음 Period 적용을 기본으로 하여 복잡한 월중 재배분을 피한다.

- MONTHLY, ANNUAL: 다음 달
- WEEKLY: 다음 주

HOURLY Rate 변경은 다음 localDate 적용을 기본으로 한다.

## 5. ScheduleRevision

최소:

- id
- effectiveFromLocalDate
- timeZoneAtCreation
- weekStartsOn
- day schedules
- unpaid breaks
- createdAt

V1에서는 Schedule 변경도 다음 localDate 또는 사용자가 명시한 미래 localDate부터 적용한다.

이미 materialize된 과거 WorkDay를 자동 재작성하지 않는다.

## 6. WorkDay

WorkDay는 날짜별 계산 Context다.

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

natural key:

- localDate

단일 프로필 V1에서는 같은 localDate에 WorkDay 하나만 존재한다.

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

DailyOverride는 해당 날짜 WorkDay materialization 전에 적용하거나 Timeline Correction 흐름에서 명시적으로 다시 계산한다.

이미 발생한 Overtime 및 Clock Event를 조용히 삭제하지 않는다.

금액 결과를 바꾸는 Override에는 사용자 확인이 필요하다.

## 8. ClockEvent

V1은 WorkDay에 Clock In/Out field를 둘 수 있으며 변경 이력이 필요하면 ClockEvent log를 함께 사용할 수 있다.

TIME_BASED:

- Clock In 필수
- Clock Out 권장

FIXED_PERIOD:

- Clock In 불필요
- Clock Out이 Daily Target 확정 Action

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

Break와 겹칠 수 있으나 통계 계산에서 Break 교집합은 제외한다.

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

V1에는 별도 OvertimePolicy entity와 Policy Revision system이 없다.

Session 자체에 계산 Snapshot을 보존한다.

open OvertimeSession은 WorkDay당 최대 하나다.

## 11. Free Work

무료봉사 Session Store는 만들지 않는다.

Free Work는 다음 원본에서 계산한다.

- WorkDay scheduledEnd
- Clock Out
- Overtime Session
- day clamp

## 12. Daily Summary Cache

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

원본 WorkDay와 Session에서 재생성할 수 있어야 한다.

## 13. Timeline Correction

Timeline 수정 대상:

- Clock In
- Clock Out
- Loafing start/end
- Overtime start/end

UI 기본 step:

- 5 minutes

수정은 같은 WorkDay의 invariant를 검증한 하나의 readwrite transaction으로 저장한다.

수정 후 관련 Daily Summary Cache를 invalidate한다.

## 14. Unclosed Day

이전 WorkDay가 clockOutAtEpochMs 없이 날짜를 넘겼으면:

- WorkDay integrityStatus = NEEDS_TIME_REVIEW
- 계산은 local midnight에서 clamp
- 다음 Day와 자동 병합하지 않음
- Timeline Correction으로 해결

자동으로 임의 Clock Out timestamp를 영구 저장하지 않는다.

## 15. Time Zone Snapshot

WorkDay가 materialize될 때 timeZoneSnapshot을 저장한다.

과거 Event epoch timestamp는 그대로 유지한다.

현재 Device Time Zone이 바뀌었다고 과거 WorkDay localDate나 Schedule 경계를 다시 계산하지 않는다.

## 16. Natural Key and Unique Index

필수 uniqueness 예:

- WorkDay.localDate unique
- open Loafing per WorkDay invariant
- open Overtime per WorkDay invariant
- Clock Out one effective value per WorkDay

deterministic key 예:

- WORKDAY:{localDate}
- LOAFING:{workDayId}:{startAtEpochMs}
- OVERTIME:{workDayId}:{startAtEpochMs}

AUTO_OT key는 V1에 필요 없다.

## 17. Multi-tab

V1 전략:

1. Command 시작
2. IndexedDB readwrite transaction
3. 현재 WorkDay 상태 재조회
4. invariant 검증
5. write
6. commit 후 BroadcastChannel로 invalidate 알림

BroadcastChannel 메시지는 SSOT가 아니다.

다른 탭은 메시지를 받으면 Repository에서 다시 읽는다.

Web Locks는 V1 필수가 아니다.

## 18. Schema Version

각 저장 root는 schemaVersion을 가진다.

Migration 원칙:

- 순차 Migration
- 실패 시 원본 보존
- 자동 전체 초기화 금지
- 부분 손상 레코드는 quarantine 가능
- 이전 버전 Fixture Test

## 19. Corruption

거부 또는 quarantine 대상:

- invalid money
- invalid localDate
- end < start
- WorkDay를 벗어나는 invalid session
- multiplier <= 0
- overlapping incompatible overtime
- duplicated effective Clock Out
- unknown schemaVersion

손상된 하나의 Session 때문에 전체 DB를 초기화하지 않는다.

## 20. JSON Export and Import

V1 Export 대상:

- Settings
- Salary Revisions
- Schedule Revisions
- Work Days
- Daily Overrides
- Loafing Sessions
- Overtime Sessions
- Consumer Items

Export에는 schemaVersion을 포함한다.

Import는 validate -> preview -> apply 순서를 사용하며 기존 데이터를 즉시 덮어쓰지 않는다.

## 21. Reset

분리:

- UI Preferences reset
- Consumer Items reset
- Activity History reset
- Work History reset
- Full Local Data reset

전체 초기화는 별도 확인이 필요하다.

## 22. Privacy

- 원격 업로드 없음
- 원격 Activity telemetry 없음
- 사용자 행동 자동 감시 없음
- Local data 접근은 동일 브라우저 프로필 보안에 의존

CSP와 외부 Script 최소화를 권장한다.
