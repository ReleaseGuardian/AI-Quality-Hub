import type { Page } from '@playwright/test';
import { LoginPage } from './login.page';

export class PageFactory {
  page: Page;
  loginPage: LoginPage;

  constructor(page: Page) {
    this.page = page;
    this.loginPage = new LoginPage(page);
  }

  getLoginPage(): LoginPage {
    return this.loginPage;
  }
}
