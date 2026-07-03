import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('payroll (admin)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/payroll');
  });

  test('payroll page renders with stats and run button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Payroll', exact: true })).toBeVisible();
    await expect(page.getByText('Total Gross (all runs)')).toBeVisible();
    await expect(page.getByRole('button', { name: /run payroll/i })).toBeVisible();
  });

  test('run payroll modal opens with period fields and closes', async ({ page }) => {
    await page.getByRole('button', { name: /run payroll/i }).click();
    await expect(page.getByRole('heading', { name: 'Run Payroll' })).toBeVisible();
    await expect(page.getByText('Period Start', { exact: true })).toBeVisible();
    await expect(page.getByText('Pay Date', { exact: true })).toBeVisible();
    // Start Run must be disabled until dates are chosen
    await expect(page.getByRole('button', { name: /start run/i })).toBeDisabled();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Run Payroll' })).not.toBeVisible();
  });
});
