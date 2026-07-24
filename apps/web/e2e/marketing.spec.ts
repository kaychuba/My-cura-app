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

  test('nav dropdowns deep-link to dedicated tabs on the same page', async ({ page }) => {
    await page.goto('/');

    // Features dropdown → Medication Management tab
    await page.locator('header').getByRole('button', { name: 'Features' }).click();
    await page.getByRole('menuitem', { name: 'Medication Management' }).click();
    await expect(page).toHaveURL(/#feature-medication/);
    await expect(page.locator('#features')).toBeInViewport();
    await expect(
      page.getByRole('tab', { name: 'Medication Management' }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Admin-scheduled doses with exact date/times')).toBeVisible();

    // Who it's for dropdown → Live-in care tab
    await page.locator('header').getByRole('button', { name: 'Who it’s for' }).click();
    await page.getByRole('menuitem', { name: 'Live-in care' }).click();
    await expect(page).toHaveURL(/#setting-live-in/);
    await expect(page.locator('#who-its-for')).toBeInViewport();
    await expect(page.getByRole('tab', { name: 'Live-in care' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Clicking a tab directly also switches the panel — same page throughout
    await page.getByRole('tab', { name: 'Supported living' }).click();
    await expect(page.getByText('Per-person care plans in shared settings')).toBeVisible();
  });

  test('contact page presents the OneTouch-style form and submits an enquiry', async ({ page }) => {
    await page.goto('/contact?type=demo');
    await expect(page.getByRole('heading', { name: 'Get in touch' })).toBeVisible();
    // ?type=demo preselects the enquiry type
    await expect(page.locator('select')).toHaveValue('demo');
    // direct-contact block alongside the form
    await expect(page.getByText('Sales enquiries')).toBeVisible();
    await expect(page.getByText('General enquiries')).toBeVisible();

    await page.getByPlaceholder('Jane Adeyemi').fill('Test Prospect');
    await page.getByPlaceholder('jane@youragency.co.uk').fill(`prospect-${Date.now()}@e2e.test`);
    await page.getByPlaceholder('Willow Court Care Ltd').fill('E2E Care Agency');
    await page
      .locator('textarea')
      .fill('We run 25 carers on paper rotas and would love to see a demo.');
    await page.getByRole('button', { name: /send message/i }).click();

    await expect(page.getByText("Thank you — we've got it")).toBeVisible();
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
