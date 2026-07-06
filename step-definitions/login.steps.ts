import { Given, When, Then } from '../utils/fixtures';
import { TestDataFactory } from '../testdata/testDataFactory';

Given('I navigate to the login page', async ({ pageFactory }) => {
  await pageFactory.getLoginPage().goto();
});

When('I log in as the {string} test user', async ({ pageFactory }, userKey: string) => {
  const dataFactory = new TestDataFactory();
  const loginData = dataFactory.getLoginData();

  if (!loginData[userKey]) {
    throw new Error(`No test user "${userKey}" found in testdata/${dataFactory.environment}/users.json`);
  }

  const { username, password } = loginData[userKey];
  await pageFactory.getLoginPage().login(username, password);
});

Then('I should be logged in successfully', async ({ pageFactory }) => {
  await pageFactory.getLoginPage().checkLoggedInSuccessfully();
});

Then('I should see the error {string}', async ({ pageFactory }, errorMessage: string) => {
  await pageFactory.getLoginPage().checkErrorMessage(errorMessage);
});
