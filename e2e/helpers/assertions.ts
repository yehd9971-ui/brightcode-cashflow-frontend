import { expect, Locator, Page } from '@playwright/test';

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByText(text)).toBeVisible({ timeout: 10_000 });
}

export async function expectTableRow(tableOrPage: Locator | Page, text: string | RegExp) {
  await expect(tableOrPage.getByText(text).first()).toBeVisible({ timeout: 10_000 });
}

export async function expectTimelineEvent(page: Page, text: string | RegExp) {
  const timeline = page.getByText(/timeline|activity|history/i).first().locator('..');
  await expect(timeline.getByText(text).first()).toBeVisible({ timeout: 10_000 });
}

export async function captureFailureScreenshot(page: Page, name: string) {
  return page.screenshot({
    path: `test-results/${name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}.png`,
    fullPage: true,
  });
}
