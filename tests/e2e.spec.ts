import { expect, test, type Page } from '@playwright/test';

const fixedNow = new Date(2026, 8, 21, 10, 0, 0, 0).getTime();

async function freshApp(page: Page) {
  await page.addInitScript((now) => {
    window.__PAYMETER_TEST_NOW__ = now;
  }, fixedNow);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function setupSalary(page: Page) {
  await page.getByLabel('월급').fill('4000000');
  await page.getByTestId('save-settings').click();
  await expect(page.getByText('돈 버는 중')).toBeVisible();
}

test('first run setup enters the live Money Timer and wall-clock changes update money', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  const before = await page.getByTestId('current-money').innerText();
  await page.evaluate(() => {
    window.__PAYMETER_TEST_NOW__ = (window.__PAYMETER_TEST_NOW__ ?? 0) + 60_000;
  });
  await page.waitForTimeout(400);
  const after = await page.getByTestId('current-money').innerText();
  expect(after).not.toBe(before);
});

test('LOAFING toggles with one click and fixed-period money keeps progressing', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  const before = await page.getByTestId('current-money').innerText();
  await page.getByTestId('loafing-toggle').click();
  await expect(page.getByText('루팡 중')).toBeVisible();
  await page.evaluate(() => {
    window.__PAYMETER_TEST_NOW__ = (window.__PAYMETER_TEST_NOW__ ?? 0) + 30 * 60_000;
  });
  await page.waitForTimeout(400);
  const after = await page.getByTestId('current-money').innerText();
  expect(after).not.toBe(before);
  await page.getByTestId('loafing-toggle').click();
  await expect(page.getByText('돈 버는 중')).toBeVisible();
});

test('Privacy Mode masks and restores the amount', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  await page.getByRole('button', { name: '금액 숨김 전환' }).click();
  await expect(page.getByTestId('current-money')).toContainText('••••••');
  await page.getByRole('button', { name: '금액 숨김 전환' }).click();
  await expect(page.getByTestId('current-money')).not.toContainText('••••••');
});

test('settings and an open LOAFING interval survive reload without duplicate sessions', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  await page.getByTestId('loafing-toggle').click();
  await page.evaluate(() => {
    window.__PAYMETER_TEST_NOW__ = (window.__PAYMETER_TEST_NOW__ ?? 0) + 30 * 60_000;
  });
  await page.reload();
  await expect(page.getByText('루팡 중')).toBeVisible();
  await expect(page.getByTestId('loafing-toggle')).toHaveText('업무 복귀');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('paymeter:p1:loafing') ?? '[]'));
  expect(stored).toHaveLength(1);
  expect(stored[0].endAtEpochMs).toBeNull();
});
