// Hooks-correctness lint only — no style rules. Scoped to package sources;
// @typescript-eslint/parser is needed solely so ESLint can parse TS/TSX.
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['**/dist/', '**/.next/', '**/storybook-static/', '**/coverage/'] },
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    // '@typescript-eslint' is registered with NO rules enabled: package sources
    // carry eslint-disable comments for consumer repos (registry installs land in
    // Next.js apps that run typescript-eslint), and without the plugin those
    // directives error with "Definition for rule ... was not found".
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': tsPlugin,
    },
    // Those same consumer-targeted directives are "unused" in this repo, so
    // unused-directive reporting stays off.
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
