const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['node_modules/', '.features-gen/', 'playwright-report/', 'test-results/', 'logs/'],
  },
  {
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      // Playwright worker fixtures that don't depend on other fixtures use the empty
      // destructuring `async ({}, use) => {...}` - a standard pattern, not a mistake.
      'no-empty-pattern': 'off',
      // Cucumber step signatures often carry an unused param (e.g. an unused dataTable) -
      // don't fight the framework's own shape, just warn instead of erroring.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      // testdata/testDataFactory.ts deliberately uses require() for dynamic per-environment
      // JSON loading, and this config file is itself CommonJS.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
