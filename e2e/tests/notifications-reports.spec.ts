import { test, expect } from '@playwright/test';
import {
  createCrmLeadTaskApi,
  getCrmReportApi,
  getNotificationsApi,
  getUnreadCountApi,
  updateCrmLeadStageApi,
} from '../helpers/api-client';
import { loginApiByRole, loginByRole, newContextForRole } from '../helpers/auth-roles';
import { createTestNumberFixture } from '../helpers/crm-fixtures';
import { assertLocalPlaywrightTargets } from '../helpers/local-readiness';
import { localDate, localTime, TEST_RUN_PREFIX, uniqueTestPhone } from '../helpers/test-data';

async function createReportFixtures() {
  const sales = await loginApiByRole('SALES');
  const manager = await loginApiByRole('SALES_MANAGER');
  const hotLead = await createTestNumberFixture(sales.accessToken, uniqueTestPhone(Date.now() + 201));
  await updateCrmLeadStageApi(hotLead.id, { stage: 'HOT_LEAD', priority: 4 }, manager.accessToken);

  const overdueLead = await createTestNumberFixture(sales.accessToken, uniqueTestPhone(Date.now() + 202));
  await updateCrmLeadStageApi(overdueLead.id, { stage: 'FOLLOWING_UP', priority: 3 }, manager.accessToken);
  await createCrmLeadTaskApi(
    overdueLead.id,
    {
      taskDate: localDate(-1),
      taskTime: localTime(8, 0),
      userId: sales.user.id,
      notes: `${TEST_RUN_PREFIX} overdue CRM report task`,
    },
    manager.accessToken,
  );

  return { sales, manager, hotLead, overdueLead };
}

test.describe('notifications and CRM reports', () => {
  test('notification bell shows assigned CRM task and marks it read', async ({ browser }) => {
    assertLocalPlaywrightTargets();

    const { sales, manager, hotLead } = await createReportFixtures();
    const task = await createCrmLeadTaskApi(
      hotLead.id,
      {
        taskDate: localDate(1),
        taskTime: localTime(10, 30),
        userId: sales.user.id,
        notes: `${TEST_RUN_PREFIX} assigned notification task`,
      },
      manager.accessToken,
    );

    await expect.poll(async () => {
      const notifications = await getNotificationsApi(sales.accessToken);
      return notifications.data.some((item) => item.type === 'TASK_ASSIGNED' && item.read === false);
    }, { timeout: 15_000 }).toBe(true);

    const unreadBefore = await getUnreadCountApi(sales.accessToken);
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginByRole(page, 'SALES');

    await page.getByTestId('notification-bell').click();
    await expect(page.getByTestId('notification-menu')).toBeVisible();
    const item = page.locator('[data-testid="notification-item"][data-type="TASK_ASSIGNED"]').first();
    await expect(item).toContainText('TASK ASSIGNED', { timeout: 10_000 });
    await item.click();

    await expect.poll(async () => {
      const unreadAfter = await getUnreadCountApi(sales.accessToken);
      return unreadAfter.count;
    }, { timeout: 15_000 }).toBeLessThan(unreadBefore.count);

    expect(task.id).toBeTruthy();
    await context.close();
  });

  test('manager sees CRM report cards, tables, and filters on reports page', async ({ browser }) => {
    const { manager } = await createReportFixtures();
    const apiReport = await getCrmReportApi(manager.accessToken, { priority: 4, stage: 'HOT_LEAD' });
    expect(apiReport.cards.hotLeads).toBeGreaterThan(0);
    expect(apiReport.exportRows.length).toBeGreaterThan(0);

    const { context, page } = await newContextForRole(browser, 'SALES_MANAGER');
    await page.goto('/reports');
    await page.getByTestId('crm-reports-tab').click();

    await expect(page.getByTestId('crm-reports-page')).toBeVisible();
    await expect(page.getByTestId('crm-report-overdue-card')).toBeVisible();
    await expect(page.getByTestId('crm-report-hot-card')).toBeVisible();
    await expect(page.getByTestId('crm-report-stale-card')).toBeVisible();
    await expect(page.getByTestId('crm-report-overdue-table')).toBeVisible();
    await expect(page.getByTestId('crm-report-hot-no-action-table')).toBeVisible();
    await expect(page.getByTestId('crm-report-stale-stage-table')).toBeVisible();

    await page.getByTestId('crm-report-stage-filter').selectOption('HOT_LEAD');
    await page.getByTestId('crm-report-priority-filter').selectOption('4');
    await expect(page.getByTestId('crm-report-hot-card')).toContainText(/\d+/, { timeout: 10_000 });

    await context.close();
  });

  test('sales users are blocked from manager CRM reports', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginByRole(page, 'SALES');
    await page.goto('/reports');

    await expect(page.getByText(/permission/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('crm-reports-tab')).toHaveCount(0);

    await context.close();
  });

  test('CRM reports remain readable on mobile viewport', async ({ browser }) => {
    await createReportFixtures();

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/reports');
    await page.getByTestId('crm-reports-tab').click();

    await expect(page.getByTestId('crm-reports-page')).toBeVisible();
    await expect(page.getByTestId('crm-report-hot-no-action-table')).toBeVisible();

    await context.close();
  });
});
