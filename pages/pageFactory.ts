import type { Page } from '@playwright/test';
import { LoginPage } from './login.page';

/**
 * One lazy getter per page: each page is only constructed the first time a step asks for it,
 * then cached on this instance for the rest of the test. Instantiated fresh per test via the
 * `pageFactory` fixture in utils/fixtures.ts - add a new page by adding a private field and a
 * getXPage() getter following the same pattern.
 */
export class PageFactory {
  page: Page;
  private loginPage?: LoginPage;

  constructor(page: Page) {
    this.page = page;
  }

  getLoginPage() {
    return (this.loginPage ??= new LoginPage(this.page));
  }
}
