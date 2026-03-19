import { NextRequest, NextResponse } from "next/server"

export function GET(request: NextRequest) {
  const callbackUrl = new URL("/api/auth/callback/slack", request.url)

  callbackUrl.search = request.nextUrl.search

  return NextResponse.redirect(callbackUrl)
}
