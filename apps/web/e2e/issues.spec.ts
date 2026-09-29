import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('report an issue end to end, then discuss and upvote it', async ({ page }) => {
  await signIn(page, 'resident@civita.dev');
  await page.getByRole('link', { name: 'Report an issue' }).click();
  await expect(page).toHaveURL(/\/report$/);

  // Step 1: details (validation first).
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Choose a category')).toBeVisible();
  await page.getByRole('radio', { name: 'Streetlights' }).click();
  const title = `E2E streetlight out ${Date.now()}`;
  await page.getByLabel('Title').fill(title);
  await page
    .getByLabel('Description')
    .fill('The only streetlight on this lane has been dark for a week now.');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2: drop a pin on the map.
  await expect(page.getByText('Tap the map to drop a pin')).toBeVisible();
  const map = page.locator('.maplibregl-canvas');
  await expect(map).toBeVisible();
  await page.waitForTimeout(800);
  await map.click({ position: { x: 300, y: 250 } });
  await expect(page.getByText('Tap the map to drop a pin')).toBeHidden();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 3: photos are optional.
  await expect(page.getByText('Drop photos here or click to browse')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 4: review and submit.
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await page.getByRole('button', { name: 'Submit report' }).click();

  await expect(page).toHaveURL(/\/issues\/[a-f0-9]{24}$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
  await expect(page.getByText('Tanvir Ahmed reported this issue')).toBeVisible();

  // Comment.
  await page
    .getByRole('textbox', { name: 'Comment' })
    .fill('Adding a note from the end-to-end test.');
  await page.getByRole('button', { name: 'Comment' }).click();
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Adding a note from the end-to-end test.' }),
  ).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Comment' })).toHaveValue('');
  await expect(page.getByText('Discussion')).toBeVisible();

  // Upvote toggles optimistically.
  const vote = page.getByRole('button', { name: 'Upvote' });
  await vote.click();
  await expect(page.getByRole('button', { name: 'Remove upvote' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Remove upvote' }).click();
  await expect(page.getByRole('button', { name: 'Upvote' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  // The reporter can delete their open report.
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete issue' }).click();
  await expect(page).toHaveURL(/\/issues$/);
});

test('status changes by an authority reach followers in real time', async ({ browser }) => {
  const residentCtx = await browser.newContext();
  const staffCtx = await browser.newContext();
  const resident = await residentCtx.newPage();
  const staff = await staffCtx.newPage();

  await signIn(resident, 'resident@civita.dev');
  await signIn(staff, 'authority@civita.dev');

  // Resident follows an open issue.
  await resident.goto('/issues?status=open&sort=oldest');
  await resident.locator('article h3 a').first().click();
  const issueUrl = resident.url();
  await expect(resident.getByRole('button', { name: /^Follow(ing)?$/ })).toBeVisible();
  const follow = resident.getByRole('button', { name: 'Follow', exact: true });
  if (await follow.isVisible()) await follow.click();
  await expect(resident.getByRole('button', { name: 'Following' })).toBeVisible();
  await resident.goto('/issues');

  // Authority moves it to in progress from the issue page.
  await staff.goto(issueUrl);
  await staff.getByLabel('Status').click();
  await staff.getByRole('option', { name: 'In progress' }).click();
  await staff.getByLabel(/Public note/).fill('Crew booked for tomorrow');
  await staff.getByRole('button', { name: 'Save changes' }).click();
  await expect(staff.getByText('Issue updated. Followers have been notified.')).toBeVisible();

  // The resident gets a live toast without refreshing.
  await expect(
    resident.getByText(/is now in progress: Crew booked for tomorrow/).first(),
  ).toBeVisible();

  // Put it back so the test can be re-run against the same data.
  await staff.getByLabel('Status').click();
  await staff.getByRole('option', { name: 'Open' }).click();
  await staff.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    staff.getByText('Issue updated. Followers have been notified.').first(),
  ).toBeVisible();

  await residentCtx.close();
  await staffCtx.close();
});

test('command palette searches issues from anywhere', async ({ page }) => {
  await page.goto('/issues');
  await page.keyboard.press('Control+k');
  await page.getByPlaceholder('Search issues or jump to…').fill('manhole');
  const result = page
    .getByRole('option')
    .filter({ hasText: /manhole/i })
    .first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/issues\/[a-f0-9]{24}$/);
});
