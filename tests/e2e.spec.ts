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
  await expect(page.getByText('업무 중')).toBeVisible();
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

test('P1R timer shows progress, today earned and loafing breakdown without target UI', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);
  await expect(page.getByTestId('progress-value')).toHaveText('12.5%');
  await expect(page.getByTestId('current-money')).toBeVisible();
  await expect(page.getByTestId('loafing-money')).toBeVisible();
  await expect(page.locator('.perimeter-current')).toHaveCount(1);
  await expect(page.getByText('오늘 목표')).toHaveCount(0);
  await expect(page.getByText('소비재 비교')).toHaveCount(0);
});

test('LOAFING changes activity presentation while fixed-period money continues', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);
  const before = await page.getByTestId('current-money').innerText();
  await page.getByTestId('loafing-toggle').click();
  await expect(page.getByText('루팡 중')).toBeVisible();
  await setNow(page, new Date(2026, 8, 21, 10, 30).getTime());
  expect(await page.getByTestId('current-money').innerText()).not.toBe(before);
  await expect(page.getByTestId('loafing-money')).not.toContainText('₩0');
  await page.getByTestId('loafing-toggle').click();
  await expect(page.getByText('업무 중')).toBeVisible();
});

test('break freezes progress and rate and uses break-end label', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  await setNow(page, new Date(2026, 8, 21, 12, 30).getTime());
  await expect(page.locator('.state-line')).toHaveText('휴게 중');
  await expect(page.getByText(/휴게 종료까지/)).toBeVisible();
  await expect(page.getByTestId('progress-value')).toHaveText('37.5%');
  await expect(page.getByTestId('rate')).toContainText('0.000');
  await expect(page.getByTestId('loafing-toggle')).toBeDisabled();
});

test('Privacy masks Today, Loafing and Free Work money', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  await page.getByRole('button', { name: '금액 숨김 전환' }).click();
  await expect(page.getByTestId('current-money')).toContainText('••••••');
  await expect(page.getByTestId('loafing-money')).toContainText('••••••');
  await setNow(page, new Date(2026, 8, 21, 18, 30).getTime());
  await expect(page.getByTestId('freework-money')).toContainText('••••••');
});

test('scheduled end enters Free Work Wallet and clock out freezes it across reload', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);
  await setNow(page, new Date(2026, 8, 21, 18, 30).getTime());
  await expect(page.getByTestId('freework-wallet')).toBeVisible();
  await expect(page.getByTestId('progress-value')).toHaveText('100%');
  await expect(page.locator('.perimeter-current')).toHaveCount(0);
  const wallet = await page.getByTestId('freework-money').innerText();
  await page.getByTestId('clock-out').click();
  await expect(page.getByText('퇴근 완료')).toBeVisible();
  await setNow(page, new Date(2026, 8, 21, 20).getTime());
  await page.reload();
  await expect(page.getByText('퇴근 완료')).toBeVisible();
  await expect(page.getByText(wallet + ' 상당')).toBeVisible();
});

test('settings expose only pay/work, display and data groups', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  await page.getByRole('button', { name: '상세' }).click();
  await page.getByRole('button', { name: '설정' }).click();
  await expect(page.getByRole('heading', { name: '급여 / 근무' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '화면' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '데이터' })).toBeVisible();
  await expect(page.getByText('Consumer Items')).toHaveCount(0);
  await expect(page.getByText('금액 소수 표시')).toHaveCount(0);
});

test('open LOAFING survives reload without duplicate intervals', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  await page.getByTestId('loafing-toggle').click();
  await page.reload();
  await expect(page.getByText('루팡 중')).toBeVisible();
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
  await expect(page.getByText('퇴근 완료')).toBeVisible();

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

  await expect(page.getByTestId('progress-value')).toHaveText('100%');
  await expect(page.getByTestId('freework-wallet')).toBeVisible();
  await expect(page.locator('.wallet-duration')).toHaveText('01:00:00');
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

  await expect(page.locator('.state-line')).toHaveText('업무 중');
  await expect(page.getByText('Legacy Coffee')).toHaveCount(0);
  await page.getByRole('button', { name: '상세' }).click();
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

test('required responsive viewports keep the P1R frame and core controls inside the viewport', async ({
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
    await expectInsideViewport(page, '.money-timer-frame');
    await expectInsideViewport(page, '[data-testid="progress-value"]');
    await expectInsideViewport(page, '[data-testid="current-money"]');
    await expectInsideViewport(page, '[data-testid="loafing-toggle"]');
  }

  await page.setViewportSize({ width: 360, height: 440 });
  await page.evaluate(() => document.body.classList.add('pip-body'));
  await expectNoHorizontalOverflow(page);
  await expectInsideViewport(page, '.money-timer-frame');
  await expectInsideViewport(page, '[data-testid="progress-value"]');
  await expectInsideViewport(page, '[data-testid="current-money"]');
  await expectInsideViewport(page, '[data-testid="loafing-toggle"]');
  await expectInsideViewport(page, 'button[aria-label="금액 숨김 전환"]');

  await setNow(page, new Date(2026, 8, 21, 18, 30).getTime());
  await expect(page.getByTestId('freework-wallet')).toBeVisible();
  await expectInsideViewport(page, '[data-testid="freework-money"]');
  await expectInsideViewport(page, '[data-testid="clock-out"]');
});
