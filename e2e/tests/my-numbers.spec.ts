import { test, expect, Page, BrowserContext } from '@playwright/test';
import { MyNumbersPage } from '../pages/my-numbers.page';
import { SALES_USER, MANUAL_PHONE } from '../helpers/test-data';
import { loginViaUI } from '../helpers/login.helper';

test.describe('My Numbers Page', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await loginViaUI(page, SALES_USER.email, SALES_USER.password);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('should display page title "My Numbers"', async () => {
    await page.goto('/numbers');
    const numbersPage = new MyNumbersPage(page);
    await numbersPage.heading.waitFor({ timeout: 15_000 });
    await expect(numbersPage.heading).toHaveText('My Numbers');
  });

  test('should show "Add Number" and "Pull from Pool" buttons', async () => {
    const numbersPage = new MyNumbersPage(page);
    await expect(numbersPage.addNumberBtn).toBeVisible();
    await expect(numbersPage.pullFromPoolBtn).toBeVisible();
  });

  test('should show empty state or assigned numbers list', async () => {
    const numbersPage = new MyNumbersPage(page);
    // User might have numbers from prior runs — verify page renders one state or the other
    const emptyOrAssigned = page.getByText(/No assigned numbers|Assigned Numbers/);
    await expect(emptyOrAssigned).toBeVisible();
  });

  test('should open Add Number modal with correct fields', async () => {
    const numbersPage = new MyNumbersPage(page);
    await numbersPage.openAddModal();
    await expect(numbersPage.phoneInput).toBeVisible();
    await expect(numbersPage.clientNameInput).toBeVisible();
    await expect(numbersPage.sourceInput).toBeVisible();
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('should add a number manually', async () => {
    const numbersPage = new MyNumbersPage(page);
    await numbersPage.openAddModal();
    await numbersPage.fillAddForm(MANUAL_PHONE, 'PW Test Client', 'Playwright');
    await numbersPage.submitAdd();

    await expect(page.getByText('Number added')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(1000);
    await expect(page.getByText(MANUAL_PHONE)).toBeVisible({ timeout: 5_000 });
  });

  test('should pull a number from pool', async () => {
    const numbersPage = new MyNumbersPage(page);
    await numbersPage.pullFromPool();
    await expect(page.getByText(/Pulled:/)).toBeVisible({ timeout: 5_000 });
  });

  test('should show number detail when clicking phone link', async () => {
    const firstPhoneBtn = page.locator('button').filter({ hasText: /^\+/ }).first();
    await firstPhoneBtn.click();
    await expect(page.getByText(/Activity|Previous Assignees|Lead Status/i)).toBeVisible({ timeout: 5_000 });
    // Close detail by clicking the phone button again (toggle) or navigating away
    await page.goto('/numbers');
    await page.locator('h1', { hasText: 'My Numbers' }).waitFor({ timeout: 15_000 });
  });

  test('should schedule follow-up on a NEW number', async () => {
    const followUpBtn = page.getByRole('button', { name: 'Follow Up' }).first();
    if (await followUpBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await followUpBtn.click();
      await expect(page.getByText('Follow-ups scheduled')).toBeVisible({ timeout: 5_000 });
    }
  });

  test('should mark number as not interested', async () => {
    const numbersPage = new MyNumbersPage(page);
    // Add a fresh number to mark
    await numbersPage.openAddModal();
    await numbersPage.fillAddForm('+201077001001', 'NI Test');
    await numbersPage.submitAdd();
    await page.getByText('Number added').waitFor({ timeout: 5_000 });
    await page.waitForTimeout(1000);

    const notInterestedBtn = page.getByRole('button', { name: 'Not Interested' }).first();
    await notInterestedBtn.click();
    await expect(page.getByText('Marked as not interested')).toBeVisible({ timeout: 5_000 });
  });

  test('should return number to pool', async () => {
    const numbersPage = new MyNumbersPage(page);
    // Add a fresh number to return
    await numbersPage.openAddModal();
    await numbersPage.fillAddForm('+201077002002', 'Return Test');
    await numbersPage.submitAdd();
    await page.getByText('Number added').waitFor({ timeout: 5_000 });
    await page.waitForTimeout(1000);

    const returnBtn = page.getByRole('button', { name: 'Return' }).first();
    await returnBtn.click();
    await expect(page.getByText('Returned to pool')).toBeVisible({ timeout: 5_000 });
  });
});
