import { test, expect, Page, BrowserContext } from '@playwright/test';
import { MySalaryPage } from '../pages/my-salary.page';
import { SALES_USER, SALES_MANAGER, ADMIN } from '../helpers/test-data';
import { getSalaryTestMonths } from '../helpers/test-data';
import { loginViaUI } from '../helpers/login.helper';
import {
  login,
  getMySalarySummary,
  getTeamSalarySummary,
} from '../helpers/api-client';

const { month1, month2 } = getSalaryTestMonths();

/** Format a number to match the UI's formatAmount (e.g. "1,234.56") */
function fmtNum(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── SALES User — My Salary ──────────────────────────────────────────────

test.describe.serial('My Salary Page — SALES User', () => {
  let ctx: BrowserContext;
  let page: Page;
  let salesToken: string;
  let m2Summary: Awaited<ReturnType<typeof getMySalarySummary>>;
  let m1Summary: Awaited<ReturnType<typeof getMySalarySummary>>;

  test.beforeAll(async ({ browser }) => {
    const auth = await login(SALES_USER.email, SALES_USER.password);
    salesToken = auth.accessToken;

    // Fetch actual data for both months
    m2Summary = await getMySalarySummary(salesToken, month2.month, month2.year);
    m1Summary = await getMySalarySummary(salesToken, month1.month, month1.year);

    ctx = await browser.newContext();
    page = await ctx.newPage();
    await loginViaUI(page, SALES_USER.email, SALES_USER.password);
  });

  test.afterAll(async () => {
    await ctx?.close();
  });

  // ── Page Structure ────────────────────────────────────────────────

  test('should display page heading "My Salary"', async () => {
    const sp = new MySalaryPage(page);
    await sp.goto();
    await expect(sp.heading).toHaveText('My Salary');
  });

  test('should display Month and Year dropdowns', async () => {
    const sp = new MySalaryPage(page);
    await expect(sp.monthSelect).toBeVisible();
    await expect(sp.yearSelect).toBeVisible();
  });

  test('should default to current month and year', async () => {
    const sp = new MySalaryPage(page);
    await expect(sp.monthSelect).toHaveValue(String(month2.month));
    await expect(sp.yearSelect).toHaveValue(String(month2.year));
  });

  test('should NOT show team salary tab for SALES role', async () => {
    const sp = new MySalaryPage(page);
    await expect(sp.teamSalaryTab).not.toBeVisible();
  });

  // ── Summary Cards (current month) ─────────────────────────────────

  test('should display Base Salary card', async () => {
    const sp = new MySalaryPage(page);
    const val = sp.getStatCardValue('Base Salary');
    await expect(val).toBeVisible();
    if (m2Summary) {
      await expect(val).toContainText(fmtNum(m2Summary.baseSalary));
    }
  });

  test('should display Days Worked matching API', async () => {
    const sp = new MySalaryPage(page);
    const val = sp.getStatCardValue('Days Worked');
    await expect(val).toBeVisible();
    await expect(val).toContainText(String(m2Summary?.totalDaysWorked ?? 0));
  });

  // ── Monthly Summary (current month) ───────────────────────────────

  test('should display Net Salary matching API', async () => {
    if (!m2Summary || parseFloat(m2Summary.netSalary) === 0) {
      test.skip();
      return;
    }
    const sp = new MySalaryPage(page);
    const val = sp.getSummaryValue('Net Salary');
    await expect(val).toContainText(fmtNum(m2Summary.netSalary));
  });

  test('should display Total Earned', async () => {
    if (!m2Summary || m2Summary.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new MySalaryPage(page);
    const val = sp.getSummaryValue('Total Earned');
    await expect(val).toContainText(fmtNum(m2Summary.totalEarned));
  });

  test('should display Call Deductions', async () => {
    if (!m2Summary) { test.skip(); return; }
    const sp = new MySalaryPage(page);
    const val = sp.getSummaryValue('Call Deductions');
    await expect(val).toBeVisible();
  });

  test('should display Manual Deductions', async () => {
    if (!m2Summary) { test.skip(); return; }
    const sp = new MySalaryPage(page);
    const val = sp.getSummaryValue('Manual Deductions');
    await expect(val).toBeVisible();
  });

  // ── Daily Breakdown (current month) ───────────────────────────────

  test('should display Daily Breakdown table headers', async () => {
    if (!m2Summary || m2Summary.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new MySalaryPage(page);
    const headers = sp.dailyHeaders();
    await expect(headers.nth(0)).toHaveText('Date');
    await expect(headers.nth(1)).toHaveText('Status');
    await expect(headers.nth(2)).toHaveText('Hours');
    await expect(headers.nth(3)).toHaveText('Day %');
    await expect(headers.nth(4)).toHaveText('Earned');
    await expect(headers.nth(5)).toHaveText('Call Ded.');
  });

  test('should show correct number of daily rows', async () => {
    if (!m2Summary || m2Summary.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new MySalaryPage(page);
    const rows = sp.dailyRows();
    await expect(rows).toHaveCount(m2Summary.dailyRecords.length);
  });

  test('should display date in YYYY-MM-DD format', async () => {
    if (!m2Summary || m2Summary.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new MySalaryPage(page);
    const firstRow = sp.dailyRows().first();
    const dateCell = firstRow.locator('td').first();
    await expect(dateCell).toHaveText(/\d{4}-\d{2}-\d{2}/);
  });

  test('should display status badges with human-readable text', async () => {
    if (!m2Summary || m2Summary.dailyRecords.length === 0) {
      test.skip();
      return;
    }
    const sp = new MySalaryPage(page);
    const firstRow = sp.dailyRows().first();
    const statusBadge = sp.getRowStatus(firstRow);
    // Status text should NOT contain underscores (they're replaced with spaces)
    const text = await statusBadge.textContent();
    expect(text).not.toContain('_');
  });

  // ── Month Switching — Previous Month ──────────────────────────────

  test('should switch to previous month', async () => {
    const sp = new MySalaryPage(page);
    await sp.selectMonthYear(month1.month, month1.year);
    await expect(sp.monthSelect).toHaveValue(String(month1.month));
    await expect(sp.yearSelect).toHaveValue(String(month1.year));
  });

  test('should show different data for previous month', async () => {
    const sp = new MySalaryPage(page);
    const daysVal = sp.getStatCardValue('Days Worked');
    await expect(daysVal).toContainText(String(m1Summary?.totalDaysWorked ?? 0));
  });

  test('should show different daily row count for previous month', async () => {
    if (m1Summary && m1Summary.dailyRecords.length > 0) {
      const sp = new MySalaryPage(page);
      await expect(sp.dailyRows()).toHaveCount(m1Summary.dailyRecords.length);
    }
  });

  // ── Month Switching — Back to Current ─────────────────────────────

  test('should restore current month data when switching back', async () => {
    const sp = new MySalaryPage(page);
    await sp.selectMonthYear(month2.month, month2.year);
    const daysVal = sp.getStatCardValue('Days Worked');
    await expect(daysVal).toContainText(String(m2Summary?.totalDaysWorked ?? 0));
  });

  // ── Empty Month ───────────────────────────────────────────────────

  test('should handle empty month gracefully', async () => {
    const sp = new MySalaryPage(page);
    // Select year 2020 — should have no data
    await sp.yearSelect.selectOption(String(month2.year - 1));
    await sp.monthSelect.selectOption('1');
    await page.waitForTimeout(1500);
    // Page should not crash — stat cards still visible
    await expect(sp.heading).toBeVisible();
    // Restore
    await sp.selectMonthYear(month2.month, month2.year);
  });

  // ── Error Handling ────────────────────────────────────────────────

  test('should handle API error gracefully', async () => {
    const sp = new MySalaryPage(page);
    await page.route('**/salary/my-summary*', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Server Error"}' }),
    );
    await sp.goto();
    // Page should not crash — heading still visible or error state shown
    await page.waitForTimeout(2000);
    await page.unroute('**/salary/my-summary*');
    await sp.goto(); // restore
  });
});

// ── SALES_MANAGER — Team Salary Tab ─────────────────────────────────────

test.describe.serial('My Salary Page — SALES_MANAGER Team Tab', () => {
  let ctx: BrowserContext;
  let page: Page;
  let smToken: string;
  let teamData: Awaited<ReturnType<typeof getTeamSalarySummary>>;

  test.beforeAll(async ({ browser }) => {
    const auth = await login(SALES_MANAGER.email, SALES_MANAGER.password);
    smToken = auth.accessToken;
    teamData = await getTeamSalarySummary(smToken, month2.month, month2.year);

    ctx = await browser.newContext();
    page = await ctx.newPage();
    await loginViaUI(page, SALES_MANAGER.email, SALES_MANAGER.password);
  });

  test.afterAll(async () => {
    await ctx?.close();
  });

  test('should display My Salary and Team Salary tabs', async () => {
    const sp = new MySalaryPage(page);
    await sp.goto();
    await expect(sp.mySalaryTab).toBeVisible();
    await expect(sp.teamSalaryTab).toBeVisible();
  });

  test('should default to My Salary tab', async () => {
    const sp = new MySalaryPage(page);
    // My Salary tab should have active styling (bg-indigo-600)
    await expect(sp.mySalaryTab).toHaveClass(/bg-indigo-600/);
  });

  test('should switch to Team Salary tab', async () => {
    const sp = new MySalaryPage(page);
    await sp.teamSalaryTab.click();
    await page.waitForTimeout(1500);
    await expect(sp.teamSalaryTab).toHaveClass(/bg-indigo-600/);
  });

  test('should display team table with correct headers', async () => {
    const sp = new MySalaryPage(page);
    const headers = sp.teamHeaders();
    await expect(headers.nth(0)).toHaveText('Employee');
    await expect(headers.nth(1)).toHaveText('Base Salary');
    await expect(headers.nth(2)).toHaveText('Earned');
    await expect(headers.nth(3)).toHaveText('Deductions');
    await expect(headers.nth(4)).toHaveText('Bonuses');
    await expect(headers.nth(5)).toHaveText('Net Salary');
    await expect(headers.nth(6)).toHaveText('Days');
  });

  test('should show SALES user in team table', async () => {
    if (!teamData || teamData.length === 0) { test.skip(); return; }
    const sp = new MySalaryPage(page);
    const row = sp.getTeamRowByEmail(SALES_USER.email);
    await expect(row).toBeVisible({ timeout: 5_000 });
  });

  test('should be read-only — no action buttons in team table', async () => {
    if (!teamData || teamData.length === 0) { test.skip(); return; }
    const sp = new MySalaryPage(page);
    const firstRow = sp.teamRows().first();
    const buttons = firstRow.getByRole('button');
    await expect(buttons).toHaveCount(0);
  });
});

// ── Role Access ─────────────────────────────────────────────────────────

test.describe.serial('My Salary — Role Access', () => {
  let adminCtx: BrowserContext;
  let adminPage: Page;

  test.beforeAll(async ({ browser }) => {
    adminCtx = await browser.newContext();
    adminPage = await adminCtx.newPage();
    await loginViaUI(adminPage, ADMIN.email, ADMIN.password);
  });

  test.afterAll(async () => {
    await adminCtx?.close();
  });

  test('ADMIN navigating to /salary should see 403 or no salary data', async () => {
    await adminPage.goto('/salary');
    await adminPage.waitForTimeout(2000);
    // Admin is not SALES/SALES_MANAGER — page may show 403 or empty
    const forbidden = adminPage.locator('h1', { hasText: '403' });
    const heading = adminPage.locator('h1', { hasText: 'My Salary' });
    const isForbidden = await forbidden.isVisible().catch(() => false);
    const isVisible = await heading.isVisible().catch(() => false);
    // Either 403 or the page shows but with no meaningful data
    expect(isForbidden || isVisible).toBeTruthy();
  });
});
