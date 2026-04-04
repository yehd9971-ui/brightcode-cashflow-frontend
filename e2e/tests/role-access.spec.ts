import { test, expect, Page, BrowserContext } from '@playwright/test';
import { ADMIN, SALES_USER, SALES_MANAGER } from '../helpers/test-data';
import { loginViaUI } from '../helpers/login.helper';

test.describe('Role-Based Access Control', () => {
  let salesCtx: BrowserContext;
  let smCtx: BrowserContext;
  let adminCtx: BrowserContext;
  let salesPage: Page;
  let smPage: Page;
  let adminPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Login all 3 roles once
    salesCtx = await browser.newContext();
    salesPage = await salesCtx.newPage();
    await loginViaUI(salesPage, SALES_USER.email, SALES_USER.password);

    smCtx = await browser.newContext();
    smPage = await smCtx.newPage();
    await loginViaUI(smPage, SALES_MANAGER.email, SALES_MANAGER.password);

    adminCtx = await browser.newContext();
    adminPage = await adminCtx.newPage();
    await loginViaUI(adminPage, ADMIN.email, ADMIN.password);
  });

  test.afterAll(async () => {
    await salesCtx?.close();
    await smCtx?.close();
    await adminCtx?.close();
  });

  test('SALES user sees "My Numbers" in sidebar but not "Number Pool"', async () => {
    const sidebar = salesPage.locator('nav, aside, [class*="sidebar"]');
    await expect(sidebar.getByText('My Numbers')).toBeVisible();
    await expect(sidebar.getByText('Number Pool')).not.toBeVisible();
  });

  test('SALES_MANAGER sees both "My Numbers" and "Number Pool" in sidebar', async () => {
    const sidebar = smPage.locator('nav, aside, [class*="sidebar"]');
    await expect(sidebar.getByText('My Numbers')).toBeVisible();
    await expect(sidebar.getByText('Number Pool')).toBeVisible();
  });

  test('ADMIN sees "Number Pool" but not "My Numbers" in sidebar', async () => {
    const sidebar = adminPage.locator('nav, aside, [class*="sidebar"]');
    await expect(sidebar.getByText('Number Pool')).toBeVisible();
    await expect(sidebar.getByText('My Numbers')).not.toBeVisible();
  });

  test('SALES_MANAGER cannot see Bulk Import button on pool page', async () => {
    await smPage.goto('/numbers/pool');
    await smPage.locator('h1', { hasText: 'Number Pool' }).waitFor({ timeout: 15_000 });
    await expect(smPage.getByRole('button', { name: /Bulk Import/ })).not.toBeVisible();
  });

  test('SALES_MANAGER cannot see Approve Attempt button on pool page', async () => {
    // Already on pool page from previous test
    await expect(smPage.getByRole('button', { name: 'Approve Attempt' })).not.toBeVisible();
  });
});
