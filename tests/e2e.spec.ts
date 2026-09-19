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

test('P1R final timer hides percentage and remaining time while keeping main and loafing money', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);

  await expect(page.getByTestId('current-money')).toBeVisible();
  await expect(page.getByTestId('loafing-money')).toBeVisible();
  await expect(page.getByText('루팡 누적액')).toBeVisible();
  await expect(page.locator('.money-timer-frame')).toHaveClass(/state-working/);
  await expect(page.getByTestId('perimeter-timeline')).toHaveAttribute(
    'data-progress-ratio',
    '0.125',
  );
  await expect(page.locator('.perimeter-progress')).toHaveCount(1);
  await expect(page.locator('.perimeter-working, .perimeter-loafing')).toHaveCount(0);
  await expect(page.locator('.meter-orb')).toHaveCount(0);

  await expect(page.getByTestId('progress-value')).toHaveCount(0);
  await expect(page.getByText('오늘 번 돈')).toHaveCount(0);
  await expect(page.getByText(/퇴근까지/)).toHaveCount(0);
  await expect(page.locator('.money-timer-frame').getByText(/%/)).toHaveCount(0);
  await expect(page.getByText('오늘 목표')).toHaveCount(0);
  await expect(page.getByText('소비재 비교')).toHaveCount(0);
});

test('LOAFING changes the theme while fixed-period money and loafing accumulation continue', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);

  const before = await page.getByTestId('current-money').innerText();
  await page.getByTestId('loafing-toggle').click();
  await expect(page.getByText('루팡중')).toBeVisible();
  await expect(page.locator('.money-timer-frame')).toHaveClass(/state-loafing/);

  await setNow(page, new Date(2026, 8, 21, 10, 30).getTime());
  expect(await page.getByTestId('current-money').innerText()).not.toBe(before);
  await expect(page.getByTestId('loafing-money')).not.toContainText('₩0');

  await page.getByTestId('loafing-toggle').click();
  await expect(page.getByText('업무중')).toBeVisible();
  await expect(page.locator('.money-timer-frame')).toHaveClass(/state-working/);
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
  await expect(page.getByTestId('rate')).toHaveCount(0);
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
  await expect(page.getByText('정상 적립 금액')).toBeVisible();
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
  await expect(page.locator('.perimeter-progress')).toHaveCount(1);
  const fullLoopDash = await page
    .locator('.perimeter-progress')
    .evaluate((element) => (element as SVGPathElement).style.strokeDasharray);
  expect(fullLoopDash.replace(',', '')).toBe('100 100');
});

test('clock out freezes Free Work money across reload', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  await setNow(page, new Date(2026, 8, 21, 18, 30).getTime());

  const walletMoney = await page.getByTestId('freework-money').innerText();
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
  await expect(page.getByTestId('cumulative-chart')).toBeVisible();

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
  await expect(page.getByRole('heading', { name: '화면' })).toHaveCount(0);
  await expect(page.getByText('Privacy Mode')).toHaveCount(0);
  await expect(page.getByText(/Milestone/)).toHaveCount(0);
  await expect(page.locator('.settings h2')).toHaveCount(2);

  await page.getByLabel('출근').fill('09:00');
  await page.getByRole('button', { name: '8시간' }).click();
  await expect(page.getByLabel('퇴근')).toHaveValue('18:00');

  await page.getByLabel('휴게 시작').fill('12:30');
  await page.getByRole('button', { name: '30분' }).click();
  await expect(page.getByLabel('휴게 종료')).toHaveValue('13:00');

  await expect(page.getByRole('button', { name: '7시간' })).toBeVisible();
  await expect(page.getByRole('button', { name: '9시간' })).toBeVisible();
  await expect(page.getByRole('button', { name: '1시간' })).toBeVisible();
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

  await page.setViewportSize({ width: 720, height: 420 });
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
