/**
 * Captures screenshots of the running app (used for the README and visual QA).
 *
 *   node scripts/screenshots.mjs [outDir] [--theme=dark|light] [--only=name,name]
 *
 * Needs the API (seeded) and the web dev server running.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const args = process.argv.slice(2);
const outDir = path.resolve(args.find((a) => !a.startsWith('--')) ?? '../../docs/screenshots');
const theme = args.find((a) => a.startsWith('--theme='))?.split('=')[1] ?? 'light';
const only = args
  .find((a) => a.startsWith('--only='))
  ?.split('=')[1]
  ?.split(',');

const shots = [
  { name: 'landing', path: '/', fullPage: true },
  { name: 'login', path: '/login' },
  { name: 'explore', path: '/issues', as: 'resident' },
  { name: 'issue', path: 'FIRST_ISSUE', as: 'authority', fullPage: true },
  { name: 'map', path: '/map', as: 'resident', wait: 3500 },
  { name: 'report', path: '/report', as: 'resident' },
  { name: 'triage', path: '/triage', as: 'authority' },
  { name: 'analytics', path: '/analytics', as: 'authority', fullPage: true },
  { name: 'users', path: '/admin/users', as: 'admin' },
  { name: 'categories', path: '/admin/categories', as: 'admin' },
  { name: 'notifications', path: '/notifications', as: 'resident' },
  { name: 'profile', path: 'MY_PROFILE', as: 'resident' },
  { name: 'settings', path: '/settings', as: 'resident' },
  { name: 'mobile-explore', path: '/issues', as: 'resident', mobile: true },
  { name: 'mobile-landing', path: '/', mobile: true },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const errors = [];

const contexts = {};
const contextFor = async (as, mobile) => {
  const key = `${as ?? 'anon'}-${mobile ? 'm' : 'd'}`;
  if (contexts[key]) return contexts[key];
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: mobile ? 2 : Number(process.env.SCALE ?? 2),
    colorScheme: theme,
  });
  await ctx.addInitScript((t) => localStorage.setItem('civita-theme', t), theme);
  if (as) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(`${as}@civita.dev`);
    await page.getByLabel('Password', { exact: true }).fill('Password123');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/issues');
    await page.close();
  }
  contexts[key] = ctx;
  return ctx;
};

for (const shot of shots) {
  if (only && !only.includes(shot.name)) continue;
  const ctx = await contextFor(shot.as, shot.mobile);
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${shot.name}] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[${shot.name}] ${e.message}`));

  let target = shot.path;
  if (target === 'FIRST_ISSUE') {
    const res = await page.request.get(`${BASE}/api/v1/issues?sort=top&status=in_progress&limit=1`);
    target = `/issues/${(await res.json()).items[0].id}`;
  }
  if (target === 'MY_PROFILE') {
    await page.goto(`${BASE}/issues`);
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Your profile' }).click();
    await page.waitForURL('**/u/**');
    target = new URL(page.url()).pathname;
  }

  await page.goto(`${BASE}${target}`, { waitUntil: 'networkidle' });
  if (shot.fullPage) {
    // Scroll through the page so scroll-triggered animations have played.
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += 400) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.waitForTimeout(shot.wait ?? 1200);
  const file = path.join(outDir, `${shot.name}${theme === 'dark' ? '-dark' : ''}.png`);
  await page.screenshot({ path: file, fullPage: !!shot.fullPage });
  console.log('saved', file);
  await page.close();
}

await browser.close();
if (errors.length) {
  console.log('\nConsole errors:');
  for (const e of errors) console.log(' ', e);
}
