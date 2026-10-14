// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const playwright = require('eslint-plugin-playwright');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: ['node_modules', 'dist', 'test-results', 'playwright-report'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { require: 'readonly', module: 'readonly' },
    },
  },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
  },
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
  prettierConfig,
);
