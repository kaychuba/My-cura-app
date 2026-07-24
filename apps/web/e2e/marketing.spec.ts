import { test, expect } from '@playwright/test';
import { LOGGED_OUT } from './helpers';

// Prospects are logged out — the admin storageState would redirect / to /dashboard.
test.use({ storageState: LOGGED_OUT });

test.describe('public marketing pages', () => {
  test('landing page renders for logged-out visitors (no login bounce)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'One platform. One record. Every visit.',
    );
    await expect(page).toHaveTitle(/Care Management Software/);
    // header CTAs for a prospect (OneTouch-style "Get in touch")
    await expect(page.locator('header').getByRole('link', { name: 'Get in touch' })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Log in' })).toBeVisible();
    // OneTouch-style sections present
    await expect(page.getByRole('heading', { name: 'My-Cura features' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Care settings we work with' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Book a demo' }).first()).toBeVisible();
  });

  test('header anchor links scroll to home-page sections', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByRole('link', { name: 'Features' }).click();
    await expect(page).toHaveURL(/#features/);
    await expect(page.locator('#features')).toBeInViewport();
    await page.locator('header').getByRole('link', { name: 'Who it’s for' }).click();
    await expect(page.locator('#who-its-for')).toBeInViewport();
  });

  test('pricing page shows tiers and the annual toggle applies the discount', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pricing');

    // monthly by default
    await expect(page.getByText('£59')).toBeVisible();
    await expect(page.getByText('£149')).toBeVisible();
    await expect(page.getByText('MOST POPULAR', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: /annual/i }).click();
    await expect(page.getByText('£49')).toBeVisible();
    await expect(page.getByText('£124')).toBeVisible();
    await expect(page.getByText('£1,488/year, billed annually')).toBeVisible();

    // Starter/Professional CTAs lead to signup, not checkout
    const signupLinks = page.getByRole('link', { name: 'Start free trial' });
    await expect(signupLinks.first()).toHaveAttribute('href', '/signup');
  });

  test('unknown public path shows the 404 page, not a login bounce', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to home' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('landing pricing teaser matches the pricing page numbers', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('£59')).toBeVisible();
    await expect(page.getByText('£149')).toBeVisible();
  });
});
