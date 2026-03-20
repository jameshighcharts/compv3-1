import type { SlackProfile } from "next-auth/providers/slack"

export const SLACK_TEAM_ID_CLAIM = "https://slack.com/team_id"

export function normalizeSlackTeamId(value?: string | null) {
  const normalizedValue = value?.trim()

  return normalizedValue ? normalizedValue : null
}

export function getSlackProfileTeamId(
  profile?: Partial<SlackProfile> | null
) {
  const teamId = profile?.[SLACK_TEAM_ID_CLAIM]

  return typeof teamId === "string" ? normalizeSlackTeamId(teamId) : null
}

export function isAllowedSlackWorkspace(
  profile: Partial<SlackProfile> | null | undefined,
  allowedTeamId: string | null
) {
  const normalizedAllowedTeamId = normalizeSlackTeamId(allowedTeamId)

  if (!normalizedAllowedTeamId) {
    return false
  }

  return getSlackProfileTeamId(profile) === normalizedAllowedTeamId
}
