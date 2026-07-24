import { defineConfig, devices, type Project } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import dotenv from 'dotenv';

// TEST_ENVIRONMENT picks which per-environment file (.env.dev, .env.qa, ...) loads first -
// it must come from the shell (e.g. `TEST_ENVIRONMENT=qa npm test`) since nothing has been
// loaded from a file yet at this point. dotenv.config() never overrides a variable that's
// already set, so loading the shared .env second only fills in what the per-environment
// file didn't already provide (BROWSER_NAME, RETRIES, LOG_LEVEL, ...).
const testEnvironment = process.env.TEST_ENVIRONMENT?.trim() || 'dev';
dotenv.config({ path: `.env.${testEnvironment}` });
dotenv.config();

const testDir = defineBddConfig({
  // .feature files live under features/ui, features/api. Step definitions live in
  // step-definitions/ at the project root; utils/fixtures.ts is where Given/When/Then/
  // Before/After actually get registered, so it must be scanned too. Generated spec files
  // are written to .features-gen/ (gitignored).
  featuresRoot: 'features',
  steps: ['step-definitions/**/*.ts', 'utils/fixtures.ts'],
});

// ---- Shared helper: parse a numeric env var, or throw a clear error on invalid input ----
// (mirrors the BROWSER_NAME validation below - fail loudly at config-load time instead of
// silently producing NaN and letting Playwright behave unpredictably)
function parseIntEnv(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${name} "${raw}" - expected a number`);
  }
  return parsed;
}

// ---- Screenshot / video / trace capture is handled natively by the Playwright runner ----
const screenshotMode = (process.env.SCREENSHOT_CONDITION || 'only-on-failure') as
  | 'off'
  | 'on'
  | 'only-on-failure';
const videoMode = (process.env.VIDEO_RECORDING_CONDITION || 'retain-on-failure') as
  | 'off'
  | 'on'
  | 'retain-on-failure'
  | 'on-first-retry';
const traceMode = (process.env.TRACE_CONDITION || 'on-first-retry') as
  | 'off'
  | 'on'
  | 'retain-on-failure'
  | 'on-first-retry';

// ---- Device / viewport emulation, driven by .env, applied on top of the UI project ----
const deviceName = process.env.DEVICE?.trim();
const viewportOverride = {
  width: parseIntEnv('VIEWPORT_WIDTH') ?? 1280,
  height: parseIntEnv('VIEWPORT_HEIGHT') ?? 720,
};
const deviceOrViewport =
  deviceName && devices[deviceName] ? devices[deviceName] : { viewport: viewportOverride };

// ---- Browser engine, driven by BROWSER_NAME in .env (defaults to chromium) ----
const browserDevices = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
} as const;
type BrowserName = keyof typeof browserDevices;

const browserName = (process.env.BROWSER_NAME?.trim() || 'chromium') as BrowserName;
if (!(browserName in browserDevices)) {
  throw new Error(`Unknown BROWSER_NAME "${browserName}" - expected one of: ${Object.keys(browserDevices).join(', ')}`);
}

// ---- Multi-LOB projects: one Playwright project per line of business ----
// Each LOB is projected like a browser: the same feature files under features/ui/lob/** run
// once per LOB, with the LOB code injected via `use: { lob }` (see utils/fixtures.ts). The
// roster + plan membership come from testdata/lobs.json; which restricted features apply to
// which LOBs comes from testdata/featureApplicability.json. Adding a LOB is a config-only
// change - no scenario/step/config-code edits.
const lobRoster: Record<string, { plans: string[] }> = require('./testdata/lobs.json');

// A restricted feature's applicability can be declared as EITHER an explicit array of LOB
// codes, OR an object scoping by plan and/or explicit lobs (their union). Plan-based scoping
// self-updates: a feature applicable to "Exchange" automatically covers new Exchange LOBs as
// they're added to lobs.json - no edit to featureApplicability.json needed.
//   "hra.feature": ["LAEX", "LADS", "MIDS"]                  // explicit LOBs
//   "planDoc.feature": { "plans": ["Exchange"] }             // every LOB under Exchange
//   "mixed.feature": { "plans": ["Medicare"], "lobs": ["LAEX"] }  // union of both
type ApplicabilitySpec = string[] | { plans?: string[]; lobs?: string[] };
const applicability: Record<string, ApplicabilitySpec> = require('./testdata/featureApplicability.json');

const rosterLobs = Object.keys(lobRoster);
const rosterPlans = new Set(Object.values(lobRoster).flatMap((m) => m.plans));

// Resolve a spec to the concrete list of LOBs it applies to, validating references (fail loud
// at load time on a typo'd LOB or plan).
function resolveApplicableLobs(featureFile: string, spec: ApplicabilitySpec): string[] {
  const explicitLobs = Array.isArray(spec) ? spec : spec.lobs ?? [];
  for (const lob of explicitLobs) {
    if (!lobRoster[lob]) {
      throw new Error(`featureApplicability "${featureFile}" names unknown LOB "${lob}" - not in testdata/lobs.json`);
    }
  }
  const plans = Array.isArray(spec) ? [] : spec.plans ?? [];
  for (const plan of plans) {
    if (!rosterPlans.has(plan)) {
      throw new Error(`featureApplicability "${featureFile}" names unknown plan "${plan}" - no LOB in testdata/lobs.json belongs to it`);
    }
  }
  const fromPlans = rosterLobs.filter((lob) => lobRoster[lob].plans.some((p) => plans.includes(p)));
  return [...new Set([...explicitLobs, ...fromPlans])];
}

// Precompute each restricted feature's applicable LOB set once.
const applicableLobsByFeature: Record<string, string[]> = Object.fromEntries(
  Object.entries(applicability).map(([featureFile, spec]) => [featureFile, resolveApplicableLobs(featureFile, spec)]),
);

// Runtime selection (both optional, comma-separated): LOBS=LAEX,MIDS and/or PLANS=Exchange.
const parseCsvEnv = (name: string) =>
  (process.env[name] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const selectedLobs = parseCsvEnv('LOBS');
const selectedPlans = parseCsvEnv('PLANS');
const isLobSelected = (lob: string, plans: string[]) =>
  (selectedLobs.length === 0 || selectedLobs.includes(lob)) &&
  (selectedPlans.length === 0 || plans.some((p) => selectedPlans.includes(p)));

// Applicability is enforced by FILE, not a tag: a LOB project ignores the generated spec of
// any restricted feature it isn't listed for. Structural + deterministic, so it never competes
// with the user's --grep (which overrides config-level grep).
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const testIgnoreFor = (lob: string): RegExp[] =>
  Object.entries(applicableLobsByFeature)
    .filter(([, applicableLobs]) => !applicableLobs.includes(lob))
    .map(([featureFile]) => new RegExp(`lob[\\\\/]${escapeRegex(featureFile)}\\.spec`));

// SCENARIO-level applicability (for features that share a file with universal scenarios):
// testdata/lobFeatures.json maps a capability tag -> the LOBs that have it. A LOB not listed
// for a tag must not run any scenario carrying it, even when that scenario sits in a mixed
// feature file. Enforced per project with grepInvert on the excluded tags, so it never removes
// scenarios that DON'T carry the tag, and other LOBs still run the shared file's other scenarios.
const lobFeatures: Record<string, string[]> = require('./testdata/lobFeatures.json');
for (const [tag, lobs] of Object.entries(lobFeatures)) {
  for (const lob of lobs) {
    if (!lobRoster[lob]) {
      throw new Error(`lobFeatures "${tag}" names unknown LOB "${lob}" - not in testdata/lobs.json`);
    }
  }
}
const grepInvertFor = (lob: string): RegExp | undefined => {
  const excludedTags = Object.entries(lobFeatures)
    .filter(([, lobs]) => !lobs.includes(lob))
    .map(([tag]) => escapeRegex(tag));
  return excludedTags.length ? new RegExp(excludedTags.join('|')) : undefined;
};

const lobProjects: Project[] = Object.entries(lobRoster)
  .filter(([lob, meta]) => isLobSelected(lob, meta.plans))
  .map(([lob, meta]) => ({
    name: lob,
    // LOB-parameterized scenarios live in features/{ui,api}/lob/** -> .features-gen/{ui,api}/lob/
    // **.spec. Both UI (browser) and API (browser-less) LOB scenarios run under this one project;
    // the browser only launches for tests that actually use the `page` fixture, so API LOB
    // scenarios here never start a browser.
    testMatch: /(?:ui|api)[\\/]lob[\\/].*\.spec\.[jt]s$/,
    testIgnore: testIgnoreFor(lob),
    grepInvert: grepInvertFor(lob),
    use: { ...browserDevices[browserName], ...deviceOrViewport, lob },
    metadata: { plans: meta.plans },
  }));

// Every scenario is LOB-scoped: the whole app is defined by Plans and LOBs, so there are no
// non-LOB projects. UI and API scenarios both live under features/{ui,api}/lob/** and run under
// the per-LOB projects above (API scenarios never launch a browser - see the project comment).
// Layer selection (UI vs API) is by path filter at run time, e.g.
//   playwright test .features-gen/ui/lob      # UI only
//   playwright test .features-gen/api/lob     # API only
// No baseURL is set here: each API object (see apis/baseApiClient.ts) owns its own baseUri.

// ---- Each run gets its own HTML report folder instead of overwriting the last one ----
// `npm run report` finds the most recent one automatically (see scripts/open-latest-report.js).
const reportTimestamp = new Date().toISOString().replace(/[:.]/g, '-');

export default defineConfig({
  testDir,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // RETRIES/WORKERS are env-configurable so local runs can opt into the same
  // resilience CI gets, without editing this file.
  retries: parseIntEnv('RETRIES') ?? (process.env.CI ? 1 : 0),
  workers: parseIntEnv('WORKERS') ?? (process.env.CI ? 2 : undefined),
  reporter: [['list'], ['html', { open: 'never', outputFolder: `playwright-report/${reportTimestamp}` }]],
  globalSetup: require.resolve('./global-setup'),
  use: {
    headless: process.env.HEADLESS !== 'false',
    launchOptions: {
      slowMo: parseIntEnv('SLOWMO') ?? 0,
    },
    screenshot: screenshotMode,
    video: videoMode,
    trace: traceMode,
    actionTimeout: 15_000,
  },
  projects: lobProjects,
});
