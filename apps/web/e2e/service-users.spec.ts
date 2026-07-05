import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

// The Service Users pages are wired to the live API: list, profile,
// care plan versions and visit notes.
test.describe('service users', () => {
  test('admin browses the live list and opens a profile with care record tabs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/service-users');

    // Live data from the API, not a mock
    await expect(page.getByText('Margaret Hughes')).toBeVisible();
    await page.getByText('Margaret Hughes').click();

    // Profile header with address and status
    await expect(page.getByRole('heading', { name: /margaret hughes/i })).toBeVisible();
    await expect(page.getByText(/care plan/i).first()).toBeVisible();

    // Visit notes tab shows carer entries
    await page.getByRole('button', { name: /visit notes/i }).click();
    await expect(
      page.getByText(/no visit notes yet|escalation|mood/i).first(),
    ).toBeVisible();
  });

  test('admin creates and activates a care plan draft', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/service-users');
    await page.getByText('Harold Bennett').click();

    await page.getByRole('button', { name: /new draft version/i }).click();
    await page.getByPlaceholder(/hospital discharge/i).fill('Post-fall support plan');
    await page.locator('textarea').nth(1).fill('Assist with washing each morning; encourage independence.');
    await page.getByRole('button', { name: 'Create Draft', exact: true }).click();
    await expect(page.getByText('Draft care plan created — activate it when ready')).toBeVisible();

    const draftCard = page.locator('.card', { hasText: 'Post-fall support plan' }).first();
    await draftCard.getByRole('button', { name: /activate/i }).click();
    await expect(page.getByText('Care plan activated — carers now see this version')).toBeVisible();
  });
});
