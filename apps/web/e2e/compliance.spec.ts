import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('policies (admin)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/policies');
  });

  test('policies page shows the monthly quota and publish button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Company Policies' })).toBeVisible();
    await expect(page.getByText('Published this month')).toBeVisible();
    await expect(page.getByText(/^\d \/ 3$/)).toBeVisible();
    await expect(page.getByRole('button', { name: /publish policy/i })).toBeVisible();
  });

  test('publish modal offers content or link and closes', async ({ page }) => {
    await page.getByRole('button', { name: /publish policy/i }).click();
    await expect(page.getByRole('heading', { name: 'Publish a Policy' })).toBeVisible();
    await expect(page.getByRole('button', { name: /write it here/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /link to a document/i })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Publish a Policy' })).not.toBeVisible();
  });
});

test.describe('whistleblowing (owner-only)', () => {
  test('agency owner sees the confidential report inbox', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/whistleblowing');
    await expect(page.getByRole('heading', { name: 'Whistleblowing' })).toBeVisible();
    await expect(page.getByText('Confidential reports — visible only to you')).toBeVisible();
  });

  // Uses the manager session captured in global-setup (managers require MFA
  // too, and per-test UI logins would burn the rate-limit budget).
  test('manager is told the page is restricted to the owner', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/manager.json' });
    const page = await context.newPage();
    await page.goto('/whistleblowing');
    await expect(page.getByText('Restricted to the agency owner')).toBeVisible();
    await context.close();
  });
});
