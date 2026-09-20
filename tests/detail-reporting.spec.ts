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

async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(sizes.html).toBeLessThanOrEqual(sizes.client);
  expect(sizes.body).toBeLessThanOrEqual(sizes.client);
}

function compact(value: string): string {
  return value.replace(/\s+/g, '');
}

test('detail reporting supports all periods, drill down and history back navigation', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);

  const mainMoney = compact(await page.getByTestId('current-money').innerText());
  await page.getByRole('button', { name: '상세 보기' }).click();

  await expect(page.getByRole('heading', { name: '상세 내역' })).toBeVisible();
  await expect(page.getByTestId('daily-report-view')).toBeVisible();
  await expect(page.getByTestId('daily-timeline')).toBeVisible();
  await expect(page.locator('.detail-hero-money')).toHaveText(mainMoney);
  await expect(page.getByTestId('daily-timeline')).toBeVisible();

  await page.getByRole('button', { name: '주간', exact: true }).click();
  await expect(page.getByTestId('weekly-report-view')).toBeVisible();
  await expect(page.getByTestId('cumulative-chart')).toContainText('이번 주 누적');

  await page.getByRole('button', { name: '월간', exact: true }).click();
  await expect(page.getByTestId('monthly-report-view')).toBeVisible();
  await expect(page.getByTestId('monthly-calendar')).toBeVisible();
  await expect(page.getByTestId('cumulative-chart')).toContainText('이번 달 누적');

  await page.locator('[data-detail-date="2026-09-18"]').click();
  await expect(page.getByTestId('daily-report-view')).toBeVisible();
  await expect(page.getByText('급여 기준 예상값')).toBeVisible();
  await expect(page.getByText('실제 History 아님')).toBeVisible();
  await expect(page.getByText('실제 기록 없음')).toBeVisible();

  await page.getByRole('button', { name: /뒤로/ }).click();
  await expect(page.getByTestId('monthly-report-view')).toBeVisible();

  await page.getByRole('button', { name: '연간', exact: true }).click();
  await expect(page.getByTestId('yearly-report-view')).toBeVisible();
  await expect(page.locator('.detail-column')).toHaveCount(12);

  await page.getByRole('button', { name: /^9월 / }).click();
  await expect(page.getByTestId('monthly-report-view')).toBeVisible();

  await page.getByRole('button', { name: /뒤로/ }).click();
  await expect(page.getByTestId('yearly-report-view')).toBeVisible();
});

test('detail privacy uses the same setting as Money Timer and masks report money', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);
  await page.getByRole('button', { name: '상세 보기' }).click();

  await page.getByRole('button', { name: '금액 숨김 전환' }).click();
  await expect(page.locator('.detail-hero-money')).toContainText('••••••');
  await page.getByRole('button', { name: '월간', exact: true }).click();
  await expect(page.getByTestId('cumulative-chart')).toContainText('금액 숨김');

  await page.getByRole('button', { name: /뒤로/ }).click();
  await expect(page.getByTestId('current-money')).toContainText('••••••');
});

test('current period navigation never generates future report values', async ({ page }) => {
  await freshApp(page);
  await setupSalary(page);
  await page.getByRole('button', { name: '상세 보기' }).click();

  await expect(page.getByRole('button', { name: '다음 기간' })).toBeDisabled();

  await page.getByRole('button', { name: '월간', exact: true }).click();
  await expect(page.getByRole('button', { name: '다음 기간' })).toBeDisabled();
  await expect(page.locator('[aria-label$="미래"]')).toHaveCount(9);

  await page.getByRole('button', { name: '연간', exact: true }).click();
  await expect(page.getByRole('button', { name: '다음 기간' })).toBeDisabled();
  await expect(page.locator('.detail-column-future')).toHaveCount(3);
});

test('detail remains horizontally contained across required portrait and landscape sizes', async ({
  page,
}) => {
  await freshApp(page);
  await setupSalary(page);
  await page.getByRole('button', { name: '상세 보기' }).click();
  await page.getByRole('button', { name: '월간', exact: true }).click();

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
    await expect(page.getByTestId('detail-report-screen')).toBeVisible();
    await expect(page.getByTestId('cumulative-chart')).toBeVisible();
    await expect(page.getByTestId('monthly-calendar')).toBeVisible();

    const geometry = await page.evaluate(() => {
      const tabs = document.querySelector('.detail-period-tabs')!.getBoundingClientRect();
      const calendar = document.querySelector('.monthly-calendar')!.getBoundingClientRect();
      return {
        tabsLeft: tabs.left,
        tabsRight: tabs.right,
        calendarLeft: calendar.left,
        calendarRight: calendar.right,
        width: window.innerWidth,
      };
    });
    expect(geometry.tabsLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.tabsRight).toBeLessThanOrEqual(geometry.width + 1);
    expect(geometry.calendarLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.calendarRight).toBeLessThanOrEqual(geometry.width + 1);
  }
});
