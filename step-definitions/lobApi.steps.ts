import { expect } from '@playwright/test';
import { Given, Then } from '../utils/fixtures';
import { UsersApi } from '../apis/users.api';
import { TestDataFactory } from '../testdata/testDataFactory';

// Browser-less LOB step: `lob` is injected per Playwright project (same as the UI LOB steps),
// so this scenario runs once per selected LOB, each time using THAT LOB's credentials.
Given('I am authenticated for my LOB', async ({ request, apiContext, lob }) => {
  const dataFactory = new TestDataFactory();
  const lobEntry = dataFactory.getLobCredentials()[lob];

  if (!lobEntry?.valid) {
    throw new Error(
      `No "valid" credentials for LOB "${lob}" in testdata/${dataFactory.environment}/lobCredentials.json`,
    );
  }

  // Pilot/demo stand-in: this demo API has no real per-LOB auth. A real implementation would
  // exchange lobEntry.valid for a token via an auth endpoint and pass it to
  // BaseApiClient.getAuthHeaders(token). The per-LOB credential lookup above is the real,
  // reusable part; only the token exchange changes for a real API.
  apiContext.usersApi = new UsersApi(request);
});

Then('the users list is returned successfully', async ({ apiContext }) => {
  const usersApi = apiContext.usersApi as UsersApi;
  const response = await usersApi.getUsers();

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const users = await response.json();
  expect(Array.isArray(users)).toBeTruthy();
  expect(users.length).toBeGreaterThan(0);
});
