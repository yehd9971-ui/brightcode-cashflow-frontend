import { Locator, Page } from '@playwright/test';

export class LeadDetailPage {
  readonly page: Page;
  readonly container: Locator;
  readonly drawer: Locator;
  readonly closeButton: Locator;
  readonly stageSelect: Locator;
  readonly nextTask: Locator;
  readonly recentCall: Locator;
  readonly timeline: Locator;
  readonly createTaskButton: Locator;
  readonly markLostButton: Locator;
  readonly markSoldButton: Locator;
  readonly callButton: Locator;
  readonly deleteButton: Locator;
  readonly notes: Locator;

  constructor(page: Page) {
    this.page = page;
    this.drawer = page.getByTestId('lead-detail-drawer');
    this.container = this.drawer;
    this.closeButton = page.getByTestId('lead-detail-close');
    this.stageSelect = page.getByTestId('lead-detail-stage-select');
    this.nextTask = page.getByTestId('lead-detail-next-task');
    this.recentCall = page.getByTestId('lead-detail-recent-call');
    this.timeline = page.getByTestId('lead-detail-timeline');
    this.createTaskButton = page.getByTestId('lead-detail-create-task');
    this.markLostButton = page.getByTestId('lead-detail-mark-lost');
    this.markSoldButton = page.getByTestId('lead-detail-mark-sold');
    this.callButton = page.getByTestId('lead-detail-call');
    this.deleteButton = page.getByTestId('lead-detail-delete');
    this.notes = page.getByTestId('lead-detail-notes');
  }

  async openDirect(leadId: string) {
    await this.page.goto(`/crm/pipeline?leadId=${leadId}`);
    await this.drawer.waitFor({ timeout: 15_000 });
  }

  async openFromPhone(phone: string) {
    await this.page.getByText(phone).first().click();
    await this.drawer.waitFor({ timeout: 15_000 });
  }

  action(name: string | RegExp) {
    return this.drawer.getByRole('button', { name });
  }

  timelineEvent(text: string | RegExp) {
    return this.timeline.getByText(text).first();
  }

  timelineItems() {
    return this.page.getByTestId('lead-detail-timeline-item');
  }
}
