import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      'apps/web/playwright-report/**',
      'apps/web/test-results/**',
      'apps/api/.mongo-data/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/api/**/*.ts', 'packages/shared/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/api/src/scripts/**', 'apps/api/scripts/**', 'apps/web/scripts/**'],
    // Screenshot script callbacks run inside the browser via page.evaluate().
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-console': 'off' },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // react-hook-form's watch() is intentionally not memoisable; the compiler just skips those components.
      'react-hooks/incompatible-library': 'off',
    },
  },
  {
    // Route tables and context providers legitimately export non-components.
    files: [
      'apps/web/src/main.tsx',
      'apps/web/src/router.tsx',
      'apps/web/src/providers/**',
      'apps/web/src/components/ui/**',
      'apps/web/src/components/domain.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['apps/web/e2e/**', 'apps/web/*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
