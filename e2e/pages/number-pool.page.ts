import { Page, Locator } from '@playwright/test';

export class NumberPoolPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly bulkImportBtn: Locator;
  readonly importTextarea: Locator;
  readonly importSubmitBtn: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1', { hasText: 'Number Pool' });
    this.bulkImportBtn = page.getByRole('button', { name: /Bulk Import/ });
    this.importTextarea = page.locator('textarea');
    this.importSubmitBtn = page.getByRole('button', { name: 'Import', exact: true });
    this.table = page.locator('table');
  }

  async goto() {
    await this.page.goto('/numbers/pool');
    await this.heading.waitFor({ timeout: 15_000 });
  }

  statCard(title: string) {
    return this.page.locator(`text=${title}`).locator('..');
  }

  statValue(title: string) {
    return this.page.locator(`text=${title}`).locator('..').locator('p, span, div').first();
  }

  tab(label: string) {
    return this.page.getByRole('button', { name: label, exact: true });
  }

  tableHeaders() {
    return this.table.locator('th');
  }

  tableRows() {
    return this.table.locator('tbody tr');
  }

  rowReturnBtn(rowIndex: number) {
    return this.tableRows().nth(rowIndex).getByRole('button', { name: 'Return' });
  }

  rowApproveBtn(rowIndex: number) {
    return this.tableRows().nth(rowIndex).getByRole('button', { name: 'Approve Attempt' });
  }

  toast(text: string) {
    return this.page.getByText(text);
  }
}
