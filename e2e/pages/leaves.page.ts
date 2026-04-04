import { Page, Locator } from '@playwright/test';

export class LeavesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly requestLeaveBtn: Locator;
  readonly table: Locator;
  readonly emptyStateTitle: Locator;
  readonly emptyStateDescription: Locator;
  readonly emptyStateAction: Locator;

  // Request Leave modal
  readonly modal: Locator;
  readonly dateInput: Locator;
  readonly reasonTextarea: Locator;
  readonly submitRequestBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1', { hasText: 'My Leaves' });
    this.requestLeaveBtn = page.getByRole('button', { name: /Request Leave/ });
    this.table = page.locator('table');
    this.emptyStateTitle = page.getByText('No leave requests');
    this.emptyStateDescription = page.getByText("You haven't requested any leaves yet.");
    this.emptyStateAction = page.getByRole('button', { name: 'Request Leave' });

    this.modal = page.locator('[role="dialog"]');
    this.dateInput = this.modal.locator('input[type="date"]');
    this.reasonTextarea = this.modal.locator('textarea');
    this.submitRequestBtn = this.modal.getByRole('button', { name: 'Submit Request' });
  }

  async goto() {
    await this.page.goto('/leaves');
    await this.heading.waitFor({ timeout: 15_000 });
  }

  async openRequestModal() {
    await this.requestLeaveBtn.first().click();
    await this.modal.waitFor({ timeout: 5_000 });
  }

  async fillRequestForm(date: string, reason?: string) {
    await this.dateInput.fill(date);
    if (reason) {
      await this.reasonTextarea.fill(reason);
    }
  }

  async submitRequest() {
    await this.submitRequestBtn.click();
  }

  tableRows() {
    return this.table.locator('tbody tr');
  }

  tableHeaders() {
    return this.table.locator('th');
  }

  getRowByDate(date: string) {
    return this.table.locator('tbody tr', { hasText: date });
  }

  getRowStatus(row: Locator) {
    // Status is in the 3rd td as a span badge
    return row.locator('td').nth(2).locator('span');
  }

  getRowReason(row: Locator) {
    return row.locator('td').nth(1);
  }

  getRowRejectionReason(row: Locator) {
    return row.locator('td').nth(3);
  }

  getCancelButton(row: Locator) {
    return row.locator('td').last().getByRole('button');
  }

  toast(text: string | RegExp) {
    return this.page.getByText(text);
  }
}
