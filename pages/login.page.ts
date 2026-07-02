import { expect, type Locator, type Page } from '@playwright/test';

/** Page object for https://practicetestautomation.com/practice-test-login/ */
export class LoginPage {
  page: Page;
  usernameInput: Locator;
  passwordInput: Locator;
  submitButton: Locator;
  errorMessage: Locator;
  successHeading: Locator;
  successMessage: Locator;
  logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('#submit');
    this.errorMessage = page.locator('#error');
    this.successHeading = page.getByRole('heading', { name: 'Logged In Successfully' });
    this.successMessage = page.getByText('Congratulations student. You successfully logged in!');
    this.logoutLink = page.getByRole('link', { name: 'Log out' });
  }

  async goto(url: string = process.env.LOGIN_APP_URL ?? 'https://practicetestautomation.com/practice-test-login/') {
    await this.page.goto(url);
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async checkLoggedInSuccessfully() {
    await expect(this.successHeading).toBeVisible();
    await expect(this.successMessage).toBeVisible();
    await expect(this.logoutLink).toBeVisible();
  }

  async checkErrorMessage(expected: string) {
    await expect(this.errorMessage).toHaveText(expected);
  }
}

export default LoginPage;
