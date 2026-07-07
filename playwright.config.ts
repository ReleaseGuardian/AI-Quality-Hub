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

const uiProject: Project = {
  name: 'ui',
  use: { ...browserDevices[browserName], ...deviceOrViewport },
  // Only run UI scenarios (features/ui/**) under this project.
  testMatch: /ui[\\/].*\.spec\.[jt]s$/,
};

const apiProject: Project = {
  name: 'api',
  // API scenarios don't need a browser - the built-in `request` fixture is enough. No
  // baseURL here: each API object (see apis/baseApiClient.ts) owns its own baseUri, so
  // different resources can target different hosts - a project-level baseURL would be a
  // second, easy-to-miss source of truth for the same thing.
  testMatch: /api[\\/].*\.spec\.[jt]s$/,
};

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
  projects: [uiProject, apiProject],
});
