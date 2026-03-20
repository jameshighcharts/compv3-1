import { describe, expect, it } from "vitest"

import {
  getSlackProfileTeamId,
  isAllowedSlackWorkspace,
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
