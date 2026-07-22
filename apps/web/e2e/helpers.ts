import { Page, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as speakeasy from 'speakeasy';

export const ADMIN = { email: 'admin@demo-care.local', password: 'Demo1234!' };
export const WORKER = { email: 'worker1@demo-care.local', password: 'Demo1234!' };

/** Empty storage for specs that must start logged out (marketing, login UI). */
export const LOGGED_OUT = { cookies: [], origins: [] };

export async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.locator('button[type="submit"]').click();
}

/**
 * Admin specs run with the storageState captured in global-setup, so this
 * normally just lands on the dashboard without spending a rate-limited
 * login. The UI-login fallback (with the /2fa TOTP challenge) exists for
 * tests that opt into a clean session via LOGGED_OUT.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/dashboard');
  if (/\/dashboard/.test(page.url())) return;

  await login(page, ADMIN);
  await expect(page).toHaveURL(/\/(2fa|dashboard)/);
  if (/\/2fa$/.test(new URL(page.url()).pathname)) {
    const secret = readFileSync(
      join(process.cwd(), 'e2e', '.auth', 'admin-totp-secret'),
      'utf8',
    ).trim();
    await page
      .locator('input[inputmode="numeric"]')
      .fill(speakeasy.totp({ secret, encoding: 'base32' }));
    await page.getByRole('button', { name: /^verify$/i }).click();
  }
  await expect(page).toHaveURL(/\/dashboard/);
}
