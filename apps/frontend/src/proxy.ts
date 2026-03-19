import { NextResponse } from "next/server"

import { auth } from "@/auth"

const PUBLIC_PATHS = new Set(["/signin"])

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.has(pathname) || pathname.startsWith("/api/auth")

const isApiPath = (pathname: string): boolean => pathname.startsWith("/api/")

export default auth((request) => {
  const { nextUrl } = request
  const { pathname, search } = nextUrl
  const isAuthenticated = Boolean(request.auth)

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
