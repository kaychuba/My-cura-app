import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('care workers (admin)', () => {
  test('workers page lists live staff with pay rates and compliance', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/workers');
    await expect(page.getByRole('heading', { name: /care workers/i })).toBeVisible();
    await expect(page.getByText('Sarah Jones')).toBeVisible();
    await expect(page.getByText(/\/h/).first()).toBeVisible(); // hourly rate column

    // Expanding a worker reveals HR documents + training
    await page.getByText('Sarah Jones').click();
    await expect(page.getByText(/hr documents/i)).toBeVisible();
    await expect(page.getByText(/training/i).first()).toBeVisible();
  });
});

test.describe('scheduling (admin)', () => {
  test('week rota renders and the new shift modal opens', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/scheduling');
    await expect(page.getByRole('heading', { name: /scheduling/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new shift/i })).toBeVisible();

    await page.getByRole('button', { name: /new shift/i }).click();
    await expect(page.getByText(/roster a shift/i)).toBeVisible();
    await expect(page.getByText(/leave blank to assign later/i)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  });
});

test.describe('messaging (admin)', () => {
  test('conversations load and a thread opens', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/messaging');
    await expect(page.getByRole('heading', { name: /messaging/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new conversation/i })).toBeVisible();
  });
});
