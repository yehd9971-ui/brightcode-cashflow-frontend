import { test, expect } from '@playwright/test';
import {
  completeCrmTaskApi,
  createCrmLeadTaskApi,
  getCrmLeadApi,
  getCrmLeadTimelineApi,
  getNotificationsApi,
  getOpenTasksApi,
  scheduleFollowUpsApi,
  updateCrmLeadStageApi,
} from '../helpers/api-client';
import { loginApiByRole, loginByRole, newContextForRole } from '../helpers/auth-roles';
import { createTestNumberFixture } from '../helpers/crm-fixtures';
import { assertLocalPlaywrightTargets } from '../helpers/local-readiness';
import { localDate, localTime, TEST_RUN_PREFIX, uniqueTestPhone } from '../helpers/test-data';
import { LeadDetailPage } from '../pages/lead-detail.page';
import { PipelinePage } from '../pages/pipeline.page';

test.describe('CRM regression coverage', () => {
  test('regression: old open tasks stay visible until completion and keep follow-up timeline links', async ({ browser }) => {
    test.setTimeout(120_000);
    assertLocalPlaywrightTargets();

    const admin = await loginApiByRole('ADMIN');
    const lead = await createTestNumberFixture(admin.accessToken, uniqueTestPhone(Date.now() + 911));
    await updateCrmLeadStageApi(lead.id, { stage: 'FOLLOWING_UP', priority: 3 }, admin.accessToken);
    const followUps = await scheduleFollowUpsApi(lead.id, admin.accessToken);
    const notes = `${TEST_RUN_PREFIX} regression old task remains visible`;
    const task = await createCrmLeadTaskApi(
      lead.id,
      {
        taskDate: localDate(-1),
        taskTime: localTime(8, 10),
        notes,
      },
      admin.accessToken,
    );

    const overdueBefore = await getOpenTasksApi(admin.accessToken, {
      bucket: 'overdue',
      clientNumberId: lead.id,
      limit: 20,
    });
    expect(overdueBefore.data.some((item) => item.id === task.id && item.isOverdue)).toBe(true);

    const timelineBefore = await getCrmLeadTimelineApi(lead.id, admin.accessToken, { limit: 50 });
    expect(timelineBefore.data.some((item) => item.event === 'TASK_OVERDUE_COMPUTED')).toBe(true);
    expect(timelineBefore.data.some((item) => item.event === 'FOLLOWUP_CREATED')).toBe(true);
    expect(followUps.length).toBeGreaterThan(0);

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const pipeline = new PipelinePage(page);
    await pipeline.goto();
    await pipeline.phoneSearch.fill(lead.phoneNumber);
    await expect(pipeline.actionColumn('pipeline-actions-tasks-required')).toContainText(lead.phoneNumber);
    await context.close();

    await completeCrmTaskApi(task.id, admin.accessToken);

    const openAfter = await getOpenTasksApi(admin.accessToken, {
      bucket: 'all',
      clientNumberId: lead.id,
      limit: 20,
    });
    expect(openAfter.data.some((item) => item.id === task.id)).toBe(false);

    const detailAfter = await getCrmLeadApi(lead.id, admin.accessToken);
    const completedTask = detailAfter.recentTasks.find((item) => item.id === task.id);
    expect(completedTask?.status).toBe('COMPLETED');
    expect(completedTask?.completedAt).toBeTruthy();
    expect(detailAfter.followUps.length).toBeGreaterThan(0);

    const timelineAfter = await getCrmLeadTimelineApi(lead.id, admin.accessToken, { limit: 50 });
    expect(timelineAfter.data.some((item) => item.event === 'TASK_COMPLETED')).toBe(true);
  });

  test('regression: pipeline stage changes, hot/stale badges, lead detail, and role scope stay intact', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const admin = await loginApiByRole('ADMIN');
    const hot = await createTestNumberFixture(admin.accessToken, uniqueTestPhone(Date.now() + 912));
    const stale = await createTestNumberFixture(admin.accessToken, uniqueTestPhone(Date.now() + 913));
    await updateCrmLeadStageApi(hot.id, { stage: 'HOT_LEAD', priority: 4 }, admin.accessToken);
    await updateCrmLeadStageApi(stale.id, { stage: 'NEW', priority: 2 }, admin.accessToken);

    const { context, page } = await newContextForRole(browser, 'SALES_MANAGER');
    const pipeline = new PipelinePage(page);
    await pipeline.goto();
    await pipeline.employeeFilter.selectOption('');

    await expect(pipeline.column('HOT_LEAD')).toContainText(hot.phoneNumber);
    await expect(pipeline.leadCard(hot.phoneNumber).getByText('Hot Lead', { exact: true }).first()).toBeVisible();
    await expect(pipeline.column('NEW')).toContainText(stale.phoneNumber);
    await expect(pipeline.leadCard(stale.phoneNumber).getByText('Stale')).toBeVisible();

    await pipeline.moveStage(hot.phoneNumber).selectOption('FOLLOWING_UP');
    await expect(page.getByText('Stage updated')).toBeVisible({ timeout: 10_000 });
    await expect(pipeline.column('FOLLOWING_UP')).toContainText(hot.phoneNumber);

    const detail = new LeadDetailPage(page);
    await detail.openFromPhone(hot.phoneNumber);
    await expect(detail.drawer).toContainText(hot.phoneNumber);
    await expect(detail.stageSelect).toHaveValue('FOLLOWING_UP');
    await context.close();

    const salesContext = await browser.newContext();
    const salesPage = await salesContext.newPage();
    await loginByRole(salesPage, 'SALES');
    await expect(salesPage.getByText('CRM Pipeline')).toBeVisible();
    await salesPage.goto('/crm/pipeline');
    await expect(salesPage.getByTestId('crm-pipeline-board')).toBeVisible({ timeout: 15_000 });
    await expect(salesPage.getByTestId('pipeline-employee-filter').locator('option', { hasText: 'All employees' })).toHaveCount(0);
    await salesContext.close();
  });

  test('regression: assigned CRM tasks surface in notifications and manager reports remain reachable', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const sales = await loginApiByRole('SALES');
    const manager = await loginApiByRole('SALES_MANAGER');
    const lead = await createTestNumberFixture(sales.accessToken, uniqueTestPhone(Date.now() + 914));
    await updateCrmLeadStageApi(lead.id, { stage: 'HOT_LEAD', priority: 4 }, manager.accessToken);
    await createCrmLeadTaskApi(
      lead.id,
      {
        taskDate: localDate(1),
        taskTime: localTime(10, 45),
        userId: sales.user.id,
        notes: `${TEST_RUN_PREFIX} regression assigned task notification`,
      },
      manager.accessToken,
    );

    await expect
      .poll(async () => {
        const notifications = await getNotificationsApi(sales.accessToken);
        return notifications.data.some(
          (item) =>
            item.type === 'TASK_ASSIGNED' &&
            item.read === false &&
            item.message.includes(lead.phoneNumber),
        );
      }, { timeout: 15_000 })
      .toBe(true);

    const salesContext = await browser.newContext();
    const salesPage = await salesContext.newPage();
    await loginByRole(salesPage, 'SALES');
    await salesPage.getByTestId('notification-bell').click();
    await expect(salesPage.getByTestId('notification-menu')).toBeVisible();
    await expect(salesPage.locator('[data-testid="notification-item"][data-type="TASK_ASSIGNED"]').first()).toContainText(
      'TASK ASSIGNED',
      { timeout: 10_000 },
    );
    await salesContext.close();

    const { context, page } = await newContextForRole(browser, 'SALES_MANAGER');
    await page.goto('/reports');
    await page.getByTestId('crm-reports-tab').click();
    await expect(page.getByTestId('crm-reports-page')).toBeVisible();
    await expect(page.getByTestId('crm-report-hot-card')).toContainText(/\d+/, { timeout: 10_000 });
    await context.close();
  });
});
