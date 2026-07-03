import { Page, expect } from '@playwright/test';

export const ADMIN = { email: 'admin@demo-care.local', password: 'Demo1234!' };
export const WORKER = { email: 'worker1@demo-care.local', password: 'Demo1234!' };

export async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.locator('button[type="submit"]').click();
}

export async function loginAsAdmin(page: Page) {
  await login(page, ADMIN);
  await expect(page).toHaveURL(/\/dashboard/);
}
