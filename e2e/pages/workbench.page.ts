import { Locator, Page } from '@playwright/test';

export class WorkbenchPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addNumberBtn: Locator;
  readonly pullFromPoolBtn: Locator;
  readonly workbenchTab: Locator;
  readonly assignedTab: Locator;
  readonly employeeFilter: Locator;
  readonly stageFilter: Locator;
  readonly priorityFilter: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1', { hasText: /My Numbers|Workbench/i });
    this.addNumberBtn = page.getByRole('button', { name: /Add Number|Create Task/i });
    this.pullFromPoolBtn = page.getByRole('button', { name: /Pull from Pool/i });
    this.workbenchTab = page.getByRole('button', { name: /Workbench/i });
    this.assignedTab = page.getByRole('button', { name: /Assigned Numbers/i });
    this.employeeFilter = page.getByLabel('Employee filter');
    this.stageFilter = page.getByLabel('Stage filter');
    this.priorityFilter = page.getByLabel('Priority filter');
  }

  async goto() {
    await this.page.goto('/numbers');
    await this.heading.waitFor({ timeout: 15_000 });
  }

  bucket(label: string) {
    return this.page.getByText(label, { exact: false }).first();
  }

  section(testId: string) {
    return this.page.getByTestId(testId);
  }

  rowByPhone(phone: string) {
    return this.page
      .getByText(phone)
      .first()
      .locator('xpath=ancestor::*[@data-testid="workbench-task-row" or @data-testid="workbench-lead-row"][1]');
  }
}
