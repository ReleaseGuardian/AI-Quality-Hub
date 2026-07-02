# PlaywrightBDD-TS

A Playwright BDD test framework built with **[playwright-bdd](https://vitalets.github.io/playwright-bdd/)** + **TypeScript**. Gherkin `.feature` files compile into native Playwright test files via `playwright-bdd` and run on the Playwright test runner — there is no CucumberJS runtime dependency anywhere in this project.

## Why playwright-bdd over CucumberJS

| | CucumberJS-based setup | PlaywrightBDD-TS (this project) |
|---|---|---|
| Runner | `@cucumber/cucumber` | `@playwright/test` (via `playwright-bdd`) |
| Language | JavaScript | TypeScript (strict) |
| "World" / shared state | `features/support/world.js` (`this.page`, globals) | Playwright fixtures (`step-definitions/fixtures.ts`) |
| Screenshots / video on failure | Custom code in `baseUtil.js` (`AttachScreenshotOnFailure`, `RetainVideoOnFailure`) | Native Playwright `use: { screenshot, video, trace }` — no custom code needed |
| Parallelism | `cucumber.json` `parallel` setting, one process | Playwright workers (`fullyParallel: true`), each an isolated process |
| Browser/device config | `BROWSER_NAME`/`DEVICE` env vars branch inside `LaunchBrowser()` | Same `BROWSER_NAME`/`DEVICE` env vars, now read directly in `playwright.config.ts` to build a single `ui` project (plus a separate `api` project) |
| Reports | Cucumber HTML report only | Native Playwright HTML report (`npm run report`) |

## Project layout

```
features/
  ui/                     UI .feature files (run under the "ui" project - browser chosen via BROWSER_NAME)
  api/                    API .feature files (run under the "api" project, no browser launched)
step-definitions/
  fixtures.ts             The "World" replacement: custom Playwright fixtures + Given/When/Then/Before/After
  *.steps.ts              Step definitions, grouped by feature area
pages/                    Page objects (login.page.ts) + pageFactory.ts, which constructs one of
                          each page object per `new PageFactory(page)` call and exposes getXPage()
                          getters - step definitions ask the factory for a page, not `new LoginPage(...)`
apis/                     baseApiClient.ts (shared base holding a per-resource baseUri + get/post
                          helpers, so resources can target different hosts) + one class per
                          resource (users.api.ts) - the API-testing equivalent of pages/, built
                          on Playwright's own `request` fixture (no axios)
testdata/                 Test data factory: JSON fixtures per environment (dev/users.json) + a
                          loader (testDataFactory.ts) that step definitions ask for data by key
utils/                    logger, log cleanup (baseUtil.ts)
playwright.config.ts      Projects, reporters, screenshot/video/trace config, bddgen config, retries/workers
global-setup.ts           Runs once before all workers: loads .env, clears old logs
```

## Page objects and API objects

Both pages and API objects are constructed directly inside the step definition that needs them —
neither is a Playwright fixture:

- **Pages** (`pages/*.page.ts`) — take a `Page`, expose UI actions (e.g. `LoginPage.login()`).
  Step definitions go through `pages/pageFactory.ts`:
  `const pageFactory = new PageFactory(page); await pageFactory.getLoginPage().login(...)` (see
  `step-definitions/login.steps.ts`). `PageFactory`'s constructor instantiates every page object up
  front, and one `getXPage()` getter exposes each. Add a new page by adding it to the constructor
  and adding its getter.
- **APIs** (`apis/*.api.ts`) — extend `apis/baseApiClient.ts`'s `BaseApiClient`, which stores a
  `baseUri` + Playwright's `APIRequestContext` (nothing else) — so different resources can target
  different hosts, independent of any project-level `baseURL`. Each resource method builds its own
  URL (`this.baseUri + 'path'`) and calls `this.request.get/post(...)` directly (see
  `UsersApi.getUsers()`) — URL-building lives at the service layer, not in a shared base helper. No
  factory: step definitions just do `const usersApi = new UsersApi(request);` directly (see
  `step-definitions/api.steps.ts`), using Playwright's built-in `request` fixture.

Both give every scenario a fresh, isolated instance — no shared mutable state between tests, which
is what makes parallel workers and retries safe.

## Test data factory

Test data (e.g. login credentials) lives in JSON under `testdata/<environment>/` (`testdata/dev/users.json`),
keyed by a short name per case (`valid`, `invalidUsername`, `invalidPassword`, ...). The environment
folder is selected by the `TEST_ENVIRONMENT` env var (defaults to `dev`), so pointing the suite at a
different environment's data is a one-line env change, not a code change.

`testdata/testDataFactory.ts` is instance-based (`new TestDataFactory()`), reads its environment from
`process.env.TEST_ENVIRONMENT` in the constructor, and has one plainly-named method per JSON file
that loads it via `require(...)` and returns the whole parsed file — e.g. `getLoginData()` returns
all of `users.json`. Callers index into it by key themselves, e.g.
`new TestDataFactory().getLoginData()['valid']` (see `step-definitions/login.steps.ts`). Deliberately
untyped (no per-domain interfaces) to keep adding a new JSON file cheap — add a new data domain by
adding the file under `testdata/<environment>/` plus a one-line `getXxxData()` method, no type
declarations required.

## Parallelization and retries

- `fullyParallel: true` schedules every scenario independently, not just every file — Playwright
  distributes individual scenarios across workers.
- `WORKERS` env var overrides the worker count (defaults: unset locally, `2` in CI).
- `RETRIES` env var overrides the retry count (defaults: `0` locally, `1` in CI).
- Because fixtures are test-scoped and hold no shared state, a retried scenario gets a brand-new
  `page`/`usersApi`/etc., so retries don't inherit state from the failed attempt.

## Browser selection

The `ui` project's browser engine and headed/headless mode are both decided by env vars in
`.env`, not by CLI flags or hardcoded config:

- `BROWSER_NAME` — `chromium` (default) | `firefox` | `webkit`. Read once in `playwright.config.ts`
  to pick the Playwright `devices[...]` preset for the single `ui` project. An unrecognized value
  throws a clear error at config-load time rather than silently falling back.
- `HEADLESS` — defaults to headed off (`true`); set `HEADLESS=false` to watch the browser run.
  `npm run test:headed` still works as a CLI override (`--headed` beats `.env` regardless of
  `HEADLESS`).
- `DEVICE` / `VIEWPORT_WIDTH` / `VIEWPORT_HEIGHT` — optional emulation on top of whichever browser
  `BROWSER_NAME` selected (unchanged from before).

To run against a different browser, edit `BROWSER_NAME` in `.env` (or export it inline, e.g.
`BROWSER_NAME=firefox npm test`) — there's no `--project=firefox` flag anymore, since there's only
one `ui` project.

## Getting started

```bash
npm install
npx playwright install        # downloads browser binaries
cp .env.example .env          # fill in real values as needed
npm test                      # generates tests (bddgen) then runs the "ui" project (BROWSER_NAME, default chromium)
```

## Scripts

- `npm test` — UI scenarios, browser from `BROWSER_NAME` (default `chromium`)
- `npm run test:api` — API scenarios (no browser launched)
- `npm run test:unit` / `test:regression` — filtered by `@UnitTest` / `@Regression` tag
- `npm run test:headed` / `test:debug` / `test:ui-mode` — local debugging
- `npm run report` — opens the last Playwright HTML report
- `npm run typecheck` — `tsc --noEmit`

## Tags

Gherkin tags on a `Scenario` (e.g. `@UnitTest`, `@Regression`, `@API`) are picked up automatically
by `playwright-bdd` and become native Playwright test tags — no extra config needed. A scenario can
carry more than one tag (e.g. `login.feature`'s "Successful login" scenario is both `@UnitTest` and
`@Regression`).

Filter by tag with `--grep`/`--grep-invert`, either via the `npm run test:unit` / `test:regression`
scripts above, or directly:

```bash
npx playwright test --grep @UnitTest
npx playwright test --grep-invert @Regression
```

## Writing new tests

1. Add a `.feature` file under `features/ui/` or `features/api/`.
2. Add/extend a `*.steps.ts` file under `step-definitions/`, importing `Given/When/Then` **from `./fixtures`**, not from `playwright-bdd` directly (that's what wires up the custom fixtures below).
3. If a step needs a new page object, API object, or shared fixture, add it under `pages/`,
   `apis/`, or `step-definitions/fixtures.ts` respectively.
4. Run `npm test` (it regenerates `.features-gen/` automatically via `bddgen`, which is gitignored).
