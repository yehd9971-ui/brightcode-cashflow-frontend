import { Page, BrowserContext, Browser } from '@playwright/test';

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('h1', { hasText: 'Cashflow Dashboard' }).waitFor({ timeout: 10_000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Handle rate limiting: if we hit 429, wait and retry
  const rateLimited = page.getByText('Too many login attempts');
  const navigated = page.waitForURL(/^(?!.*\/login)/, { timeout: 5_000 }).catch(() => null);

  const result = await Promise.race([
    navigated.then(() => 'ok'),
    rateLimited.waitFor({ timeout: 3_000 }).then(() => 'rate-limited').catch(() => null),
  ]);

  if (result === 'rate-limited') {
    console.log(`[login] Rate limited for ${email}, waiting 61s...`);
    await page.waitForTimeout(61_000);
    // Dismiss any alerts and retry
    const dismissBtn = page.getByRole('button', { name: 'Dismiss' });
    if (await dismissBtn.isVisible().catch(() => false)) {
      await dismissBtn.click();
    }
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 15_000 });
  } else if (result !== 'ok') {
    // Neither navigated nor rate-limited within 5s, wait more for navigation
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 15_000 });
  }

  await page.waitForTimeout(500);
}
