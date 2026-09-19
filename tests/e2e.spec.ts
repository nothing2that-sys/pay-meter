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

test('P1R timer shows progress, today earned and loafing breakdown without target UI', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);
  await expect(page.getByTestId('progress-value')).toHaveText('12.5%');
  await expect(page.getByTestId('current-money')).toBeVisible();
  await expect(page.getByTestId('loafing-money')).toBeVisible();
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
  await expect(page.getByText('휴게 중')).toBeVisible();
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
