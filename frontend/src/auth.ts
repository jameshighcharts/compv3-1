import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import Slack from "next-auth/providers/slack"

export const isSlackConfigured = Boolean(
  process.env.AUTH_SECRET &&
    process.env.AUTH_SLACK_ID &&
    process.env.AUTH_SLACK_SECRET
)

const providers: Provider[] = isSlackConfigured ? [Slack] : []

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
})
