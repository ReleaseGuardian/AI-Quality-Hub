import dotenv from 'dotenv';
import path from 'path';
import { BaseUtil } from './utils/baseUtil';

/**
 * Runs once, in a single process, before any Playwright worker starts.
 * Anything written to process.env here is inherited by all workers.
 *
 * Replaces the old world.js `BeforeAll` hook responsibilities:
 *  - loading .env
 *  - clearing stale log files from previous runs
 *
 * Browser launch and video/screenshot capture are no longer handled here - the
 * Playwright test runner does that natively via `use: { screenshot, video, trace }`.
 */
export default async function globalSetup() {
  dotenv.config();

  const baseUtil = new BaseUtil();
  const logsPath = path.resolve(__dirname, 'logs');
  await baseUtil.cleanUpLogsAtPath(logsPath);
}
