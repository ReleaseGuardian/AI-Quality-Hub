import { expect, type APIResponse } from '@playwright/test';
import { Given, When, Then } from '../utils/fixtures';
import { UsersApi } from '../apis/users.api';
import { TestDataFactory } from '../testdata/testDataFactory';

// Generic API request steps, reused by the per-LOB API scenarios under features/api/lob/**.
// (There are no non-LOB API tests - every scenario runs once per selected LOB.)

// Arrange
Given('I have a valid user payload to create', async ({ apiContext }) => {
  const dataFactory = new TestDataFactory();
  apiContext.payload = dataFactory.getCreateUserPayloads()['valid'];
});

// Act
When('I invoke the create user request', async ({ request, apiContext }) => {
  const usersApi = new UsersApi(request);
  apiContext.response = await usersApi.createUser(apiContext.payload);
});

// Assert
Then('the created user should be returned with the expected details', async ({ apiContext }) => {
  const response = apiContext.response as APIResponse;
  const payload = apiContext.payload as Record<string, unknown>;

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(201);

  const createdUser = await response.json();
  expect(createdUser).toMatchObject({
    id: expect.any(Number),
    ...payload,
  });
});
