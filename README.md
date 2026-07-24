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
- [Naming conventions](#naming-conventions)
- [Architecture](#architecture)
  - [Page objects and API objects](#page-objects-and-api-objects)
  - [Test data factory](#test-data-factory)
- [Running tests](#running-tests)
- [Multi-LOB testing](#multi-lob-testing)
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
| [`dotenv`](https://www.npmjs.com/package/dotenv) | Loads `.env.<environment>` then `.env` into `process.env` |
| [`cross-env`](https://www.npmjs.com/package/cross-env) | Sets env vars inline in npm scripts (e.g. `execute-ui-tests-qa`) the same way on Windows, macOS, and Linux |
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

**5. Confirm `.env`, `.env.dev`, `.env.qa` exist and review them** (all tracked in the repo with working defaults — public demo endpoints, no real secrets — so this step is optional to get started)

| Shell | Command |
|---|---|
| Git Bash / macOS / Linux | `cat .env .env.dev` |
| PowerShell | `Get-Content .env, .env.dev` |
| cmd.exe | `type .env .env.dev` |

**6. Run the default test suite to confirm everything works**

```bash
npm test
```

If it finishes with `3 passed`, the install is good.

---

## Environment configuration

Configuration is split across two kinds of files, both tracked in the repo with working defaults (public demo endpoints, no real secrets):

- **`.env`** — settings that are the same regardless of which environment you're testing against (browser, headless, retries, log level, ...).
- **`.env.dev`** / **`.env.qa`** — settings that actually differ per environment (`API_BASE_URL`, `LOGIN_APP_URL`, `TEST_ENVIRONMENT`). Only one of these loads per run.

`playwright.config.ts` decides which per-environment file to load from the `TEST_ENVIRONMENT` value already present in the shell (defaulting to `dev` if unset), loads that file first, then loads the shared `.env` on top — `dotenv` never overrides a variable that's already set, so `.env` only fills in whatever the per-environment file didn't provide. To add a third environment (e.g. `staging`), add `.env.staging` with the same three keys — no code change needed.

| Variable | Purpose | Default / example | Lives in |
|---|---|---|---|
| `BROWSER_NAME` | Which browser engine the `ui` project uses — `chromium` \| `firefox` \| `webkit`. An unrecognized value throws a clear error at config-load time. | `chromium` | `.env` |
| `DEVICE` | Optional Playwright device-emulation preset name (e.g. `iPhone 13`). Takes priority over `VIEWPORT_WIDTH`/`VIEWPORT_HEIGHT` if set. | *(empty = off)* | `.env` |
| `HEADLESS` | Whether the browser runs headless. `HEADLESS=false` to watch it run. `--headed` on the CLI overrides this regardless of the value here. | `true` | `.env` |
| `SLOWMO` | Milliseconds of delay Playwright inserts between actions — useful for watching a headed run. Non-numeric values throw a clear error at config-load time. | `0` | `.env` |
| `VIEWPORT_WIDTH` / `VIEWPORT_HEIGHT` | Viewport size, used when `DEVICE` isn't set. Non-numeric values throw a clear error at config-load time. | `1280` / `720` | `.env` |
| `VIDEO_RECORDING_CONDITION` | Playwright's `video` option — `off` \| `on` \| `retain-on-failure` \| `on-first-retry`. | `retain-on-failure` | `.env` |
| `SCREENSHOT_CONDITION` | Playwright's `screenshot` option — `off` \| `on` \| `only-on-failure`. | `only-on-failure` | `.env` |
| `TRACE_CONDITION` | Playwright's `trace` option — `off` \| `on` \| `retain-on-failure` \| `on-first-retry`. | `on-first-retry` | `.env` |
| `LOG_LEVEL` | log4js log level (`1`–`5`; see `utils/logger.ts`). | `4` | `.env` |
| `RETRIES` | Overrides Playwright's retry count. Non-numeric values throw a clear error at config-load time. | `0` locally, `1` in CI | `.env` |
| `WORKERS` | Overrides Playwright's worker count. Non-numeric values throw a clear error at config-load time. | unset locally, `2` in CI | `.env` |
| `MemberPortal_url`, `MP_userName`, `MP_password`, `AUTH_LOCATION` | Not currently read by any code — placeholders reserved for an upcoming Member Portal test target. | — | `.env` |
| `TEST_ENVIRONMENT` | Which per-environment file loads, and which `testdata/<environment>/` folder the test data factory reads from. | `dev` | `.env.dev` / `.env.qa` |
| `LOGIN_APP_URL` | Base URL for the UI login scenarios (`pages/login.page.ts`). | `https://practicetestautomation.com/practice-test-login/` | `.env.dev` / `.env.qa` |
| `API_BASE_URL` | Base URL every API object (`apis/*.api.ts`) targets, via `BaseApiClient`. Missing values throw a clear error at request time. | `https://jsonplaceholder.typicode.com/` | `.env.dev` / `.env.qa` |
| `APP_BEARER_TOKEN` | Not currently read by any code — a placeholder token source for the first endpoint that needs bearer-token auth. `BaseApiClient.getAuthHeaders(accessToken)` takes the token as a parameter rather than reading this var itself, so a caller decides whether it comes from here, a login step, or somewhere else. | *(empty)* | `.env.dev` / `.env.qa` |

To run against QA instead of the default `dev`:

| Shell | Command |
|---|---|
| Git Bash / macOS / Linux | `TEST_ENVIRONMENT=qa npm test` |
| PowerShell | `$env:TEST_ENVIRONMENT="qa"; npm test` |
| cmd.exe | `set TEST_ENVIRONMENT=qa&& npm test` |

To point the suite at different values otherwise, either edit `.env`/`.env.dev`/`.env.qa` directly, or override a variable for a single run:

| Shell | Command |
|---|---|
| Git Bash / macOS / Linux | `BROWSER_NAME=firefox npm test` |
| PowerShell | `$env:BROWSER_NAME="firefox"; npm test` |
| cmd.exe | `set BROWSER_NAME=firefox&& npm test` |

---

## Project layout

```
features/
  ui/
    lob/                  Per-LOB UI .feature files - each runs once per selected LOB (see Multi-LOB testing)
  api/                    API .feature files (run under the "api" project, no browser launched)
step-definitions/
  *.steps.ts              Step definitions, grouped by feature area, import Given/When/Then
                           from ../utils/fixtures
pages/
  login.page.ts            Page object - locators as class fields, methods for actions/assertions
  pageFactory.ts            One getXPage() getter per page, lazily constructing (and caching) it on
                           first access - injected into steps as the `pageFactory` fixture
apis/
  baseApiClient.ts          Shared base: reads the API_BASE_URL env var + stores Playwright's
                           APIRequestContext
  users.api.ts              One class per resource, extends BaseApiClient, builds its own URLs
testdata/
  lobs.json                 LOB roster + Plan membership (shared across environments)
  featureApplicability.json Which restricted features apply to which LOBs/Plans (shared)
  dev/lobCredentials.json   Per-LOB login credentials (valid/invalid sets), for TEST_ENVIRONMENT=dev
  qa/lobCredentials.json    Same shape, for TEST_ENVIRONMENT=qa
  dev/createUserPayloads.json  API createUser() request bodies, keyed by case
  qa/createUserPayloads.json   Same shape, for TEST_ENVIRONMENT=qa
  testDataFactory.ts        Instance-based factory; one plain getXxxData() method per JSON file
utils/
  fixtures.ts               Registers the test-scoped `pageFactory` fixture and the
                           worker-scoped `logger` fixture, produces Given/When/Then/Before/
                           After via createBdd(), and defines the global Before/After hooks
                           (scenario start/PASS/FAIL logging, viewport/device report
                           attachment) - every *.steps.ts file imports Given/When/Then from here
  logger.ts                 log4js wrapper, one log file per worker process
  baseUtil.ts                Log directory cleanup, used from global-setup.ts
playwright.config.ts       Projects ("api" + one per LOB, built from testdata/lobs.json), reporters,
                           screenshot/video/trace config, bddgen config, env-driven browser/retries/
                           workers, with validated numeric env vars
global-setup.ts            Runs once before all workers: clears old logs (.env is already loaded by
                           the time this runs, via playwright.config.ts)
tsconfig.json               TypeScript compiler options (strict, no emit - Playwright runs .ts directly)
eslint.config.js            ESLint flat config (typescript-eslint recommended rules)
scripts/
  open-latest-report.js      Finds and opens the most recent playwright-report/<timestamp>/ folder
                           (used by `npm run report`) - plain Node, works the same on every OS
```

---

## Naming conventions

Enforced automatically by `npm run lint` (`@typescript-eslint/naming-convention` in `eslint.config.js`), not just documentation — a violation fails lint the same as any other rule.

| What | Convention | Example |
|---|---|---|
| Classes, interfaces, type aliases, enums | `PascalCase` | `PageFactory`, `BaseApiClient`, `TestFixtures` |
| Variables, functions, methods, parameters | `camelCase` | `getLobCredentials()`, `dataFactory`, `screenshotMode` |
| Class fields, incl. `private` ones | `camelCase`, no leading underscore | `private loginPage?: LoginPage` (not `_loginPage`) — the `private` keyword is already the privacy signal |
| Module-level fixed-literal constants | `SCREAMING_SNAKE_CASE` | `TEST_DATA_PATH` in `testDataFactory.ts` |
| Any other `const`, even derived/computed ones | `camelCase` | `browserName`, `reportTimestamp` — stays camelCase even though it's a `const`, because the value isn't a hardcoded literal |
| Env vars (`.env`/`.env.dev`/`.env.qa`) | `SCREAMING_SNAKE_CASE` | `BROWSER_NAME`, `TEST_ENVIRONMENT` |
| Files | `camelCase.ts`, domain-suffixed where applicable | `pageFactory.ts`, `login.page.ts`, `users.api.ts`, `lob.steps.ts` |
| Folders | `kebab-case` (a single word is trivially kebab-case) | `step-definitions/`, `apis/`, `pages/` |
| Object/type literal property names | Not enforced | `Authorization` header, JSON API field names — these often have to match an external contract, not our own convention |
| `Given`/`When`/`Then`/`Before`/`After`/`BeforeAll`/`AfterAll` | `PascalCase` (explicit exception) | Destructured from `createBdd()` in `utils/fixtures.ts` — intentionally mirrors Gherkin keywords rather than following the general camelCase rule |

Two conventions that aren't (and can't easily be) lint-enforced, so they rely on code review instead:
- **Booleans** — prefix with `is`/`has`/`should`/`can` (e.g. `isValid`, `hasError`) so the name reads as a yes/no question. Not currently exercised anywhere in this codebase — apply it the first time a boolean-typed variable/property shows up.
- **Return types** — don't annotate when TypeScript can already infer it unambiguously (established by removing several redundant `: Promise<void>`, `: LoginPage` annotations earlier in this project's history); do annotate at exported/public API boundaries where the inferred type might not be obvious to a caller.

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
  (see `step-definitions/lob.steps.ts`). Because it's test-scoped, **the same `PageFactory` instance is shared across every step in one scenario** — `pages/pageFactory.ts` lazily constructs and caches each page on first access (`this.loginPage ??= new LoginPage(this.page)`), so a page used by 3 different steps in the same scenario is only ever built once. Add a new page by adding a private field + a `getXPage()` getter to `PageFactory` — no changes needed anywhere `pageFactory` is already used.

- **APIs** (`apis/*.api.ts`) — extend `apis/baseApiClient.ts`'s `BaseApiClient`. Its constructor reads the single `API_BASE_URL` env var directly — a missing value throws a clear error immediately rather than silently sending requests to `undefined`. Each resource method then builds its own URL (`this.baseUri + 'path'`) and calls `this.request.get/post(...)` directly — URL-building lives at the service layer, not in a shared base helper. No factory, and not a fixture: step definitions just do
  ```ts
  const usersApi = new UsersApi(request);
  const response = await usersApi.getUsers();
  ```
  (see `step-definitions/api.steps.ts`), using Playwright's built-in `request` fixture. Since `UsersApi` adds no constructor of its own, it inherits `BaseApiClient`'s directly — a new resource class only needs its own constructor if it has extra setup beyond what the base class already does. If a future endpoint needs bearer-token auth, call the inherited `this.getAuthHeaders(accessToken)` (throws if `accessToken` is falsy) and spread it into that method's `headers` — the token itself is passed in by the caller (e.g. from `APP_BEARER_TOKEN`, or a token obtained via a login step), not read from an env var inside `BaseApiClient` — not implemented on `UsersApi` today since neither of its methods need auth.

Both give every scenario a fresh, isolated instance — no shared mutable state *between* tests, which is what makes parallel workers and retries safe. (Sharing *within* one scenario, via the `pageFactory` fixture, is safe precisely because it's rebuilt fresh for every test/retry — see [Parallelization and retries](#parallelization-and-retries).)

### Test data factory

Per-environment test data (e.g. login credentials) lives in JSON under `testdata/<environment>/` (`testdata/dev/lobCredentials.json`), keyed by LOB then by case (`valid`, `invalidUsername`, `invalidPassword`). The environment folder is selected by the `TEST_ENVIRONMENT` env var (defaults to `dev`), so pointing the suite at a different environment's data is a one-line env change, not a code change. (LOB roster/Plan/applicability data — `lobs.json`, `featureApplicability.json` — is shared across environments and lives at the `testdata/` root; see [Multi-LOB testing](#multi-lob-testing).)

`testdata/testDataFactory.ts` is instance-based (`new TestDataFactory()`), reads its environment from `process.env.TEST_ENVIRONMENT` in the constructor, and has one plainly-named method per JSON file that loads it via `require(...)` and returns the whole parsed file — e.g. `getLobCredentials()` returns all of `lobCredentials.json`. Callers index into it themselves, e.g. `new TestDataFactory().getLobCredentials()['LAEX'].valid` (see `step-definitions/lob.steps.ts`). Deliberately untyped (no per-domain interfaces) to keep adding a new JSON file cheap — add a new data domain by adding the file under `testdata/<environment>/` plus a one-line `getXxxData()` method. Same pattern for API request bodies — `getCreateUserPayloads()['valid']` reads `createUserPayloads.json` for `UsersApi.createUser()` (see `step-definitions/api.steps.ts`), instead of hardcoding the payload inline in the step.

Scaling to many LOBs needs **no code change at all** — it's purely adding entries to the JSON
files (a LOB to `lobs.json` + its credentials to each `lobCredentials.json`), never touching a
`.feature` file. `lob.steps.ts` throws a clear error if a scenario runs for a LOB whose
credentials are missing.

---

## Running tests

`npm run <script>` runs `bddgen` first (regenerating `.features-gen/` from the current `.feature`/step-definition files), then invokes Playwright.

| Command | What it runs |
|---|---|
| `npm test` | All per-LOB UI scenarios (each runs once per LOB — see [Multi-LOB testing](#multi-lob-testing)), browser from `BROWSER_NAME` (default `chromium`), against whichever environment `TEST_ENVIRONMENT` already resolves to (`dev` if unset) |
| `npm run execute-ui-tests-dev` / `npm run execute-ui-tests-qa` | Same as `npm test`, explicitly against `dev` / `qa` (sets `TEST_ENVIRONMENT` for you via `cross-env`, so it works the same on every shell/OS) |
| `npm run execute-api-tests` | API scenarios only (no browser launched) |
| `npm run execute-api-tests-dev` / `npm run execute-api-tests-qa` | Same as `npm run execute-api-tests`, explicitly against `dev` / `qa` |
| `npm run execute-unit-tests` | UI scenarios tagged `@UnitTest` only |
| `npm run execute-regression-tests` | UI scenarios tagged `@Regression` only |
| `npm run execute-lob-tests` | The per-LOB scenarios under `features/ui/lob/**`, one run per selected LOB — see [Multi-LOB testing](#multi-lob-testing) for LOB/Plan/tag selection |
| `npm run execute-lob-tests-dev` / `npm run execute-lob-tests-qa` | Same as `execute-lob-tests`, explicitly against `dev` / `qa` |
| `npm run bddgen` | Regenerates `.features-gen/` from `.feature` files without running anything |
| `npm run report` | Opens the most recent Playwright HTML report (each run gets its own timestamped folder) |
| `npm run typecheck` | `tsc --noEmit` — type-checks the whole project, no build output |
| `npm run lint` | `eslint .` — lints the whole project against `eslint.config.js` |

You can also drop straight to the Playwright CLI for anything not covered by a script, e.g.:

```bash
npx playwright test --project=LAEX --grep "invalid username"   # one LOB
npx playwright test --project=LAEX --project=api               # a LOB + the API project
npx playwright test --project=LAEX --headed                    # visible browser window
npx playwright test --project=LAEX --debug                     # step-through debugger
npx playwright test --ui                                       # interactive UI mode
```

---

## Multi-LOB testing

The app serves many **LOBs** (lines of business, e.g. `LAEX`, `NCEX`, `LADS`, `MIDS`), each grouped under one or more **Plans** (`Exchange`, `Medicaid`, `Medicare`, `CHIP`). A scenario is written **once** and run against any LOB(s) — each LOB is its own Playwright project, built dynamically from config, with the LOB code injected via the `lob` test option (like running the same tests across browsers). Nothing about a LOB lives in the Gherkin.

**Config (all under `testdata/`):**

| File | Scope | Purpose |
|---|---|---|
| `lobs.json` | shared | The roster: which LOBs exist and each one's Plan membership (`{ "LAEX": { "plans": ["Exchange"] } }`) |
| `featureApplicability.json` | shared | Which restricted features apply to which LOBs (see below) |
| `<env>/lobCredentials.json` | per-env | Per-LOB login credentials (`dev` vs `qa` differ) |

**Adding a new LOB is config-only** — one line in `lobs.json` plus its credentials in each `<env>/lobCredentials.json`. No scenario, step, or config-code edits.

### Selecting what runs — one command, four axes

`npm run execute-lob-tests` is the single entry point. Selection uses two composable mechanisms:

- **Env vars before the command** — decide *which LOB projects exist* (read at config-load, before Playwright starts):
  - `LOBS=LAEX,MIDS` — only these LOBs
  - `PLANS=Exchange,Medicare` — every LOB under these Plans
- **Playwright flags after `-- `** — filter *within* the selected projects:
  - `--project=LAEX` — a specific LOB (native, exact name)
  - `--grep @Regression` — by tag (test type / test-case ID / any custom tag — see [Tags](#tags))

Omit an axis and it's unconstrained (no `LOBS`/`PLANS` = all LOBs; no `--grep` = all tags).

| Goal | Command |
|---|---|
| All LOBs | `npm run execute-lob-tests` |
| One Plan | `PLANS=Exchange npm run execute-lob-tests` |
| Several Plans | `PLANS=Exchange,Medicare npm run execute-lob-tests` |
| One LOB | `npm run execute-lob-tests -- --project=LAEX` |
| Several LOBs | `LOBS=LAEX,MIDS npm run execute-lob-tests` |
| Plan ∩ LOB subset | `PLANS=Exchange LOBS=LAEX npm run execute-lob-tests` |
| Everything at once | `PLANS=Medicare LOBS=LADS,MIDS npm run execute-lob-tests -- --grep @Regression` |

Use `execute-lob-tests-dev` / `-qa` to pin the environment; pass `LOBS=`/`PLANS=`/`--grep` the same way.

### Feature applicability (some features are only for a few LOBs or Plans)

Most scenarios (login, enrollment) run for **every** LOB. Some features are only enabled for a subset — `hra.feature` in this repo is just an example; you'll have others. Declare each restricted feature in `testdata/featureApplicability.json`, keyed by its **feature file name**. The value can be:

```jsonc
{
  "hra.feature":     ["LAEX", "LADS", "MIDS"],          // explicit list of LOBs
  "planDoc.feature": { "plans": ["Exchange"] },          // every LOB under Exchange (self-updating)
  "mixed.feature":   { "plans": ["Medicare"], "lobs": ["LAEX"] }  // union of a Plan + extra LOBs
}
```

- **Explicit LOBs** — a hand-picked list.
- **Plan-based** (`{ "plans": [...] }`) — resolves to every LOB in those Plans and **self-updates**: add a new LOB to that Plan in `lobs.json` and it's automatically covered, with no edit here.
- **Union** — combine `plans` and `lobs`.

A LOB the feature doesn't apply to simply never runs that feature file (enforced structurally, so it never interferes with `--grep`). Unlisted features are universal to all LOBs. A typo (unknown LOB or Plan) fails loudly at config-load.

**Adding a restricted feature:** put its `.feature` file under `features/ui/lob/`, then add one entry to `featureApplicability.json` scoping it. That's it.

---

## Browser selection

The `ui` project's browser engine and headed/headless mode are both decided by env vars in `.env`, not by CLI flags or hardcoded config:

- `BROWSER_NAME` — `chromium` (default) | `firefox` | `webkit`. Read once in `playwright.config.ts` to pick the Playwright `devices[...]` preset applied to every browser-based (per-LOB) project. An unrecognized value throws a clear error at config-load time rather than silently falling back.
- `HEADLESS` — defaults to headless (`true`); set `HEADLESS=false` to watch the browser run. `npx playwright test --project=LAEX --headed` still works as a CLI override (`--headed` beats `.env` regardless of `HEADLESS`).
- `DEVICE` / `VIEWPORT_WIDTH` / `VIEWPORT_HEIGHT` — optional emulation on top of whichever browser `BROWSER_NAME` selected.

To run against a different browser, edit `BROWSER_NAME` in `.env` (or override it inline per the shell table above) — it applies to every per-LOB project, so there's no separate `--project=firefox` (the projects are the LOBs, not the browsers).

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

Gherkin tags on a `Scenario` (e.g. `@Smoke`, `@Regression`, `@API`) are picked up automatically by `playwright-bdd` and become native Playwright test tags — no extra config needed. A scenario can carry more than one tag (e.g. `lob/login.feature`'s "Login succeeds" scenario is both `@Smoke` and `@Regression`).

Filter by tag with `--grep`/`--grep-invert`, either via the `npm run execute-unit-tests` / `execute-regression-tests` scripts above, or directly:

```bash
npx playwright test --grep @UnitTest
npx playwright test --grep-invert @Regression
```

### Combining multiple tags

`--grep` takes a **regex**, so you can combine tags with boolean logic. Quote the expression so the shell doesn't interpret `|`, `(`, `)`, or `*`.

| Logic | Syntax | Matches |
|---|---|---|
| **OR** (any of) | `--grep "@Smoke\|@Regression"` | has `@Smoke` **or** `@Regression` |
| **AND** (all of) | `--grep "(?=.*@Smoke)(?=.*@Regression)"` | has `@Smoke` **and** `@Regression` |
| **EXCLUDE** | `--grep @Regression --grep-invert @WIP` | `@Regression` but **not** `@WIP` |

OR is the common case. If you frequently need AND-of-tags, a single combined tag (e.g. `@SmokeRegression`) usually reads better than the lookahead form.

Tag filters work with **any** tag — test type (`@Smoke`, `@Regression`), test-case IDs (`@TC-1234`), or your own custom tags — and **compose with LOB/Plan selection**, since [Multi-LOB testing](#multi-lob-testing) never uses `--grep` for its own routing:

```bash
# Regression, excluding WIP, for the Exchange plan's LOBs, in qa
PLANS=Exchange npm run execute-lob-tests-qa -- --grep @Regression --grep-invert @WIP

# A specific test-case ID across a couple of LOBs
LOBS=LAEX,MIDS npm run execute-lob-tests -- --grep @TC-1234
```

---

## Logging and debugging

Every worker process writes its own log file to `logs/thread_<pid>.log` (gitignored, cleared at the start of each run by `global-setup.ts`). Two global hooks in `utils/fixtures.ts` write to it automatically — no per-step logging code needed:

- **`Before`**: logs the scenario name (plus `(retry N)` if this is a retried attempt) as soon as it starts.
- **`After`**: logs `Scenario PASSED: <title>` or `Scenario FAILED: <title>`, and on failure, the actual error message(s) Playwright captured (`testInfo.errors`) — so you can trace what went wrong straight from the log file, without reopening the HTML report or a trace.

Example failure entry:

```
[2026-07-02T09:57:26.030] [ERROR] default - Scenario FAILED: Login is rejected with an invalid password
Error: No "invalidPassword" credentials for LOB "LAEX" in testdata/dev/lobCredentials.json
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
4. For a new API resource: add a class under `apis/*.api.ts` extending `BaseApiClient` (no constructor needed unless the resource has extra setup), and instantiate it directly in the step file (`new YourApi(request)`) — no factory or fixture needed. All resources share the single `API_BASE_URL` env var.
5. For new test data: add a JSON file under `testdata/<environment>/` and a one-line getter method on `TestDataFactory`.
6. Run `npm test` (it regenerates `.features-gen/` automatically via `bddgen`, which is gitignored).
7. Before committing, run `npm run typecheck` and `npm run lint` — neither runs automatically as part of `npm test`.

---

## Troubleshooting

- **`Unknown BROWSER_NAME "..."` error on startup** — `BROWSER_NAME` in `.env` must be exactly `chromium`, `firefox`, or `webkit`.
- **`API_BASE_URL is not set` error** — add `API_BASE_URL` to `.env` (see [Environment configuration](#environment-configuration)).
- **Invalid `RETRIES`/`WORKERS`/`SLOWMO`/`VIEWPORT_WIDTH`/`VIEWPORT_HEIGHT`** — these must be plain numbers; a non-numeric value throws a clear error at config-load time (same as `BROWSER_NAME`) instead of silently misbehaving.
- **`No "..." credentials for LOB "..." in testdata/<env>/lobCredentials.json`** — a LOB is in the roster (`lobs.json`) but is missing that credential set in `testdata/<TEST_ENVIRONMENT>/lobCredentials.json`. Check the JSON file's keys and `TEST_ENVIRONMENT` match.
- **`featureApplicability "..." names unknown LOB/plan "..."`** — an entry in `testdata/featureApplicability.json` references a LOB or Plan that no LOB in `lobs.json` has. Fix the typo or add the LOB/Plan to the roster.
- **A UI test times out waiting on a locator** — check whether the target site (`LOGIN_APP_URL`, a public demo site) is rate-limiting repeated runs; re-run after a short wait.
- **`tsc --noEmit` errors after pulling changes** — run `npm install` again; a dependency or type declaration may have changed.
- **`eslint` errors after pulling changes** — run `npm install` again; `eslint.config.js`'s rules or dependencies may have changed.
- **Browser binaries missing** — run `npx playwright install` again (this doesn't happen automatically on `npm install`).
- **Need to trace what happened in a failed run** — check `logs/thread_<pid>.log` first; every scenario logs a clear `PASSED`/`FAILED` line with the error message (see [Logging and debugging](#logging-and-debugging)).
- **(Windows) `'VAR' is not recognized as an internal or external command`** — you used bash-style inline env vars (`VAR=value command`) in PowerShell or cmd.exe, which don't support that syntax. Use the PowerShell/cmd.exe equivalents shown throughout this doc, or switch to Git Bash.
- **(Windows) A script silently no-ops or `&&` behaves oddly in cmd.exe** — prefer PowerShell or Git Bash over cmd.exe for anything beyond the single-line examples above; cmd.exe's quoting/chaining rules are more limited.
- **(Windows) `npm install` fails on a native dependency build step** — make sure a recent Node.js LTS is installed (this project has no native/node-gyp dependencies itself, but a corrupted global npm cache can still cause this); try `npm cache clean --force` then `npm install` again.
