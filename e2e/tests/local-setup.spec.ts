import { test, expect } from '@playwright/test';
import { loginApiByRole, loginByRole } from '../helpers/auth-roles';
import { assertLocalApiReady, assertLocalAppReady, assertLocalPlaywrightTargets } from '../helpers/local-readiness';
import {
  createCallFixture,
  createFollowUpFixture,
  createLeadFixture,
  createTaskFixture,
  createTestNumberFixture,
} from '../helpers/crm-fixtures';
import { bestEffortCleanupTestData, getNeedsRetryApi, getTodayTasksApi } from '../helpers/api-client';
import { expectToast } from '../helpers/assertions';
import { ADMIN, SALES_MANAGER, SALES_USER, uniqueTestPhone } from '../helpers/test-data';
import { PipelinePage } from '../pages/pipeline.page';
import { LeadDetailPage } from '../pages/lead-detail.page';

test.describe('local setup readiness', () => {
  test('setup uses localhost-only targets', async () => {
    expect(() => assertLocalPlaywrightTargets()).not.toThrow();
  });

  test('setup confirms local API is reachable', async () => {
    await assertLocalApiReady();
  });

  test('setup confirms local Next app is reachable', async ({ page }) => {
    await assertLocalAppReady(page);
  });

  test('auth smoke logs in all CRM test roles', async ({ browser }) => {
    for (const role of ['ADMIN', 'SALES', 'SALES_MANAGER'] as const) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginByRole(page, role);
      await context.close();
    }
  });

  test('setup helpers create local CRM numbers and task fixtures', async () => {
    const admin = await loginApiByRole('ADMIN');
    const number = await createTestNumberFixture(admin.accessToken, uniqueTestPhone());
    const overdue = await createTaskFixture(admin.accessToken, 'overdue');
    const today = await createTaskFixture(admin.accessToken, 'today');
    const upcoming = await createTaskFixture(admin.accessToken, 'upcoming');

    expect(number.id).toBeTruthy();
    expect(overdue.task.id).toBeTruthy();
    expect(today.task.id).toBeTruthy();
    expect(upcoming.task.id).toBeTruthy();
  });

  test('setup helpers create local follow-up, call, and lead fixtures', async () => {
    const admin = await loginApiByRole('ADMIN');
    const followUp = await createFollowUpFixture(admin.accessToken);
    const call = await createCallFixture(admin.accessToken, uniqueTestPhone());
    const hotLead = await createLeadFixture(admin.accessToken, 'hotLead');
    const staleLead = await createLeadFixture(admin.accessToken, 'staleLead');
    const needsRetry = await createLeadFixture(admin.accessToken, 'needsRetry');

    expect(followUp.number.id).toBeTruthy();
    expect(call.call.id).toBeTruthy();
    expect(hotLead.id).toBeTruthy();
    expect(staleLead.id).toBeTruthy();
    expect(needsRetry.id).toBeTruthy();
  });

  test('setup API helpers expose today tasks and needs retry endpoints', async () => {
    const manager = await loginApiByRole('SALES_MANAGER');
    await expect(getTodayTasksApi(manager.accessToken)).resolves.toBeTruthy();
    await expect(getNeedsRetryApi(manager.accessToken)).resolves.toBeTruthy();
  });

  test('CRM navigation smoke opens sales-scoped pipeline page', async ({ page }) => {
    await loginByRole(page, 'SALES');
    const pipeline = new PipelinePage(page);
    await pipeline.goto();
    await expect(pipeline.heading).toBeVisible();
    await expect(pipeline.employeeFilter.locator('option', { hasText: 'All employees' })).toHaveCount(0);
  });

  test('removed numbers routes do not render work pages', async ({ page }) => {
    await loginByRole(page, 'ADMIN');
    await page.goto('/numbers');
    await expect(page.locator('h1', { hasText: 'My Numbers' })).toHaveCount(0);
    await page.goto('/numbers/pool');
    await expect(page.locator('h1', { hasText: 'Number Pool' })).toHaveCount(0);
  });

  test('setup page objects are compile-safe for future CRM pages', async ({ page }) => {
    const pipeline = new PipelinePage(page);
    const leadDetail = new LeadDetailPage(page);
    expect(pipeline.heading).toBeTruthy();
    expect(leadDetail.container).toBeTruthy();
  });

  test('setup assertion helpers support visible toasts', async ({ page }) => {
    await page.setContent('<div>Saved locally</div>');
    await expectToast(page, 'Saved locally');
  });

  test('setup cleanup helper is safe and non-destructive', async () => {
    const admin = await loginApiByRole('ADMIN');
    const result = await bestEffortCleanupTestData(admin.accessToken);
    expect(result.strategy).toBe('prefix-only');
  });

  test('auth smoke account constants remain documented', async () => {
    expect(ADMIN.email).toContain('@');
    expect(SALES_USER.email).toContain('@');
    expect(SALES_MANAGER.email).toContain('@');
  });
});
