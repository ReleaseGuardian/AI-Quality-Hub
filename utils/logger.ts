import log4js, { Logger as Log4jsLogger } from 'log4js';
import fs from 'fs';
import path from 'path';

type LogLevelInput = string | number | undefined;

/**
 * Thin wrapper around log4js that writes one log file per worker/process (thread_<pid>.log).
 * Each Playwright worker is its own OS process, so keying the file by process.pid keeps every
 * worker's log output separate with no coordination needed between workers.
 */
export class Logger {
  constructor(logLevel: LogLevelInput, projectRoot: string) {
    const threadId = process.pid;
    const logFolderPath = path.join(projectRoot, 'logs');

    if (!fs.existsSync(logFolderPath)) {
      fs.mkdirSync(logFolderPath, { recursive: true });
    }

    const logFilePath = path.join(logFolderPath, `thread_${threadId}.log`);

    log4js.configure({
      appenders: {
        file: { type: 'file', filename: logFilePath },
      },
      categories: {
        default: { appenders: ['file'], level: this.resolveLevel(logLevel) },
      },
    });
  }

  private resolveLevel(logLevel: LogLevelInput): string {
    switch (String(logLevel)) {
      case '0':
        return 'off';
      case '1':
        return 'fatal';
      case '2':
        return 'error';
      case '3':
        return 'warn';
      case '4':
        return 'info';
      case '5':
        return 'trace';
      default:
        return 'info';
    }
  }

  /** Returns a ready-to-use log4js logger instance. */
  createLogger(): Log4jsLogger {
    return log4js.getLogger();
  }
}

export default Logger;
