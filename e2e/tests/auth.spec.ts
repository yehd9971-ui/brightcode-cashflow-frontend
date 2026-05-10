import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ADMIN } from '../helpers/test-data';
import { loginViaUI } from '../helpers/login.helper';

test.describe('Authentication', () => {
  test('should display login form with email and password fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitBtn).toHaveText('Sign In');
    await expect(loginPage.emailInput).toHaveAttribute('placeholder', 'you@example.com');
  });

  test('should show validation error when submitting with empty fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await page.evaluate(() => {
      document.querySelectorAll('input[required]').forEach((el) => el.removeAttribute('required'));
    });
    await loginPage.submit();
    await expect(page.getByText('Please enter both email and password')).toBeVisible({ timeout: 5_000 });
  });

  test('should toggle password visibility', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.passwordInput.fill('secret');
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    await loginPage.eyeToggle.click();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

    await loginPage.eyeToggle.click();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });

  test('should redirect to login when accessing protected route unauthenticated', async ({ page }) => {
    await page.goto('/crm/pipeline');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('nonexistent@test.com', 'WrongPassword123!');

    if (await page.getByText('Too many login attempts').isVisible({ timeout: 1_000 }).catch(() => false)) {
      await page.waitForTimeout(61_000);
      const dismissBtn = page.getByRole('button', { name: 'Dismiss' });
      if (await dismissBtn.isVisible().catch(() => false)) {
        await dismissBtn.click();
      }
      await loginPage.login('nonexistent@test.com', 'WrongPassword123!');
    }

    await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 5_000 });
  });

  test('should login successfully and persist session after reload', async ({ page }) => {
    await loginViaUI(page, ADMIN.email, ADMIN.password);
    await expect(page.getByText('Login successful!')).toBeVisible({ timeout: 5_000 });

    // Persist check: reload and verify still authenticated
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
  });
});
