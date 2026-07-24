# PlaywrightBDD-TS

A BDD test framework using **[playwright-bdd](https://vitalets.github.io/playwright-bdd/)** + **TypeScript**. Gherkin `.feature` files compile into native Playwright specs (`bddgen`) and run on the Playwright runner — no CucumberJS runtime.

The whole suite is **LOB-scoped**: the app is defined by **Plans** and **LOBs** (lines of business), so every scenario — UI and API alike — runs once per LOB, selectable by LOB, Plan, or tag with no code changes. Covers UI (Page Object Model) and API (object-per-resource on Playwright's `request` context), with an environment-aware test-data factory and native reporting.

---

## Table of contents

- [Quick start](#quick-start)
- [Shells (Windows)](#shells-windows)
- [Environment configuration](#environment-configuration)
- [Project layout](#project-layout)
- [Running tests](#running-tests)
- [Multi-LOB testing](#multi-lob-testing)
- [Tags](#tags)
- [Architecture](#architecture)
- [Naming conventions](#naming-conventions)
- [Runtime configuration (browser, parallelism, retries)](#runtime-configuration-browser-parallelism-retries)
- [Logging & reports](#logging--reports)
- [Writing new tests](#writing-new-tests)
- [Troubleshooting](#troubleshooting)

---

## Quick start

**Prerequisites:** Node.js `>= 20` and npm `>= 10` (`.nvmrc` pins `20`), plus `git`. No global CLI tools needed. On Windows, [Git for Windows](https://git-scm.com/download/win) is recommended — it installs **Git Bash**, in which every command here works as written.

```bash
git clone https://github.com/ReleaseGuardian/AI-Quality-Hub.git
cd AI-Quality-Hub
npm install
npx playwright install        # Playwright browser binaries (Chromium/Firefox/WebKit)
npm test                      # runs the full suite; should end with all tests passing
```

`.env`, `.env.dev`, and `.env.qa` are tracked with working defaults (public demo endpoints, no real secrets), so no setup is needed to get started.

| Package | Role |
|---|---|
| [`@playwright/test`](https://playwright.dev/) | Runner, browser automation, assertions, HTML reporting |
| [`playwright-bdd`](https://vitalets.github.io/playwright-bdd/) | Compiles `.feature` files to specs (`bddgen`); binds `Given/When/Then` to fixtures via `createBdd()` |
| [`typescript`](https://www.typescriptlang.org/) | Strict mode, no build step (Playwright runs `.ts` directly) |
| [`dotenv`](https://www.npmjs.com/package/dotenv) | Loads `.env.<environment>` then `.env` into `process.env` |
| [`cross-env`](https://www.npmjs.com/package/cross-env) | Cross-platform inline env vars in npm scripts |
| [`log4js`](https://www.npmjs.com/package/log4js) | Per-worker file logging (`logs/thread_<pid>.log`) |
| [`eslint`](https://eslint.org/) + [`typescript-eslint`](https://typescript-eslint.io/) | Linting (flat config) |

---

## Shells (Windows)

Every `npm run <script>` works identically on all OSes. The only shell-specific syntax is setting an env var **inline** on the same line — bash/POSIX only. Translate as needed:

| Git Bash / macOS / Linux | PowerShell | cmd.exe |
|---|---|---|
| `TEST_ENVIRONMENT=qa npm test` | `$env:TEST_ENVIRONMENT="qa"; npm test` | `set TEST_ENVIRONMENT=qa&& npm test` |

All inline-env examples below use the bash form. **Recommendation:** use Git Bash on Windows so everything works verbatim.

---

## Environment configuration

Two kinds of config file, both tracked with working defaults:

- **`.env`** — settings that don't change per environment (browser, headless, retries, log level, …).
- **`.env.dev`** / **`.env.qa`** — settings that differ per environment (`API_BASE_URL`, `LOGIN_APP_URL`, `TEST_ENVIRONMENT`). One loads per run.

`playwright.config.ts` picks the per-environment file from `TEST_ENVIRONMENT` (default `dev`), loads it, then loads `.env` on top — `dotenv` never overrides an already-set value, so `.env` only fills gaps. Add a new environment by adding `.env.<name>` with the same three keys — no code change.

| Variable | Purpose | Default | File |
|---|---|---|---|
| `BROWSER_NAME` | Browser for the per-LOB projects — `chromium` \| `firefox` \| `webkit`. Invalid value throws at config load. | `chromium` | `.env` |
| `HEADLESS` | `false` to watch the browser. `--headed` on the CLI overrides it. | `true` | `.env` |
| `SLOWMO` | Delay (ms) between actions, for headed runs. | `0` | `.env` |
| `DEVICE` | Playwright device preset (e.g. `iPhone 13`); overrides viewport if set. | *(off)* | `.env` |
| `VIEWPORT_WIDTH` / `VIEWPORT_HEIGHT` | Viewport size when `DEVICE` is unset. | `1280` / `720` | `.env` |
| `SCREENSHOT_CONDITION` | `off` \| `on` \| `only-on-failure`. | `only-on-failure` | `.env` |
| `VIDEO_RECORDING_CONDITION` | `off` \| `on` \| `retain-on-failure` \| `on-first-retry`. | `retain-on-failure` | `.env` |
| `TRACE_CONDITION` | `off` \| `on` \| `retain-on-failure` \| `on-first-retry`. | `on-first-retry` | `.env` |
| `LOG_LEVEL` | log4js level (`1`–`5`). | `4` | `.env` |
| `RETRIES` | Playwright retry count. Invalid value throws at config load. | `0` local, `1` CI | `.env` |
| `WORKERS` | Playwright worker count. Invalid value throws at config load. | auto local, `2` CI | `.env` |
| `TEST_ENVIRONMENT` | Which per-env file loads, and which `testdata/<environment>/` folder is read. | `dev` | `.env.dev` / `.env.qa` |
| `LOGIN_APP_URL` | Base URL for UI login scenarios. | *(public demo)* | `.env.dev` / `.env.qa` |
| `API_BASE_URL` | Base URL for API objects (via `BaseApiClient`). Missing value throws at request time. | *(public demo)* | `.env.dev` / `.env.qa` |

Numeric env vars (`SLOWMO`, `VIEWPORT_*`, `RETRIES`, `WORKERS`) throw a clear error at config-load time on a non-numeric value. A few keys in `.env*` (`APP_BEARER_TOKEN`, `MemberPortal_*`) are reserved placeholders not read by any code yet.

Run against QA, or override a single variable for one run:

```bash
TEST_ENVIRONMENT=qa npm test
BROWSER_NAME=firefox npm test
```

---

## Project layout

```
features/                    Every scenario is LOB-scoped - there are no non-LOB tests
  ui/lob/                    Per-LOB UI .feature files    (run once per selected LOB)
  api/lob/                   Per-LOB API .feature files   (browser-less, once per LOB)
step-definitions/
  *.steps.ts                 Step defs; import Given/When/Then from ../utils/fixtures
pages/
  login.page.ts              Page object - locators as fields, methods for actions/asserts
  pageFactory.ts             Lazy getXPage() per page; injected as the `pageFactory` fixture
apis/
  baseApiClient.ts           Base: reads API_BASE_URL, holds Playwright's APIRequestContext
  users.api.ts               One class per resource, extends BaseApiClient, builds its own URLs
testdata/
  lobs.json                  LOB roster + Plan membership          (shared across envs)
  featureApplicability.json  Which features apply to which LOBs/Plans (shared)
  <env>/lobCredentials.json  Per-LOB credentials (valid/invalid)   (per environment)
  <env>/createUserPayloads.json  API request bodies                (per environment)
  testDataFactory.ts         Instance-based factory, one getXxxData() per JSON file
utils/
  fixtures.ts                Registers fixtures (pageFactory, lob, logger), creates Given/When/
                             Then, and the global Before/After hooks (logging, report attachments)
  logger.ts / baseUtil.ts    log4js wrapper; log-dir cleanup
playwright.config.ts         Projects (one per LOB, from lobs.json), reporters, capture, bddgen,
                             env-driven browser/retries/workers with validated numeric env vars
global-setup.ts              Clears old logs before the run
scripts/open-latest-report.js  Opens the newest playwright-report/<timestamp>/ folder
```

---

## Running tests

Each `npm run <script>` runs `bddgen` first (regenerating `.features-gen/`), then Playwright.

| Command | Runs |
|---|---|
| `npm test` | Everything — UI + API — once per LOB |
| `npm run execute-ui-tests` | UI-only per-LOB scenarios (`features/ui/lob/**`) |
| `npm run execute-api-tests` | API-only per-LOB scenarios (`features/api/lob/**`, no browser) |
| `npm run execute-lob-tests` | Both layers (same as `npm test`, without the `pretest` hook) |
| `npm run execute-unit-tests` | Scenarios tagged `@UnitTest` (both layers) |
| `npm run execute-regression-tests` | Scenarios tagged `@Regression` (both layers) |
| `npm run bddgen` | Regenerate `.features-gen/` without running anything |
| `npm run report` | Open the most recent HTML report |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / `eslint .` |

Every `execute-*` script has `-dev` / `-qa` variants that pin `TEST_ENVIRONMENT`. To narrow by LOB, Plan, or tag, see [Multi-LOB testing](#multi-lob-testing).

Drop to the Playwright CLI for anything not scripted:

```bash
npx playwright test --project=LAEX --headed     # one LOB, visible browser
npx playwright test --project=LAEX --debug      # step-through debugger
npx playwright test --ui                        # interactive UI mode
```

---

## Multi-LOB testing

The app serves many **LOBs** (`LAEX`, `NCEX`, `LADS`, `MIDS`, …), each under one or more **Plans** (`Exchange`, `Medicaid`, `Medicare`, `CHIP`). A scenario is written **once**; each LOB is its own Playwright project (built dynamically from config) with the LOB code injected via the `lob` fixture — like running the same tests across browsers. Nothing about a LOB lives in the Gherkin.

**Adding a new LOB is config-only** — one line in `lobs.json` plus its credentials in each `<env>/lobCredentials.json`. No scenario, step, or config-code edits.

| File (`testdata/`) | Scope | Purpose |
|---|---|---|
| `lobs.json` | shared | Roster + Plan membership — `{ "LAEX": { "plans": ["Exchange"] } }` |
| `featureApplicability.json` | shared | Which restricted features apply to which LOBs (see below) |
| `<env>/lobCredentials.json` | per-env | Per-LOB credentials |

### Selecting what runs — layer × LOBs/Plans × tags

Three independent choices; mix freely:

1. **Layer** → the command: `execute-ui-tests`, `execute-api-tests`, or `execute-lob-tests` (both).
2. **Which LOBs** → env vars **before** the command: `LOBS=LAEX,MIDS` or `PLANS=Exchange,Medicare` (both = intersection; neither = all).
3. **Which scenarios** → flags **after** `-- `: `--project=LAEX` (one exact LOB) or `--grep @Tag` (see [Tags](#tags)).

Add `-dev` / `-qa` to any command to pin the environment. Always **quote** a `--grep` expression containing `|`, `(`, or `*`.

| Use case | Command |
|---|---|
| Everything (UI + API), all LOBs | `npm test` |
| All UI tests, all LOBs | `npm run execute-ui-tests` |
| All API tests, all LOBs | `npm run execute-api-tests` |
| UI tests for one LOB | `npm run execute-ui-tests -- --project=LAEX` |
| API tests for one LOB | `npm run execute-api-tests -- --project=LAEX` |
| UI tests for one Plan | `PLANS=Exchange npm run execute-ui-tests` |
| API tests for several Plans | `PLANS=Exchange,Medicare npm run execute-api-tests` |
| UI tests for a few LOBs | `LOBS=LAEX,MIDS npm run execute-ui-tests` |
| Plan ∩ LOB subset | `PLANS=Exchange LOBS=LAEX npm run execute-ui-tests` |
| Smoke tests (both layers) for 2 LOBs | `LOBS=LAEX,MIDS npm run execute-lob-tests -- --grep @Smoke` |
| Regression on Medicare LOBs, excluding WIP, in qa | `PLANS=Medicare npm run execute-lob-tests-qa -- --grep @Regression --grep-invert @WIP` |

### Running a specific set of scenarios (e.g. 5 of 100) for chosen LOBs

Give those scenarios **one shared tag** — even across different feature files — then grep it:

```gherkin
@Sprint42 @Regression
Scenario: Member updates their address
  ...
```

```bash
LOBS=LAEX,MIDS npm run execute-ui-tests  -- --grep @Sprint42   # 5 scenarios x 2 LOBs = 10 runs
LOBS=LAEX,MIDS npm run execute-api-tests -- --grep @Sprint42   # the same 5 as API instead
```

A scenario can carry many tags, so `@Sprint42` sits alongside `@Regression`/`@TC-1043`. With no shared tag, OR the IDs instead: `--grep "@TC-101|@TC-102|@TC-103"`.

### Feature applicability (features enabled for only some LOBs/Plans)

Most scenarios run for every LOB. For ones that don't, add an entry to `testdata/featureApplicability.json`, keyed by the **feature file name**:

```jsonc
{
  "hra.feature":     ["LAEX", "LADS", "MIDS"],                    // explicit LOBs
  "planDoc.feature": { "plans": ["Exchange"] },                  // every LOB under Exchange (self-updating)
  "mixed.feature":   { "plans": ["Medicare"], "lobs": ["LAEX"] } // union of a Plan + extra LOBs
}
```

- **Plan-based** entries **self-update** — add a LOB to that Plan in `lobs.json` and it's covered automatically.
- A LOB the feature doesn't apply to simply never runs that file (enforced by file, so it never interferes with `--grep`). Unlisted features are universal. An unknown LOB/Plan fails loudly at config load.

**Adding a restricted feature:** drop its `.feature` under `features/ui/lob/` or `features/api/lob/`, then add one entry to `featureApplicability.json`. That's it.

---

## Tags

Gherkin tags (`@Smoke`, `@Regression`, `@TC-1043`, …) are picked up automatically by `playwright-bdd` and become native Playwright tags. A scenario can carry several. Filter with `--grep` / `--grep-invert`:

| Logic | Syntax |
|---|---|
| Single | `--grep @Regression` |
| OR (any of) | `--grep "@Smoke\|@Regression"` |
| AND (all of) | `--grep "(?=.*@Smoke)(?=.*@Regression)"` |
| EXCLUDE | `--grep @Regression --grep-invert @WIP` |

Tag filters compose with LOB/Plan selection (they never fight each other — LOB routing uses folders, not tags). If you often need AND-of-tags, a single combined tag reads better than the lookahead form.

---

## Architecture

### Page objects and API objects

**Pages** (`pages/*.page.ts`) take a `Page` and expose UI actions. `utils/fixtures.ts` registers a test-scoped `pageFactory` fixture, so steps just destructure it:

```ts
Given('I am logged in for my LOB', async ({ pageFactory, lob }) => {
  const creds = new TestDataFactory().getLobCredentials()[lob].valid;
  await pageFactory.getLoginPage().goto();
  await pageFactory.getLoginPage().login(creds.username, creds.password);
});
```

`PageFactory` lazily constructs and caches each page (`this.loginPage ??= new LoginPage(this.page)`), so a page used by several steps in one scenario is built once. Add a page = one field + one `getXPage()` getter.

**APIs** (`apis/*.api.ts`) extend `BaseApiClient`, which reads `API_BASE_URL` (throwing if missing). Steps construct them directly on Playwright's `request` fixture — no factory, no fixture:

```ts
const usersApi = new UsersApi(request);
const response = await usersApi.getUsers();
```

(see `step-definitions/lobApi.steps.ts`). For future bearer-token auth, call the inherited `getAuthHeaders(token)` — the caller supplies the token, not the base class.

Every scenario gets fresh, isolated page/API instances (no shared state between tests), which is what makes parallel workers and retries safe.

### Test data factory

`testdata/testDataFactory.ts` reads `TEST_ENVIRONMENT` in its constructor and has one method per JSON file returning the whole parsed file (deep-cloned, so a mutating test can't leak into others sharing a worker). Callers index in themselves:

```ts
new TestDataFactory().getLobCredentials()['LAEX'].valid
```

Per-environment data lives in `testdata/<environment>/`; shared LOB roster/applicability lives at the `testdata/` root. Deliberately untyped — adding a data domain is a new JSON file plus a one-line getter. Scaling to many LOBs is pure data entry; a scenario running for a LOB with missing credentials fails with a clear error.

---

## Naming conventions

Enforced by `npm run lint` (`@typescript-eslint/naming-convention`), not just documented.

| What | Convention | Example |
|---|---|---|
| Classes, interfaces, types, enums | `PascalCase` | `PageFactory`, `BaseApiClient` |
| Variables, functions, methods, params | `camelCase` | `getLobCredentials()`, `dataFactory` |
| Class fields (incl. `private`) | `camelCase`, no leading `_` | `private loginPage?: LoginPage` |
| Fixed-literal module constants | `SCREAMING_SNAKE_CASE` | `TEST_DATA_PATH` |
| Other `const`s (derived/computed) | `camelCase` | `browserName`, `reportTimestamp` |
| Env vars | `SCREAMING_SNAKE_CASE` | `BROWSER_NAME` |
| Files / folders | `camelCase.ts` (domain-suffixed) / `kebab-case` | `login.page.ts`, `step-definitions/` |
| `Given`/`When`/`Then`/… | `PascalCase` (mirrors Gherkin) | from `createBdd()` |

Two review-only conventions: prefix booleans with `is`/`has`/`should`/`can`; annotate return types only where inference isn't obvious (e.g. public API boundaries).

---

## Runtime configuration (browser, parallelism, retries)

All driven by `.env` (see the [table above](#environment-configuration)):

- **Browser** — `BROWSER_NAME` picks the engine for every per-LOB project (the projects are the LOBs, not browsers, so there's no `--project=firefox`). `HEADLESS=false` or CLI `--headed` to watch it run; `DEVICE`/`VIEWPORT_*` for emulation.
- **Parallelism** — `fullyParallel: true` distributes individual scenarios across workers; `WORKERS` overrides the count.
- **Retries** — `RETRIES` overrides the count. Because page/API objects are rebuilt per scenario, a retry inherits no state from the failed attempt.

```bash
RETRIES=1 WORKERS=4 npm test
```

---

## Logging & reports

Each worker writes `logs/thread_<pid>.log` (gitignored, cleared each run). Global `Before`/`After` hooks in `utils/fixtures.ts` log scenario start and `PASSED`/`FAILED` (with the error message on failure) automatically — no per-step logging code:

```
[ERROR] Scenario FAILED: Login is rejected with an invalid password
Error: No "invalidPassword" credentials for LOB "LAEX" in testdata/dev/lobCredentials.json
```

Set `LOG_LEVEL` in `.env` for verbosity. Need a logger in a step? Destructure the worker-scoped `logger` fixture (`async ({ logger }) => { logger.info(...) }`).

Reports:

- Each run writes its own `playwright-report/<timestamp>/` (gitignored), so past runs aren't overwritten.
- `npm run report` opens the newest one; the `list` reporter also prints pass/fail live in the terminal.
- Screenshots/videos/traces attach on failure per the `*_CONDITION` env vars — open a trace with `npx playwright show-trace <trace.zip>`.

---

## Writing new tests

1. Add a `.feature` file under `features/ui/lob/` or `features/api/lob/`.
2. Add/extend a `*.steps.ts` file, importing `Given/When/Then` **from `../utils/fixtures`** (not `playwright-bdd` directly).
3. New UI flow → add a `pages/*.page.ts` and register it in `pageFactory.ts`. New API resource → add an `apis/*.api.ts` extending `BaseApiClient`, instantiated directly in the step.
4. New data → a JSON file under `testdata/<environment>/` plus a one-line getter on `TestDataFactory`.
5. A feature only for some LOBs? Add an entry to `featureApplicability.json` ([above](#feature-applicability-features-enabled-for-only-some-lobsplans)).
6. Run `npm test`, then `npm run typecheck` and `npm run lint` before committing (neither runs automatically).

---

## Troubleshooting

- **`Unknown BROWSER_NAME "..."`** — must be exactly `chromium`, `firefox`, or `webkit`.
- **`API_BASE_URL is not set`** — add it to `.env.dev` / `.env.qa`.
- **Invalid `RETRIES`/`WORKERS`/`SLOWMO`/`VIEWPORT_*`** — must be plain numbers (validated at config load).
- **`No "..." credentials for LOB "..."`** — the LOB is in `lobs.json` but missing that credential set in `testdata/<env>/lobCredentials.json`. Check keys and `TEST_ENVIRONMENT`.
- **`featureApplicability "..." names unknown LOB/plan "..."`** — a typo in `featureApplicability.json`, or the LOB/Plan isn't in `lobs.json`.
- **A UI test times out on a locator** — the public demo site may be rate-limiting; retry after a moment.
- **Browser binaries missing** — run `npx playwright install` (not automatic on `npm install`).
- **`tsc`/`eslint` errors after pulling** — run `npm install` again.
- **(Windows) `'VAR' is not recognized...`** — you used bash inline-env syntax in PowerShell/cmd; use the [translations](#shells-windows) or Git Bash.
