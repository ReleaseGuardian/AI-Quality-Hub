Feature: Member dashboard

  # A MIXED file: both scenarios live here together. The first runs for every LOB. The second
  # carries the @Alerts capability tag, so it runs only for LOBs that have Alerts enabled
  # (testdata/lobFeatures.json -> "@Alerts": ["LAEX", "NCEX"]) - the other LOBs still run the
  # first scenario, they just never run this one. This is scenario-level applicability.

  @Smoke @Regression
  Scenario: Dashboard loads for the current LOB
    Given I am logged in for my LOB
    Then I should be logged in successfully

  @Regression @Alerts
  Scenario: Alerts panel is visible for the current LOB
    Given I am logged in for my LOB
    Then the alerts panel should be visible
