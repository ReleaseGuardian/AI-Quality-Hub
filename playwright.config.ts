import { defineConfig, devices, type Project } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import dotenv from 'dotenv';

dotenv.config();

const testDir = defineBddConfig({
  // .feature files live under features/ui, features/api. Step definitions live in
  // step-definitions/ at the project root. Generated spec files are written to
  // .features-gen/ (gitignored).
  featuresRoot: 'features',
  steps: 'step-definitions/**/*.ts',
});

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
  width: Number(process.env.VIEWPORT_WIDTH) || 1280,
  height: Number(process.env.VIEWPORT_HEIGHT) || 720,
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
  // API scenarios don't need a browser - the built-in `request` fixture is enough.
  testMatch: /api[\\/].*\.spec\.[jt]s$/,
  use: {
    baseURL: process.env.API_LOCATION,
  },
};

export default defineConfig({
  testDir,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // RETRIES/WORKERS are env-configurable so local runs can opt into the same
  // resilience CI gets, without editing this file.
  retries: Number(process.env.RETRIES ?? (process.env.CI ? 1 : 0)),
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: require.resolve('./global-setup'),
  use: {
    headless: process.env.HEADLESS !== 'false',
    launchOptions: {
      slowMo: Number(process.env.SLOWMO) || 0,
    },
    screenshot: screenshotMode,
    video: videoMode,
    trace: traceMode,
    actionTimeout: 15_000,
  },
  projects: [uiProject, apiProject],
});
