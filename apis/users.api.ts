import { BaseApiClient } from './baseApiClient';

/**
 * API object for the "users" resource, mirroring the Page Object Model
 * used under pages/ - one class per resource, constructed with the Playwright
 * fixture that talks to it (APIRequestContext instead of Page).
 */
export class UsersApi extends BaseApiClient {
  getUsers() {
    const url = this.baseUri + 'users';
    return this.request.get(url);
  }

  // payload comes straight from testdata/*/createUserPayloads.json (untyped, like the rest
  // of TestDataFactory) - not worth a dedicated interface just to cast it back off again.
  createUser(payload: unknown) {
    const url = this.baseUri + 'users';
    return this.request.post(url, { data: payload });
  }
}
