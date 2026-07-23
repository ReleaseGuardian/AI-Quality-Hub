Feature: LOB API access

  # Pilot/demo stand-in: this project's demo API (JSONPlaceholder) has no real per-LOB
  # authentication or behavior, so "the users list comes back successfully" plays the role of
  # a real per-LOB API check here - proving the mechanism (LOB group -> generated scenario ->
  # generic API step, no browser needed), not the specific endpoint. A real client endpoint
  # would follow this identical pattern once its actual authenticated API is known - see
  # BaseApiClient.getAuthHeaders(accessToken), reserved for exactly that.
  Scenario Outline: API access for a given LOB
    Given I am authenticated as a member for LOB "<lob>"
    Then the users list should be returned successfully

    Examples:
      | lob |
