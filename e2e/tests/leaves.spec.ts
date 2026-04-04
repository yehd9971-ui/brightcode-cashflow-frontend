import { test, expect, Page, BrowserContext } from '@playwright/test';
import { LeavesPage } from '../pages/leaves.page';
import { LeaveApprovalsPage } from '../pages/leave-approvals.page';
import { SALES_USER, ADMIN } from '../helpers/test-data';
import { loginViaUI } from '../helpers/login.helper';
import {
  login,
  createLeave,
  getMyLeaves,
  cancelLeaveApi,
} from '../helpers/api-client';

/**
 * Return YYYY-MM-DD for today + offsetDays.
 * A random per-run seed ensures dates don't collide with leaves
 * from prior runs (approved/rejected leaves can't be deleted).
 */
const RUN_SEED = Math.floor(Math.random() * 800) + 100; // 100-900 days ahead
function futureDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays + RUN_SEED);
  return d.toISOString().split('T')[0];
}

test.describe.serial('My Leaves & Cross-Role Leave Flow', () => {
  let salesCtx: BrowserContext;
  let salesPage: Page;
  let adminCtx: BrowserContext;
  let adminPage: Page;
  let salesToken: string;
  let adminToken: string;

  // Dates used by each test group (unique offsets + RUN_SEED to avoid collisions)
  const dateCreate = futureDate(30);
  const dateWithReason = futureDate(31);
  const dateCancel = futureDate(32);
  const dateApprovePaid = futureDate(33);
  const dateApproveUnpaid = futureDate(34);
  const dateReject = futureDate(35);

  test.beforeAll(async ({ browser }) => {
    // Get API tokens for setup/cleanup
    const salesAuth = await login(SALES_USER.email, SALES_USER.password);
    salesToken = salesAuth.accessToken;
    const adminAuth = await login(ADMIN.email, ADMIN.password);
    adminToken = adminAuth.accessToken;

    // Clean up any pending leaves from prior runs
    const existing = await getMyLeaves(salesToken, { limit: 100 });
    for (const leave of existing.data) {
      if (leave.status === 'PENDING_LEAVE') {
        await cancelLeaveApi(leave.id, salesToken).catch(() => {});
      }
    }

    // Login both users via UI
    salesCtx = await browser.newContext();
    salesPage = await salesCtx.newPage();
    await loginViaUI(salesPage, SALES_USER.email, SALES_USER.password);

    adminCtx = await browser.newContext();
    adminPage = await adminCtx.newPage();
    await loginViaUI(adminPage, ADMIN.email, ADMIN.password);
  });

  test.afterAll(async () => {
    // Clean up any pending leaves created during tests
    try {
      const remaining = await getMyLeaves(salesToken, { limit: 100 });
      for (const leave of remaining.data) {
        if (leave.status === 'PENDING_LEAVE') {
          await cancelLeaveApi(leave.id, salesToken).catch(() => {});
        }
      }
    } catch { /* ignore */ }
    await salesCtx?.close();
    await adminCtx?.close();
  });

  // ── GROUP 1: Page Structure ─────────────────────────────────────────

  test('should display page title "My Leaves"', async () => {
    const lp = new LeavesPage(salesPage);
    await lp.goto();
    await expect(lp.heading).toHaveText('My Leaves');
  });

  test('should display "Request Leave" button in header', async () => {
    const lp = new LeavesPage(salesPage);
    await expect(lp.requestLeaveBtn.first()).toBeVisible();
  });

  test('should show empty state when no leaves exist', async () => {
    const lp = new LeavesPage(salesPage);
    const tableVisible = await lp.table.isVisible().catch(() => false);
    if (!tableVisible) {
      await expect(lp.emptyStateTitle).toBeVisible();
      await expect(lp.emptyStateDescription).toBeVisible();
    }
  });

  // ── GROUP 2: Request Leave Modal ────────────────────────────────────

  test('should open request leave modal on button click', async () => {
    const lp = new LeavesPage(salesPage);
    await lp.openRequestModal();
    await expect(lp.modal).toBeVisible();
    await expect(lp.dateInput).toBeVisible();
    await expect(lp.reasonTextarea).toBeVisible();
    await expect(lp.submitRequestBtn).toBeVisible();
    // Close modal for next test
    await salesPage.keyboard.press('Escape');
    await expect(lp.modal).not.toBeVisible();
  });

  // ── GROUP 3: Create Leave — Happy Path ──────────────────────────────

  test('should create a leave request with date only', async () => {
    const lp = new LeavesPage(salesPage);
    await lp.goto();
    await lp.openRequestModal();
    await lp.fillRequestForm(dateCreate);
    await lp.submitRequest();

    await expect(lp.toast('Leave requested').first()).toBeVisible({ timeout: 10_000 });
    await salesPage.waitForTimeout(1500);
  });

  test('should display the new leave in the table with Pending status', async () => {
    const lp = new LeavesPage(salesPage);
    const row = lp.getRowByDate(dateCreate);
    await expect(row).toBeVisible({ timeout: 5_000 });
    await expect(lp.getRowStatus(row)).toHaveText('Pending');
  });

  test('should show cancel button for pending leave', async () => {
    const lp = new LeavesPage(salesPage);
    const row = lp.getRowByDate(dateCreate);
    await expect(lp.getCancelButton(row)).toBeVisible();
  });

  // ── GROUP 4: Create Leave with Reason ───────────────────────────────

  test('should create a leave request with date and reason', async () => {
    const lp = new LeavesPage(salesPage);
    await lp.goto();
    await lp.openRequestModal();
    await lp.fillRequestForm(dateWithReason, 'Personal appointment');
    await lp.submitRequest();

    await expect(lp.toast('Leave requested').first()).toBeVisible({ timeout: 10_000 });
    await salesPage.waitForTimeout(1500);
  });

  test('should display reason in the table row', async () => {
    const lp = new LeavesPage(salesPage);
    const row = lp.getRowByDate(dateWithReason);
    await expect(row).toBeVisible({ timeout: 5_000 });
    await expect(lp.getRowReason(row)).toHaveText('Personal appointment');
  });

  // ── GROUP 5: Cancel Leave ───────────────────────────────────────────

  test('should cancel a pending leave', async () => {
    const lp = new LeavesPage(salesPage);
    // Create via API to avoid toast collision
    await createLeave({ leaveDate: dateCancel }, salesToken);
    await lp.goto();

    const row = lp.getRowByDate(dateCancel);
    await expect(row).toBeVisible({ timeout: 5_000 });
    await lp.getCancelButton(row).click();

    await expect(lp.toast('Leave cancelled').first()).toBeVisible({ timeout: 5_000 });
    await salesPage.waitForTimeout(1000);
  });

  test('should remove cancelled leave from the table', async () => {
    const lp = new LeavesPage(salesPage);
    await expect(lp.getRowByDate(dateCancel)).not.toBeVisible({ timeout: 5_000 });
  });

  // ── GROUP 6: Cross-Role — Admin Approves as Paid ────────────────────

  test('should create a leave request for Paid approval', async () => {
    // Use API for speed and reliability
    await createLeave({ leaveDate: dateApprovePaid }, salesToken);
  });

  test('should show pending leave on admin approvals page', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await ap.goto();
    const row = ap.getRowByDate(dateApprovePaid);
    await expect(row).toBeVisible({ timeout: 10_000 });
  });

  test('should approve leave as Paid via admin', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByDate(dateApprovePaid);
    await ap.getPaidButton(row).click();
    await expect(ap.toast('Leave approved').first()).toBeVisible({ timeout: 5_000 });
    await adminPage.waitForTimeout(1000);
  });

  test('should show "Approved (Paid)" status on My Leaves', async () => {
    const lp = new LeavesPage(salesPage);
    await lp.goto();
    const row = lp.getRowByDate(dateApprovePaid);
    await expect(row).toBeVisible({ timeout: 5_000 });
    await expect(lp.getRowStatus(row)).toHaveText('Approved (Paid)');
  });

  test('should not show cancel button for approved leave', async () => {
    const lp = new LeavesPage(salesPage);
    const row = lp.getRowByDate(dateApprovePaid);
    await expect(lp.getCancelButton(row)).not.toBeVisible();
  });

  // ── GROUP 7: Cross-Role — Admin Approves as Unpaid ──────────────────

  test('should approve leave as Unpaid via admin', async () => {
    await createLeave({ leaveDate: dateApproveUnpaid }, salesToken);
    const ap = new LeaveApprovalsPage(adminPage);
    await ap.goto();
    const row = ap.getRowByDate(dateApproveUnpaid);
    await expect(row).toBeVisible({ timeout: 10_000 });
    await ap.getUnpaidButton(row).click();
    await expect(ap.toast('Leave approved').first()).toBeVisible({ timeout: 5_000 });
    await adminPage.waitForTimeout(1000);
  });

  test('should show "Approved (Unpaid)" status on My Leaves', async () => {
    const lp = new LeavesPage(salesPage);
    await lp.goto();
    const row = lp.getRowByDate(dateApproveUnpaid);
    await expect(row).toBeVisible({ timeout: 5_000 });
    await expect(lp.getRowStatus(row)).toHaveText('Approved (Unpaid)');
  });

  // ── GROUP 8: Cross-Role — Admin Rejects ─────────────────────────────

  test('should reject leave via admin with reason', async () => {
    await createLeave({ leaveDate: dateReject, reason: 'Vacation day' }, salesToken);
    const ap = new LeaveApprovalsPage(adminPage);
    await ap.goto();
    const row = ap.getRowByDate(dateReject);
    await expect(row).toBeVisible({ timeout: 10_000 });
    await ap.openRejectModal(row);
    await ap.fillRejectReason('This date conflicts with an important team meeting and deadline');
    await ap.submitReject();
    await expect(ap.toast('Leave rejected').first()).toBeVisible({ timeout: 5_000 });
    await adminPage.waitForTimeout(1000);
  });

  test('should show rejected status and rejection reason on My Leaves', async () => {
    const lp = new LeavesPage(salesPage);
    await lp.goto();
    const row = lp.getRowByDate(dateReject);
    await expect(row).toBeVisible({ timeout: 5_000 });
    await expect(lp.getRowStatus(row)).toHaveText('Rejected');
    await expect(lp.getRowRejectionReason(row)).toContainText('This date conflicts');
  });

  // ── GROUP 9: Table Structure ────────────────────────────────────────

  test('should display correct table column headers', async () => {
    const lp = new LeavesPage(salesPage);
    const headers = lp.tableHeaders();
    await expect(headers.nth(0)).toHaveText('Date');
    await expect(headers.nth(1)).toHaveText('Reason');
    await expect(headers.nth(2)).toHaveText('Status');
    await expect(headers.nth(3)).toHaveText('Rejection Reason');
  });

  test('should show dash when reason is empty', async () => {
    const lp = new LeavesPage(salesPage);
    const row = lp.getRowByDate(dateCreate);
    await expect(lp.getRowReason(row)).toHaveText('-');
  });

  // ── GROUP 10: Edge Cases ────────────────────────────────────────────

  test('should show error when creating leave with past date', async () => {
    const lp = new LeavesPage(salesPage);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pastDate = yesterday.toISOString().split('T')[0];

    await lp.goto();
    await lp.openRequestModal();
    await lp.fillRequestForm(pastDate);
    await lp.submitRequest();
    await expect(salesPage.getByText(/Failed|past|future/i).first()).toBeVisible({ timeout: 10_000 });
    await salesPage.keyboard.press('Escape');
  });

  test('should handle network error gracefully', async () => {
    const lp = new LeavesPage(salesPage);
    await salesPage.route('**/leaves', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: '{"message":"Internal Server Error"}',
        });
      }
      return route.continue();
    });

    await lp.goto();
    await lp.openRequestModal();
    await lp.fillRequestForm(futureDate(99));
    await lp.submitRequest();
    await expect(salesPage.getByText(/Failed|Error/i).first()).toBeVisible({ timeout: 10_000 });

    await salesPage.unroute('**/leaves');
    await salesPage.keyboard.press('Escape');
  });
});
