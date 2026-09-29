import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Password123';

export const signIn = async (page: Page, email: string, password = PASSWORD) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/issues$/);
};

export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@e2e.test`;
