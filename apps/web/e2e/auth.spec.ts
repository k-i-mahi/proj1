import { expect, test } from '@playwright/test';
import { signIn, uniqueEmail } from './helpers';

test('sign up, stay signed in across reloads, then sign out', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Playwright Tester');
  await page.getByLabel('Email').fill(uniqueEmail('signup'));
  await page.getByLabel('Password').fill('weak');
  await expect(page.getByText('8+ characters')).toBeVisible();
  await page.getByLabel('Password').fill('StrongPass123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/issues$/);
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();

  // The session survives a reload via the httpOnly refresh cookie.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();

  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/issues');
  await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
});

test('shows a clear error for wrong credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('resident@civita.dev');
  await page.getByLabel('Password', { exact: true }).fill('WrongPass999');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect');
});

test('validates the sign up form before submitting', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Name is too short')).toBeVisible();
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
});

test('forgot password never reveals whether the account exists', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('nobody@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
});

test('demo accounts sign in with one click', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Authority' }).click();
  await expect(page).toHaveURL(/\/issues$/);
  await expect(page.getByRole('link', { name: 'Triage board' })).toBeVisible();
});

test('residents cannot reach staff pages', async ({ page }) => {
  await signIn(page, 'resident@civita.dev');
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: 'This page wandered off' })).toBeVisible();
});
