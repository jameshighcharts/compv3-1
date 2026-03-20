import type { SlackProfile } from "next-auth/providers/slack"

export const SLACK_TEAM_ID_CLAIM = "https://slack.com/team_id"
export const SLACK_EMAIL_CLAIM = "email"

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

function normalizeSlackEmailAddress(value?: string | null) {
  const normalizedValue = value?.trim().toLowerCase()

  return normalizedValue ? normalizedValue : null
}

export function parseAllowedEmailDomains(value?: string | null) {
  if (!value) {
    return []
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

export function getSlackProfileEmail(profile?: Partial<SlackProfile> | null) {
  const email = profile?.[SLACK_EMAIL_CLAIM]

  return typeof email === "string" ? normalizeSlackEmailAddress(email) : null
}

export function isAllowedSlackEmailDomain(
  profile: Partial<SlackProfile> | null | undefined,
  allowedDomains: string[]
) {
  if (allowedDomains.length === 0) {
    return false
  }

  const normalizedEmail = getSlackProfileEmail(profile)

  if (!normalizedEmail) {
    return false
  }

  return allowedDomains.some((domain) => normalizedEmail.endsWith(`@${domain}`))
}
