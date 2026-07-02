import type { APIRequestContext } from '@playwright/test';
import { BaseApiClient } from './baseApiClient';

export interface User {
  id: number;
  name: string;
  company: string;
  username: string;
  email: string;
  address: string;
  zip: string;
  state: string;
  country: string;
  phone: string;
  photo: string;
}

/**
 * API object for the "users" resource, mirroring the Page Object Model
 * used under pages/ - one class per resource, constructed with the Playwright
 * fixture that talks to it (APIRequestContext instead of Page).
 */
export class UsersApi extends BaseApiClient {
  constructor(request: APIRequestContext, lob: string = process.env.LOB ?? 'default') {
    super(lob, request);
  }

  getUsers() {
    const url = this.baseUri + 'users';
    return this.request.get(url);
  }
}
