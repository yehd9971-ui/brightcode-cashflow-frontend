import { Locator, Page } from '@playwright/test';

export class PipelinePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly board: Locator;
  readonly mobile: Locator;
  readonly employeeFilter: Locator;
  readonly priorityFilter: Locator;
  readonly phoneSearch: Locator;
  readonly cards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1', { hasText: /CRM Pipeline/i });
    this.board = page.getByTestId('crm-pipeline-board');
    this.mobile = page.getByTestId('crm-pipeline-mobile');
    this.employeeFilter = page.getByTestId('pipeline-employee-filter');
    this.priorityFilter = page.getByTestId('pipeline-priority-filter');
    this.phoneSearch = page.getByTestId('pipeline-phone-search');
    this.cards = page.getByTestId('pipeline-lead-card');
  }

  async goto() {
    await this.page.goto('/crm/pipeline');
    await this.heading.waitFor({ timeout: 15_000 });
  }

  column(stage: string) {
    return this.page.getByTestId(`pipeline-stage-${stage}`);
  }

  actionColumn(testId: string) {
    return this.page.getByTestId(testId);
  }

  mobileTab(tabId: string) {
    return this.page.getByTestId(`pipeline-mobile-tab-${tabId}`);
  }

  leadCard(phone: string) {
    return this.page.locator(`[data-testid="pipeline-lead-card"][data-phone="${phone}"]`);
  }

  moveStage(phone: string) {
    return this.page.getByLabel(`Move stage ${phone}`);
  }

  stagePage(stage: string) {
    return this.page.getByTestId(`pipeline-stage-${stage}-page`);
  }

  nextStagePage(stage: string) {
    return this.page.getByTestId(`pipeline-stage-${stage}-next`);
  }

  preview() {
    return this.page.getByTestId('lead-detail-drawer');
  }
}
