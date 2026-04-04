import { test, expect, Page, BrowserContext } from '@playwright/test';
import { MyNumbersPage } from '../pages/my-numbers.page';
import { SALES_USER, ADMIN } from '../helpers/test-data';
import { loginViaUI } from '../helpers/login.helper';

test.describe('UI States & Edge Cases', () => {
  let salesCtx: BrowserContext;
  let adminCtx: BrowserContext;
  let salesPage: Page;
  let adminPage: Page;

  test.beforeAll(async ({ browser }) => {
    salesCtx = await browser.newContext();
    salesPage = await salesCtx.newPage();
    await loginViaUI(salesPage, SALES_USER.email, SALES_USER.password);

    adminCtx = await browser.newContext();
    adminPage = await adminCtx.newPage();
    await loginViaUI(adminPage, ADMIN.email, ADMIN.password);
  });

  test.afterAll(async () => {
    await salesCtx?.close();
    await adminCtx?.close();
  });

  test('should show empty state or assigned numbers message', async () => {
    await salesPage.goto('/numbers');
    const emptyOrNumbers = salesPage.getByText(/No assigned numbers|Assigned Numbers/);
    await expect(emptyOrNumbers).toBeVisible({ timeout: 15_000 });
  });

  test('should show pool stats as zeros when intercepting empty response', async () => {
    await adminPage.route('**/client-numbers/pool/stats', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ available: 0, assigned: 0, coolingDown: 0, frozen: 0, archived: 0, reserved: 0, total: 0 }),
      });
    });

    await adminPage.goto('/numbers/pool');
    await adminPage.locator('h1', { hasText: 'Number Pool' }).waitFor({ timeout: 15_000 });

    const zeroValues = adminPage.locator('text=0');
    await expect(zeroValues.first()).toBeVisible();

    // Unroute for future tests
    await adminPage.unroute('**/client-numbers/pool/stats');
  });

  test('should show error toast on network failure', async () => {
    await salesPage.goto('/numbers');
    await salesPage.locator('h1', { hasText: 'My Numbers' }).waitFor({ timeout: 15_000 });

    await salesPage.route('**/client-numbers/pull', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    const numbersPage = new MyNumbersPage(salesPage);
    await numbersPage.pullFromPool();
    await expect(salesPage.getByText(/error|failed|No numbers/i)).toBeVisible({ timeout: 5_000 });

    await salesPage.unroute('**/client-numbers/pull');
  });

  test('should close Add Number modal via close button', async () => {
    await salesPage.goto('/numbers');
    await salesPage.locator('h1', { hasText: 'My Numbers' }).waitFor({ timeout: 15_000 });

    const numbersPage = new MyNumbersPage(salesPage);
    await numbersPage.openAddModal();
    await expect(numbersPage.phoneInput).toBeVisible();

    // Use the "Close modal" button (aria-label) from the Modal component
    await salesPage.locator('[role="dialog"]').getByLabel('Close modal').click();
    await expect(numbersPage.phoneInput).not.toBeVisible({ timeout: 3_000 });
  });
});
