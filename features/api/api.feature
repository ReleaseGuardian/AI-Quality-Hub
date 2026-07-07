Feature: Verify the users API

  @API
  Scenario: Verify the users list response has the expected shape
    Given Invoke the get users request and perform validation

  @API
  Scenario: Create a new user via the API
    Given I have a valid user payload to create
    When I invoke the create user request
    Then the created user should be returned with the expected details
