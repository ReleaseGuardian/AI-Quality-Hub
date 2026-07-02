import fsExtra from 'fs-extra';

/**
 * Shared setup helpers used from global-setup.ts.
 *
 * Note: unlike the old Cucumber-based framework, browser launch/lifecycle and
 * screenshot/video-on-failure capture are now handled natively by the Playwright
 * test runner via `use: { screenshot, video, trace }` in playwright.config.ts,
 * so no custom LaunchBrowser / AttachScreenshotOnFailure code is needed here.
 */
export class BaseUtil {
  /** Empties the logs directory before a run starts (equivalent of the old preunitTest log cleanup). */
  async cleanUpLogsAtPath(logsPath: string) {
    await fsExtra.emptyDir(logsPath);
  }
}

export default BaseUtil;
