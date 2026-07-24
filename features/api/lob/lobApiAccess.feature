Feature: LOB API access

  # Runs once per selected LOB - the same mechanism as the UI LOB scenarios, but browser-less.
  # The LOB comes from the Playwright project; its credentials come from lobCredentials.json.
  # Selection (--project / LOBS= / PLANS=) and tag filtering work identically to the UI side.
  @Regression
  Scenario: The users API is reachable for the current LOB
    Given I am authenticated for my LOB
    Then the users list is returned successfully
