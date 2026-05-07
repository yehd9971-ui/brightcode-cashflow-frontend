import { expect, Page } from '@playwright/test';
import { API_BASE, APP_BASE, LOCAL_ONLY_HOSTS } from './test-data';

function assertLocalUrl(url: string, label: string) {
  const parsed = new URL(url);
  if (!LOCAL_ONLY_HOSTS.includes(parsed.hostname)) {
    throw new Error(`${label} must target localhost only. Received: ${url}`);
  }
}

async function waitForHttp(url: string, label: string, timeoutMs = 30_000) {
  assertLocalUrl(url, label);
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
      lastError = new Error(`${label} returned ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`${label} is not ready at ${url}. Last error: ${String(lastError)}`);
}

export async function assertLocalApiReady() {
  await waitForHttp(`${API_BASE}/health`, 'Local API', 30_000).catch(async () => {
    await waitForHttp(`${API_BASE}/auth/refresh`, 'Local API fallback', 30_000);
  });
}

export async function assertLocalAppReady(page: Page) {
  assertLocalUrl(APP_BASE, 'Local Next app');
  await page.goto('/');
  await expect(page).toHaveURL(/localhost:3001|127\.0\.0\.1:3001|\/login/);
}

export function assertLocalPlaywrightTargets() {
  assertLocalUrl(API_BASE, 'PLAYWRIGHT_API_BASE');
  assertLocalUrl(APP_BASE, 'PLAYWRIGHT_APP_BASE');
}
