# PayMeter Detail Reporting Rework Closeout

## 1. Verification Basis

- Repository: `nothing2that-sys/pay-meter`
- Branch: `main`
- Audit Baseline HEAD: `[legacy-sha-removed]`
- Plan Commit: `[legacy-sha-removed]`
- Verified Implementation HEAD: `[legacy-sha-removed]`
- GitHub Actions Run ID: `[legacy-ci-run-removed]`
- Result: `completed / success`
- Final Status: `DETAIL_REPORTING_REWORK_APPROVED`

## 2. Implemented Corrections

### Daily Archive

- 날짜별 Settings Snapshot 보존
- 날짜별 Loafing Interval 보존
- 날짜별 마지막 관측 시각과 Clock Out 보존
- 다른 날짜 저장 시 기존 날짜 데이터 유지
- 날짜 경계의 열린 Loafing 안전 종료
- Archive가 있는 과거 날짜를 `ARCHIVED_SNAPSHOT`으로 재계산
- 주간, 월간, 연간 파생 합계는 저장하지 않음
- Archive checkpoint는 1분 단위와 주요 Action에서 저장

### Reporting

- Period `plannedPaidDurationMs`를 Aggregate에 포함
- Live Snapshot의 예정시간 포함
- Monthly 누적 그래프에 휴무일을 포함한 달력 날짜축 유지
- 미래 날짜는 누적 생성 금지 유지
- Daily 단일 점 그래프 제거
- Daily Timeline을 핵심 시각화로 승격
- 그래프에 최신 표시값 Summary 추가

### Settings and Presentation

- 무급 휴게시간 사용/없음 Toggle
- 설정 Action Button 스타일 통일
- 모바일 주요 Action 44px Touch Target
- 모바일 Calendar marker를 작은 Dot로 단순화
- 큰 금액 자릿수 기반 Compact Typography
- 모바일 Perimeter stroke selector 수정

## 3. Regression Preservation

다음 의미는 변경하지 않았다.

- Device Wall Clock SSOT
- Tick count independent calculation
- Today Earned와 Loafing Earned Value 중복 합산 금지
- Free Work Reference Value의 비급여 의미
- WORKING Session 별도 저장 금지
- Free Work Session 별도 저장 금지
- P2 IndexedDB 전체 History Gate 유지

## 4. Automated Verification

Quality Job:

- npm ci: PASS
- lint: PASS
- format check: PASS
- Unit Test: 62 passed
- TypeScript build: PASS
- Vite production build: PASS

E2E Job:

- Playwright: 18 passed
- Portrait and Landscape containment: PASS
- Detail Period navigation: PASS
- Privacy: PASS
- Optional unpaid break: PASS

## 5. Production Verification

Vercel status for Verified Implementation HEAD:

- success

Manual Production smoke:

- 첫 설정 저장: PASS
- 휴게 없음 저장 및 재진입 유지: PASS
- Money Timer: PASS
- Daily Detail Timeline: PASS
- Monthly cumulative and calendar: PASS
- Planned paid duration includes Live Day: PASS
- Application console error: 0

## 6. Remaining Boundary

이번 Archive는 P1R 호환 계층이다.

정식 P2에서 남는 작업:

- IndexedDB SalaryRevision
- IndexedDB ScheduleRevision
- IndexedDB WorkDay
- IndexedDB LoafingSession
- Multi-tab transaction and BroadcastChannel
- P1R Archive migration

이 항목은 이번 Rework 승인 범위 밖이며 P2 Gate는 계속 BLOCKED다.

## 7. Final Decision

확인된 P1R Detail Reporting의 기능 및 디자인 보정은 완료되었다.

Final Status:

`DETAIL_REPORTING_REWORK_APPROVED`
