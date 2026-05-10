import { test, expect } from '@playwright/test';
import { loginApiByRole, loginByRole, newContextForRole } from '../helpers/auth-roles';
import {
  createCallApi,
  createCallTaskApi,
  deleteCrmLeadApi,
  ensureClientNumberApi,
  getUsers,
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

  test('pipeline remains horizontally scrollable on mobile viewport', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const lead = await createPipelineLead(admin.accessToken, { stage: 'FOLLOWING_UP', priority: 2 });

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    await page.setViewportSize({ width: 390, height: 844 });
    const pipeline = new PipelinePage(page);
    await pipeline.goto();

    await expect(pipeline.column('FOLLOWING_UP')).toContainText(lead.phoneNumber);
    await expect(pipeline.board).toBeVisible();
    await expect.poll(async () => pipeline.board.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

    await context.close();
  });
});
