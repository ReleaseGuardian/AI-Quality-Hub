import type { APIRequestContext } from '@playwright/test';
import { TestDataFactory } from '../testdata/testDataFactory';

/**
 * Base class for API objects. Each LOB (line of business) has its own base URL, listed in
 * testdata/<environment>/lobBaseUrls.json - the constructor resolves `lob` to a baseUri via
 * TestDataFactory, so different resources (and the same resource against different LOBs) can
 * target different hosts. Subclasses build their own URLs (`this.baseUri + path`) and call
 * `this.request.get/post` directly in each method.
 */
export class BaseApiClient {
  baseUri: string;
  request: APIRequestContext;

  constructor(lob: string, request: APIRequestContext) {
    const dataFactory = new TestDataFactory();
    const baseUri = dataFactory.getLobBaseUrls()[lob];
    if (!baseUri) {
      throw new Error(`Unknown LOB "${lob}" - no base URL configured for it in testdata/${dataFactory.environment}/lobBaseUrls.json`);
    }

    this.baseUri = baseUri;
    this.request = request;
  }
}
