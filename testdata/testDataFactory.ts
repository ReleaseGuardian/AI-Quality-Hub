const TEST_DATA_PATH = './';

/**
 * Test data factory: JSON fixtures live under testdata/<environment>/, selected via the
 * TEST_ENVIRONMENT env var. Add a new data domain by adding a JSON file under
 * testdata/<environment>/ plus a one-line getter following this same pattern.
 */
export class TestDataFactory {
  environment: string;

  constructor() {
    this.environment = process.env.TEST_ENVIRONMENT ?? 'dev';
  }

  getLoginData() {
    // require() caches the module - deep-clone before returning, so a test that mutates
    // its result can't leak that mutation into other tests sharing this worker process.
    const data = require(TEST_DATA_PATH + this.environment + '/users.json');
    return JSON.parse(JSON.stringify(data));
  }

  getLobBaseUrls() {
    // require() caches the module - deep-clone before returning, so a test that mutates
    // its result can't leak that mutation into other tests sharing this worker process.
    const data = require(TEST_DATA_PATH + this.environment + '/lobBaseUrls.json');
    return JSON.parse(JSON.stringify(data));
  }
}
