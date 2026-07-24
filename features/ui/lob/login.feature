Feature: LOB login

  # Runs once per selected LOB - each LOB is its own Playwright project (built from
  # testdata/lobs.json). No LOB is named here; the project context supplies it. Select which
  # LOBs run via --project / LOBS= / PLANS= without touching this file.
  @Smoke @Regression
  Scenario: Login succeeds for the current LOB
    Given I am logged in for my LOB
    Then I should be logged in successfully
