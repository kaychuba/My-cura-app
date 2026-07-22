import { test, expect } from '@playwright/test';
import { login, loginAsAdmin, LOGGED_OUT, WORKER } from './helpers';

// These tests exercise the real login UI, so they start logged out.
test.use({ storageState: LOGGED_OUT });

test.describe('authentication & portal access', () => {
  test('agency owner can log in and reach the dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ada');
  });

  test('wrong password stays on the login page', async ({ page }) => {
    await login(page, { email: 'admin@demo-care.local', password: 'WrongPassword1!' });
    await expect(page).toHaveURL(/\/login/);
  });

  test('care worker is denied access to the admin portal', async ({ page }) => {
    await login(page, WORKER);
    await expect(page.getByTestId('portal-denied')).toBeVisible();
    // No admin chrome should be reachable
    await page.goto('/payroll');
    await expect(page.getByTestId('portal-denied')).toBeVisible();
  });

  test('unauthenticated visitor is redirected to login', async ({ page }) => {
    await page.goto('/payroll');
    await expect(page).toHaveURL(/\/login/);
  });
});
