import { test, expect } from '@playwright/test';
import { loginApiByRole, loginByRole, newContextForRole } from '../helpers/auth-roles';
import { getUsers, updateCrmLeadStageApi } from '../helpers/api-client';
import { createTestNumberFixture } from '../helpers/crm-fixtures';
import { assertLocalPlaywrightTargets } from '../helpers/local-readiness';
import { uniqueTestPhone } from '../helpers/test-data';
import { PipelinePage } from '../pages/pipeline.page';

async function createPipelineLead(
  token: string,
  data: { stage: string; priority?: number },
) {
  const lead = await createTestNumberFixture(token, uniqueTestPhone());
  await updateCrmLeadStageApi(lead.id, data, token);
  return lead;
}

test.describe('CRM Pipeline UI', () => {
  test('admin and sales manager can open pipeline while sales is blocked', async ({ browser }) => {
    assertLocalPlaywrightTargets();

    const { context: adminContext, page: adminPage } = await newContextForRole(browser, 'ADMIN');
    const adminPipeline = new PipelinePage(adminPage);
    await adminPipeline.goto();
    await expect(adminPipeline.board).toBeVisible();
    await expect(adminPipeline.column('NEW')).toBeVisible();
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
    await expect(pipeline.column('INTERESTED')).toContainText(lead.phoneNumber);

    await pipeline.priorityFilter.selectOption('1');
    await expect(pipeline.leadCard(lead.phoneNumber)).toHaveCount(0);

    await context.close();
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
