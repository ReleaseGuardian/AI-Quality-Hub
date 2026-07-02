import type { APIRequestContext } from '@playwright/test';

/**
 * Base class for API objects, each carrying its own base URI - so different resources can
 * target different hosts, independent of whatever baseURL the "api" project has configured.
 * Subclasses build their own URLs (`this.baseUri + path`) and call `this.request.get/post`
 * directly in each method.
 */
export class BaseApiClient {
  baseUri: string;
  request: APIRequestContext;

  constructor(baseUri: string, request: APIRequestContext) {
    this.baseUri = baseUri;
    this.request = request;
  }
}
