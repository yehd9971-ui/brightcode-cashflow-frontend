import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;
  readonly eyeToggle: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitBtn = page.locator('button[type="submit"]');
    this.eyeToggle = page.locator('button[aria-label="Show password"], button[aria-label="Hide password"]');
    this.heading = page.locator('h1', { hasText: 'Cashflow Dashboard' });
  }

  async goto() {
    await this.page.goto('/login');
    await this.heading.waitFor();
  }

  async fill(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitBtn.click();
  }

  async login(email: string, password: string) {
    await this.fill(email, password);
    await this.submit();
  }

  errorAlert() {
    return this.page.locator('[role="alert"]');
  }

  getAlertText() {
    return this.page.locator('[role="alert"]');
  }
}
