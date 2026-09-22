# PayMeter Detail Reporting Rework Plan

## 0. Status

- Repository: `nothing2that-sys/pay-meter`
- Branch: `main`
- Audit Baseline HEAD: `[legacy-sha-removed]`
- Scope: P1R Detail Reporting correctness, transitional daily archive, settings usability, responsive presentation
- P2: Full IndexedDB History remains BLOCKED
- Final Status: `DETAIL_REPORTING_REWORK_APPROVED`
- Verified Implementation HEAD: `[legacy-sha-removed]`
- Verification CI Run ID: `[legacy-ci-run-removed]`

## 1. Purpose

Production과 최신 main을 점검한 결과 기본 Money Timer의 계산과 상태 전환은 유지 가능하지만, 상세보기의 장기 데이터 의미와 일부 집계 및 모바일 표현은 보정이 필요하다.

이번 단계는 P2 전체를 시작하지 않는다. P1R에서 실제 사용 중 발생한 하루 데이터를 잃지 않도록 최소 원본 Snapshot Archive를 추가하고, 정식 IndexedDB History가 도입되면 마이그레이션 가능한 경계를 유지한다.

## 2. Confirmed Findings

### R1 Transitional Daily Archive

현재 단일 `LOAFING_KEY`와 `DAY_CONTROL_KEY`는 날짜별 누적을 보장하지 않는다.

조치:

- 날짜별 Settings Snapshot, 마지막 관측 시각, Loafing Interval, Clock Out을 보존한다.
- Archive는 파생 주간/월간/연간 합계를 저장하지 않는다.
- 과거 보고는 Archive 원본에서 Daily Report를 재계산한다.
- Archive가 없는 날짜만 `SYNTHETIC_ALLOCATION`을 사용한다.
- 날짜 변경 시 열린 Loafing 구간을 안전하게 닫고 이전 날짜 Archive를 보존한다.

### R2 Period Planned Duration

현재 주간과 월간의 예정 유급시간이 Synthetic 날짜만 더해 오늘의 Live Snapshot 예정시간을 제외한다.

조치:

- 미래와 Empty 날짜를 제외한 모든 보고서의 `plannedPaidDurationMs`를 합산한다.
- Live Snapshot과 Archived Day를 포함한다.

### R3 Optional Unpaid Break

Domain은 `unpaidBreak: null`을 지원하지만 Settings UI에서 휴게 없음 선택이 불가능하다.

조치:

- 휴게시간 사용 Toggle을 추가한다.
- OFF이면 `unpaidBreak: null`을 저장한다.
- ON 복귀 시 기본값 12:00–13:00을 복원한다.

### R4 Reporting Visualization

- Daily 단일 점 Line Chart는 정보 밀도가 낮다.
- Monthly 누적 Line은 휴무일을 제거해 실제 날짜 간격을 왜곡한다.
- 모바일 Calendar marker와 상단 Action의 터치/글자 크기가 작다.
- 큰 금액은 Money Timer에서 잘릴 수 있다.

조치:

- Daily는 그래프 대신 Compact Accumulation Summary를 사용한다.
- Monthly는 매 날짜 Point를 유지하고 휴무일은 누적값을 유지한다.
- Chart Point 선택값을 보이는 요약으로 제공한다.
- 모바일 Touch Target을 최소 44px 중심으로 확대하고 Calendar는 Dot marker를 사용한다.
- 금액 자릿수 기반 Size Class를 추가한다.
- Settings Action 스타일을 메인 디자인 언어와 통일한다.

## 3. Storage Boundary

P1R Transitional Archive 최소 필드:

- localDate
- settingsSnapshot
- lastObservedAtEpochMs
- clockOutAtEpochMs
- loafingIntervals
- integrityStatus
- updatedAtEpochMs

금지:

- Weekly total 저장
- Monthly total 저장
- Yearly total 저장
- Tick마다 금액 저장
- Free Work Session 별도 저장
- WORKING Session 별도 저장

정식 P2에서는 위 Archive를 IndexedDB의 SalaryRevision, ScheduleRevision, WorkDay, LoafingSession으로 마이그레이션한다.

## 4. Implementation Sequence

1. Transitional Archive type과 storage API
2. App 날짜 전환 및 주요 Action Archive 동기화
3. Reporting Source Adapter에 Archive 연결
4. 예정시간 집계 수정
5. 휴게 없음 설정
6. Daily/Monthly Chart와 모바일 UI 보정
7. Unit/E2E 회귀 테스트
8. CI와 Production 검증

## 5. Acceptance Criteria

- 전날 기록이 다음 날 첫 저장 이후에도 유지된다.
- 날짜별 Loafing과 Clock Out이 서로 덮어쓰지 않는다.
- Archive가 있는 과거 날짜는 Synthetic이 아니라 실제 Archive Source로 표시된다.
- 열린 Loafing은 날짜 경계 밖으로 이어지지 않는다.
- 주간과 월간 예정 유급시간은 오늘 계획시간을 포함한다.
- 휴게 없음 설정을 저장하고 다시 열었을 때 유지한다.
- Monthly cumulative X축은 달력 날짜 전체를 유지한다.
- 320px 화면에서 주요 Action은 44px Touch Target을 확보한다.
- 큰 금액이 320px Money Timer 밖으로 넘치지 않는다.
- 기존 Pay/Loafing/Free Work 의미는 바뀌지 않는다.
- lint, format check, unit, build, E2E가 모두 통과한다.

## 6. Completion State

구현과 검증을 완료했다.

- 날짜별 Archive와 날짜별 Loafing 보존: PASS
- Archive 기반 과거 Daily Report 재계산: PASS
- Live Day 포함 Planned Duration 집계: PASS
- 휴게 없음 설정: PASS
- Daily Timeline 우선 배치: PASS
- Monthly 달력 날짜축 유지: PASS
- 모바일 Touch Target과 Calendar Marker 개선: PASS
- 큰 금액 Size Class: PASS
- Unit Test: 62 passed
- E2E: 18 passed
- lint / format / build: PASS
- Production Vercel status: success
- Production manual smoke: settings, timer, daily/monthly detail, console error 0

최종 상태:

`DETAIL_REPORTING_REWORK_APPROVED`
