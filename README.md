# PlaywrightBDD-TS

A Playwright BDD test framework built with **[playwright-bdd](https://vitalets.github.io/playwright-bdd/)** + **TypeScript**. Gherkin `.feature` files compile into native Playwright test files via `playwright-bdd` and run on the Playwright test runner — there is no CucumberJS runtime dependency anywhere in this project.

It covers both **UI testing** (Page Object Model, driven by a `PageFactory`) and **API testing** (a parallel object-per-resource pattern built on Playwright's own `request` context), with an environment-aware test data factory, env-driven browser/parallelization config, and native Playwright reporting.

---

## Table of contents

- [Technology stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment configuration](#environment-configuration)
- [Project layout](#project-layout)
- [Architecture](#architecture)
  - [Page objects and API objects](#page-objects-and-api-objects)
  - [Test data factory](#test-data-factory)
- [Running tests](#running-tests)
- [Browser selection](#browser-selection)
- [Parallelization and retries](#parallelization-and-retries)
- [Tags](#tags)
- [Logging and debugging](#logging-and-debugging)
- [Viewing reports](#viewing-reports)
- [Writing new tests](#writing-new-tests)
- [Troubleshooting](#troubleshooting)

---

## Technology stack

| Package | Role |
|---|---|
| [`@playwright/test`](https://playwright.dev/) | Test runner, browser automation (Chromium/Firefox/WebKit), assertions, HTML reporting |
| [`playwright`](https://playwright.dev/) | Browser binaries / driver used by `@playwright/test` |
| [`playwright-bdd`](https://vitalets.github.io/playwright-bdd/) | Compiles Gherkin `.feature` files into native Playwright spec files (`bddgen`), and binds `Given/When/Then` to Playwright fixtures via `createBdd()` |
| [`typescript`](https://www.typescriptlang.org/) | Language — strict mode, no build step needed (Playwright runs `.ts` files directly) |
| [`dotenv`](https://www.npmjs.com/package/dotenv) | Loads `.env` into `process.env` |
| [`log4js`](https://www.npmjs.com/package/log4js) | Per-worker file logging (`logs/thread_<pid>.log`) |
| [`fs-extra`](https://www.npmjs.com/package/fs-extra) | Used for recursively clearing the `logs/` directory before a run |
| [`eslint`](https://eslint.org/) + [`typescript-eslint`](https://typescript-eslint.io/) | Linting (`eslint.config.js`, flat config) — separate from `typecheck` |

No CucumberJS runtime, no axios (API calls go through Playwright's own `APIRequestContext`), no other UI/API testing libraries.

---

## Prerequisites

- **Node.js** `>= 20.0.0` and **npm** `>= 10.0.0` (see `engines` in `package.json`; `.nvmrc` pins `20` if you use `nvm`)
  - **Windows**: install from the [official Node.js installer](https://nodejs.org/) (LTS), or use [`nvm-windows`](https://github.com/coreybutler/nvm-windows) if you manage multiple Node versions (note: this is a separate tool from `nvm` on macOS/Linux — commands differ slightly, e.g. `nvm install 20` / `nvm use 20`)
  - **macOS/Linux**: install via [`nvm`](https://github.com/nvm-sh/nvm), Homebrew, or your package manager
- **git**
  - **Windows**: install [Git for Windows](https://git-scm.com/download/win) — this also installs **Git Bash**, which is the recommended shell for this project (see note below)
  - **macOS/Linux**: usually preinstalled, or via Xcode Command Line Tools / your package manager
- No global CLI tools required — everything runs through local `npm` scripts and `npx`

### A note for Windows users

Every `npm run <script>` command in this README works identically on Windows, macOS, and Linux — they're plain `npm`/`npx` invocations. The only shell-specific bits are the handful of examples below that set an environment variable **inline** on the same line as a command (e.g. `BROWSER_NAME=firefox npm test`) — that syntax is bash/POSIX-shell only. Where that comes up, this doc shows the **Git Bash**, **PowerShell**, and **cmd.exe** equivalents side by side.

**Recommendation**: use **Git Bash** (installed alongside Git for Windows) as your shell for this project — every command in this README then works exactly as written, with no translation needed.

---

## Installation

Steps 1, 3, 4, and 6 below are identical on every OS. Step 2 (pinned Node version) and step 5 (viewing a file's contents) have OS-specific commands, shown separately.

**1. Clone the repo**

```bash
git clone https://github.com/ReleaseGuardian/AI-Quality-Hub.git
cd AI-Quality-Hub
```

**2. (optional) use the pinned Node version**

| Shell | Command |
|---|---|
| macOS/Linux (`nvm`) | `nvm use` |
| Windows (`nvm-windows`) | `nvm use 20` |
| Windows (no `nvm`) | Skip this — just make sure your installed Node.js is `>= 20.0.0` (`node --version`) |

**3. Install dependencies**

```bash
npm install
```

**4. Install Playwright's browser binaries (Chromium, Firefox, WebKit)**

```bash
npx playwright install
```

**5. Confirm `.env` exists and review it** (tracked in the repo with working defaults — all public demo endpoints, no real secrets — so this step is optional to get started)

| Shell | Command |
|---|---|
| Git Bash / macOS / Linux | `cat .env` |
| PowerShell | `Get-Content .env` |
| cmd.exe | `type .env` |

**6. Run the default test suite to confirm everything works**

```bash
npm test
```

If it finishes with `3 passed`, the install is good.

---

## Environment configuration

Configuration lives in `.env` (tracked in the repo with working defaults) and `.env.example` (the template). Every setting below is a plain environment variable, read directly by `playwright.config.ts`, `global-setup.ts`, or application code — there's no separate config file format to learn.

| Variable | Purpose | Default / example |
|---|---|---|
| `BROWSER_NAME` | Which browser engine the `ui` project uses — `chromium` \| `firefox` \| `webkit`. An unrecognized value throws a clear error at config-load time. | `chromium` |
| `DEVICE` | Optional Playwright device-emulation preset name (e.g. `iPhone 13`). Takes priority over `VIEWPORT_WIDTH`/`VIEWPORT_HEIGHT` if set. | *(empty = off)* |
| `HEADLESS` | Whether the browser runs headless. `HEADLESS=false` to watch it run. `--headed` on the CLI overrides this regardless of the value here. | `true` |
| `SLOWMO` | Milliseconds of delay Playwright inserts between actions — useful for watching a headed run. Non-numeric values throw a clear error at config-load time. | `0` |
| `VIEWPORT_WIDTH` / `VIEWPORT_HEIGHT` | Viewport size, used when `DEVICE` isn't set. Non-numeric values throw a clear error at config-load time. | `1280` / `720` |
| `VIDEO_RECORDING_CONDITION` | Playwright's `video` option — `off` \| `on` \| `retain-on-failure` \| `on-first-retry`. | `retain-on-failure` |
| `SCREENSHOT_CONDITION` | Playwright's `screenshot` option — `off` \| `on` \| `only-on-failure`. | `only-on-failure` |
| `TRACE_CONDITION` | Playwright's `trace` option — `off` \| `on` \| `retain-on-failure` \| `on-first-retry`. | `on-first-retry` |
| `LOGIN_APP_URL` | Base URL for the UI login scenarios (`pages/login.page.ts`). | `https://practicetestautomation.com/practice-test-login/` |
| `LOB` | Which LOB's base URL (from `apis/lobBaseUrls.json`) API objects use by default. Unknown values throw a clear error at request time. | `default` |
| `TEST_ENVIRONMENT` | Selects which `testdata/<environment>/` folder the test data factory reads from. | `dev` |
| `LOG_LEVEL` | log4js log level (`1`–`5`; see `utils/logger.ts`). | `4` |
| `RETRIES` | Overrides Playwright's retry count. Non-numeric values throw a clear error at config-load time. | `0` locally, `1` in CI |
| `WORKERS` | Overrides Playwright's worker count. Non-numeric values throw a clear error at config-load time. | unset locally, `2` in CI |
| `MemberPortal_url`, `MP_userName`, `MP_password`, `AUTH_LOCATION` | Not currently read by any code — placeholders reserved for an upcoming Member Portal test target. | — |

To point the suite at different values, either edit `.env` directly, or override a variable for a single run:

| Shell | Command |
|---|---|
| Git Bash / macOS / Linux | `BROWSER_NAME=firefox npm test` |
| PowerShell | `$env:BROWSER_NAME="firefox"; npm test` |
| cmd.exe | `set BROWSER_NAME=firefox&& npm test` |

---

## Project layout

```
features/
  ui/                     UI .feature files (run under the "ui" project - browser chosen via BROWSER_NAME)
  api/                    API .feature files (run under the "api" project, no browser launched)
step-definitions/
  *.steps.ts              Step definitions, grouped by feature area, import Given/When/Then
                           from ../utils/fixtures
pages/
  login.page.ts            Page object - locators as class fields, methods for actions/assertions
  pageFactory.ts            One getXPage() getter per page, lazily constructing (and caching) it on
                           first access - injected into steps as the `pageFactory` fixture
apis/
  baseApiClient.ts          Shared base: resolves a baseUri per LOB via TestDataFactory +
                           stores Playwright's APIRequestContext
  users.api.ts              One class per resource, extends BaseApiClient, builds its own URLs
testdata/
  dev/users.json            Environment-scoped JSON test data (login credentials)
  dev/lobBaseUrls.json      Environment-scoped LOB (line of business) name -> base URL lookup,
                           one entry per LOB, read via TestDataFactory.getLobBaseUrls()
  testDataFactory.ts        Instance-based factory; one plain getXxxData() method per JSON file
utils/
  fixtures.ts               Registers the test-scoped `pageFactory` fixture and the
                           worker-scoped `logger` fixture, produces Given/When/Then/Before/
                           After via createBdd(), and defines the global Before/After hooks
                           (scenario start/PASS/FAIL logging, viewport/device report
                           attachment) - every *.steps.ts file imports Given/When/Then from here
  logger.ts                 log4js wrapper, one log file per worker process
  baseUtil.ts                Log directory cleanup, used from global-setup.ts
playwright.config.ts       Projects ("ui", "api"), reporters, screenshot/video/trace config, bddgen
                           config, env-driven browser/retries/workers, with validated numeric env vars
global-setup.ts            Runs once before all workers: clears old logs (.env is already loaded by
                           the time this runs, via playwright.config.ts)
tsconfig.json               TypeScript compiler options (strict, no emit - Playwright runs .ts directly)
eslint.config.js            ESLint flat config (typescript-eslint recommended rules)
scripts/
  open-latest-report.js      Finds and opens the most recent playwright-report/<timestamp>/ folder
                           (used by `npm run report`) - plain Node, works the same on every OS
```

---

## Architecture

### Page objects and API objects

Pages are provided via a Playwright fixture; API objects are constructed directly where needed:

- **Pages** (`pages/*.page.ts`) — take a `Page`, expose UI actions (e.g. `LoginPage.login()`). `utils/fixtures.ts` registers a test-scoped `pageFactory` fixture (`async ({ page }, use) => { await use(new PageFactory(page)); }`), so every step in a scenario just destructures it:
  ```ts
  Given('I navigate to the login page', async ({ pageFactory }) => {
    await pageFactory.getLoginPage().goto();
  });
  ```
  (see `step-definitions/login.steps.ts`). Because it's test-scoped, **the same `PageFactory` instance is shared across every step in one scenario** — `pages/pageFactory.ts` lazily constructs and caches each page on first access (`this.loginPage ??= new LoginPage(this.page)`), so a page used by 3 different steps in the same scenario is only ever built once. Add a new page by adding a private field + a `getXPage()` getter to `PageFactory` — no changes needed anywhere `pageFactory` is already used.

- **APIs** (`apis/*.api.ts`) — extend `apis/baseApiClient.ts`'s `BaseApiClient`. Its constructor takes an `lob` (line of business) name and resolves the actual `baseUri` from `testdata/<environment>/lobBaseUrls.json` (via `TestDataFactory`) — an unrecognized LOB throws a clear error immediately rather than silently using the wrong host. Each resource method then builds its own URL (`this.baseUri + 'path'`) and calls `this.request.get/post(...)` directly — URL-building lives at the service layer, not in a shared base helper. No factory, and not a fixture: step definitions just do
  ```ts
  const usersApi = new UsersApi(request);              // uses the LOB env var, or 'default'
  const usersApiForGlobex = new UsersApi(request, 'globex'); // explicit LOB override
  const response = await usersApi.getUsers();
  ```
  (see `step-definitions/api.steps.ts`), using Playwright's built-in `request` fixture. Every resource constructor should follow this same pattern — `constructor(request, lob = process.env.LOB ?? 'default')` — so a run defaults to one LOB (set via the `LOB` env var) but any step can target a specific LOB explicitly when needed. Adding LOB #31 is a one-line addition to `testdata/<environment>/lobBaseUrls.json`, no code change.

Both give every scenario a fresh, isolated instance — no shared mutable state *between* tests, which is what makes parallel workers and retries safe. (Sharing *within* one scenario, via the `pageFactory` fixture, is safe precisely because it's rebuilt fresh for every test/retry — see [Parallelization and retries](#parallelization-and-retries).)

### Test data factory

Test data (e.g. login credentials) lives in JSON under `testdata/<environment>/` (`testdata/dev/users.json`), keyed by a short name per case (`valid`, `invalidUsername`, `invalidPassword`, ...). The environment folder is selected by the `TEST_ENVIRONMENT` env var (defaults to `dev`), so pointing the suite at a different environment's data is a one-line env change, not a code change.

`testdata/testDataFactory.ts` is instance-based (`new TestDataFactory()`), reads its environment from `process.env.TEST_ENVIRONMENT` in the constructor, and has one plainly-named method per JSON file that loads it via `require(...)` and returns the whole parsed file — e.g. `getLoginData()` returns all of `users.json`. Callers index into it by key themselves, e.g. `new TestDataFactory().getLoginData()['valid']` (see `step-definitions/login.steps.ts`). Deliberately untyped (no per-domain interfaces) to keep adding a new JSON file cheap — add a new data domain by adding the file under `testdata/<environment>/` plus a one-line `getXxxData()` method.

Scaling to many test cases (e.g. 30+ login credential sets for different scenarios) needs **no
code change at all** — it's purely adding more keys to the JSON file, referenced by name from
`.feature` files (`When I log in as the "mfaEnabledUser" test user`). `login.steps.ts` already
throws a clear error if a `.feature` file references a key that doesn't exist.

---

## Running tests

`npm run <script>` runs `bddgen` first (regenerating `.features-gen/` from the current `.feature`/step-definition files), then invokes Playwright.

| Command | What it runs |
|---|---|
| `npm test` | All UI scenarios, browser from `BROWSER_NAME` (default `chromium`) |
| `npm run test:ui` | Same as `npm test`, explicitly excluding anything tagged `@API` |
| `npm run test:api` | API scenarios only (no browser launched) |
| `npm run test:unit` | UI scenarios tagged `@UnitTest` only |
| `npm run test:regression` | UI scenarios tagged `@Regression` only |
| `npm run test:headed` | UI scenarios with a visible browser window (`--headed`) |
| `npm run test:debug` | UI scenarios in Playwright's step-through debugger (`--debug`) |
| `npm run test:ui-mode` | Opens Playwright's interactive UI mode (`--ui`) for exploring/re-running tests visually |
| `npm run bddgen` | Regenerates `.features-gen/` from `.feature` files without running anything |
| `npm run report` | Opens the most recent Playwright HTML report (each run gets its own timestamped folder) |
| `npm run typecheck` | `tsc --noEmit` — type-checks the whole project, no build output |
| `npm run lint` | `eslint .` — lints the whole project against `eslint.config.js` |

You can also drop straight to the Playwright CLI for anything not covered by a script, e.g.:

```bash
npx playwright test --project=ui --grep "invalid username"
npx playwright test --project=api --project=ui   # both projects in one run
```

---

## Browser selection

The `ui` project's browser engine and headed/headless mode are both decided by env vars in `.env`, not by CLI flags or hardcoded config:

- `BROWSER_NAME` — `chromium` (default) | `firefox` | `webkit`. Read once in `playwright.config.ts` to pick the Playwright `devices[...]` preset for the single `ui` project. An unrecognized value throws a clear error at config-load time rather than silently falling back.
- `HEADLESS` — defaults to headless (`true`); set `HEADLESS=false` to watch the browser run. `npm run test:headed` still works as a CLI override (`--headed` beats `.env` regardless of `HEADLESS`).
- `DEVICE` / `VIEWPORT_WIDTH` / `VIEWPORT_HEIGHT` — optional emulation on top of whichever browser `BROWSER_NAME` selected.

To run against a different browser, edit `BROWSER_NAME` in `.env` (or override it inline per the shell table above) — there's no `--project=firefox` flag anymore, since there's only one `ui` project.

---

## Parallelization and retries

- `fullyParallel: true` schedules every scenario independently, not just every file — Playwright distributes individual scenarios across workers.
- `WORKERS` env var overrides the worker count (defaults: unset locally, `2` in CI).
- `RETRIES` env var overrides the retry count (defaults: `0` locally, `1` in CI).
- Because page/API objects are constructed fresh per scenario and hold no shared state, a retried scenario gets a brand-new `page`/`UsersApi`/etc., so retries don't inherit state from the failed attempt.
- `testdata/testDataFactory.ts` deep-clones every JSON file it loads before returning it (`JSON.parse(JSON.stringify(...))`). `require()` caches the underlying module, so without the clone, a test that mutated its returned data would leak that mutation into every other test sharing the same worker for the rest of the run — the clone guarantees each caller gets an independent copy.

Example (multiple variables at once):

| Shell | Command |
|---|---|
| Git Bash / macOS / Linux | `RETRIES=1 WORKERS=4 npm test` |
| PowerShell | `$env:RETRIES=1; $env:WORKERS=4; npm test` |
| cmd.exe | `set RETRIES=1&& set WORKERS=4&& npm test` |

---

## Tags

Gherkin tags on a `Scenario` (e.g. `@UnitTest`, `@Regression`, `@API`) are picked up automatically by `playwright-bdd` and become native Playwright test tags — no extra config needed. A scenario can carry more than one tag (e.g. `login.feature`'s "Successful login" scenario is both `@UnitTest` and `@Regression`).

Filter by tag with `--grep`/`--grep-invert`, either via the `npm run test:unit` / `test:regression` scripts above, or directly:

```bash
npx playwright test --grep @UnitTest
npx playwright test --grep-invert @Regression
```

---

## Logging and debugging

Every worker process writes its own log file to `logs/thread_<pid>.log` (gitignored, cleared at the start of each run by `global-setup.ts`). Two global hooks in `utils/fixtures.ts` write to it automatically — no per-step logging code needed:

- **`Before`**: logs the scenario name (plus `(retry N)` if this is a retried attempt) as soon as it starts.
- **`After`**: logs `Scenario PASSED: <title>` or `Scenario FAILED: <title>`, and on failure, the actual error message(s) Playwright captured (`testInfo.errors`) — so you can trace what went wrong straight from the log file, without reopening the HTML report or a trace.

Example failure entry:

```
[2026-07-02T09:57:26.030] [ERROR] default - Scenario FAILED: Login fails with an invalid password
Error: No test user "invalidPasswordXXX" found in testdata/dev/users.json
```

Set `LOG_LEVEL` in `.env` to control verbosity (see the [environment configuration table](#environment-configuration)). Need a logger inside a step or page/API object? Take the worker-scoped `logger` fixture the same way `fixtures.ts` does — destructure it from the fixtures object (`async ({ logger }) => { logger.info(...) }`).

---

## Viewing reports

- Every run writes its own timestamped HTML report folder — `playwright-report/<ISO-timestamp>/` — instead of overwriting the previous run's report, so you can compare a past run against a new one (`playwright-report/`, gitignored).
- `npm run report` runs `scripts/open-latest-report.js`, which finds the most recently modified folder under `playwright-report/` and opens it — no need to remember or type a timestamp.
- The `list` reporter prints pass/fail per scenario directly to the terminal as tests run.
- On failure, screenshots/videos/traces are attached per `SCREENSHOT_CONDITION`/`VIDEO_RECORDING_CONDITION`/`TRACE_CONDITION` in `.env` — open a trace with `npx playwright show-trace <path-to-trace.zip>`.
- To open a specific past run's report directly: `npx playwright show-report playwright-report/<timestamp>`.
- `playwright-report/` isn't pruned automatically — old run folders accumulate locally until you delete them.

---

## Writing new tests

1. Add a `.feature` file under `features/ui/` or `features/api/`.
2. Add/extend a `*.steps.ts` file under `step-definitions/`, importing `Given/When/Then` **from `../utils/fixtures`**, not from `playwright-bdd` directly (that's what wires up the custom fixtures below).
3. For a new UI flow: add a page object under `pages/*.page.ts`, then register it in `pages/pageFactory.ts` (constructor + `getXPage()` getter).
4. For a new API resource: add a class under `apis/*.api.ts` extending `BaseApiClient` (constructor takes `request` and an optional `lob`, defaulting to `process.env.LOB ?? 'default'`), and instantiate it directly in the step file (`new YourApi(request)`) — no factory or fixture needed. For a new LOB, add its base URL to `apis/lobBaseUrls.json`.
5. For new test data: add a JSON file under `testdata/<environment>/` and a one-line getter method on `TestDataFactory`.
6. Run `npm test` (it regenerates `.features-gen/` automatically via `bddgen`, which is gitignored).
7. Before committing, run `npm run typecheck` and `npm run lint` — neither runs automatically as part of `npm test`.

---

## Troubleshooting

- **`Unknown BROWSER_NAME "..."` error on startup** — `BROWSER_NAME` in `.env` must be exactly `chromium`, `firefox`, or `webkit`.
- **`Unknown LOB "..."` error** — the LOB name (from the `LOB` env var or an explicit constructor argument, e.g. `new UsersApi(request, 'globex')`) doesn't have an entry in `apis/lobBaseUrls.json`. Add it there.
- **Invalid `RETRIES`/`WORKERS`/`SLOWMO`/`VIEWPORT_WIDTH`/`VIEWPORT_HEIGHT`** — these must be plain numbers; a non-numeric value throws a clear error at config-load time (same as `BROWSER_NAME`) instead of silently misbehaving.
- **`No test user "..." found in testdata/<env>/users.json`** — the key used in a `.feature` file's `When I log in as the "..." test user` step doesn't exist in `testdata/<TEST_ENVIRONMENT>/users.json`. Check the JSON file's keys and `TEST_ENVIRONMENT` match.
- **A UI test times out waiting on a locator** — check whether the target site (`LOGIN_APP_URL`, a public demo site) is rate-limiting repeated runs; re-run after a short wait.
- **`tsc --noEmit` errors after pulling changes** — run `npm install` again; a dependency or type declaration may have changed.
- **`eslint` errors after pulling changes** — run `npm install` again; `eslint.config.js`'s rules or dependencies may have changed.
- **Browser binaries missing** — run `npx playwright install` again (this doesn't happen automatically on `npm install`).
- **Need to trace what happened in a failed run** — check `logs/thread_<pid>.log` first; every scenario logs a clear `PASSED`/`FAILED` line with the error message (see [Logging and debugging](#logging-and-debugging)).
- **(Windows) `'VAR' is not recognized as an internal or external command`** — you used bash-style inline env vars (`VAR=value command`) in PowerShell or cmd.exe, which don't support that syntax. Use the PowerShell/cmd.exe equivalents shown throughout this doc, or switch to Git Bash.
- **(Windows) A script silently no-ops or `&&` behaves oddly in cmd.exe** — prefer PowerShell or Git Bash over cmd.exe for anything beyond the single-line examples above; cmd.exe's quoting/chaining rules are more limited.
- **(Windows) `npm install` fails on a native dependency build step** — make sure a recent Node.js LTS is installed (this project has no native/node-gyp dependencies itself, but a corrupted global npm cache can still cause this); try `npm cache clean --force` then `npm install` again.
