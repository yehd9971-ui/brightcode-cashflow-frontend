import { Browser, BrowserContext, expect, Page } from '@playwright/test';
import { login } from './api-client';
import { loginViaUI } from './login.helper';
import { TEST_ACCOUNTS, TestRole } from './test-data';

const apiSessions = new Map<TestRole, Awaited<ReturnType<typeof login>>>();
const apiSessionTimes = new Map<TestRole, number>();
const API_SESSION_TTL_MS = 2 * 60 * 1000;

export function accountFor(role: TestRole) {
  return TEST_ACCOUNTS[role];
}

export async function loginByRole(page: Page, role: TestRole) {
  const account = accountFor(role);
  await loginViaUI(page, account.email, account.password);
  await expect(page.getByText(account.email)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(role)).toBeVisible({ timeout: 10_000 });
}

export async function loginApiByRole(role: TestRole) {
  const cached = apiSessions.get(role);
  const cachedAt = apiSessionTimes.get(role) ?? 0;
  if (cached && Date.now() - cachedAt < API_SESSION_TTL_MS) return cached;

  const account = accountFor(role);
  try {
    const session = await login(account.email, account.password);
    apiSessions.set(role, session);
    apiSessionTimes.set(role, Date.now());
    return session;
  } catch (error) {
    if (!String(error).includes('429')) throw error;
    await new Promise((resolve) => setTimeout(resolve, 65_000));
    const session = await login(account.email, account.password);
    apiSessions.set(role, session);
    apiSessionTimes.set(role, Date.now());
    return session;
  }
}

export async function newContextForRole(browser: Browser, role: TestRole) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginByRole(page, role);
  return { context, page };
}

export async function closeContexts(contexts: Array<BrowserContext | undefined>) {
  await Promise.all(contexts.map((context) => context?.close().catch(() => undefined)));
}
