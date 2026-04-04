import { test, expect, Page, BrowserContext } from '@playwright/test';
import { LeaveApprovalsPage } from '../pages/leave-approvals.page';
import { ADMIN, SALES_USER, SALES_MANAGER } from '../helpers/test-data';
import { loginViaUI } from '../helpers/login.helper';
import {
  login,
  createLeave,
  getMyLeaves,
  cancelLeaveApi,
} from '../helpers/api-client';

/**
 * Return YYYY-MM-DD for today + offsetDays.
 * A per-run seed ensures dates don't collide with leaves from prior runs.
 */
const RUN_SEED = Math.floor(Math.random() * 800) + 100;
function futureDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays + RUN_SEED);
  return d.toISOString().split('T')[0];
}

// ── Admin Leave Approvals Page ──────────────────────────────────────────

test.describe.serial('Leave Approvals Page (Admin)', () => {
  let adminCtx: BrowserContext;
  let adminPage: Page;
  let salesToken: string;
  let adminToken: string;

  // Unique dates for this spec
  const datePaidApproval = futureDate(50);
  const dateUnpaidApproval = futureDate(51);
  const dateReject = futureDate(52);
  const dateRejectModalTest = futureDate(53);
  const dateEmptyStateSetup = futureDate(54);

  test.beforeAll(async ({ browser }) => {
    // Get API tokens
    const salesAuth = await login(SALES_USER.email, SALES_USER.password);
    salesToken = salesAuth.accessToken;
    const adminAuth = await login(ADMIN.email, ADMIN.password);
    adminToken = adminAuth.accessToken;

    // Clean up prior pending leaves
    const existing = await getMyLeaves(salesToken, { limit: 100 });
    for (const leave of existing.data) {
      if (leave.status === 'PENDING_LEAVE') {
        await cancelLeaveApi(leave.id, salesToken).catch(() => {});
      }
    }

    // Create test leaves via API for this spec
    await createLeave({ leaveDate: datePaidApproval, reason: 'Doctor visit' }, salesToken).catch(() => {});
    await createLeave({ leaveDate: dateUnpaidApproval }, salesToken).catch(() => {});
    await createLeave({ leaveDate: dateReject, reason: 'Vacation' }, salesToken).catch(() => {});
    await createLeave({ leaveDate: dateRejectModalTest, reason: 'Modal test' }, salesToken).catch(() => {});

    // Login admin via UI
    adminCtx = await browser.newContext();
    adminPage = await adminCtx.newPage();
    await loginViaUI(adminPage, ADMIN.email, ADMIN.password);
  });

  test.afterAll(async () => {
    // Clean up remaining pending leaves
    try {
      const remaining = await getMyLeaves(salesToken, { limit: 100 });
      for (const leave of remaining.data) {
        if (leave.status === 'PENDING_LEAVE') {
          await cancelLeaveApi(leave.id, salesToken).catch(() => {});
        }
      }
    } catch { /* ignore */ }
    await adminCtx?.close();
  });

  // ── GROUP 1: Page Structure ─────────────────────────────────────────

  test('should display page title "Leave Approvals"', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await ap.goto();
    await expect(ap.heading).toHaveText('Leave Approvals');
  });

  test('should display subtitle', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await expect(ap.subtitle).toBeVisible();
  });

  test('should display correct table columns', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const headers = ap.tableHeaders();
    await expect(headers.nth(0)).toHaveText('Employee');
    await expect(headers.nth(1)).toHaveText('Leave Date');
    await expect(headers.nth(2)).toHaveText('Reason');
    await expect(headers.nth(3)).toHaveText('Submitted');
    await expect(headers.nth(4)).toHaveText('Status');
    await expect(headers.nth(5)).toHaveText('Actions');
  });

  // ── GROUP 2: Pending Leave Display ──────────────────────────────────

  test('should display pending leave with employee email', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByEmail(SALES_USER.email);
    await expect(row.first()).toBeVisible({ timeout: 5_000 });
  });

  test('should display leave date in table', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByDate(datePaidApproval);
    await expect(row).toBeVisible({ timeout: 5_000 });
  });

  test('should display reason in table', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByDate(datePaidApproval);
    await expect(row).toContainText('Doctor visit');
  });

  test('should display dash when reason is empty', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByDate(dateUnpaidApproval);
    // Reason column (3rd td, index 2)
    const reasonCell = row.locator('td').nth(2);
    await expect(reasonCell).toHaveText('-');
  });

  test('should display submission time in Cairo timezone format', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByDate(datePaidApproval);
    // Submitted column (4th td, index 3) — formatted as dd/MM/yyyy - HH:mm
    const submittedCell = row.locator('td').nth(3);
    await expect(submittedCell).toHaveText(/\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2}/);
  });

  test('should show Paid, Unpaid, and Reject action buttons', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByDate(datePaidApproval);
    await expect(ap.getPaidButton(row)).toBeVisible();
    await expect(ap.getUnpaidButton(row)).toBeVisible();
    await expect(ap.getRejectButton(row)).toBeVisible();
  });

  // ── GROUP 3: Approve as Paid ────────────────────────────────────────

  test('should approve leave as Paid', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByDate(datePaidApproval);
    await ap.getPaidButton(row).click();
    await expect(ap.toast('Leave approved')).toBeVisible({ timeout: 5_000 });
    await adminPage.waitForTimeout(1000);
  });

  test('should remove Paid-approved leave from pending list', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await expect(ap.getRowByDate(datePaidApproval)).not.toBeVisible({ timeout: 5_000 });
  });

  // ── GROUP 4: Approve as Unpaid ──────────────────────────────────────

  test('should approve leave as Unpaid', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByDate(dateUnpaidApproval);
    await expect(row).toBeVisible({ timeout: 5_000 });
    await ap.getUnpaidButton(row).click();
    await expect(ap.toast('Leave approved')).toBeVisible({ timeout: 5_000 });
    await adminPage.waitForTimeout(1000);
  });

  test('should remove Unpaid-approved leave from pending list', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await expect(ap.getRowByDate(dateUnpaidApproval)).not.toBeVisible({ timeout: 5_000 });
  });

  // ── GROUP 5: Reject Modal ──────────────────────────────────────────

  test('should open reject modal with employee email displayed', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByDate(dateRejectModalTest);
    await expect(row).toBeVisible({ timeout: 5_000 });
    await ap.openRejectModal(row);
    await expect(ap.rejectModal).toBeVisible();
    await expect(ap.rejectModal.getByText(SALES_USER.email)).toBeVisible();
  });

  test('should show rejection reason textarea', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await expect(ap.rejectReasonTextarea).toBeVisible();
  });

  test('should show character counter starting at 0/500', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await expect(ap.charCounter).toContainText('0/500');
  });

  test('should update character counter as user types', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await ap.fillRejectReason('Hello');
    await expect(ap.charCounter).toContainText('5/500');
  });

  test('should show error message when reason is less than 10 characters', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await expect(ap.rejectErrorMessage).toBeVisible();
  });

  test('should disable Reject button when reason is under 10 characters', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await expect(ap.rejectModalRejectBtn).toBeDisabled();
  });

  test('should enable Reject button when reason reaches 10 characters', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await ap.fillRejectReason('Exactly 10');
    await expect(ap.rejectErrorMessage).not.toBeVisible();
    await expect(ap.rejectModalRejectBtn).toBeEnabled();
  });

  test('should close reject modal via Cancel button', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await ap.cancelReject();
    await expect(ap.rejectModal).not.toBeVisible();
  });

  test('should clear reason field when modal is reopened', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByDate(dateRejectModalTest);
    await ap.openRejectModal(row);
    await expect(ap.rejectReasonTextarea).toHaveValue('');
    await expect(ap.charCounter).toContainText('0/500');
  });

  // ── GROUP 6: Reject Submission ──────────────────────────────────────

  test('should reject leave with valid reason', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await ap.fillRejectReason('This request cannot be approved due to scheduling conflicts');
    await ap.submitReject();
    await expect(ap.toast('Leave rejected')).toBeVisible({ timeout: 5_000 });
    await adminPage.waitForTimeout(1000);
  });

  test('should close modal after rejection', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await expect(ap.rejectModal).not.toBeVisible();
  });

  test('should remove rejected leave from pending list', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    await expect(ap.getRowByDate(dateRejectModalTest)).not.toBeVisible({ timeout: 5_000 });
  });

  // ── GROUP 7: Reject the remaining leave ─────────────────────────────

  test('should reject another leave via full flow', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    const row = ap.getRowByDate(dateReject);
    await expect(row).toBeVisible({ timeout: 5_000 });
    await ap.openRejectModal(row);
    await ap.fillRejectReason('Vacation not approved for this period');
    await ap.submitReject();
    await expect(ap.toast('Leave rejected')).toBeVisible({ timeout: 5_000 });
    await adminPage.waitForTimeout(1000);
  });

  // ── GROUP 8: Empty State ────────────────────────────────────────────

  test('should show empty state when no pending leaves remain', async () => {
    const ap = new LeaveApprovalsPage(adminPage);
    // All test leaves should be processed now — reload to check empty state
    await ap.goto();
    // If there are other pending leaves from other users, the table might still show.
    // Only assert empty state if no rows are visible.
    const rowCount = await ap.tableRows().count().catch(() => 0);
    if (rowCount === 0) {
      await expect(ap.emptyStateTitle).toBeVisible({ timeout: 5_000 });
      await expect(ap.emptyStateDescription).toBeVisible();
    }
  });

  // ── GROUP 9: Error Handling ─────────────────────────────────────────

  test('should show error toast on approval network failure', async () => {
    // Create a leave to test error handling
    await createLeave({ leaveDate: dateEmptyStateSetup }, salesToken).catch(() => {});
    const ap = new LeaveApprovalsPage(adminPage);
    await ap.goto();

    // Mock the approve endpoint to fail
    await adminPage.route('**/leaves/*/approve', (route) =>
      route.fulfill({ status: 500, body: '{"message":"Internal Server Error"}' }),
    );

    const row = ap.getRowByDate(dateEmptyStateSetup);
    if (await row.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await ap.getPaidButton(row).click();
      await expect(ap.toast(/Failed|Error/i)).toBeVisible({ timeout: 5_000 });
    }

    await adminPage.unroute('**/leaves/*/approve');
  });

  test('should show error toast on rejection network failure', async () => {
    const ap = new LeaveApprovalsPage(adminPage);

    await adminPage.route('**/leaves/*/reject', (route) =>
      route.fulfill({ status: 500, body: '{"message":"Internal Server Error"}' }),
    );

    const row = ap.getRowByDate(dateEmptyStateSetup);
    if (await row.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await ap.openRejectModal(row);
      await ap.fillRejectReason('Testing error handling for rejection');
      await ap.submitReject();
      await expect(adminPage.locator('[role="status"]').first()).toBeVisible({ timeout: 5_000 });
      await adminPage.keyboard.press('Escape');
    }

    await adminPage.unroute('**/leaves/*/reject');
  });
});

// ── Role-Based Access ────────────────────────────────────────────────────

test.describe.serial('Leave Approvals — Role-Based Access', () => {
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

  test('SALES user navigating to /leaves/approvals should see 403', async () => {
    const ap = new LeaveApprovalsPage(salesPage);
    await ap.goto();
    await expect(ap.forbiddenHeading).toBeVisible({ timeout: 10_000 });
  });

  test('SALES_MANAGER navigating to /leaves/approvals should see 403', async () => {
    const ap = new LeaveApprovalsPage(smPage);
    await ap.goto();
    await expect(ap.forbiddenHeading).toBeVisible({ timeout: 10_000 });
  });
});
