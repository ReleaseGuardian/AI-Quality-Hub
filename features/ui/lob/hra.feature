Feature: HRA feature availability

  # HRA is a restricted feature: it only applies to the LOBs listed for "hra.feature" in
  # testdata/featureApplicability.json (LAEX, LADS, MIDS). LOB projects not in that list ignore
  # this feature's generated spec entirely, so it never runs for them.
  @Regression
  Scenario: HRA is available for the current LOB
    Given I am logged in for my LOB
    Then the HRA feature should be visible
