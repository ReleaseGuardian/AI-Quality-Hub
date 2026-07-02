import { expect } from '@playwright/test';
import { Given } from './fixtures';
import { UsersApi, type User } from '../apis/users.api';

Given('Invoke the get request and perform validation', async ({ request }) => {
  const usersApi = new UsersApi(request);
  const response = await usersApi.getUsers();

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const users: User[] = await response.json();
  expect(Array.isArray(users)).toBeTruthy();
  expect(users.length).toBeGreaterThan(0);

  // Beeceptor mocks the data on every call, so assert shape/types rather than exact values.
  for (const user of users) {
    expect(user).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      username: expect.any(String),
      email: expect.any(String),
    });
  }
});
