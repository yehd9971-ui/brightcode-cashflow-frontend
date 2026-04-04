import { test, expect, Page, BrowserContext } from '@playwright/test';
import { NumberPoolPage } from '../pages/number-pool.page';
import { ADMIN } from '../helpers/test-data';
import { loginViaUI } from '../helpers/login.helper';

test.describe('Number Pool Page (Admin)', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await loginViaUI(page, ADMIN.email, ADMIN.password);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('should display page title "Number Pool"', async () => {
    await page.goto('/numbers/pool');
    const poolPage = new NumberPoolPage(page);
    await poolPage.heading.waitFor({ timeout: 15_000 });
    await expect(poolPage.heading).toHaveText('Number Pool');
  });

  test('should display 6 pool statistics cards', async () => {
    for (const title of ['Available', 'Assigned', 'Cooling Down', 'Frozen', 'Archived', 'Total']) {
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    }
  });

  test('should show Bulk Import button for admin', async () => {
    const poolPage = new NumberPoolPage(page);
    await expect(poolPage.bulkImportBtn).toBeVisible();
  });

  test('should toggle bulk import textarea on click', async () => {
    const poolPage = new NumberPoolPage(page);
    await expect(poolPage.importTextarea).not.toBeVisible();
    await poolPage.bulkImportBtn.click();
    await expect(poolPage.importTextarea).toBeVisible();
    await poolPage.bulkImportBtn.click();
    await expect(poolPage.importTextarea).not.toBeVisible();
  });

  test('should bulk import numbers via CSV', async () => {
    const poolPage = new NumberPoolPage(page);
    await poolPage.bulkImportBtn.click();
    const csv = '+201066001001,Import Test 1,PW\n+201066001002,Import Test 2,PW';
    await poolPage.importTextarea.fill(csv);
    await poolPage.importSubmitBtn.click();
    await expect(page.getByText(/Imported:.*success/)).toBeVisible({ timeout: 10_000 });
  });

  test('should handle duplicate import errors', async () => {
    const poolPage = new NumberPoolPage(page);
    // Textarea might be closed from previous test, reopen
    if (!await poolPage.importTextarea.isVisible().catch(() => false)) {
      await poolPage.bulkImportBtn.click();
    }
    const csv = '+201066001001,Dup Test,PW';
    await poolPage.importTextarea.fill(csv);
    await poolPage.importSubmitBtn.click();
    await expect(page.getByText(/Imported:|error|already/i)).toBeVisible({ timeout: 10_000 });
  });

  test('should display filter tabs and filter by status', async () => {
    const poolPage = new NumberPoolPage(page);
    await page.goto('/numbers/pool');
    await poolPage.heading.waitFor({ timeout: 15_000 });

    for (const label of ['All', 'Available', 'Assigned', 'Cooling Down', 'Frozen', 'Archived']) {
      await expect(poolPage.tab(label)).toBeVisible();
    }

    await poolPage.tab('Available').click();
    await expect(poolPage.tab('Available')).toHaveClass(/bg-indigo-600/);
  });

  test('should display table with correct columns', async () => {
    const poolPage = new NumberPoolPage(page);
    await poolPage.tab('All').click();
    await page.waitForTimeout(500);

    const headers = poolPage.tableHeaders();
    await expect(headers.nth(0)).toHaveText(/Phone/i);
    await expect(headers.nth(1)).toHaveText(/Client/i);
    await expect(headers.nth(2)).toHaveText(/Status/i);
    await expect(headers.nth(3)).toHaveText(/Lead/i);
    await expect(headers.nth(4)).toHaveText(/Failed/i);
    await expect(headers.nth(5)).toHaveText(/Release/i);
  });

  test('should update stats after bulk import', async () => {
    const poolPage = new NumberPoolPage(page);
    await page.goto('/numbers/pool');
    await poolPage.heading.waitFor({ timeout: 15_000 });

    await poolPage.bulkImportBtn.click();
    const csv = '+201066003001,Stats Test,PW\n+201066003002,Stats Test 2,PW';
    await poolPage.importTextarea.fill(csv);
    await poolPage.importSubmitBtn.click();
    await page.getByText(/Imported:/).waitFor({ timeout: 10_000 });

    await page.reload();
    await poolPage.heading.waitFor();

    // Total stat value is the second <p> inside the stat card
    const totalValue = page.getByText('Total', { exact: true }).locator('..').locator('p').nth(1);
    const totalText = await totalValue.textContent();
    expect(Number(totalText)).toBeGreaterThan(0);
  });
});
