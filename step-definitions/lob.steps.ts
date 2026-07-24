import { expect } from '@playwright/test';
import { Given, Then } from '../utils/fixtures';
import { PageFactory } from '../pages/pageFactory';
import { TestDataFactory } from '../testdata/testDataFactory';

// Log in using one of the current LOB's credential sets (valid / invalidUsername /
// invalidPassword). `lob` is injected per Playwright project, so the same scenario runs once
// per selected LOB, each time pulling THAT LOB's data from testdata/<env>/lobCredentials.json.
async function loginForLob(pageFactory: PageFactory, lob: string, credentialSet: string) {
  const dataFactory = new TestDataFactory();
  const lobEntry = dataFactory.getLobCredentials()[lob];

  if (!lobEntry?.[credentialSet]) {
    throw new Error(
      `No "${credentialSet}" credentials for LOB "${lob}" in testdata/${dataFactory.environment}/lobCredentials.json`,
    );
  }

  const { username, password } = lobEntry[credentialSet];
  const loginPage = pageFactory.getLoginPage();
  await loginPage.goto();
  await loginPage.login(username, password);
}

Given('I am logged in for my LOB', async ({ pageFactory, lob }) => {
  await loginForLob(pageFactory, lob, 'valid');
});

Given('I log in for my LOB with an invalid username', async ({ pageFactory, lob }) => {
  await loginForLob(pageFactory, lob, 'invalidUsername');
});

Given('I log in for my LOB with an invalid password', async ({ pageFactory, lob }) => {
  await loginForLob(pageFactory, lob, 'invalidPassword');
});

Then('I should be logged in successfully', async ({ pageFactory }) => {
  await pageFactory.getLoginPage().checkLoggedInSuccessfully();
});

Then('I should see the error {string}', async ({ pageFactory }, errorMessage: string) => {
  await pageFactory.getLoginPage().checkErrorMessage(errorMessage);
});

// Pilot/demo stand-in: the public demo login page has no real HRA feature, so the logout link
// plays the role of a conditionally-visible client feature here. Applicability (which LOBs
// even run this) is enforced upstream by testdata/featureApplicability.json + testIgnore.
Then('the HRA feature should be visible', async ({ pageFactory }) => {
  await expect(pageFactory.getLoginPage().logoutLink).toBeVisible();
});
