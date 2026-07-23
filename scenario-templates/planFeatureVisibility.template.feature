Feature: Plan-scoped feature visibility

  # Pilot/demo stand-in: this project's demo login page has no real conditional feature
  # (e.g. a "Download" button) to check, so "the logout link" plays that role here - proving
  # the mechanism (plan-derived LOB group -> generated scenario -> generic assertion step),
  # not the specific feature name. A real client feature would follow this identical pattern
  # once its actual page/locator is known.
  Scenario Outline: Feature visible for LOBs under a specific Plan
    Given I am logged in as a member for LOB "<lob>"
    Then the logout link should be visible

    Examples:
      | lob |
