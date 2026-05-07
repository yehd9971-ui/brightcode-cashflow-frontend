import { test, expect } from '@playwright/test';
import { loginApiByRole, loginByRole, newContextForRole } from '../helpers/auth-roles';
import {
  clearActiveCallWithReportApi,
  createCallApi,
  createCallTaskApi,
  updateCrmLeadStageApi,
} from '../helpers/api-client';
import { createTestNumberFixture } from '../helpers/crm-fixtures';
import { assertLocalPlaywrightTargets } from '../helpers/local-readiness';
import { futureTodayTime, localDate, localTime, TEST_RUN_PREFIX, uniqueTestPhone } from '../helpers/test-data';
import { WorkbenchPage } from '../pages/workbench.page';

async function createWorkbenchTask(
  token: string,
  kind: 'overdue' | 'today' | 'upcoming',
  userId?: string,
) {
  const offsets = { overdue: -1, today: 0, upcoming: 1 } as const;
  const taskTime = kind === 'today'
    ? futureTodayTime()
    : kind === 'overdue'
      ? localTime(8, 15)
      : localTime(10, 15);
  const number = await createTestNumberFixture(token, uniqueTestPhone());
  const task = await createCallTaskApi(
    {
      clientPhoneNumber: number.phoneNumber,
      taskDate: localDate(offsets[kind]),
      taskTime,
      userId,
      notes: `${TEST_RUN_PREFIX} workbench ${kind}`,
    },
    token,
  );
  return { number, task };
}

test.describe('numbers workbench', () => {
  test('renders overdue, due today, upcoming, retry, hot, and stale sections locally', async ({ browser }) => {
    assertLocalPlaywrightTargets();
    const admin = await loginApiByRole('ADMIN');
    const overdue = await createWorkbenchTask(admin.accessToken, 'overdue');
    const today = await createWorkbenchTask(admin.accessToken, 'today');
    const upcoming = await createWorkbenchTask(admin.accessToken, 'upcoming');

    const hot = await createTestNumberFixture(admin.accessToken, uniqueTestPhone());
    await updateCrmLeadStageApi(hot.id, { stage: 'HOT_LEAD', priority: 4 }, admin.accessToken);

    const stale = await createTestNumberFixture(admin.accessToken, uniqueTestPhone());

    const retry = await createTestNumberFixture(admin.accessToken, uniqueTestPhone());
    await createCallApi(
      {
        clientPhoneNumber: retry.phoneNumber,
        callStatus: 'NOT_ANSWERED',
        notes: `${TEST_RUN_PREFIX} workbench retry`,
      },
      admin.accessToken,
    );

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const workbench = new WorkbenchPage(page);
    await workbench.goto();

    await expect(workbench.section('workbench-overdue')).toContainText(overdue.number.phoneNumber);
    await expect(workbench.section('workbench-today')).toContainText(today.number.phoneNumber);
    await expect(workbench.section('workbench-upcoming')).toContainText(upcoming.number.phoneNumber);
    await expect(workbench.section('workbench-needs-retry')).toContainText(retry.phoneNumber);
    await expect(workbench.section('workbench-hot-leads')).toContainText(hot.phoneNumber);
    await expect(workbench.section('workbench-stale-leads')).toContainText(stale.phoneNumber);

    await context.close();
  });

  test('filters workbench rows by stage and priority', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const hot = await createTestNumberFixture(admin.accessToken, uniqueTestPhone());
    await updateCrmLeadStageApi(hot.id, { stage: 'HOT_LEAD', priority: 4 }, admin.accessToken);

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const workbench = new WorkbenchPage(page);
    await workbench.goto();

    await workbench.stageFilter.selectOption('HOT_LEAD');
    await workbench.priorityFilter.selectOption('4');

    await expect(workbench.section('workbench-hot-leads')).toContainText(hot.phoneNumber);
    await expect(workbench.section('workbench-stale-leads')).toBeVisible();

    await context.close();
  });

  test('sales can start a call from a task row but cannot close the task', async ({ browser }) => {
    const sales = await loginApiByRole('SALES');
    await clearActiveCallWithReportApi(sales.accessToken);
    const fixture = await createWorkbenchTask(sales.accessToken, 'today', sales.user.id);

    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.open = () => null;
    });
    const page = await context.newPage();
    const workbench = new WorkbenchPage(page);
    try {
      await loginByRole(page, 'SALES');
      await workbench.goto();

      const row = workbench.rowByPhone(fixture.number.phoneNumber);
      await expect(row.getByRole('button', { name: /^Call$/ })).toBeVisible();
      await expect(row.getByRole('button', { name: /Close/i })).toHaveCount(0);

      await row.getByRole('button', { name: /^Call$/ }).click();
      await expect(page).toHaveURL(/\/calls\/new\?phone=/, { timeout: 15_000 });
    } finally {
      await clearActiveCallWithReportApi(sales.accessToken).catch(() => null);
      await context.close();
    }
  });

  test('admin can complete and close open tasks from the workbench', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const completeFixture = await createWorkbenchTask(admin.accessToken, 'today');
    const closeFixture = await createWorkbenchTask(admin.accessToken, 'upcoming');

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const workbench = new WorkbenchPage(page);
    await workbench.goto();

    const completeRow = workbench.rowByPhone(completeFixture.number.phoneNumber);
    await completeRow.getByRole('button', { name: /Complete/i }).click();
    await expect(page.getByText('Task completed')).toBeVisible({ timeout: 10_000 });

    const closeRow = workbench.rowByPhone(closeFixture.number.phoneNumber);
    await closeRow.getByRole('button', { name: /Close/i }).click();
    const closeDialog = page.getByRole('dialog', { name: 'Close Task' });
    await closeDialog.getByLabel('Close Reason').fill(`${TEST_RUN_PREFIX} close`);
    await closeDialog.getByRole('button', { name: /^Close Task$/ }).click();
    await expect(page.getByText('Task closed')).toBeVisible({ timeout: 10_000 });

    await context.close();
  });
});
