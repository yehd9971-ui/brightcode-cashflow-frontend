import { Page, Locator } from '@playwright/test';

export class LeaveApprovalsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly table: Locator;
  readonly emptyStateTitle: Locator;
  readonly emptyStateDescription: Locator;
  readonly forbiddenHeading: Locator;
  readonly forbiddenMessage: Locator;

  // Reject modal
  readonly rejectModal: Locator;
  readonly rejectReasonTextarea: Locator;
  readonly rejectModalCancelBtn: Locator;
  readonly rejectModalRejectBtn: Locator;
  readonly rejectErrorMessage: Locator;
  readonly charCounter: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1', { hasText: 'Leave Approvals' });
    this.subtitle = page.getByText('Review and process pending leave requests');
    this.table = page.locator('table');
    this.emptyStateTitle = page.getByText('No pending leaves');
    this.emptyStateDescription = page.getByText('All leave requests have been processed.');
    this.forbiddenHeading = page.locator('h1', { hasText: '403' });
    this.forbiddenMessage = page.getByText("You don't have permission");

    this.rejectModal = page.locator('[role="dialog"]');
    this.rejectReasonTextarea = this.rejectModal.locator('textarea');
    this.rejectModalCancelBtn = this.rejectModal.getByRole('button', { name: 'Cancel' });
    this.rejectModalRejectBtn = this.rejectModal.getByRole('button', { name: 'Reject' });
    this.rejectErrorMessage = this.rejectModal.getByText('Reason must be at least 10 characters');
    this.charCounter = this.rejectModal.locator('text=/\\d+\\/500/');
  }

  async goto() {
    await this.page.goto('/leaves/approvals');
    // Wait for either the heading (authorized) or forbidden (unauthorized)
    await Promise.race([
      this.heading.waitFor({ timeout: 15_000 }),
      this.forbiddenHeading.waitFor({ timeout: 15_000 }),
    ]);
  }

  tableRows() {
    return this.table.locator('tbody tr');
  }

  tableHeaders() {
    return this.table.locator('th');
  }

  getRowByEmail(email: string) {
    return this.table.locator('tbody tr', { hasText: email });
  }

  getRowByDate(date: string) {
    return this.table.locator('tbody tr', { hasText: date });
  }

  getPaidButton(row: Locator) {
    return row.getByRole('button', { name: 'Paid', exact: true });
  }

  getUnpaidButton(row: Locator) {
    return row.getByRole('button', { name: 'Unpaid', exact: true });
  }

  getRejectButton(row: Locator) {
    return row.getByRole('button', { name: 'Reject', exact: true });
  }

  async openRejectModal(row: Locator) {
    await this.getRejectButton(row).click();
    await this.rejectModal.waitFor({ timeout: 5_000 });
  }

  async fillRejectReason(reason: string) {
    await this.rejectReasonTextarea.fill(reason);
  }

  async submitReject() {
    await this.rejectModalRejectBtn.click();
  }

  async cancelReject() {
    await this.rejectModalCancelBtn.click();
  }

  toast(text: string | RegExp) {
    return this.page.getByText(text);
  }
}
