import Image from "next/image"
import { redirect } from "next/navigation"
import { AuthError } from "next-auth"

import { auth, isSlackConfigured, providerMap, signIn } from "@/auth"
import { Button } from "@/shared/ui/button"

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
      return "Slack rejected the sign-in request."
    case "CallbackRouteError":
      return "Slack returned, but the callback could not complete."
    case "Configuration":
      return "Slack OAuth is not configured yet."
    case "SlackWorkspaceRestricted":
      return "Use the approved Slack workspace to sign in."
    default:
      return errorType ? "Authentication failed. Try again." : null
  }
}

function resolveRedirectTarget(value: SearchParamValue) {
  const resolvedValue = firstValue(value)

  if (!resolvedValue || !resolvedValue.startsWith("/")) {
    return "/"
  }

  return resolvedValue
}

function SlackGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="10.2" y="1.5" width="3.6" height="8" rx="1.8" fill="#36C5F0" />
      <rect x="14.5" y="10.2" width="8" height="3.6" rx="1.8" fill="#36C5F0" />
      <rect x="14.5" y="1.5" width="3.6" height="8" rx="1.8" fill="#2EB67D" />
      <rect x="10.2" y="5.8" width="8" height="3.6" rx="1.8" fill="#2EB67D" />
      <rect x="10.2" y="14.5" width="3.6" height="8" rx="1.8" fill="#ECB22E" />
      <rect x="1.5" y="10.2" width="8" height="3.6" rx="1.8" fill="#ECB22E" />
      <rect x="5.8" y="14.5" width="3.6" height="8" rx="1.8" fill="#E01E5A" />
      <rect x="1.5" y="14.5" width="8" height="3.6" rx="1.8" fill="#E01E5A" />
    </svg>
  )
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [session, resolvedSearchParams] = await Promise.all([
    auth(),
    Promise.resolve(searchParams),
  ])

  if (session?.user) {
    redirect("/")
  }

  const callbackUrl = resolveRedirectTarget(resolvedSearchParams?.callbackUrl)
  const errorType = firstValue(resolvedSearchParams?.error)
  const errorMessage = getErrorMessage(errorType)
  const slackProvider = providerMap.find((provider) => provider.id === "slack")

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 text-slate-900"
      style={{
        backgroundColor: "#fbfbf8",
        backgroundImage:
          "radial-gradient(circle at top, rgba(0, 0, 0, 0.03), transparent 42%)",
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-black/8" />

      <section className="relative z-10 flex w-full max-w-xl flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-5">
          <div
            className="relative h-12"
            style={{
              width: "292px",
              maxWidth: "72vw",
            }}
          >
            <Image
              src="/highcharts.svg"
              alt="Highcharts"
              fill
              priority
              className="object-contain"
            />
          </div>
        </div>

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
            className="w-full max-w-xs"
          >
            <Button
              type="submit"
              variant="outline"
              className="h-14 w-full justify-center rounded-xl bg-white text-base font-semibold text-slate-900 transition-transform hover:-translate-y-0.5 hover:bg-white"
              style={{
                borderColor: "rgba(0, 0, 0, 0.12)",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
              }}
            >
              <SlackGlyph />
              <span>Sign in with Slack</span>
            </Button>
          </form>
        ) : (
          <div
            className="w-full max-w-xs rounded-xl border bg-white px-5 py-4 text-center text-sm text-black/60"
            style={{
              borderColor: "rgba(0, 0, 0, 0.1)",
            }}
          >
            Slack sign-in is not configured.
          </div>
        )}

        {errorMessage ? (
          <p className="max-w-sm text-center text-sm text-red-800">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  )
}
