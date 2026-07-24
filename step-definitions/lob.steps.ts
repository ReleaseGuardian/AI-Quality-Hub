import { expect } from '@playwright/test';
import { Given, Then } from '../utils/fixtures';
import { TestDataFactory } from '../testdata/testDataFactory';

// `lob` is injected per Playwright project (one project per LOB - see playwright.config.ts).
// The scenario never names a LOB; the project context supplies it, so the same scenario runs
// once per selected LOB.
Given('I am logged in for my LOB', async ({ pageFactory, lob }) => {
  const dataFactory = new TestDataFactory();
  const lobCredentials = dataFactory.getLobCredentials();

  if (!lobCredentials[lob]) {
    throw new Error(`No credentials for LOB "${lob}" in testdata/${dataFactory.environment}/lobCredentials.json`);
  }

  const { username, password } = lobCredentials[lob];
  const loginPage = pageFactory.getLoginPage();
  await loginPage.goto();
  await loginPage.login(username, password);
});

// The "Then I should be logged in successfully" step is shared - it's already defined in
// login.steps.ts and playwright-bdd registers step definitions globally, so LOB scenarios
// reuse it directly.

// Pilot/demo stand-in: the public demo login page has no real HRA feature, so the logout link
// plays the role of a conditionally-visible client feature here. Applicability (which LOBs
// even run this) is enforced upstream by testdata/featureApplicability.json + testIgnore, so
// this step only runs for LOBs where the feature is expected to be present.
Then('the HRA feature should be visible', async ({ pageFactory }) => {
  await expect(pageFactory.getLoginPage().logoutLink).toBeVisible();
});
