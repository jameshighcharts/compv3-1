import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import type { SlackProfile } from "next-auth/providers/slack"
import Slack from "next-auth/providers/slack"

import {
  isAllowedSlackWorkspace,
  normalizeSlackTeamId,
} from "@/lib/auth/slack-workspace"

const allowedSlackTeamId = normalizeSlackTeamId(process.env.AUTH_SLACK_TEAM_ID)

export const isSlackConfigured = Boolean(
  process.env.AUTH_SECRET &&
    process.env.AUTH_SLACK_ID &&
    process.env.AUTH_SLACK_SECRET &&
    allowedSlackTeamId
)

const providers: Provider[] =
  isSlackConfigured && allowedSlackTeamId
    ? [
        Slack({
          authorization: {
            params: {
              // Hint Slack to open the approved workspace first.
              team: allowedSlackTeamId,
            },
          },
        }),
      ]
    : []

export const providerMap = providers.map((provider) => {
  if (typeof provider === "function") {
    const providerConfig = provider()

    return {
      id: providerConfig.id,
      name: providerConfig.name,
    }
  }

  return {
    id: provider.id,
    name: provider.name,
  }
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "slack") {
        return true
      }

      if (
        !isAllowedSlackWorkspace(
          profile as Partial<SlackProfile> | undefined,
          allowedSlackTeamId
        )
      ) {
        return "/signin?error=SlackWorkspaceRestricted"
      }

      return true
    },
  },
})
