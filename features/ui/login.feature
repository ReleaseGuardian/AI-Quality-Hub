Feature: Verify login functionality

  Background:
    Given I navigate to the login page

  @UnitTest @Regression
  Scenario: Successful login with valid credentials
    When I log in as the "valid" test user
    Then I should be logged in successfully

  @UnitTest
  Scenario: Login fails with an invalid username
    When I log in as the "invalidUsername" test user
    Then I should see the error "Your username is invalid!"

  @UnitTest
  Scenario: Login fails with an invalid password
    When I log in as the "invalidPassword" test user
    Then I should see the error "Your password is invalid!"
