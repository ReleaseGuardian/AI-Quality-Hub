import { expect } from '@playwright/test';
import { Given, Then } from '../utils/fixtures';
import { TestDataFactory } from '../testdata/testDataFactory';

Given('I am logged in as a member for LOB {string}', async ({ pageFactory }, lob: string) => {
  const dataFactory = new TestDataFactory();
  const lobCredentials = dataFactory.getLobCredentials();

  if (!lobCredentials[lob]) {
    throw new Error(`No LOB "${lob}" found in testdata/${dataFactory.environment}/lobCredentials.json`);
  }

  const { username, password } = lobCredentials[lob];
  const loginPage = pageFactory.getLoginPage();
  await loginPage.goto();
  await loginPage.login(username, password);
});

// Pilot/demo stand-in feature check - see scenario-templates/planFeatureVisibility.template.feature
// for why "the logout link" plays the role of a real conditionally-visible client feature here.
Then('the logout link should be visible', async ({ pageFactory }) => {
  await expect(pageFactory.getLoginPage().logoutLink).toBeVisible();
});
