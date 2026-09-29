/**
 * Production build: bundles the API (and the seed script) into dist/.
 * The TypeScript-only @civita/shared workspace package is inlined; every
 * other dependency stays external and is installed from package.json.
 */
import { readFile, rm } from 'node:fs/promises';
import { build } from 'esbuild';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((name) => name !== '@civita/shared');

await rm(new URL('../dist', import.meta.url), { recursive: true, force: true });
await build({
  entryPoints: { server: 'src/server.ts', seed: 'src/scripts/seed.ts' },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  external,
  logLevel: 'info',
});
