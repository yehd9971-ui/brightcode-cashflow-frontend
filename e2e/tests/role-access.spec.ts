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

  test('SALES user sees CRM Pipeline in sidebar but not removed Numbers pages', async () => {
    const sidebar = salesPage.locator('nav, aside, [class*="sidebar"]');
    await expect(sidebar.getByText('CRM Pipeline')).toBeVisible();
    await expect(sidebar.getByText('My Numbers')).not.toBeVisible();
    await expect(sidebar.getByText('Number Pool')).not.toBeVisible();
  });

  test('SALES_MANAGER sees CRM Pipeline in sidebar but not removed Numbers pages', async () => {
    const sidebar = smPage.locator('nav, aside, [class*="sidebar"]');
    await expect(sidebar.getByText('CRM Pipeline')).toBeVisible();
    await expect(sidebar.getByText('My Numbers')).not.toBeVisible();
    await expect(sidebar.getByText('Number Pool')).not.toBeVisible();
  });

  test('ADMIN sees CRM Pipeline in sidebar but not removed Numbers pages', async () => {
    const sidebar = adminPage.locator('nav, aside, [class*="sidebar"]');
    await expect(sidebar.getByText('CRM Pipeline')).toBeVisible();
    await expect(sidebar.getByText('Number Pool')).not.toBeVisible();
    await expect(sidebar.getByText('My Numbers')).not.toBeVisible();
  });

  test('removed Numbers routes no longer render work pages', async () => {
    await smPage.goto('/numbers');
    await expect(smPage.locator('h1', { hasText: 'My Numbers' })).toHaveCount(0);
    await smPage.goto('/numbers/pool');
    await expect(smPage.locator('h1', { hasText: 'Number Pool' })).toHaveCount(0);
  });
});
