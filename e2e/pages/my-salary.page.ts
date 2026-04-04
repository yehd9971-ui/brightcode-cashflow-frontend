import { Page, Locator } from '@playwright/test';

export class MySalaryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly monthSelect: Locator;
  readonly yearSelect: Locator;

  // SM-only tabs
  readonly mySalaryTab: Locator;
  readonly teamSalaryTab: Locator;

  // Daily breakdown table
  readonly dailyTable: Locator;

  // Team table (SM only, shares <table> element when team tab active)
  readonly teamTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1', { hasText: 'My Salary' });
    this.monthSelect = page.getByRole('combobox').first();
    this.yearSelect = page.getByRole('combobox').nth(1);

    this.mySalaryTab = page.getByRole('button', { name: 'My Salary', exact: true });
    this.teamSalaryTab = page.getByRole('button', { name: /Team Salary/ });

    this.dailyTable = page.locator('table');
    this.teamTable = page.locator('table');
  }

  async goto() {
    await this.page.goto('/salary');
    await this.heading.waitFor({ timeout: 15_000 });
  }

  async selectMonthYear(month: number, year: number) {
    await this.monthSelect.selectOption(String(month));
    await this.yearSelect.selectOption(String(year));
    await this.page.waitForTimeout(1500);
  }

  /** Get the displayed value of a StatCard by its title (e.g. "Base Salary") */
  getStatCardValue(title: string) {
    // StatCard renders: <p class="text-sm text-gray-500">{title}</p> <p class="text-2xl...">{value}</p>
    // Navigate from the title text to the parent card, then find the large value text
    return this.page.locator(`text=${title}`).locator('..').locator('p.text-2xl, p.text-xl').first();
  }

  /** Get a value from the Monthly Summary section by its label */
  getSummaryValue(label: string) {
    return this.page.locator(`text=${label}`).locator('..').locator('p.text-lg, p.text-2xl').first();
  }

  dailyRows() {
    return this.dailyTable.locator('tbody tr');
  }

  dailyHeaders() {
    return this.dailyTable.locator('th');
  }

  getRowByDate(date: string) {
    return this.dailyTable.locator('tbody tr', { hasText: date });
  }

  getRowStatus(row: Locator) {
    return row.locator('td').nth(1).locator('span');
  }

  getRowDayPercentage(row: Locator) {
    return row.locator('td').nth(3);
  }

  // Team table helpers
  teamRows() {
    return this.teamTable.locator('tbody tr');
  }

  teamHeaders() {
    return this.teamTable.locator('th');
  }

  getTeamRowByEmail(email: string) {
    return this.teamTable.locator('tbody tr', { hasText: email });
  }

  toast(text: string | RegExp) {
    return this.page.getByText(text);
  }
}
