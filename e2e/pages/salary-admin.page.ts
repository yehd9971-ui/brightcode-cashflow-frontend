import { Page, Locator } from '@playwright/test';

export class SalaryAdminPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly monthSelect: Locator;
  readonly yearSelect: Locator;
  readonly addDeductionBtn: Locator;

  // All Employees table
  readonly employeesTable: Locator;

  // Employee Detail table (appears when View is clicked)
  readonly detailTable: Locator;

  // Modal (shared locator — only one open at a time)
  readonly modal: Locator;

  // Deduction modal fields
  readonly employeeSelect: Locator;
  readonly amountInput: Locator;
  readonly dateInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly addDeductionSubmitBtn: Locator;

  // Override modal fields
  readonly dayPercentageInput: Locator;
  readonly adminNotesTextarea: Locator;
  readonly overrideSubmitBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1', { hasText: 'Salary Management' });
    this.monthSelect = page.getByRole('combobox').first();
    this.yearSelect = page.getByRole('combobox').nth(1);
    this.addDeductionBtn = page.getByRole('button', { name: 'Add Deduction' });

    this.employeesTable = page.locator('table').first();
    this.detailTable = page.locator('table').nth(1);

    this.modal = page.locator('[role="dialog"]');

    // Deduction modal fields (labels are generic divs, not <label for>)
    this.employeeSelect = this.modal.getByRole('combobox');
    this.amountInput = this.modal.getByRole('spinbutton');
    this.dateInput = this.modal.getByRole('textbox').first();
    this.descriptionTextarea = this.modal.getByRole('textbox').nth(1);
    this.addDeductionSubmitBtn = this.modal.getByRole('button', { name: 'Add Deduction' });

    // Override modal fields
    this.dayPercentageInput = this.modal.getByRole('spinbutton');
    this.adminNotesTextarea = this.modal.getByRole('textbox');
    this.overrideSubmitBtn = this.modal.getByRole('button', { name: 'Override' });
  }

  async goto() {
    await this.page.goto('/salary/admin');
    await this.heading.waitFor({ timeout: 15_000 });
  }

  async selectMonthYear(month: number, year: number) {
    await this.monthSelect.selectOption(String(month));
    await this.yearSelect.selectOption(String(year));
    await this.page.waitForTimeout(1500);
  }

  employeeRows() {
    return this.employeesTable.locator('tbody tr');
  }

  employeeHeaders() {
    return this.employeesTable.locator('th');
  }

  getEmployeeRowByEmail(email: string) {
    return this.employeesTable.locator('tbody tr', { hasText: email });
  }

  getEmployeeNet(row: Locator) {
    return row.locator('td').nth(5);
  }

  getEmployeeDeductions(row: Locator) {
    return row.locator('td').nth(3);
  }

  getEmployeeDays(row: Locator) {
    return row.locator('td').nth(6);
  }

  async clickViewEmployee(row: Locator) {
    await row.getByRole('button', { name: 'View' }).click();
    await this.page.waitForTimeout(1000);
  }

  // Detail table helpers
  detailRows() {
    return this.detailTable.locator('tbody tr');
  }

  detailHeaders() {
    return this.detailTable.locator('th');
  }

  getDetailRowByDate(date: string) {
    return this.detailTable.locator('tbody tr', { hasText: date });
  }

  getDetailDayPercentage(row: Locator) {
    return row.locator('td').nth(3);
  }

  // Deduction modal
  async openDeductionModal() {
    await this.addDeductionBtn.click();
    await this.modal.waitFor({ timeout: 5_000 });
  }

  async fillDeductionForm(userId: string, amount: string, date: string, description: string) {
    await this.employeeSelect.selectOption(userId);
    await this.amountInput.fill(amount);
    await this.dateInput.fill(date);
    await this.descriptionTextarea.fill(description);
  }

  async submitDeduction() {
    await this.addDeductionSubmitBtn.click();
  }

  // Override modal
  async clickOverride(row: Locator) {
    await row.getByRole('button', { name: 'Override' }).click();
    await this.modal.waitFor({ timeout: 5_000 });
  }

  async fillOverrideForm(percentage: string, notes: string) {
    await this.dayPercentageInput.fill(percentage);
    if (notes) {
      await this.adminNotesTextarea.fill(notes);
    }
  }

  async submitOverride() {
    await this.overrideSubmitBtn.click();
  }

  toast(text: string | RegExp) {
    return this.page.getByText(text);
  }
}
