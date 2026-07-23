Feature: LOB login

  Scenario Outline: Successful login for a given LOB
    Given I am logged in as a member for LOB "<lob>"
    Then I should be logged in successfully

    Examples:
      | lob |
