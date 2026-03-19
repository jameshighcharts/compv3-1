import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthError } from "next-auth"

import { auth, isSlackConfigured, providerMap, signIn, signOut } from "@/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type SearchParamValue = string | string[] | undefined

type SignInPageProps = {
  searchParams?:
    | Promise<Record<string, SearchParamValue>>
    | Record<string, SearchParamValue>
}

function firstValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function getErrorMessage(errorType?: string) {
  switch (errorType) {
    case "OAuthSignin":
      return "Slack rejected the sign-in request. Check the client ID, client secret, and redirect URL."
    case "CallbackRouteError":
      return "Slack returned to the app, but Auth.js could not complete the callback."
    case "Configuration":
      return "Slack OAuth is not configured yet. Add AUTH_SLACK_ID, AUTH_SLACK_SECRET, and AUTH_SECRET."
    default:
      return errorType
        ? "Authentication failed. Check the Slack app configuration and try again."
        : null
  }
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [session, resolvedSearchParams] = await Promise.all([
    auth(),
    Promise.resolve(searchParams),
  ])

  const callbackUrl = firstValue(resolvedSearchParams?.callbackUrl) ?? "/"
  const errorType = firstValue(resolvedSearchParams?.error)
  const errorMessage = getErrorMessage(errorType)
  const slackProvider = providerMap.find((provider) => provider.id === "slack")

  if (session?.user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Slack account connected</CardTitle>
            <CardDescription>
              You are signed in through Slack and can disconnect from this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="font-medium">{session.user.name ?? "Slack user"}</p>
              <p className="text-muted-foreground">
                {session.user.email ?? "No email returned by Slack"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="font-medium">Registered callback path</p>
              <code className="mt-2 block text-xs sm:text-sm">
                /api/auth/callback/slack
              </code>
              <p className="mt-2 text-muted-foreground">
                The alias <code>/api/auth/slack/callback</code> also forwards into
                Auth.js if your Slack app already uses that path.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-3">
            <form
              action={async () => {
                "use server"

                await signOut({
                  redirectTo: "/signin",
                })
              }}
            >
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
            <Button asChild>
              <Link href="/">Back to dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Connect Slack with Auth.js</CardTitle>
          <CardDescription>
            Add the Slack keys in the deployment environment, then start the sign-in
            flow from this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="font-medium">Environment variables</p>
            <code className="mt-2 block text-xs sm:text-sm">
              AUTH_SECRET
              <br />
              AUTH_SLACK_ID
              <br />
              AUTH_SLACK_SECRET
            </code>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="font-medium">Redirect URL to register in Slack</p>
            <code className="mt-2 block text-xs sm:text-sm">
              https://compv2.vercel.app/api/auth/callback/slack
            </code>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          {isSlackConfigured && slackProvider ? (
            <form
              action={async () => {
                "use server"

                try {
                  await signIn(slackProvider.id, {
                    redirectTo: callbackUrl,
                  })
                } catch (error) {
                  if (error instanceof AuthError) {
                    return redirect(`/signin?error=${error.type}`)
                  }

                  throw error
                }
              }}
            >
              <Button type="submit">Continue with Slack</Button>
            </form>
          ) : (
            <Button disabled>Waiting for Slack keys</Button>
          )}
          <Button asChild variant="outline">
            <Link href="/">Back to dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
