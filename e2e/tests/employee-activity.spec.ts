import { test, expect } from '@playwright/test';
import { loginByRole, loginApiByRole, newContextForRole } from '../helpers/auth-roles';
import { assertLocalPlaywrightTargets } from '../helpers/local-readiness';
import { API_BASE, uniqueTestPhone } from '../helpers/test-data';

const PHONE_LOG_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function egyptDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

test.describe('employee activity and historical calls', () => {
  test('historical call counts toward the timeline only after admin approval', async ({ browser }) => {
    assertLocalPlaywrightTargets();
    const phone = uniqueTestPhone();
    const salesContext = await browser.newContext();
    const salesPage = await salesContext.newPage();
    await loginByRole(salesPage, 'SALES');
    await salesPage.goto('/calls/new');
    await salesPage.getByRole('button', { name: 'Add Historical Call' }).click();

    const form = salesPage.getByTestId('historical-call-form');
    await expect(form).toBeVisible();
    await form.getByLabel('Phone Number').fill(phone);
    await form.getByLabel('Call Date').fill(egyptDate());
    await form.getByLabel('Start Time (Egypt)').fill('00:01');
    await form.getByLabel('Actual Talk Duration (minutes)').fill('2');
    await form.locator('textarea').fill('Playwright historical call');
    await form.locator('input[type="file"]').setInputFiles({
      name: 'phone-log.png',
      mimeType: 'image/png',
      buffer: PHONE_LOG_PNG,
    });
    await form.getByRole('button', { name: 'Submit for Approval' }).click();
    await expect(salesPage.getByText('Historical call submitted for approval')).toBeVisible();
    await salesContext.close();

    const { context: adminContext, page: adminPage } = await newContextForRole(browser, 'ADMIN');
    await adminPage.goto('/dashboard');
    await adminPage.getByRole('tab', { name: 'Activity Timeline' }).click();
    await expect(adminPage.getByTestId('employee-activity-timeline')).toBeVisible();
    await adminPage.getByRole('button', { name: new RegExp(phone.replace('+', '\\+')) }).click();
    let dialog = adminPage.getByRole('dialog');
    await expect(dialog).toContainText('PENDING');
    await expect(dialog).toContainText('Counted toward gaps');
    await expect(dialog).toContainText('No');
    await dialog.getByRole('button', { name: 'Close modal' }).click();

    await adminPage.goto('/calls/approvals');
    const pendingCard = adminPage
      .locator('[data-testid^="pending-call-"]')
      .filter({ hasText: phone });
    await expect(pendingCard).toBeVisible();
    await expect(pendingCard).toContainText('Historical / Outside System');
    await pendingCard.getByRole('button', { name: 'Approve call' }).click();
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(adminPage.getByText('Call approved', { exact: true })).toBeVisible();

    await adminPage.goto('/dashboard');
    await adminPage.getByRole('tab', { name: 'Activity Timeline' }).click();
    await adminPage.getByRole('button', { name: new RegExp(phone.replace('+', '\\+')) }).click();
    dialog = adminPage.getByRole('dialog');
    await expect(dialog).toContainText('APPROVED');
    await expect(dialog).toContainText('Counted toward gaps');
    await expect(dialog).toContainText('Yes');
    await adminContext.close();
  });

  test('current call appears active and then completed on the admin timeline', async ({ browser }) => {
    assertLocalPlaywrightTargets();
    const phone = uniqueTestPhone(Date.now() + 1000);
    const sales = await loginApiByRole('SALES');
    const startResponse = await fetch(`${API_BASE}/users/start-call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sales.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });
    expect(startResponse.ok).toBe(true);

    const { context: adminContext, page: adminPage } = await newContextForRole(browser, 'ADMIN');
    await adminPage.goto('/dashboard');
    await adminPage.getByRole('tab', { name: 'Activity Timeline' }).click();
    await adminPage.getByRole('button', { name: new RegExp(`Active call.*${phone.replace('+', '\\+')}`) }).click();
    await expect(adminPage.getByRole('dialog')).toContainText('Active');

    const salesContext = await browser.newContext();
    const salesPage = await salesContext.newPage();
    await loginByRole(salesPage, 'SALES');
    await salesPage.goto(`/calls/new?phone=${encodeURIComponent(phone)}`);
    await salesPage.locator('input[type="number"]').fill('1');
    await salesPage.locator('textarea').fill('Playwright current call');
    await salesPage.locator('input[type="file"]').setInputFiles({
      name: 'current-call.png',
      mimeType: 'image/png',
      buffer: PHONE_LOG_PNG,
    });
    await salesPage.getByRole('button', { name: 'Log Call', exact: true }).click();
    await expect(salesPage.getByText('Call logged successfully')).toBeVisible();

    await adminPage.goto('/dashboard');
    await adminPage.getByRole('tab', { name: 'Activity Timeline' }).click();
    await adminPage.getByRole('button', { name: new RegExp(`Answered.*${phone.replace('+', '\\+')}`) }).click();
    const dialog = adminPage.getByRole('dialog');
    await expect(dialog).toContainText('Current system call');
    await expect(dialog).toContainText('Counted toward gaps');
    await expect(dialog).toContainText('Yes');

    await salesContext.close();
    await adminContext.close();
  });

  test('sales role cannot access the activity timeline API', async () => {
    assertLocalPlaywrightTargets();
    const sales = await loginApiByRole('SALES');
    const response = await fetch(
      `${API_BASE}/calls/activity-timeline?date=${egyptDate()}`,
      { headers: { Authorization: `Bearer ${sales.accessToken}` } },
    );

    expect(response.status).toBe(403);
  });
});
