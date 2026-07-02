# Demo Guide: PlaywrightBDD-TS

A script for walking your team through this repo — what it is, why it's built this way, and a
live demo you can run in front of them. Pair this with `README.md` (the reference docs) — this
file is the narrative; the README is what people go back to afterward.

---

## Table of contents

- [1. The pitch (30 seconds)](#1-the-pitch-30-seconds)
- [2. Why this approach](#2-why-this-approach)
- [3. Why it's efficient](#3-why-its-efficient)
- [4. Live demo script](#4-live-demo-script)
- [5. Architecture deep-dive (for Q&A)](#5-architecture-deep-dive-for-qa)
- [6. Anticipated questions](#6-anticipated-questions)

---

## 1. The pitch (30 seconds)

> "This is a BDD test framework — Gherkin `.feature` files, plain-English steps — but it runs
> entirely on native Playwright, with zero CucumberJS runtime. We get Gherkin's readability for
> non-engineers and stakeholders, plus Playwright's speed, parallelism, and tooling, without
> paying for two test runners. It covers UI and API testing with the same design patterns, is
> fully TypeScript, and every piece of "how do I run this differently" — browser, retries,
> worker count, which environment, which line of business — is a one-line env var change, not a
> code change."

---

## 2. Why this approach

### Why `playwright-bdd` instead of CucumberJS?

CucumberJS is its own test runner with its own parallelism model, its own reporting, and its own
way of managing shared state (`World`). Pairing it with Playwright means running two runtimes
side by side — Cucumber orchestrates, Playwright just provides browser automation underneath.

`playwright-bdd` removes that seam: it *compiles* `.feature` files into native Playwright test
files (`bddgen`), so the thing that actually executes tests is Playwright itself — its workers,
its parallelism, its retries, its HTML reporter, its trace viewer. You keep Gherkin syntax
(`Given/When/Then`) for readability, and lose nothing of Playwright's tooling.

### Why TypeScript, strict mode?

Catches an entire class of bugs (wrong argument types, typos in property names, `undefined`
where an object was expected) at compile time instead of during a test run — and every step
definition, page object, and API object gets IDE autocomplete.

### Why Page Object Model + a `PageFactory`?

Every UI page lives in one class (`pages/*.page.ts`) — locators declared once as class fields,
methods for the actions/assertions on that page. Step definitions never touch raw selectors.
`PageFactory` centralizes *constructing* those page objects (`new PageFactory(page).getLoginPage()`)
so adding a new page is "add it to one constructor and add one getter" — not scattered
`new SomePage(page)` calls copy-pasted across every step file.

### Why API objects instead of a generic HTTP client?

Same idea as Page Objects, applied to APIs: `apis/*.api.ts`, one class per resource, each method
named after what it does (`getUsers()`), not a generic `get('/some/path')` call scattered through
step files. `BaseApiClient` is the shared parent — it resolves which **LOB (line of business)**
base URL to use, so the exact same resource class can hit 30 different hosts depending on
which LOB a scenario is testing, with zero code duplication.

### Why a `TestDataFactory` instead of hardcoding data in `.feature` files?

Login credentials (and any future test data) live in JSON, one file per environment
(`testdata/<environment>/`). `TestDataFactory` loads it by key. Switching from `dev` data to
`staging` data is one env var (`TEST_ENVIRONMENT`), not editing every `.feature` file. It's also
deliberately *untyped* — adding a new data domain is "add a JSON file + one getter method," not
"add a JSON file + write a TypeScript interface for it."

### Why is (almost) everything driven by environment variables?

Browser (`BROWSER_NAME`), headless/headed (`HEADLESS`), retries (`RETRIES`), worker count
(`WORKERS`), which environment's data (`TEST_ENVIRONMENT`), which LOB (`LOB`) — none of these are
hardcoded or require a code change to switch. That's what makes the same codebase usable locally,
in CI, against different environments, and against different lines of business, without branching
logic anywhere.

---

## 3. Why it's efficient

- **Real parallelism, not simulated.** `fullyParallel: true` means Playwright schedules every
  individual *scenario* independently across workers — not just every file. A feature file with
  5 scenarios can run all 5 at once, on different workers.
- **No shared state between tests, so parallelism is actually safe.** Every scenario gets a fresh
  `Page`, a fresh `BrowserContext`, and a fresh copy of its test data (deep-cloned specifically to
  prevent one test's mutation leaking into another sharing the same worker process). Nothing to
  coordinate, nothing to reset between tests.
- **Retries don't inherit broken state.** A retried scenario gets a brand-new page/context/API
  object — it starts clean, not from wherever the failed attempt left off.
- **Fast failure diagnosis.** Every scenario's outcome (pass/fail + the actual error) is logged to
  a per-worker log file automatically — no digging through a trace file just to see *what* broke.
- **One codebase, many targets.** Switching browser, environment, or LOB is an env var, so there's
  no forked/duplicated test code per target.
- **Nothing wasted on unused tooling.** No axios (Playwright's own HTTP client is enough), no
  CucumberJS runtime, no dead code — this was explicitly audited and trimmed.

---

## 4. Live demo script

Run these in order, narrating what each one shows. Total time: ~10 minutes.

### Step 1 — Show the `.feature` file (readable by anyone, not just engineers)

Open `features/ui/login.feature`. Point out:
- Plain English steps.
- `Background:` — the shared "navigate to the login page" step, written once, applies to every
  scenario below it.
- Tags (`@UnitTest`, `@Regression`) — used for filtering which tests run, shown in step 5.

### Step 2 — Show the step definition behind it

Open `step-definitions/login.steps.ts`. Point out: no raw selectors, no `page.locator(...)` calls
— everything goes through `pageFactory.getLoginPage()`.

### Step 3 — Run it, headed, so the team sees the browser

```bash
HEADLESS=false npm test
```
Narrate: 3 scenarios, running in parallel (watch multiple browser windows/tabs), against a real
login page.

### Step 4 — Switch browsers with zero code change

```bash
BROWSER_NAME=firefox npm test
```
Same tests, same code, different engine — just an env var.

### Step 5 — Filter by tag

```bash
npx playwright test --grep @Regression
```
Only the tagged scenario runs. Point back at the `.feature` file's tags from step 1.

### Step 6 — Show the API side

Open `apis/users.api.ts` and `apis/baseApiClient.ts`. Then run:

```bash
npm run test:api
```

Point out `BaseApiClient` resolving a base URL by LOB (`testdata/dev/lobBaseUrls.json`) — the
same resource class could hit a different LOB's host with one constructor argument.

### Step 7 — Force a failure, show the logging

```bash
LOB=doesnotexist npx playwright test --project=api
```
Show the clear error (`Unknown LOB "doesnotexist" - no base URL configured...`), then open
`logs/thread_<pid>.log` and show the `Scenario FAILED` line with the same message — no trace file
needed to know what broke.

### Step 8 — Show retries actually retry cleanly

```bash
RETRIES=1 npm test
```
Point out (from the README/architecture discussion) that a retried scenario gets a completely
fresh browser context — no leftover cookies/state from the failed attempt.

### Step 9 — Show the report

```bash
npm run report
```
Opens the HTML report for the run just completed — point out screenshots/videos/traces attached
automatically on failure, and that every run gets its own timestamped report folder (nothing
overwritten).

### Step 10 — Show code quality gates

```bash
npm run typecheck
npm run lint
```
Both clean — this is what CI (once added) or a pre-commit hook would run before merging.

---

## 5. Architecture deep-dive (for Q&A)

Point people to `README.md`'s [Architecture](README.md#architecture) section for the full
written explanation. Quick map of "if someone asks about X, the answer lives in file Y":

| Question | File |
|---|---|
| "How does browser/retry/worker config work?" | `playwright.config.ts` |
| "How do page objects get created?" | `pages/pageFactory.ts` |
| "How does the login page interact with the site?" | `pages/login.page.ts` |
| "How does API testing work?" | `apis/baseApiClient.ts`, `apis/users.api.ts` |
| "How do we support 30 LOBs?" | `testdata/dev/lobBaseUrls.json` + `apis/baseApiClient.ts` |
| "Where does test data come from?" | `testdata/testDataFactory.ts`, `testdata/dev/*.json` |
| "How are custom fixtures/hooks wired up?" | `utils/fixtures.ts` |
| "What happens before/after every test?" | `utils/fixtures.ts` (`Before`/`After` hooks) |
| "How is logging done?" | `utils/logger.ts` + `utils/fixtures.ts`'s `After` hook |
| "What env vars exist and what do they do?" | `README.md`'s environment configuration table |

---

## 6. Anticipated questions

**"Why not just use Cucumber directly?"**
Two runtimes to maintain, two parallelism models to reason about, and CucumberJS's own reporting
is weaker than Playwright's native HTML report/trace viewer. `playwright-bdd` gets Gherkin syntax
without any of that overhead.

**"What if a scenario needs data from a different environment than the rest of the suite?"**
`TEST_ENVIRONMENT` is read once per `TestDataFactory` instantiation — nothing stops adding
per-scenario overrides later if a real need comes up, but nothing in the current suite needs that
yet, so it wasn't built speculatively.

**"Is this safe to run 100+ scenarios in parallel?"**
Yes — that's specifically what `fullyParallel` + fresh-context-per-test + the data-factory
deep-clone fix are for. Nothing in the design assumes low scenario counts.

**"How do we add a new LOB?"**
One line in `testdata/dev/lobBaseUrls.json`. No code change.

**"What's not done yet?"**
No CI pipeline configured yet (deliberately deferred — revisit once there's a meaningful number
of tests to run in it). Test surface is currently small (1 UI flow, 1 API resource) — this is a
hardened *foundation*, not yet a large regression suite.

**"Why TypeScript strict mode — doesn't that slow us down writing tests?"**
It catches wrong-type bugs before a test even runs, and gives autocomplete on every page
object/API object/fixture — it's a net time save once you're past the first few files.
