import { test, expect } from '@playwright/test';
import {
  clearActiveCallWithReportApi,
  createCrmLeadTaskApi,
  deleteCrmLeadApi,
  ensureClientNumberApi,
  updateCrmLeadStageApi,
} from '../helpers/api-client';
import { loginApiByRole, newContextForRole } from '../helpers/auth-roles';
import { createTestNumberFixture } from '../helpers/crm-fixtures';
import { assertLocalPlaywrightTargets } from '../helpers/local-readiness';
import { localDate, localTime, TEST_RUN_PREFIX, uniqueTestPhone } from '../helpers/test-data';
import { LeadDetailPage } from '../pages/lead-detail.page';
import { PipelinePage } from '../pages/pipeline.page';

async function createLead(token: string, stage = 'NEW') {
  const lead = await createTestNumberFixture(token, uniqueTestPhone(Date.now() + Math.floor(Math.random() * 1000)));
  await updateCrmLeadStageApi(lead.id, { stage, priority: 3 }, token);
  return lead;
}

test.describe('Lead detail drawer UI', () => {
  test('lead detail opens from pipeline card, closes route state, and supports direct links', async ({ browser }) => {
    assertLocalPlaywrightTargets();

    const admin = await loginApiByRole('ADMIN');
    const lead = await createLead(admin.accessToken, 'INTERESTED');

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const pipeline = new PipelinePage(page);
    const detail = new LeadDetailPage(page);
    await pipeline.goto();

    await expect(pipeline.leadCard(lead.phoneNumber)).toBeVisible({ timeout: 15_000 });
    await detail.openFromPhone(lead.phoneNumber);
    await expect(detail.drawer).toContainText(lead.phoneNumber);
    await expect(detail.stageSelect).toHaveValue('INTERESTED');
    await expect(detail.nextTask).toContainText(/No open task|Scheduled/i);

    await detail.closeButton.click();
    await expect(detail.drawer).toHaveCount(0);
    await expect(page).not.toHaveURL(/leadId=/);

    await detail.openDirect(lead.id);
    await expect(detail.drawer).toContainText(lead.phoneNumber);

    await context.close();
  });

  test('lead detail creates a task and shows the timeline event', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const lead = await createLead(admin.accessToken, 'FOLLOWING_UP');
    const note = `${TEST_RUN_PREFIX} lead detail task`;

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const detail = new LeadDetailPage(page);
    await detail.openDirect(lead.id);

    await detail.createTaskButton.click();
    const taskDialog = page.locator('[role="dialog"]').filter({ hasText: 'Task date' });
    await taskDialog.getByLabel('Task date').fill(localDate(1));
    await taskDialog.getByLabel('Task time').fill(localTime(10, 30));
    await taskDialog.getByLabel('Notes').fill(note);
    await taskDialog.getByRole('button', { name: 'Create Task' }).click();

    await expect(page.getByText('Task created', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(detail.nextTask).toContainText(note, { timeout: 15_000 });
    await expect(detail.timelineEvent(/TASK CREATED|TASK_CREATED|Task created/i)).toBeVisible({ timeout: 15_000 });
    await expect(detail.nextTask.getByRole('button', { name: 'Close' })).toBeVisible();

    await context.close();
  });

  test('lead detail shows sales notes, lets admin delete, and hides delete from manager', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const note = `${TEST_RUN_PREFIX} sales note`;
    const lead = await ensureClientNumberApi(
      {
        phoneNumber: uniqueTestPhone(Date.now() + 701),
        clientName: `${TEST_RUN_PREFIX} notes client`,
        source: 'Playwright',
        notes: note,
      },
      admin.accessToken,
    );
    await updateCrmLeadStageApi(lead.id, { stage: 'NEW', priority: 2 }, admin.accessToken);

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const detail = new LeadDetailPage(page);
    await detail.openDirect(lead.id);

    await expect(detail.notes).toContainText(note);
    await expect(detail.deleteButton).toBeVisible();
    await detail.deleteButton.click();
    const deleteDialog = page.locator('[role="dialog"]').filter({ hasText: 'Delete Lead' });
    await deleteDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Lead deleted')).toBeVisible({ timeout: 10_000 });
    await expect(detail.drawer).toHaveCount(0);
    await context.close();

    const managerLead = await ensureClientNumberApi(
      {
        phoneNumber: uniqueTestPhone(Date.now() + 702),
        clientName: `${TEST_RUN_PREFIX} manager no delete`,
        source: 'Playwright',
      },
      admin.accessToken,
    );
    await updateCrmLeadStageApi(managerLead.id, { stage: 'NEW', priority: 2 }, admin.accessToken);

    const { context: managerContext, page: managerPage } = await newContextForRole(browser, 'SALES_MANAGER');
    const managerDetail = new LeadDetailPage(managerPage);
    await managerDetail.openDirect(managerLead.id);
    await expect(managerDetail.deleteButton).toHaveCount(0);
    await managerContext.close();

    await deleteCrmLeadApi(managerLead.id, admin.accessToken);
  });

  test('lead detail changes stage, marks sold, and marks lost with reason', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const lead = await createLead(admin.accessToken, 'NEW');

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const detail = new LeadDetailPage(page);
    await detail.openDirect(lead.id);

    await detail.stageSelect.selectOption('HOT_LEAD');
    await expect(page.getByText('Stage updated')).toBeVisible({ timeout: 10_000 });
    await expect(detail.stageSelect).toHaveValue('HOT_LEAD');

    await detail.markSoldButton.click();
    await expect(page.getByText('Marked sold')).toBeVisible({ timeout: 10_000 });
    await expect(detail.stageSelect).toHaveValue('SOLD');

    await detail.markLostButton.click();
    const lostDialog = page.locator('[role="dialog"]').filter({ hasText: 'Lost reason' });
    await lostDialog.getByLabel('Lost reason').fill(`${TEST_RUN_PREFIX} lost reason`);
    await lostDialog.getByRole('button', { name: 'Mark Lost' }).click();
    await expect(page.getByText('Marked lost')).toBeVisible({ timeout: 10_000 });
    await expect(detail.stageSelect).toHaveValue('LOST');
    await expect(detail.timelineEvent(/LOST|STAGE/i)).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test('lead detail call button opens the local call report flow', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    await clearActiveCallWithReportApi(admin.accessToken);
    const lead = await createLead(admin.accessToken, 'NOT_ANSWERED');

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    const detail = new LeadDetailPage(page);
    await detail.openDirect(lead.id);
    await page.evaluate(() => {
      window.open = () => null;
    });

    await detail.callButton.click();
    await expect(page).toHaveURL(/\/calls\/new\?phone=/, { timeout: 15_000 });
    await clearActiveCallWithReportApi(admin.accessToken);

    await context.close();
  });

  test('lead detail remains usable on mobile viewport', async ({ browser }) => {
    const admin = await loginApiByRole('ADMIN');
    const lead = await createLead(admin.accessToken, 'PROPOSAL_SENT');
    await createCrmLeadTaskApi(
      lead.id,
      {
        taskDate: localDate(1),
        taskTime: localTime(11, 0),
        notes: `${TEST_RUN_PREFIX} mobile detail task`,
      },
      admin.accessToken,
    );

    const { context, page } = await newContextForRole(browser, 'ADMIN');
    await page.setViewportSize({ width: 390, height: 844 });
    const detail = new LeadDetailPage(page);
    await detail.openDirect(lead.id);

    await expect(detail.drawer).toBeVisible();
    await expect(detail.callButton).toBeVisible();
    await expect(detail.createTaskButton).toBeVisible();
    await expect(detail.timeline).toBeVisible();

    await context.close();
  });
});
