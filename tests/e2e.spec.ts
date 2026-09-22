import { expect, test, type Page } from '@playwright/test';

const fixedNow = new Date(2026, 8, 21, 10, 0, 0, 0).getTime();

async function freshApp(page: Page, now = fixedNow) {
  await page.addInitScript((value) => {
    window.__PAYMETER_TEST_NOW__ = value;
  }, now);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function setupSalary(page: Page) {
  await page.getByLabel('월급').fill('4000000');
  await page.getByTestId('save-settings').click();
  await expect(page.getByText('업무중')).toBeVisible();
}

async function setNow(page: Page, epochMs: number) {
  await page.evaluate((nextNow) => {
    window.__PAYMETER_TEST_NOW__ = nextNow;
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  }, epochMs);
  await page.waitForTimeout(60);
}

async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth);
}

async function expectTimerLockedToViewport(page: Page) {
  const sizes = await page.evaluate(() => ({
    htmlWidth: document.documentElement.scrollWidth,
    htmlHeight: document.documentElement.scrollHeight,
    bodyWidth: document.body.scrollWidth,
    bodyHeight: document.body.scrollHeight,
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  expect(sizes.htmlWidth).toBeLessThanOrEqual(sizes.width);
  expect(sizes.bodyWidth).toBeLessThanOrEqual(sizes.width);
  expect(sizes.htmlHeight).toBeLessThanOrEqual(sizes.height);
  expect(sizes.bodyHeight).toBeLessThanOrEqual(sizes.height);
}

async function expectInsideViewport(page: Page, selector: string) {
  const result = await page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });
  expect(result.left).toBeGreaterThanOrEqual(0);
  expect(result.top).toBeGreaterThanOrEqual(0);
  expect(result.right).toBeLessThanOrEqual(result.width + 1);
  expect(result.bottom).toBeLessThanOrEqual(result.height + 1);
}

async function expectPerimeterClearance(page: Page, minimumGapPx = 10) {
  const gaps = await page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>('.money-timer-frame')!;
    const header = document.querySelector<HTMLElement>('.app-header')!;
    const timerLayout = document.querySelector<HTMLElement>('.timer-layout')!;
    const frameRect = frame.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const timerRect = timerLayout.getBoundingClientRect();
    const maxStrokeWidth = Math.max(
      ...[...document.querySelectorAll<SVGPathElement>('.perimeter path')].map(
        (path) => Number.parseFloat(getComputedStyle(path).strokeWidth) || 0,
      ),
    );
    const paintedHalfStroke = maxStrokeWidth / 2;
    const leftPaintedEdge = frameRect.left + frameRect.width * 0.007 + paintedHalfStroke;
    const rightPaintedEdge = frameRect.left + frameRect.width * 0.993 - paintedHalfStroke;
    const topPaintedEdge = frameRect.top + frameRect.height * 0.007 + paintedHalfStroke;
    const bottomPaintedEdge = frameRect.top + frameRect.height * 0.993 - paintedHalfStroke;
    const contentLeft = Math.min(headerRect.left, timerRect.left);
    const contentRight = Math.max(headerRect.right, timerRect.right);

    return {
      top: headerRect.top - topPaintedEdge,
      right: rightPaintedEdge - contentRight,
      bottom: bottomPaintedEdge - timerRect.bottom,
      left: contentLeft - leftPaintedEdge,
    };
  });

  for (const gap of Object.values(gaps)) expect(gap).toBeGreaterThanOrEqual(minimumGapPx);
}

test('P1R final timer hides percentage and remaining time while keeping main and loafing money', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);

  await expect(page.getByTestId('current-money')).toBeVisible();
  await expect(page.getByTestId('loafing-money')).toBeVisible();
  await expect(page.getByTestId('current-rate')).toContainText(/\+₩\d+\.\d{3}\/초/);
  await expect(page.getByText('루팡 누적액')).toBeVisible();
  await expect(page.locator('.money-timer-frame')).toHaveClass(/state-working/);
  await expect(page.getByRole('button', { name: '상세 보기' })).toBeVisible();
  await expect(page.getByText('상세 보기')).toHaveCount(0);
  await expect(page.getByTestId('perimeter-timeline')).toHaveAttribute(
    'data-progress-ratio',
    '0.125',
  );
  await expect(page.locator('.perimeter-segment-working .perimeter-segment-core')).toHaveCount(1);
  await expect(page.locator('.perimeter-segment-loafing')).toHaveCount(0);
  await expect(page.locator('.meter-orb')).toHaveCount(0);

  await expect(page.getByTestId('progress-value')).toHaveCount(0);
  await expect(page.getByText('오늘 번 돈')).toHaveCount(0);
  await expect(page.getByText(/퇴근까지/)).toHaveCount(0);
  await expect(page.locator('.money-timer-frame').getByText(/%/)).toHaveCount(0);
  await expect(page.getByText('오늘 목표')).toHaveCount(0);
  await expect(page.getByText('소비재 비교')).toHaveCount(0);
});

test('LOAFING preserves elapsed working color and paints only the later range amber', async ({
  page,
}) => {
  await freshApp(page, new Date(2026, 8, 21, 9, 48).getTime());
  await setupSalary(page);

  await expect(page.getByTestId('perimeter-timeline')).toHaveAttribute(
    'data-progress-ratio',
    '0.1',
  );
  const workingPathAtSwitch = await page
    .locator('.perimeter-segment-working .perimeter-segment-core')
    .getAttribute('d');
  expect(workingPathAtSwitch).toBeTruthy();

  const loafingButtonHeight = await page
    .getByTestId('loafing-toggle')
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(loafingButtonHeight).toBeGreaterThanOrEqual(68);

  await page.getByTestId('loafing-toggle').click();
  await expect(page.getByText('루팡중')).toBeVisible();
  await setNow(page, new Date(2026, 8, 21, 10, 12).getTime());

  await expect(page.locator('.perimeter-segment-working')).toHaveCount(1);
  await expect(page.locator('.perimeter-segment-loafing')).toHaveCount(1);
  await expect(page.locator('.perimeter-segment-working .perimeter-segment-core')).toHaveCSS(
    'stroke',
    'rgb(53, 183, 170)',
  );
  await expect(page.locator('.perimeter-segment-loafing .perimeter-segment-core')).toHaveCSS(
    'stroke',
    'rgb(216, 147, 53)',
  );
  expect(
    await page.locator('.perimeter-segment-working .perimeter-segment-core').getAttribute('d'),
  ).toBe(workingPathAtSwitch);

  await expect(page.getByTestId('loafing-money')).not.toContainText('₩0');

  await page.getByTestId('loafing-toggle').click();
  await expect(page.getByText('업무중')).toBeVisible();
  await setNow(page, new Date(2026, 8, 21, 10, 24).getTime());
  await expect(page.locator('.perimeter-segment-working')).toHaveCount(2);
  await expect(page.locator('.perimeter-segment-loafing')).toHaveCount(1);
});

test('break freezes the real perimeter progress without exposing percentage or remaining time', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);

  await setNow(page, new Date(2026, 8, 21, 12, 0).getTime());
  const progressAtBreakStart = await page
    .getByTestId('perimeter-timeline')
    .getAttribute('data-progress-ratio');

  await setNow(page, new Date(2026, 8, 21, 12, 30).getTime());
  await expect(page.locator('.state-line')).toHaveText('휴게중');
  await expect(page.getByTestId('perimeter-timeline')).toHaveAttribute(
    'data-progress-ratio',
    progressAtBreakStart ?? '',
  );
  await expect(page.getByTestId('loafing-toggle')).toBeDisabled();
  await expect(page.getByTestId('progress-value')).toHaveCount(0);
  await expect(page.getByText(/휴게 종료까지/)).toHaveCount(0);
  await expect(page.getByTestId('current-rate')).toContainText('₩0.000/초');
});

test('Privacy masks main, loafing, free work and normal-earned summary money', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);

  await page.getByRole('button', { name: '금액 숨김 전환' }).click();
  await expect(page.getByTestId('current-money')).toContainText('••••••');
  await expect(page.getByTestId('loafing-money')).toContainText('••••••');

  await setNow(page, new Date(2026, 8, 21, 18, 30).getTime());
  await expect(page.getByTestId('freework-money')).toContainText('••••••');
  await expect(page.getByTestId('normal-earned-money')).toContainText('••••••');
});

test('scheduled end shows the final Free Work hierarchy and a completed full-loop perimeter', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);
  await setNow(page, new Date(2026, 8, 21, 18, 30).getTime());

  const wallet = page.getByTestId('freework-wallet');
  await expect(wallet).toBeVisible();
  await expect(page.getByText('봉사중')).toBeVisible();
  await expect(page.getByText('무료봉사 WALLET')).toHaveCount(0);
  await expect(page.getByText('무료봉사 시간')).toBeVisible();
  await expect(page.getByText('일당', { exact: true })).toBeVisible();
  await expect(page.getByTestId('freework-ratio')).toContainText('일당의 6.3%');
  const freeWorkFill = await page
    .locator('.money-timer-frame')
    .evaluate((element) => getComputedStyle(element).getPropertyValue('--freework-fill').trim());
  expect(Number.parseFloat(freeWorkFill)).toBeCloseTo(6.25, 1);
  await expect(page.locator('.money-timer-frame')).toHaveClass(/state-freework/);
  await expect(page.getByTestId('freework-money')).toHaveCSS('color', 'rgb(240, 90, 103)');
  await expect(wallet).not.toContainText('+');
  await expect(wallet).not.toContainText('실제 지급액 아님');

  const sizeHierarchy = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('[data-testid="freework-money"]');
    const secondary = document.querySelector<HTMLElement>('[data-testid="normal-earned-money"]');
    return {
      main: Number.parseFloat(getComputedStyle(main!).fontSize),
      secondary: Number.parseFloat(getComputedStyle(secondary!).fontSize),
    };
  });
  expect(sizeHierarchy.main).toBeGreaterThan(sizeHierarchy.secondary);

  await expect(page.getByTestId('perimeter-timeline')).toHaveAttribute('data-progress-ratio', '1');
  await expect(page.getByTestId('perimeter-timeline')).toHaveAttribute('data-complete', 'true');
  await expect(page.locator('.perimeter-segment-core')).toHaveCount(1);
  const fullLoopPath = await page.locator('.perimeter-segment-core').getAttribute('d');
  expect(fullLoopPath).toContain('M 50 0.7');
  expect(await page.locator('.perimeter-segment-core').getAttribute('stroke-dasharray')).toBeNull();
});

test('clock out freezes Free Work money across reload', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  await setNow(page, new Date(2026, 8, 21, 18, 30).getTime());

  const walletMoney = (await page.getByTestId('freework-money').innerText()).replace(/\s+/g, '');
  await page.getByTestId('clock-out').click();
  await expect(page.getByText('퇴근완료')).toBeVisible();
  await expect(page.getByTestId('clocked-freework-money')).toHaveText(walletMoney);

  await setNow(page, new Date(2026, 8, 21, 20).getTime());
  await page.reload();
  await expect(page.getByText('퇴근완료')).toBeVisible();
  await expect(page.getByTestId('clocked-freework-money')).toHaveText(walletMoney);
});

test('detail view shows daily weekly monthly cumulative summaries and graph', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  await page.getByRole('button', { name: '상세 보기' }).click();

  await expect(page.getByRole('heading', { name: '상세 내역' })).toBeVisible();
  await expect(page.getByRole('button', { name: /일간/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /주간/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /월간/ })).toBeVisible();
  await expect(page.getByTestId('daily-timeline')).toBeVisible();

  await page.getByRole('button', { name: /주간/ }).click();
  await expect(page.getByTestId('cumulative-chart')).toContainText('이번 주 누적');
  await page.getByRole('button', { name: /월간/ }).click();
  await expect(page.getByTestId('cumulative-chart')).toContainText('이번 달 누적');
});

test('settings provide work and break presets without duplicate privacy or milestone controls', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);
  await page.getByRole('button', { name: '설정' }).click();

  await expect(page.getByRole('heading', { name: '급여 / 근무' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '데이터' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '화면 스타일' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Meter Dark/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Mono/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Pocket/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Ledger/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '자동' })).toBeVisible();
  await expect(page.getByRole('button', { name: '집중형' })).toBeVisible();
  await expect(page.getByRole('button', { name: '분할형' })).toBeVisible();
  await expect(page.getByText('Privacy Mode')).toHaveCount(0);
  await expect(page.getByText(/Milestone/)).toHaveCount(0);
  await expect(page.locator('.settings h2')).toHaveCount(3);

  await page.getByLabel('출근').fill('09:00');
  await page.getByRole('button', { name: '8시간' }).click();
  await expect(page.getByLabel('퇴근')).toHaveValue('18:00');

  await page.getByLabel('휴게 시작').fill('12:30');
  await page.getByRole('button', { name: '30분', exact: true }).click();
  await expect(page.getByLabel('휴게 종료')).toHaveValue('13:00');

  await expect(page.getByRole('button', { name: '7시간' })).toBeVisible();
  await expect(page.getByRole('button', { name: '9시간' })).toBeVisible();
  await expect(page.getByRole('button', { name: '1시간', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '1시간 30분' })).toBeVisible();
});

test('open LOAFING survives reload without duplicate intervals', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  await page.getByTestId('loafing-toggle').click();
  await page.reload();
  await expect(page.getByText('루팡중')).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('paymeter:p1:loafing') ?? '[]'),
  );
  expect(stored).toHaveLength(1);
  expect(stored[0].endAtEpochMs).toBeNull();
});

test('clock out closes an open LOAFING interval and reload does not reopen it', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);
  const loafingStart = new Date(2026, 8, 21, 17, 50).getTime();
  const clockOutAt = new Date(2026, 8, 21, 18, 30).getTime();

  await setNow(page, loafingStart);
  await page.getByTestId('loafing-toggle').click();
  await setNow(page, clockOutAt);
  await page.getByTestId('clock-out').click();

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('paymeter:p1:loafing') ?? '[]'),
  );
  expect(stored).toHaveLength(1);
  expect(stored[0].endAtEpochMs).toBe(clockOutAt);

  await setNow(page, new Date(2026, 8, 21, 20).getTime());
  await page.reload();
  await expect(page.getByText('퇴근완료')).toBeVisible();

  const reloaded = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('paymeter:p1:loafing') ?? '[]'),
  );
  expect(reloaded[0].endAtEpochMs).toBe(clockOutAt);
});

test('background-style resume recomputes from wall clock without catch-up ticks', async ({
  page,
}) => {
  await freshApp(page, new Date(2026, 8, 21, 17, 50).getTime());
  await setupSalary(page);

  await setNow(page, new Date(2026, 8, 21, 19, 0).getTime());

  await expect(page.getByTestId('perimeter-timeline')).toHaveAttribute('data-progress-ratio', '1');
  await expect(page.getByTestId('perimeter-timeline')).toHaveAttribute('data-complete', 'true');
  await expect(page.getByTestId('freework-wallet')).toBeVisible();
  await expect(page.getByTestId('freework-duration')).toHaveText('01:00:00');
  await expect(page.locator('.milestone-ring')).toHaveCount(0);
});

test('legacy P1 settings data is normalized and does not reactivate Consumer Value UI', async ({
  page,
}) => {
  await freshApp(page);
  await page.evaluate(() => {
    localStorage.setItem(
      'paymeter:p1:settings',
      JSON.stringify({
        salaryKrw: 4_000_000,
        schedule: {
          workDays: [1, 2, 3, 4, 5],
          start: '09:00',
          end: '18:00',
          unpaidBreak: { start: '12:00', end: '13:00' },
        },
        display: {
          showDecimals: true,
          milestoneEnabled: true,
          privacy: false,
        },
        consumerItems: [{ id: 'legacy', name: 'Legacy Coffee', priceKrw: 4500 }],
      }),
    );
  });
  await page.reload();

  await expect(page.locator('.state-line')).toHaveText('업무중');
  await expect(page.getByText('Legacy Coffee')).toHaveCount(0);
  await page.getByRole('button', { name: '상세 보기' }).click();
  await expect(page.getByText('Legacy Coffee')).toHaveCount(0);
  await page.getByRole('button', { name: '설정' }).click();
  await expect(page.getByText('금액 소수 표시')).toHaveCount(0);
  await expect(page.getByText('Legacy Coffee')).toHaveCount(0);
  await page.getByTestId('save-settings').click();

  const normalized = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('paymeter:p1:settings') ?? '{}'),
  );
  expect(normalized.display.showDecimals).toBe(false);
  expect(normalized.display.theme).toBe('meter-dark');
  expect(normalized.display.layout).toBe('auto');
  expect(normalized.consumerItems).toEqual([]);
});

test('portrait, landscape and compact layouts keep final P1R content inside the viewport', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);

  for (const viewport of [
    { width: 560, height: 680 },
    { width: 320, height: 568 },
    { width: 360, height: 480 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
    await expectTimerLockedToViewport(page);
    await expectInsideViewport(page, '.money-timer-frame');
    await expectInsideViewport(page, '[data-testid="current-money"]');
    await expectInsideViewport(page, '[data-testid="loafing-money"]');
    await expectInsideViewport(page, '[data-testid="loafing-toggle"]');
  }

  await page.setViewportSize({ width: 360, height: 480 });
  const portraitAmountSize = await page
    .getByTestId('current-money')
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));

  await page.setViewportSize({ width: 720, height: 420 });
  const landscapeAmountSize = await page
    .getByTestId('current-money')
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  const landscapeLoafingButtonHeight = await page
    .getByTestId('loafing-toggle')
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(landscapeAmountSize).toBeGreaterThan(portraitAmountSize);
  expect(landscapeLoafingButtonHeight).toBeGreaterThanOrEqual(78);
  await expectNoHorizontalOverflow(page);
  await expectTimerLockedToViewport(page);
  await expectInsideViewport(page, '.money-timer-frame');
  const regularLandscape = await page.evaluate(() => {
    const main = document.querySelector('.timer-main-zone')!.getBoundingClientRect();
    const actions = document.querySelector('.timer-action-zone')!.getBoundingClientRect();
    return { mainRight: main.right, actionsLeft: actions.left };
  });
  expect(regularLandscape.mainRight).toBeLessThanOrEqual(regularLandscape.actionsLeft + 1);

  await setNow(page, new Date(2026, 8, 21, 18, 30).getTime());
  await expect(page.getByTestId('freework-wallet')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectTimerLockedToViewport(page);
  await expectInsideViewport(page, '[data-testid="freework-money"]');
  await expectInsideViewport(page, '[data-testid="clock-out"]');
  const freeWorkLandscape = await page.evaluate(() => {
    const main = document.querySelector('.freework-main-zone')!.getBoundingClientRect();
    const actions = document.querySelector('.freework-action-zone')!.getBoundingClientRect();
    return { mainRight: main.right, actionsLeft: actions.left };
  });
  expect(freeWorkLandscape.mainRight).toBeLessThanOrEqual(freeWorkLandscape.actionsLeft + 1);

  await setNow(page, fixedNow);
  await page.setViewportSize({ width: 360, height: 440 });
  await page.evaluate(() => document.body.classList.add('pip-body'));
  await expectNoHorizontalOverflow(page);
  await expectTimerLockedToViewport(page);
  await expectInsideViewport(page, '.money-timer-frame');
  await expectInsideViewport(page, '[data-testid="current-money"]');
  await expectInsideViewport(page, '[data-testid="loafing-toggle"]');
  await expectInsideViewport(page, 'button[aria-label="금액 숨김 전환"]');

  await setNow(page, new Date(2026, 8, 21, 18, 30).getTime());
  await expect(page.getByTestId('freework-wallet')).toBeVisible();
  await expectInsideViewport(page, '[data-testid="freework-money"]');
  await expectInsideViewport(page, '[data-testid="clock-out"]');
});

test('settings supports a schedule without an unpaid break', async ({ page }) => {
  await freshApp(page);
  await page.getByLabel('월급').fill('4000000');
  await page.getByRole('checkbox').uncheck();
  await page.getByTestId('save-settings').click();

  await expect(page.getByText('업무중')).toBeVisible();
  await page.getByRole('button', { name: '설정' }).click();
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await expect(page.getByText('없음')).toBeVisible();
});

test('perimeter maintains a safe content inset across desktop, mobile and PiP sizes', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);

  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 720, height: 420 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expectPerimeterClearance(page);
    await expectNoHorizontalOverflow(page);
  }

  await page.getByRole('button', { name: '설정' }).click();
  await page.getByRole('button', { name: /라이트/ }).click();
  await page.getByRole('button', { name: /Pocket/ }).click();
  await page.getByTestId('save-settings').click();
  await page.setViewportSize({ width: 360, height: 440 });
  await page.evaluate(() => document.body.classList.add('pip-body'));
  await expectPerimeterClearance(page);
  await expectTimerLockedToViewport(page);
});

test('all themes, layout and current rate preferences persist without changing pay semantics', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);

  const amountBefore = (await page.getByTestId('current-money').innerText()).replace(/\s+/g, '');
  await expect(page.locator('.money-timer-frame')).toHaveClass(/theme-meter-dark/);
  await expect(page.locator('.money-timer-frame')).toHaveClass(/mode-dark/);
  await expect(page.locator('.money-timer-frame')).toHaveClass(/layout-auto/);

  await page.getByRole('button', { name: '설정' }).click();
  await page.getByRole('button', { name: /Mono/ }).click();
  await page.getByRole('button', { name: '집중형' }).click();
  await page.getByTestId('save-settings').click();

  await expect(page.locator('.money-timer-frame')).toHaveClass(/theme-mono/);
  await expect(page.locator('.money-timer-frame')).toHaveClass(/layout-focus/);
  await expect(page.getByTestId('current-money')).toHaveText(amountBefore);
  await expect(page.getByTestId('current-rate')).toContainText(/\+₩\d+\.\d{3}\/초/);
  await page.reload();
  await expect(page.locator('.money-timer-frame')).toHaveClass(/theme-mono/);

  await page.getByRole('button', { name: '설정' }).click();
  await page.getByRole('button', { name: /Pocket/ }).click();
  await page.getByTestId('save-settings').click();
  await expect(page.locator('.money-timer-frame')).toHaveClass(/theme-pocket/);
  await expect(page.getByTestId('current-money')).toHaveText(amountBefore);
  await page.reload();
  await expect(page.locator('.money-timer-frame')).toHaveClass(/theme-pocket/);

  await page.getByRole('button', { name: '설정' }).click();
  await page.getByRole('button', { name: /Ledger/ }).click();
  await page.getByTestId('save-settings').click();
  await expect(page.locator('.money-timer-frame')).toHaveClass(/theme-ledger/);
  await expect(page.getByTestId('current-money')).toHaveText(amountBefore);

  await page.reload();
  await expect(page.locator('.money-timer-frame')).toHaveClass(/theme-ledger/);
  await expect(page.locator('.money-timer-frame')).toHaveClass(/layout-focus/);

  await page.getByRole('button', { name: '금액 숨김 전환' }).click();
  await expect(page.getByTestId('current-rate')).toContainText('₩••••/초');
});

test('light base combines with every theme and persists across main and detail views', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);
  const amountBefore = (await page.getByTestId('current-money').innerText()).replace(/\s+/g, '');

  const themes = [
    ['Meter Light', 'theme-meter-dark', '#0f766e'],
    ['Mono', 'theme-mono', '#242a2e'],
    ['Pocket', 'theme-pocket', '#24785b'],
    ['Ledger', 'theme-ledger', '#356f6a'],
  ] as const;

  for (const [label, themeClass, workingColor] of themes) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: '설정' }).click();
    await page.getByRole('button', { name: /라이트/ }).click();
    await expect(page.locator('.base-option-row button[aria-pressed="true"]')).toHaveCount(1);
    await page.getByRole('button', { name: new RegExp(label) }).click();
    await page.getByTestId('save-settings').click();

    const frame = page.locator('.money-timer-frame');
    await expect(frame).toHaveClass(/mode-light/);
    await expect(frame).toHaveClass(new RegExp(themeClass));
    await expect(page.getByTestId('current-money')).toHaveText(amountBefore);
    await expectNoHorizontalOverflow(page);
    expect(
      await frame.evaluate((element) =>
        getComputedStyle(element).getPropertyValue('--theme-working').trim(),
      ),
    ).toBe(workingColor);
    await expect(page.getByTestId('loafing-toggle')).toHaveCSS('color', 'rgb(23, 33, 39)');

    await page.getByRole('button', { name: '상세 보기' }).click();
    await expect(page.locator('.detail-screen')).toHaveClass(/mode-light/);
    await expect(page.locator('.detail-screen')).toHaveClass(new RegExp(themeClass));
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: '뒤로', exact: true }).click();

    await page.setViewportSize({ width: 360, height: 440 });
    await page.evaluate(() => document.body.classList.add('pip-body'));
    await expect(page.locator('.money-timer-frame')).toHaveClass(/mode-light/);
    await expect(page.locator('.money-timer-frame')).toHaveClass(new RegExp(themeClass));
    await expectNoHorizontalOverflow(page);
    await expectTimerLockedToViewport(page);
    await expectInsideViewport(page, '[data-testid="current-money"]');
    await expectInsideViewport(page, '[data-testid="loafing-toggle"]');
    await page.evaluate(() => document.body.classList.remove('pip-body'));
  }

  await page.reload();
  await expect(page.locator('.money-timer-frame')).toHaveClass(/mode-light/);
  await expect(page.locator('.money-timer-frame')).toHaveClass(/theme-ledger/);
  await expect(page.getByTestId('current-money')).toHaveText(amountBefore);

  await setNow(page, new Date(2026, 8, 21, 18, 30).getTime());
  await expect(page.getByTestId('freework-wallet')).toBeVisible();
  await expect(page.getByTestId('freework-money')).toHaveCSS('color', 'rgb(180, 35, 60)');
  await expect(page.getByTestId('current-rate')).toContainText('₩0.000/초');
});

test('Pocket and Ledger apply to detail and compact pip-body simulation without overflow', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);

  for (const [label, className] of [
    ['Pocket', 'theme-pocket'],
    ['Ledger', 'theme-ledger'],
  ] as const) {
    await page.setViewportSize({ width: 720, height: 640 });
    await page.getByRole('button', { name: '설정' }).click();
    await page.getByRole('button', { name: new RegExp(label) }).click();
    await expect(page.locator('.theme-option-grid button[aria-pressed="true"]')).toHaveCount(1);
    await page.getByTestId('save-settings').click();
    await page.reload();
    await expect(page.locator('.money-timer-frame')).toHaveClass(new RegExp(className));

    const visualContract = await page.evaluate(() => {
      const frame = document.querySelector<HTMLElement>('.money-timer-frame')!;
      const amount = document.querySelector<HTMLElement>('.main-money strong')!;
      const loafingCard = document.querySelector<HTMLElement>('.loafing-inline-card')!;
      return {
        working: getComputedStyle(frame).getPropertyValue('--theme-working').trim(),
        amountFont: getComputedStyle(amount).fontFamily,
        cardRadius: getComputedStyle(loafingCard).borderRadius,
      };
    });
    if (label === 'Pocket') {
      expect(visualContract.working).toBe('#6fc9a6');
      expect(visualContract.cardRadius).toBe('14px');
    } else {
      expect(visualContract.working).toBe('#78aaa3');
      expect(visualContract.amountFont).toMatch(/Cascadia Mono|Consolas|monospace/);
      expect(visualContract.cardRadius).toBe('0px');
    }

    await page.getByRole('button', { name: '상세 보기' }).click();
    await expect(page.locator('.detail-screen')).toHaveClass(new RegExp(className));
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: '뒤로', exact: true }).click();

    await page.setViewportSize({ width: 360, height: 440 });
    await page.evaluate(() => document.body.classList.add('pip-body'));
    await expectNoHorizontalOverflow(page);
    await expectTimerLockedToViewport(page);
    await expectInsideViewport(page, '.money-timer-frame');
    await expectInsideViewport(page, '[data-testid="current-money"]');
    await expectInsideViewport(page, '[data-testid="loafing-toggle"]');
    await page.evaluate(() => document.body.classList.remove('pip-body'));
  }
});
