import { test, expect, Page, BrowserContext } from '@playwright/test';
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

  test('should show CRM pipeline for sales with self-only employee filter', async () => {
    await salesPage.goto('/crm/pipeline');
    await salesPage.locator('h1', { hasText: 'CRM Pipeline' }).waitFor({ timeout: 15_000 });
    await expect(salesPage.getByTestId('pipeline-employee-filter').locator('option', { hasText: 'All employees' })).toHaveCount(0);
  });

  test('should not render removed numbers pages', async () => {
    await adminPage.goto('/numbers');
    await expect(adminPage.locator('h1', { hasText: 'My Numbers' })).toHaveCount(0);
    await adminPage.goto('/numbers/pool');
    await expect(adminPage.locator('h1', { hasText: 'Number Pool' })).toHaveCount(0);
  });

  test('should show error toast on network failure', async () => {
    await salesPage.goto('/crm/pipeline');
    await salesPage.locator('h1', { hasText: 'CRM Pipeline' }).waitFor({ timeout: 15_000 });

    await salesPage.route('**/client-numbers', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    await salesPage.getByRole('button', { name: 'Add Number' }).click();
    const dialog = salesPage.locator('[role="dialog"]').filter({ hasText: 'Add Number' });
    await dialog.getByLabel('Phone Number').fill('01012345678');
    await dialog.getByRole('button', { name: /^Add$/ }).click();
    await expect(salesPage.getByText(/Internal Server Error|Failed to add/i)).toBeVisible({ timeout: 5_000 });

    await salesPage.unroute('**/client-numbers');
  });

  test('should close Add Number modal via close button', async () => {
    await salesPage.goto('/crm/pipeline');
    await salesPage.locator('h1', { hasText: 'CRM Pipeline' }).waitFor({ timeout: 15_000 });

    await salesPage.getByRole('button', { name: 'Add Number' }).click();
    const phoneInput = salesPage.locator('[role="dialog"]').getByLabel('Phone Number');
    await expect(phoneInput).toBeVisible();

    await salesPage.locator('[role="dialog"]').getByLabel('Close modal').click();
    await expect(phoneInput).not.toBeVisible({ timeout: 3_000 });
  });
});
