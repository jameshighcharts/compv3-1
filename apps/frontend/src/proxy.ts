import { NextResponse } from "next/server"

import { auth } from "@/auth"

const PUBLIC_PATHS = new Set(["/signin"])
const LOCAL_DEV_HOSTS = new Set(["127.0.0.1", "localhost", "::1"])

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.has(pathname) || pathname.startsWith("/api/auth")

const isApiPath = (pathname: string): boolean => pathname.startsWith("/api/")

export default auth((request) => {
  const { nextUrl } = request
  const { hostname, pathname, search } = nextUrl
  const isAuthenticated = Boolean(request.auth)
  const isLocalDevBypass =
    process.env.NODE_ENV !== "production" && LOCAL_DEV_HOSTS.has(hostname)

  if (isLocalDevBypass) {
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    if (isAuthenticated && pathname === "/signin") {
      return NextResponse.redirect(new URL("/", nextUrl))
    }

    return NextResponse.next()
  }

  if (isAuthenticated) {
    return NextResponse.next()
  }

  if (isApiPath(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const signInUrl = new URL("/signin", nextUrl)
  signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`)

  return NextResponse.redirect(signInUrl)
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
}
