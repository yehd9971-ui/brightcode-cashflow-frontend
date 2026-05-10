import { test, expect } from '@playwright/test';
import { loginApiByRole, loginByRole, newContextForRole } from '../helpers/auth-roles';
import {
  clearActiveCallWithReportApi,
  createCallApi,
  createCallTaskApi,
  deleteCrmLeadApi,
  ensureClientNumberApi,
  getMyCallStatusApi,
  getUsers,
  searchNumbersApi,
  updateCrmLeadStageApi,
} from '../helpers/api-client';
import { createTestNumberFixture } from '../helpers/crm-fixtures';
import { assertLocalPlaywrightTargets } from '../helpers/local-readiness';
import { futureTodayTime, localDate, localTime, TEST_RUN_PREFIX, uniqueTestPhone } from '../helpers/test-data';
import { PipelinePage } from '../pages/pipeline.page';

async function createPipelineLead(
  token: string,
  data: { stage: string; priority?: number },
) {
  const lead = await createTestNumberFixture(token, uniqueTestPhone());
  await updateCrmLeadStageApi(lead.id, data, token);
  return lead;
}

async function createPipelineTask(token: string, kind: 'overdue' | 'today' | 'upcoming') {
  const offsets = { overdue: -1, today: 0, upcoming: 1 } as const;
  const taskTime = kind === 'today'
    ? futureTodayTime()
    : kind === 'overdue'
      ? localTime(8, 15)
      : localTime(10, 15);
  const number = await createTestNumberFixture(token, uniqueTestPhone());
  await createCallTaskApi(
    {
      clientPhoneNumber: number.phoneNumber,
      taskDate: localDate(offsets[kind]),
      taskTime,
      notes: `${TEST_RUN_PREFIX} pipeline ${kind}`,
    },
    token,
  );
  return number;
}

test.describe('CRM Pipeline UI', () => {
  test('admin and sales manager can open pipeline while sales is blocked', async ({ browser }) => {
    assertLocalPlaywrightTargets();

    const { context: adminContext, page: adminPage } = await newContextForRole(browser, 'ADMIN');
    const adminPipeline = new PipelinePage(adminPage);
    await adminPipeline.goto();
    await expect(adminPipeline.board).toBeVisible();
    await expect(adminPipeline.column('NEW')).toBeVisible();
    await expect(adminPage.getByTestId('pipeline-stage-INTERESTED')).toHaveCount(0);
    const columns = adminPipeline.board.locator(':scope > div > section');
    await expect(columns.nth(0)).toHaveAttribute('data-testid', 'pipeline-stage-NEW');
    await expect(columns.nth(1)).toHaveAttribute('data-testid', 'pipeline-actions-tasks-required');
    await expect(columns.nth(2)).toHaveAttribute('data-testid', 'pipeline-actions-needs-retry');
    await expect(adminPipeline.column('NOT_ANSWERED')).toBeVisible();
    await expect(adminPipeline.column('NOT_ANSWERED').locator('h2')).toHaveText('NO ANSWER');
    await expect(adminPage.getByTestId('pipeline-stage-CONTACTED')).toHaveCount(0);
    await expect(adminPage.getByTestId('pipeline-stage-PROPOSAL_SENT')).toHaveCount(0);
    await expect(adminPage.getByTestId('pipeline-stage-LOST')).toHaveCount(0);
    await expect(adminPage.getByText('Showing the first 100 leads')).toHaveCount(0);
    await expect(adminPage.locator('option', { hasText: 'CONTACTED' })).toHaveCount(0);
    await expect(adminPage.locator('option', { hasText: 'PROPOSAL SENT' })).toHaveCount(0);
    await expect(adminPage.locator('option', { hasText: 'LOST' })).toHaveCount(0);
    await expect(adminPage.locator('option').filter({ hasText: /^INTERESTED$/ })).toHaveCount(0);
    await expect(adminPage.locator('option', { hasText: 'NO ANSWER' }).first()).toBeAttached();
    await adminContext.close();

    const { context: managerContext, page: managerPage } = await newContextForRole(browser, 'SALES_MANAGER');
    const managerPipeline = new PipelinePage(managerPage);
    await managerPipeline.goto();
    await expect(managerPipeline.board).toBeVisible();
    await managerContext.close();

    const salesContext = await browser.newContext();
    const salesPage = await salesContext.newPage();
    await loginByRole(salesPage, 'SALES');
    await expect(salesPage.getByText('CRM Pipeline')).toHaveCount(0);
    await salesPage.goto('/crm/pipeline');
    await expect(salesPage.getByText(/permission/i)).toBeVisible({ timeout: 10_000 });
    await salesContext.close();
  });

  test('renders hot and stale pipeline cards with warnings', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const hot = await createPipelineLead(admin.accessToken, { stage: 'HOT_LEAD', priority: 4 });
    const stale = await createPipelineLead(admin.accessToken, { stage: 'NEW', priority: 2 });

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const pipeline = new PipelinePage(page);
    await pipeline.goto();

    const hotCard = pipeline.leadCard(hot.phoneNumber);
    await expect(pipeline.column('HOT_LEAD')).toContainText(hot.phoneNumber);
    await expect(hotCard.getByText('Hot Lead', { exact: true }).first()).toBeVisible();
    await expect(hotCard.getByText('No next action')).toBeVisible();

    const staleCard = pipeline.leadCard(stale.phoneNumber);
    await expect(pipeline.column('NEW')).toContainText(stale.phoneNumber);
    await expect(staleCard.getByText('Stale')).toBeVisible();

    await context.close();
  });

  test('filters pipeline by employee and priority', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const sales = await loginApiByRole('SALES');
    const lead = await createPipelineLead(sales.accessToken, { stage: 'INTERESTED', priority: 4 });
    const users = await getUsers(admin.accessToken);
    const salesUser = users.data.find((user) => user.email === 'salma@brightc0de.com') ?? sales.user;

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const pipeline = new PipelinePage(page);
    await pipeline.goto();

    await pipeline.employeeFilter.selectOption(salesUser.id);
    await pipeline.priorityFilter.selectOption('4');
    await expect(pipeline.column('HOT_LEAD')).toContainText(lead.phoneNumber);
    await expect(pipeline.column('INTERESTED')).toHaveCount(0);

    await pipeline.priorityFilter.selectOption('1');
    await expect(pipeline.leadCard(lead.phoneNumber)).toHaveCount(0);

    await context.close();
  });

  test('renders required tasks and retry columns after new leads', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const overdue = await createPipelineTask(admin.accessToken, 'overdue');
    const today = await createPipelineTask(admin.accessToken, 'today');
    const upcoming = await createPipelineTask(admin.accessToken, 'upcoming');
    const retry = await createTestNumberFixture(admin.accessToken, uniqueTestPhone());
    await createCallApi(
      {
        clientPhoneNumber: retry.phoneNumber,
        callStatus: 'NOT_ANSWERED',
        notes: `${TEST_RUN_PREFIX} pipeline retry`,
      },
      admin.accessToken,
    );

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const pipeline = new PipelinePage(page);
    await pipeline.goto();

    const tasksColumn = pipeline.actionColumn('pipeline-actions-tasks-required');
    await expect(tasksColumn).toContainText(overdue.phoneNumber);
    await expect(tasksColumn).toContainText(today.phoneNumber);
    await expect(tasksColumn).not.toContainText(upcoming.phoneNumber);
    await expect(pipeline.actionColumn('pipeline-actions-needs-retry')).toContainText(retry.phoneNumber);

    await context.close();
  });

  test('required task cards open details and start calls', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    await clearActiveCallWithReportApi(admin.accessToken);
    const lead = await createTestNumberFixture(admin.accessToken, uniqueTestPhone());
    const notes = `${TEST_RUN_PREFIX} pipeline task actions`;
    let context: Awaited<ReturnType<typeof newContextForRole>>['context'] | undefined;

    try {
      await createCallTaskApi(
        {
          clientPhoneNumber: lead.phoneNumber,
          taskDate: localDate(0),
          taskTime: futureTodayTime(),
          notes,
        },
        admin.accessToken,
      );

      const roleContext = await newContextForRole(browser, 'ADMIN');
      context = roleContext.context;
      const page = roleContext.page;
      const pipeline = new PipelinePage(page);
      await pipeline.goto();
      await pipeline.phoneSearch.fill(lead.phoneNumber);

      const tasksColumn = pipeline.actionColumn('pipeline-actions-tasks-required');
      const taskCard = tasksColumn.locator(`[data-testid="pipeline-task-card"][data-phone="${lead.phoneNumber}"]`);
      await expect(taskCard).toBeVisible({ timeout: 15_000 });
      await expect(taskCard.getByRole('button', { name: `Open details ${lead.phoneNumber}` })).toBeVisible();
      await expect(taskCard.getByRole('button', { name: `Call ${lead.phoneNumber}` })).toBeVisible();

      await taskCard.getByRole('button', { name: lead.phoneNumber, exact: true }).click();
      await expect(pipeline.preview()).toBeVisible({ timeout: 15_000 });
      await expect(pipeline.preview()).toContainText(lead.phoneNumber);
      await page.getByTestId('lead-detail-close').click();
      await expect(pipeline.preview()).toHaveCount(0);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expect(pipeline.mobile).toBeVisible({ timeout: 15_000 });
      await pipeline.phoneSearch.fill(lead.phoneNumber);
      await pipeline.mobileTab('TASKS_REQUIRED').click();
      const mobileCard = pipeline
        .actionColumn('pipeline-actions-tasks-required-mobile')
        .locator(`[data-testid="pipeline-task-card"][data-phone="${lead.phoneNumber}"]`);
      await expect(mobileCard).toBeVisible({ timeout: 15_000 });
      await mobileCard.getByRole('button', { name: `Open details ${lead.phoneNumber}` }).click();
      await expect(pipeline.preview()).toContainText(lead.phoneNumber, { timeout: 15_000 });
      await page.getByTestId('lead-detail-close').click();

      await page.evaluate(() => {
        window.open = () => null;
      });
      await mobileCard.getByRole('button', { name: `Call ${lead.phoneNumber}` }).click();
      await expect(page).toHaveURL(/\/calls\/new\?phone=/, { timeout: 15_000 });
      await expect(page.locator('input[placeholder="01xxxxxxxxx"]')).toHaveValue(lead.phoneNumber);
    } finally {
      await context?.close();
      await deleteCrmLeadApi(lead.id, admin.accessToken).catch(() => undefined);
      await clearActiveCallWithReportApi(admin.accessToken).catch(() => undefined);
    }
  });

  test('marks non-NO ANSWER leads when the last call was not answered', async ({ browser }) => {
    const sales = await loginApiByRole('SALES');
    const lead = await createPipelineLead(sales.accessToken, { stage: 'HOT_LEAD', priority: 4 });
    await createCallApi(
      {
        clientPhoneNumber: lead.phoneNumber,
        callStatus: 'NOT_ANSWERED',
        notes: `${TEST_RUN_PREFIX} last no answer`,
      },
      sales.accessToken,
    );

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const pipeline = new PipelinePage(page);
    await pipeline.goto();

    const card = pipeline.leadCard(lead.phoneNumber);
    await expect(pipeline.column('HOT_LEAD')).toContainText(lead.phoneNumber);
    await expect(card.getByText('Last call: No answer')).toBeVisible();
    await expect(card).toHaveClass(/border-red-300/);

    await context.close();
  });

  test('sales manager can select self in the employee filter', async ({ browser }) => {
    const manager = await loginApiByRole('SALES_MANAGER');
    const { context, page } = await newContextForRole(browser, 'SALES_MANAGER');
    const pipeline = new PipelinePage(page);
    await pipeline.goto();

    await expect(pipeline.employeeFilter.locator('option', { hasText: 'yasmin@brightc0de.com' })).toHaveCount(1);
    await pipeline.employeeFilter.selectOption(manager.user.id);
    await expect(pipeline.employeeFilter).toHaveValue(manager.user.id);

    await context.close();
  });

  test('paginates each stage at 50 leads', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const created = await Promise.all(
      Array.from({ length: 51 }).map((_, index) =>
        ensureClientNumberApi(
          {
            phoneNumber: uniqueTestPhone(Date.now() + 3000 + index),
            clientName: `${TEST_RUN_PREFIX} page ${index}`,
            source: 'Playwright',
          },
          admin.accessToken,
        ),
      ),
    );

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const pipeline = new PipelinePage(page);
    await pipeline.goto();

    await expect(pipeline.column('NEW').getByTestId('pipeline-lead-card')).toHaveCount(50);
    await expect(pipeline.stagePage('NEW')).toContainText(/Page 1 of \d+/);
    await expect(pipeline.nextStagePage('NEW')).toBeEnabled();
    await pipeline.nextStagePage('NEW').click();
    await expect(pipeline.stagePage('NEW')).toContainText(/Page 2 of \d+/, { timeout: 15_000 });

    await context.close();
    await Promise.all(created.map((lead) => deleteCrmLeadApi(lead.id, admin.accessToken).catch(() => undefined)));
  });

  test('searches phone numbers outside the current stage page', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const target = await ensureClientNumberApi(
      {
        phoneNumber: uniqueTestPhone(Date.now() + 5000),
        clientName: `${TEST_RUN_PREFIX} search target`,
        source: 'Playwright',
      },
      admin.accessToken,
    );
    const fillers = [];
    for (let index = 0; index < 50; index += 1) {
      fillers.push(
        await ensureClientNumberApi(
          {
            phoneNumber: uniqueTestPhone(Date.now() + 5100 + index),
            clientName: `${TEST_RUN_PREFIX} search filler ${index}`,
            source: 'Playwright',
          },
          admin.accessToken,
        ),
      );
    }

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const pipeline = new PipelinePage(page);
    await pipeline.goto();

    await expect(pipeline.leadCard(target.phoneNumber)).toHaveCount(0);
    await pipeline.phoneSearch.fill(target.phoneNumber);
    await expect(pipeline.column('NEW')).toContainText(target.phoneNumber, { timeout: 15_000 });
    await expect(pipeline.stagePage('NEW')).toContainText('Page 1 of 1');

    await context.close();
    await Promise.all(
      [target, ...fillers].map((lead) =>
        deleteCrmLeadApi(lead.id, admin.accessToken).catch(() => undefined),
      ),
    );
  });

  test('moves a lead between stages and opens lead detail drawer', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const lead = await createPipelineLead(admin.accessToken, { stage: 'NEW', priority: 3 });

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const pipeline = new PipelinePage(page);
    await pipeline.goto();

    await expect(pipeline.column('NEW')).toContainText(lead.phoneNumber);
    await pipeline.moveStage(lead.phoneNumber).selectOption('SOLD');
    await expect(page.getByText('Stage updated')).toBeVisible({ timeout: 10_000 });
    await expect(pipeline.column('SOLD')).toContainText(lead.phoneNumber);

    await pipeline.leadCard(lead.phoneNumber).getByRole('button', { name: lead.phoneNumber }).click();
    await expect(pipeline.preview()).toBeVisible();
    await expect(pipeline.preview()).toContainText(lead.phoneNumber);

    await context.close();
  });

  test('pipeline uses mobile stage tabs without page overflow', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const lead = await createPipelineLead(admin.accessToken, { stage: 'FOLLOWING_UP', priority: 2 });
    await createPipelineTask(admin.accessToken, 'today');
    const retry = await createTestNumberFixture(admin.accessToken, uniqueTestPhone());
    await createCallApi(
      {
        clientPhoneNumber: retry.phoneNumber,
        callStatus: 'NOT_ANSWERED',
        notes: `${TEST_RUN_PREFIX} mobile retry`,
      },
      admin.accessToken,
    );

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    await page.setViewportSize({ width: 390, height: 844 });
    const pipeline = new PipelinePage(page);
    await pipeline.goto();

    await expect(pipeline.mobile).toBeVisible({ timeout: 15_000 });
    await expect(pipeline.board).toHaveCount(0);
    await expect(pipeline.mobileTab('NEW')).toBeVisible();
    await expect(pipeline.mobileTab('TASKS_REQUIRED')).toBeVisible();
    await expect(pipeline.mobileTab('NEEDS_RETRY')).toBeVisible();

    await pipeline.mobileTab('FOLLOWING_UP').click();
    await expect(pipeline.column('FOLLOWING_UP')).toContainText(lead.phoneNumber);

    await pipeline.mobileTab('TASKS_REQUIRED').click();
    await expect(pipeline.actionColumn('pipeline-actions-tasks-required-mobile')).toBeVisible();
    await expect(pipeline.actionColumn('pipeline-actions-tasks-required-mobile').getByTestId('pipeline-task-card').first()).toBeVisible();

    await pipeline.mobileTab('NEEDS_RETRY').click();
    await expect(pipeline.actionColumn('pipeline-actions-needs-retry-mobile')).toContainText(retry.phoneNumber);
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      )
      .toBe(true);

    await context.close();
  });

  test('mobile pipeline supports add, filter, move, tasks, and call report flow', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    await clearActiveCallWithReportApi(admin.accessToken);
    const addedPhone = uniqueTestPhone(Date.now() + 9000);
    const taskNote = `${TEST_RUN_PREFIX} mobile drawer task`;
    let context: Awaited<ReturnType<typeof newContextForRole>>['context'] | undefined;

    try {
      const roleContext = await newContextForRole(browser, 'ADMIN');
      context = roleContext.context;
      const page = roleContext.page;
      await page.setViewportSize({ width: 390, height: 844 });
      const pipeline = new PipelinePage(page);
      await pipeline.goto();

      await expect(pipeline.mobile).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Add Number' }).click();
      const addDialog = page.locator('[role="dialog"]').filter({ hasText: 'Add Number' });
      await addDialog.getByLabel('Phone Number').fill(addedPhone);
      await addDialog.getByLabel('Client Name').fill(`${TEST_RUN_PREFIX} mobile add`);
      await addDialog.getByLabel('Source').fill('Playwright Mobile');
      await addDialog.getByRole('button', { name: /^Add$/ }).click();
      await expect(page.getByText('Number added')).toBeVisible({ timeout: 15_000 });

      await pipeline.mobileTab('NEW').click();
      await pipeline.phoneSearch.fill(addedPhone);
      await expect(pipeline.column('NEW')).toContainText(addedPhone, { timeout: 15_000 });

      await pipeline.moveStage(addedPhone).selectOption('FOLLOWING_UP');
      await expect(page.getByText('Stage updated')).toBeVisible({ timeout: 15_000 });
      await pipeline.mobileTab('FOLLOWING_UP').click();
      await expect(pipeline.column('FOLLOWING_UP')).toContainText(addedPhone, { timeout: 15_000 });

      await pipeline.leadCard(addedPhone).getByRole('button', { name: addedPhone }).click();
      await expect(pipeline.preview()).toBeVisible();
      await expect(pipeline.preview()).toContainText(addedPhone);

      await page.getByTestId('lead-detail-stage-select').selectOption('HOT_LEAD');
      await expect(page.getByText('Stage updated')).toBeVisible({ timeout: 15_000 });
      await page.getByTestId('lead-detail-mark-sold').click();
      await expect(page.getByText('Marked sold')).toBeVisible({ timeout: 15_000 });

      await page.getByTestId('lead-detail-create-task').click();
      const taskDialog = page.locator('[role="dialog"]').filter({ hasText: 'Task date' });
      await taskDialog.getByLabel('Task date').fill(localDate(1));
      await taskDialog.getByLabel('Task time').fill(localTime(11, 15));
      await taskDialog.getByLabel('Notes').fill(taskNote);
      await taskDialog.getByRole('button', { name: 'Create Task' }).click();
      await expect(page.getByText('Task created', { exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('lead-detail-next-task')).toContainText(taskNote, { timeout: 15_000 });
      await page.getByTestId('lead-detail-next-task').getByRole('button', { name: 'Close' }).click();
      const closeDialog = page.locator('[role="dialog"]').filter({ hasText: 'Close Task' });
      await closeDialog.getByLabel('Close reason').fill(`${TEST_RUN_PREFIX} mobile close`);
      await closeDialog.getByRole('button', { name: 'Close Task' }).click();
      await expect(page.getByText('Task closed')).toBeVisible({ timeout: 15_000 });

      await page.evaluate(() => {
        window.open = () => null;
      });
      await page.getByTestId('lead-detail-call').click();
      await expect(page).toHaveURL(/\/calls\/new\?phone=/, { timeout: 15_000 });
      await expect(page.locator('input[placeholder="01xxxxxxxxx"]')).toHaveValue(addedPhone);
      await page.getByRole('button', { name: 'Not Answered' }).click();
      await expect(page.getByRole('button', { name: 'Log Call' })).toBeEnabled({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Log Call' }).click();
      await expect(page).toHaveURL(/\/numbers/, { timeout: 15_000 });
      await expect
        .poll(async () => (await getMyCallStatusApi(admin.accessToken)).currentStatus)
        .toBe('AVAILABLE');
    } finally {
      await context?.close();
      const matches = await searchNumbersApi(addedPhone, admin.accessToken).catch(() => []);
      await Promise.all(matches.map((lead) => deleteCrmLeadApi(lead.id, admin.accessToken).catch(() => undefined)));
      await clearActiveCallWithReportApi(admin.accessToken).catch(() => undefined);
    }
  });
});
