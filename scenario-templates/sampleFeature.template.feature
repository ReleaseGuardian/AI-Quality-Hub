Feature: Cross-plan feature visibility

  # Pilot/demo stand-in - see planFeatureVisibility.template.feature for why "the logout
  # link" is used here instead of a real client feature.
  Scenario Outline: Feature visible for a hand-picked cross-Plan LOB subset
    Given I am logged in as a member for LOB "<lob>"
    Then the logout link should be visible

    Examples:
      | lob |
