import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

const CSV = [
  'Client ID,First Name,Surname,D.O.B,Address 1,Town,Post Code,Known Allergies',
  'E2E-1,Elsie,Endtoend,05/06/1941,9 Test Way,Stockport,SK1 1AA,Aspirin',
  'E2E-2,Frank,Endtoend,17/09/1939,9 Test Way,Stockport,SK1 1AA,',
].join('\n');

test.describe('data import wizard', () => {
  test('CSV walks through mapping, validation and import', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/imports');
    await expect(page.getByRole('heading', { name: /data import/i })).toBeVisible();

    // Step 1: upload a messy-headers CSV
    await page.locator('input[type="file"]').setInputFiles({
      name: 'legacy-export.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV),
    });

    // Step 2: fuzzy auto-mapping matched the odd header spellings
    await expect(page.getByText('legacy-export.csv')).toBeVisible();
    await expect(page.getByText(/2 rows/)).toBeVisible();
    const firstNameRow = page.locator('tr', { hasText: 'First name' }).first();
    await expect(firstNameRow.locator('select')).toHaveValue(/[0-9]+/);

    await page.getByRole('button', { name: /check my data/i }).click();

    // Step 3: both rows valid
    await expect(page.getByText('ready to import')).toBeVisible();
    await page.getByRole('button', { name: /import 2 rows/i }).click();

    // Step 4: report
    await expect(page.getByText(/import complete/i)).toBeVisible();
    await expect(page.getByText(/created|updated/i).first()).toBeVisible();

    // The people are really in Service Users
    await page.goto('/service-users');
    await page.getByPlaceholder(/search by name/i).fill('Endtoend');
    await expect(page.getByText('Elsie Endtoend')).toBeVisible();
    await expect(page.getByText('Frank Endtoend')).toBeVisible();
  });
});
