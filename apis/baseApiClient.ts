import type { APIRequestContext } from '@playwright/test';

/**
 * Base class for API objects. All resources share a single base URL, configured via the
 * API_BASE_URL env var. Subclasses build their own URLs (`this.baseUri + path`) and call
 * `this.request.get/post` directly in each method.
 */
export class BaseApiClient {
  baseUri: string;
  request: APIRequestContext;

  constructor(request: APIRequestContext) {
    const baseUri = process.env.API_BASE_URL;
    if (!baseUri) {
      throw new Error('API_BASE_URL is not set');
    }

    this.baseUri = baseUri;
    this.request = request;
  }

  /**
   * Not called anywhere yet - reserved for the first resource method that needs to call a
   * bearer-token-protected endpoint. Takes the token as a parameter rather than reading an
   * env var itself, so a caller can pass whichever token applies (e.g. a per-user token from
   * APP_BEARER_TOKEN, or one fetched from a login step) instead of this class being wired to
   * one fixed source. Usage once needed:
   * `this.request.post(url, { headers: this.getAuthHeaders(accessToken) })`.
   */
  protected getAuthHeaders(accessToken: string) {
    if (!accessToken) {
      throw new Error('accessToken is required');
    }
    return { Authorization: `Bearer ${accessToken}` };
  }
}
