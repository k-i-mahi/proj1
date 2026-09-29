import { expect, test } from '@playwright/test';

test('landing page shows live stats and leads into the app', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /fix your city/i })).toBeVisible();
  await expect(page.getByText('Issues reported')).toBeVisible();

  await page.getByRole('link', { name: 'Explore the map' }).click();
  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByText(/\d+ issues/)).toBeVisible();
});

test('anonymous visitors can browse, filter and open issues', async ({ page }) => {
  await page.goto('/issues');
  await expect(page.getByRole('heading', { name: 'Explore issues' })).toBeVisible();
  const count = page.getByText(/^\d+ issues?$/);
  await expect(count).toBeVisible();

  // Search narrows the results and is reflected in the URL.
  await page.getByLabel('Search issues').fill('pothole');
  await expect(page).toHaveURL(/q=pothole/);
  const first = page.locator('article h3 a').first();
  await expect(first).toContainText(/pothole/i);

  await first.click();
  await expect(page).toHaveURL(/\/issues\/[a-f0-9]{24}$/);
  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
  await expect(page.getByText('to join the discussion')).toBeVisible();
});

test('upvoting while signed out asks you to sign in', async ({ page }) => {
  await page.goto('/issues');
  await page.getByRole('button', { name: 'Upvote' }).first().click();
  await expect(page).toHaveURL(/\/login\?next=/);
});

test('unknown routes show a friendly 404', async ({ page }) => {
  await page.goto('/this/does/not/exist');
  await expect(page.getByRole('heading', { name: 'This page wandered off' })).toBeVisible();
});

test('protected pages redirect to sign in and come back afterwards', async ({ page }) => {
  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/login\?next=%2Fnotifications/);
  await page.getByLabel('Email').fill('resident@civita.dev');
  await page.getByLabel('Password', { exact: true }).fill('Password123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/notifications$/);
});
