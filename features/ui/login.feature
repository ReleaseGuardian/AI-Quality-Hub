Feature: Verify login functionality

  @UnitTest @Regression
  Scenario: Successful login with valid credentials
    Given I navigate to the login page
    When I log in as the "valid" test user
    Then I should be logged in successfully

  @UnitTest
  Scenario: Login fails with an invalid username
    Given I navigate to the login page
    When I log in as the "invalidUsername" test user
    Then I should see the error "Your username is invalid!"

  @UnitTest
  Scenario: Login fails with an invalid password
    Given I navigate to the login page
    When I log in as the "invalidPassword" test user
    Then I should see the error "Your password is invalid!"
