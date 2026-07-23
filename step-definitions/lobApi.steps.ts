import { expect } from '@playwright/test';
import { Given, Then } from '../utils/fixtures';
import { UsersApi } from '../apis/users.api';
import { TestDataFactory } from '../testdata/testDataFactory';

Given('I am authenticated as a member for LOB {string}', async ({ request, apiContext }, lob: string) => {
  const dataFactory = new TestDataFactory();
  const lobCredentials = dataFactory.getLobCredentials();

  if (!lobCredentials[lob]) {
    throw new Error(`No LOB "${lob}" found in testdata/${dataFactory.environment}/lobCredentials.json`);
  }

  // Pilot/demo stand-in - this demo API has no real per-LOB auth to exchange credentials
  // for a token. A real implementation would call an auth endpoint here and pass the
  // resulting token to BaseApiClient's getAuthHeaders(accessToken).
  apiContext.usersApi = new UsersApi(request);
});

Then('the users list should be returned successfully', async ({ apiContext }) => {
  const usersApi = apiContext.usersApi as UsersApi;
  const response = await usersApi.getUsers();

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const users = await response.json();
  expect(Array.isArray(users)).toBeTruthy();
  expect(users.length).toBeGreaterThan(0);
});
