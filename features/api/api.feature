Feature: Verify the users API

  @API
  Scenario: Verify the users list response has the expected shape
    Given Invoke the get users request and perform validation
