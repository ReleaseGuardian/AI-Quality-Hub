const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
// Turns off ESLint rules that would conflict with Prettier - Prettier owns formatting,
// ESLint owns correctness. Must be last so it overrides earlier configs.
const prettierConfig = require('eslint-config-prettier');

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
      // Enforces the naming conventions documented in README.md's "Naming conventions"
      // section - see there for the reasoning behind each rule.
      '@typescript-eslint/naming-convention': [
        'error',
        // Classes, interfaces, type aliases, enums: PascalCase.
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase'] },
        // Imports: camelCase for value imports (e.g. `path`, `log4js`), PascalCase for
        // classes/types/Given-When-Then-style bindings (e.g. `BaseUtil`, `Given`).
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
        // Top-level (module-scope) const literals may be SCREAMING_SNAKE_CASE (e.g.
        // TEST_DATA_PATH) - everything else defaults to camelCase below.
        { selector: 'variable', modifiers: ['const', 'global'], format: ['camelCase', 'UPPER_CASE'] },
        // Object/type literal property names often have to match an external contract
        // (HTTP header names, JSON API fields, third-party option objects) - not enforced.
        { selector: ['objectLiteralProperty', 'typeProperty'], format: null },
        // Everything else not covered above (variables, functions, parameters, class
        // members): camelCase. Leading underscore allowed only because ESLint's own
        // no-unused-vars convention above uses it for intentionally-unused params.
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        // playwright-bdd's own Given/When/Then/Before/After/BeforeAll/AfterAll, destructured
        // from createBdd() in utils/fixtures.ts - intentionally PascalCase to mirror Gherkin
        // keywords, not a naming mistake. Listed last so it overrides the 'default' rule
        // above for exactly these names.
        {
          selector: 'variable',
          filter: { regex: '^(Given|When|Then|Before|After|BeforeAll|AfterAll)$', match: true },
          format: ['PascalCase'],
        },
      ],
    },
  },
  prettierConfig,
);
