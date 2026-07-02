import fsExtra from 'fs-extra';

/**
 * Shared setup helpers used from global-setup.ts.
 *
 * Browser launch/lifecycle and screenshot/video-on-failure capture are handled natively
 * by the Playwright test runner via `use: { screenshot, video, trace }` in
 * playwright.config.ts, so no custom browser-launch or capture code is needed here.
 */
export class BaseUtil {
  /** Empties the logs directory before a run starts. */
  async cleanUpLogsAtPath(logsPath: string) {
    await fsExtra.emptyDir(logsPath);
  }
}

export default BaseUtil;
