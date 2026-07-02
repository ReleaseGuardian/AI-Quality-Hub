import { Given, When, Then } from './fixtures';
import { TestDataFactory } from '../testdata/testDataFactory';
import { PageFactory } from '../pages/pageFactory';

Given('I navigate to the login page', async ({ page }) => {
  const pageFactory = new PageFactory(page);
  await pageFactory.getLoginPage().goto();
});

When('I log in as the {string} test user', async ({ page }, userKey: string) => {
  const pageFactory = new PageFactory(page);
  const dataFactory = new TestDataFactory();
  const { username, password } = dataFactory.getLoginData()[userKey];
  await pageFactory.getLoginPage().login(username, password);
});

Then('I should be logged in successfully', async ({ page }) => {
  const pageFactory = new PageFactory(page);
  await pageFactory.getLoginPage().checkLoggedInSuccessfully();
});

Then('I should see the error {string}', async ({ page }, errorMessage: string) => {
  const pageFactory = new PageFactory(page);
  await pageFactory.getLoginPage().checkErrorMessage(errorMessage);
});
