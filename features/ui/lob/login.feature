Feature: LOB login

  # Every scenario here runs once per selected LOB - the LOB comes from the Playwright project,
  # not from the Gherkin. Each scenario pulls the current LOB's credentials (valid / invalid)
  # from testdata/<env>/lobCredentials.json. Choose which LOBs run via --project / LOBS= / PLANS=.

  @Smoke @Regression
  Scenario: Login succeeds with the LOB's valid credentials
    Given I am logged in for my LOB
    Then I should be logged in successfully

  @UnitTest @Regression
  Scenario: Login is rejected with an invalid username
    Given I log in for my LOB with an invalid username
    Then I should see the error "Your username is invalid!"

  @UnitTest @Regression
  Scenario: Login is rejected with an invalid password
    Given I log in for my LOB with an invalid password
    Then I should see the error "Your password is invalid!"
