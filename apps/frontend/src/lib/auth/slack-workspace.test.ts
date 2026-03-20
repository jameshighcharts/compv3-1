import { describe, expect, it } from "vitest"

import {
  getSlackProfileEmail,
  getSlackProfileTeamId,
  isAllowedSlackEmailDomain,
  isAllowedSlackWorkspace,
  parseAllowedEmailDomains,
  normalizeSlackTeamId,
} from "@/lib/auth/slack-workspace"

describe("normalizeSlackTeamId", () => {
  it("returns null for empty values", () => {
    expect(normalizeSlackTeamId(undefined)).toBeNull()
    expect(normalizeSlackTeamId(null)).toBeNull()
    expect(normalizeSlackTeamId("   ")).toBeNull()
  })

  it("trims surrounding whitespace", () => {
    expect(normalizeSlackTeamId(" T07UR9NFJ ")).toBe("T07UR9NFJ")
  })
})

describe("getSlackProfileTeamId", () => {
  it("reads the Slack team id claim", () => {
    expect(
      getSlackProfileTeamId({
        "https://slack.com/team_id": " T07UR9NFJ ",
      })
    ).toBe("T07UR9NFJ")
  })

  it("returns null when the claim is missing", () => {
    expect(getSlackProfileTeamId({})).toBeNull()
  })
})

describe("isAllowedSlackWorkspace", () => {
  it("allows the configured Slack workspace", () => {
    expect(
      isAllowedSlackWorkspace(
        { "https://slack.com/team_id": "T07UR9NFJ" },
        "T07UR9NFJ"
      )
    ).toBe(true)
  })

  it("rejects a different Slack workspace", () => {
    expect(
      isAllowedSlackWorkspace(
        { "https://slack.com/team_id": "TOTHER123" },
        "T07UR9NFJ"
      )
    ).toBe(false)
  })
})

describe("parseAllowedEmailDomains", () => {
  it("normalizes and deduplicates domains", () => {
    expect(
      parseAllowedEmailDomains(" Highsoft.com,highsoft.com, highcharts.com ")
    ).toEqual(["highsoft.com", "highcharts.com"])
  })

  it("returns an empty list when unset", () => {
    expect(parseAllowedEmailDomains(undefined)).toEqual([])
  })
})

describe("getSlackProfileEmail", () => {
  it("normalizes the email address", () => {
    expect(
      getSlackProfileEmail({
        email: " JamesM.Haugen@Highsoft.com ",
      })
    ).toBe("jamesm.haugen@highsoft.com")
  })
})

describe("isAllowedSlackEmailDomain", () => {
  it("allows matching domains", () => {
    expect(
      isAllowedSlackEmailDomain(
        {
          email: "jamesm.haugen@highsoft.com",
        },
        ["highsoft.com"]
      )
    ).toBe(true)
  })

  it("rejects non-matching domains", () => {
    expect(
      isAllowedSlackEmailDomain(
        {
          email: "jamesm.haugen@example.com",
        },
        ["highsoft.com"]
      )
    ).toBe(false)
  })

  it("rejects when the allowlist is empty", () => {
    expect(
      isAllowedSlackEmailDomain(
        {
          email: "jamesm.haugen@highsoft.com",
        },
        []
      )
    ).toBe(false)
  })
})
