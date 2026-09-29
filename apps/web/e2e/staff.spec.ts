import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('authority dashboards load with real data', async ({ page }) => {
  await signIn(page, 'authority@civita.dev');

  await page.getByRole('link', { name: 'Triage board' }).click();
  await expect(page.getByRole('region', { name: 'Open' })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'In progress' }).getByRole('link').first(),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Analytics' }).click();
  await expect(page.getByText('Resolution rate')).toBeVisible();
  await expect(page.getByText('Reported vs resolved')).toBeVisible();
  await page.getByRole('button', { name: 'Table' }).click();
  await expect(page.getByRole('columnheader', { name: 'Reported' })).toBeVisible();
});

test('admins can manage users and categories', async ({ page }) => {
  await signIn(page, 'admin@civita.dev');

  await page.goto('/admin/users');
  await page.getByLabel('Search users').fill('ayesha');
  await expect(page.getByRole('button', { name: 'Actions for Ayesha Siddiqua' })).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(2);

  await page.goto('/admin/categories');
  await page.getByRole('button', { name: 'New category' }).click();
  const name = `Noise ${Date.now() % 100000}`;
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Create category' }).click();
  await expect(page.getByText('Category created')).toBeVisible();

  // Clean up the category we just made.
  await page.getByRole('button', { name: `Actions for ${name}` }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByText('Category deleted')).toBeVisible();
});
