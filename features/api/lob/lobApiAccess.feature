Feature: LOB users API

  # Browser-less, runs once per selected LOB - same mechanism as the UI LOB scenarios.
  # The LOB comes from the Playwright project; its credentials come from lobCredentials.json.
  # Selection (--project / LOBS= / PLANS=) and tag filtering work identically to the UI side.

  @Smoke @Regression
  Scenario: The users API is reachable for the current LOB
    Given I am authenticated for my LOB
    Then the users list is returned successfully

  @Regression
  Scenario: A user can be created for the current LOB
    Given I am authenticated for my LOB
    And I have a valid user payload to create
    When I invoke the create user request
    Then the created user should be returned with the expected details
