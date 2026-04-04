import { Page, Locator } from '@playwright/test';

export class MyNumbersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addNumberBtn: Locator;
  readonly pullFromPoolBtn: Locator;
  readonly emptyState: Locator;
  readonly numberRows: Locator;

  // Add Number modal
  readonly modal: Locator;
  readonly phoneInput: Locator;
  readonly clientNameInput: Locator;
  readonly sourceInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1', { hasText: 'My Numbers' });
    this.addNumberBtn = page.getByRole('button', { name: /Add Number/ });
    this.pullFromPoolBtn = page.getByRole('button', { name: /Pull from Pool/ });
    this.emptyState = page.getByText('No assigned numbers. Pull from the pool to get started.');
    this.numberRows = page.locator('.divide-y > div');

    // Modal uses role="dialog" on a div, not <dialog>
    this.modal = page.locator('[role="dialog"]');
    this.phoneInput = page.getByPlaceholder('+201234567890');
    this.clientNameInput = this.modal.getByRole('textbox').nth(1);
    this.sourceInput = this.modal.getByRole('textbox').nth(2);
  }

  async goto() {
    await this.page.goto('/numbers');
    await this.heading.waitFor({ timeout: 15_000 });
  }

  async openAddModal() {
    await this.addNumberBtn.click();
    await this.phoneInput.waitFor({ timeout: 5_000 });
  }

  async fillAddForm(phone: string, clientName?: string, source?: string) {
    await this.phoneInput.fill(phone);
    if (clientName) await this.clientNameInput.fill(clientName);
    if (source) await this.sourceInput.fill(source);
  }

  async submitAdd() {
    await this.modal.getByRole('button', { name: 'Add' }).click();
  }

  async pullFromPool() {
    await this.pullFromPoolBtn.click();
  }

  toast(text: string) {
    return this.page.getByText(text);
  }
}
