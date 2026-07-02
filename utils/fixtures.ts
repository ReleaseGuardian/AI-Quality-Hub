import path from 'path';
import log4js from 'log4js';
import { test as base, createBdd } from 'playwright-bdd';
import { Logger } from './logger';

/**
 * This file is the "World" of the new framework: it is where custom Playwright fixtures
 * are declared and where Given/When/Then/Before/After are bound to them.
 *
 * Every step-definition file must import { Given, When, Then } from here (not from
 * 'playwright-bdd' directly), otherwise it won't have access to these fixtures.
 *
 * Page objects and API objects are not fixtures here - they're constructed directly where
 * needed (`new PageFactory(page)`, `new UsersApi(request)`), using Playwright's own `page`/
 * `request` fixtures underneath.
 */

type WorkerFixtures = {
  /** One log4js logger per worker process, writing to logs/thread_<pid>.log. */
  logger: log4js.Logger;
};

export const test = base.extend<{}, WorkerFixtures>({
  logger: [
    async ({}, use) => {
      const projectRoot = path.resolve(__dirname, '../');
      const loggerFactory = new Logger(process.env.LOG_LEVEL, projectRoot);
      await use(loggerFactory.createLogger());
    },
    { scope: 'worker' },
  ],
});

export const { Given, When, Then, Before, After, BeforeAll, AfterAll } = createBdd(test);

// Runs before every scenario - logs the scenario name and attaches viewport/device
// info to the report, mirroring the old world.js `Before` hook.
Before(async ({ logger }) => {
  const testInfo = test.info();
  logger.info('Running scenario:', testInfo.title, testInfo.retry > 0 ? `(retry ${testInfo.retry})` : '');

  const deviceName = process.env.DEVICE?.trim();
  if (deviceName) {
    await testInfo.attach('Device', { body: deviceName, contentType: 'text/plain' });
  } else {
    const width = process.env.VIEWPORT_WIDTH ?? '1280';
    const height = process.env.VIEWPORT_HEIGHT ?? '720';
    await testInfo.attach('Viewport', { body: `${width} x ${height}`, contentType: 'text/plain' });
  }
});

// Runs after every scenario - logs the pass/fail outcome and, on failure, the actual
// error message(s) so the per-worker log file (logs/thread_<pid>.log) is enough to trace
// what went wrong without having to reopen the HTML report or trace viewer.
After(async ({ logger }) => {
  const testInfo = test.info();
  const attempt = testInfo.retry > 0 ? ` (retry ${testInfo.retry})` : '';

  if (testInfo.status === testInfo.expectedStatus) {
    logger.info(`Scenario PASSED: ${testInfo.title}${attempt}`);
    return;
  }

  const errorDetails = testInfo.errors.length
    ? testInfo.errors.map((error) => error.message ?? String(error)).join('\n')
    : `status: ${testInfo.status}`;
  logger.error(`Scenario FAILED: ${testInfo.title}${attempt}\n${errorDetails}`);
});
