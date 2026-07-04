import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

// Admin MAR flow: set medication parameters and schedule doses that the
// carer app then unlocks for recording.
test.describe('MAR admin', () => {
  test('admin adds a medication with all carer-visible fields and schedules a dose', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/mar');
    await expect(page.getByRole('heading', { name: /medication administration/i })).toBeVisible();

    // Pick a service user
    await page.locator('select').first().selectOption({ label: 'Margaret Hughes' });

    // Medications table shows the admin-set columns
    await expect(page.getByRole('columnheader', { name: 'Function' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Formulation' })).toBeVisible();
    await expect(page.getByText('Pain relief and fever reduction')).toBeVisible();

    // Add a new medication with every field the carer sees
    const medName = `Cetirizine ${Date.now() % 100000}`;
    await page.getByRole('button', { name: /add medication/i }).click();
    await page.getByPlaceholder('e.g. Paracetamol').fill(medName);
    await page.getByPlaceholder('e.g. Pain relief and fever reduction').fill('Relieves hay fever and allergies');
    await page.getByPlaceholder('e.g. 500mg').fill('10mg');
    await page.getByPlaceholder('e.g. 1 tablet / 5 ml').fill('1 tablet');
    await page.locator('.grid select').first().selectOption('tablet'); // formulation
    await page.getByPlaceholder('e.g. Twice daily').fill('Once daily');
    await page.getByRole('button', { name: 'Add Medication' }).last().click();
    await expect(page.getByText('Medication added — carers can now see it')).toBeVisible();

    // The new row shows the admin-set values
    const row = page.locator('tr', { hasText: medName });
    await expect(row.getByText('Relieves hay fever and allergies')).toBeVisible();
    await expect(row.getByText('10mg')).toBeVisible();

    // Schedule a dose for it
    await row.getByTitle('Schedule doses').click();
    await expect(page.getByText(/recording options unlocked/i)).toBeVisible();
    await page.locator('input[type="time"]').fill('18:30');
    await page.getByRole('button', { name: 'Schedule Doses', exact: true }).click();
    await expect(page.getByText(/1 dose scheduled/i)).toBeVisible();

    // The daily MAR chart now lists it as Scheduled with the due time
    const dailyRow = page.locator('tr', { hasText: medName }).last();
    await expect(dailyRow.getByText('Scheduled')).toBeVisible();
    await expect(dailyRow.getByText('18:30')).toBeVisible();
  });
});
