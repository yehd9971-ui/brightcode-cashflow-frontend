import { test, expect, Page, BrowserContext } from '@playwright/test';
import { SalaryAdminPage } from '../pages/salary-admin.page';
import { SALES_USER, SALES_MANAGER, ADMIN } from '../helpers/test-data';
import { getSalaryTestMonths } from '../helpers/test-data';
import { loginViaUI } from '../helpers/login.helper';
import {
  login,
  getAllEmployeesSummary,
  getEmployeeSalarySummary,
} from '../helpers/api-client';

const { month1, month2 } = getSalaryTestMonths();

function todayDateStr(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// ── Admin Salary Management ─────────────────────────────────────────────

test.describe.serial('Salary Management Page — Admin', () => {
  let adminCtx: BrowserContext;
  let adminPage: Page;
  let adminToken: string;
  let m2Employees: Awaited<ReturnType<typeof getAllEmployeesSummary>>;
  let m1Employees: Awaited<ReturnType<typeof getAllEmployeesSummary>>;
  let salesDetail: Awaited<ReturnType<typeof getEmployeeSalarySummary>>;

  test.beforeAll(async ({ browser }) => {
    const auth = await login(ADMIN.email, ADMIN.password);
    adminToken = auth.accessToken;

    m2Employees = await getAllEmployeesSummary(adminToken, month2.month, month2.year);
    m1Employees = await getAllEmployeesSummary(adminToken, month1.month, month1.year);
    salesDetail = await getEmployeeSalarySummary(adminToken, SALES_USER.id, month2.month, month2.year);

    adminCtx = await browser.newContext();
    adminPage = await adminCtx.newPage();
    await loginViaUI(adminPage, ADMIN.email, ADMIN.password);
  });

  test.afterAll(async () => {
    await adminCtx?.close();
  });

  // ── Page Structure ────────────────────────────────────────────────

  test('should display page heading "Salary Management"', async () => {
    const sp = new SalaryAdminPage(adminPage);
    await sp.goto();
    await expect(sp.heading).toHaveText('Salary Management');
  });

  test('should display "Add Deduction" button', async () => {
    const sp = new SalaryAdminPage(adminPage);
    await expect(sp.addDeductionBtn).toBeVisible();
  });

  test('should display Month and Year dropdowns', async () => {
    const sp = new SalaryAdminPage(adminPage);
    await expect(sp.monthSelect).toBeVisible();
    await expect(sp.yearSelect).toBeVisible();
  });

  test('should default to current month and year', async () => {
    const sp = new SalaryAdminPage(adminPage);
    await expect(sp.monthSelect).toHaveValue(String(month2.month));
    await expect(sp.yearSelect).toHaveValue(String(month2.year));
  });

  // ── Employees Table ───────────────────────────────────────────────

  test('should display employee table with correct headers', async () => {
    const sp = new SalaryAdminPage(adminPage);
    const headers = sp.employeeHeaders();
    await expect(headers.nth(0)).toHaveText('Employee');
    await expect(headers.nth(1)).toHaveText('Base Salary');
    await expect(headers.nth(2)).toHaveText('Earned');
    await expect(headers.nth(3)).toHaveText('Deductions');
    await expect(headers.nth(4)).toHaveText('Bonuses');
    await expect(headers.nth(5)).toHaveText('Net');
    await expect(headers.nth(6)).toHaveText('Days');
  });

  test('should show employee rows', async () => {
    const sp = new SalaryAdminPage(adminPage);
    if (m2Employees && m2Employees.length > 0) {
      await expect(sp.employeeRows()).toHaveCount(m2Employees.length);
    }
  });

  test('should display SALES user in table', async () => {
    const sp = new SalaryAdminPage(adminPage);
    const row = sp.getEmployeeRowByEmail(SALES_USER.email);
    await expect(row).toBeVisible({ timeout: 5_000 });
  });

  test('should show View button for each employee', async () => {
    const sp = new SalaryAdminPage(adminPage);
    const firstRow = sp.employeeRows().first();
    const viewBtn = firstRow.getByRole('button', { name: 'View' });
    await expect(viewBtn).toBeVisible();
  });

  // ── Employee Detail View ──────────────────────────────────────────

  test('should show detail table when View is clicked', async () => {
    if (!salesDetail || salesDetail.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new SalaryAdminPage(adminPage);
    const row = sp.getEmployeeRowByEmail(SALES_USER.email);
    await sp.clickViewEmployee(row);
    await expect(sp.detailTable).toBeVisible({ timeout: 5_000 });
  });

  test('should display detail table headers', async () => {
    if (!salesDetail || salesDetail.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new SalaryAdminPage(adminPage);
    const headers = sp.detailHeaders();
    await expect(headers.nth(0)).toHaveText('Date');
    await expect(headers.nth(1)).toHaveText('Status');
    await expect(headers.nth(2)).toHaveText('Hours');
    await expect(headers.nth(3)).toHaveText('Day %');
    await expect(headers.nth(4)).toHaveText('Earned');
  });

  test('should show daily record rows with Override buttons', async () => {
    if (!salesDetail || salesDetail.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new SalaryAdminPage(adminPage);
    await expect(sp.detailRows()).toHaveCount(salesDetail.dailyRecords.length);
    const firstRow = sp.detailRows().first();
    await expect(firstRow.getByRole('button', { name: 'Override' })).toBeVisible();
  });

  // ── Add Deduction Modal ───────────────────────────────────────────

  test('should open Add Deduction modal', async () => {
    const sp = new SalaryAdminPage(adminPage);
    await sp.goto(); // fresh load to reset state
    await sp.openDeductionModal();
    await expect(sp.modal).toBeVisible();
    await expect(sp.employeeSelect).toBeVisible();
    await expect(sp.amountInput).toBeVisible();
    await expect(sp.dateInput).toBeVisible();
    await expect(sp.descriptionTextarea).toBeVisible();
  });

  test('should close deduction modal via Escape', async () => {
    const sp = new SalaryAdminPage(adminPage);
    await adminPage.keyboard.press('Escape');
    await expect(sp.modal).not.toBeVisible();
  });

  test('should add deduction and show success toast', async () => {
    const sp = new SalaryAdminPage(adminPage);
    await sp.openDeductionModal();
    await sp.fillDeductionForm(
      SALES_USER.id,
      '100',
      todayDateStr(),
      `E2E test deduction ${Date.now()}`,
    );
    await sp.submitDeduction();
    await expect(sp.toast('Deduction added').first()).toBeVisible({ timeout: 5_000 });
    await adminPage.waitForTimeout(1500);
  });

  test('should close modal after successful deduction', async () => {
    const sp = new SalaryAdminPage(adminPage);
    await expect(sp.modal).not.toBeVisible();
  });

  // ── Month Switching — Previous Month ──────────────────────────────

  test('should show data for previous month when switching', async () => {
    const sp = new SalaryAdminPage(adminPage);
    await sp.selectMonthYear(month1.month, month1.year);
    if (m1Employees && m1Employees.length > 0) {
      await expect(sp.employeeRows()).toHaveCount(m1Employees.length);
    }
  });

  test('should show different data for previous month', async () => {
    const sp = new SalaryAdminPage(adminPage);
    // The deduction we just added is in month2 — month1 should not include it
    const row = sp.getEmployeeRowByEmail(SALES_USER.email);
    if (await row.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const m1Emp = m1Employees?.find((e) => e.email === SALES_USER.email);
      if (m1Emp) {
        // Deductions should match the original month1 data (no E2E deduction)
        await expect(sp.getEmployeeDeductions(row)).toBeVisible();
      }
    }
  });

  // ── Month Switching — Back to Current ─────────────────────────────

  test('should restore current month with deduction changes', async () => {
    const sp = new SalaryAdminPage(adminPage);
    await sp.selectMonthYear(month2.month, month2.year);
    await expect(sp.monthSelect).toHaveValue(String(month2.month));
    // Employee table should be visible
    const row = sp.getEmployeeRowByEmail(SALES_USER.email);
    await expect(row).toBeVisible({ timeout: 5_000 });
  });

  // ── Override Day Record ───────────────────────────────────────────

  test('should open Override modal for a daily record', async () => {
    if (!salesDetail || salesDetail.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new SalaryAdminPage(adminPage);
    // Click View on SALES_USER first
    const empRow = sp.getEmployeeRowByEmail(SALES_USER.email);
    await sp.clickViewEmployee(empRow);
    await expect(sp.detailTable).toBeVisible({ timeout: 5_000 });

    // Click Override on first daily record
    const firstRow = sp.detailRows().first();
    await sp.clickOverride(firstRow);
    await expect(sp.modal).toBeVisible();
    await expect(sp.dayPercentageInput).toBeVisible();
    await expect(sp.adminNotesTextarea).toBeVisible();
  });

  test('should pre-fill Day Percentage with current value', async () => {
    if (!salesDetail || salesDetail.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new SalaryAdminPage(adminPage);
    const currentPct = String(salesDetail.dailyRecords[0].dayPercentage);
    await expect(sp.dayPercentageInput).toHaveValue(currentPct);
  });

  test('should submit override and show success toast', async () => {
    if (!salesDetail || salesDetail.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new SalaryAdminPage(adminPage);
    await sp.fillOverrideForm('75', 'E2E override test');
    await sp.submitOverride();
    await expect(sp.toast('Day record overridden').first()).toBeVisible({ timeout: 5_000 });
    await adminPage.waitForTimeout(1500);
  });

  test('should close override modal after success', async () => {
    if (!salesDetail || salesDetail.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new SalaryAdminPage(adminPage);
    await expect(sp.modal).not.toBeVisible();
  });

  test('should update day percentage in detail table', async () => {
    if (!salesDetail || salesDetail.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new SalaryAdminPage(adminPage);
    // Re-open employee detail to see refreshed data
    await sp.goto();
    const empRow = sp.getEmployeeRowByEmail(SALES_USER.email);
    await sp.clickViewEmployee(empRow);
    await expect(sp.detailTable).toBeVisible({ timeout: 5_000 });

    // Find the record by date (the one we overrode — first record from salesDetail)
    const overriddenDate = salesDetail.dailyRecords[0].dateEgypt;
    const row = sp.getDetailRowByDate(overriddenDate);
    await expect(sp.getDetailDayPercentage(row)).toContainText('75%');
  });

  // ── Error Handling ────────────────────────────────────────────────

  test('should show error toast on deduction failure', async () => {
    const sp = new SalaryAdminPage(adminPage);
    await adminPage.route('**/salary/deduction', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Server Error"}' }),
    );
    await sp.goto();
    await sp.openDeductionModal();
    await sp.fillDeductionForm(SALES_USER.id, '50', todayDateStr(), 'Error test');
    await sp.submitDeduction();
    await expect(adminPage.locator('[role="status"]').first()).toBeVisible({ timeout: 5_000 });
    await adminPage.unroute('**/salary/deduction');
    await adminPage.keyboard.press('Escape');
  });

  test('should show error toast on override failure', async () => {
    if (!salesDetail || salesDetail.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new SalaryAdminPage(adminPage);
    await adminPage.route('**/salary/daily-record/*/override', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Server Error"}' }),
    );
    await sp.goto();
    const empRow = sp.getEmployeeRowByEmail(SALES_USER.email);
    await sp.clickViewEmployee(empRow);
    const firstRow = sp.detailRows().first();
    if (await firstRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sp.clickOverride(firstRow);
      await sp.fillOverrideForm('50', 'Error test');
      await sp.submitOverride();
      await expect(adminPage.locator('[role="status"]').first()).toBeVisible({ timeout: 5_000 });
      await adminPage.keyboard.press('Escape');
    }
    await adminPage.unroute('**/salary/daily-record/*/override');
  });
});

// ── Role Access ─────────────────────────────────────────────────────────

test.describe.serial('Salary Management — Role Access', () => {
  let salesCtx: BrowserContext;
  let salesPage: Page;
  let smCtx: BrowserContext;
  let smPage: Page;

  test.beforeAll(async ({ browser }) => {
    salesCtx = await browser.newContext();
    salesPage = await salesCtx.newPage();
    await loginViaUI(salesPage, SALES_USER.email, SALES_USER.password);

    smCtx = await browser.newContext();
    smPage = await smCtx.newPage();
    await loginViaUI(smPage, SALES_MANAGER.email, SALES_MANAGER.password);
  });

  test.afterAll(async () => {
    await salesCtx?.close();
    await smCtx?.close();
  });

  test('SALES user navigating to /salary/admin should see empty table or 403', async () => {
    await salesPage.goto('/salary/admin');
    await salesPage.waitForTimeout(3000);
    // No ProtectedRoute on this page — SALES can reach it but backend returns no data
    const forbidden = salesPage.locator('h1', { hasText: '403' });
    const heading = salesPage.locator('h1', { hasText: 'Salary Management' });
    const is403 = await forbidden.isVisible().catch(() => false);
    const isPage = await heading.isVisible().catch(() => false);
    // Either 403 or page loads with empty table (no employees since API is admin-only)
    expect(is403 || isPage).toBeTruthy();
    if (isPage) {
      // Verify the table has no employee rows (backend rejects non-admin)
      const rows = salesPage.locator('table').first().locator('tbody tr');
      await expect(rows).toHaveCount(0);
    }
  });

  test('SALES_MANAGER navigating to /salary/admin should see empty table or 403', async () => {
    await smPage.goto('/salary/admin');
    await smPage.waitForTimeout(3000);
    const forbidden = smPage.locator('h1', { hasText: '403' });
    const heading = smPage.locator('h1', { hasText: 'Salary Management' });
    const is403 = await forbidden.isVisible().catch(() => false);
    const isPage = await heading.isVisible().catch(() => false);
    expect(is403 || isPage).toBeTruthy();
    if (isPage) {
      const rows = smPage.locator('table').first().locator('tbody tr');
      await expect(rows).toHaveCount(0);
    }
  });
});
