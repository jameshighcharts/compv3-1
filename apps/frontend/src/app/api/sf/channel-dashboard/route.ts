import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  getScorecardChannelDashboardPayload,
  resolveRevenueFiltersFromSearchParams,
  resolveRevenueWindowFromSearchParams,
} from "@backend/domains/sales";

const SUCCESS_CACHE_CONTROL = "s-maxage=120, stale-while-revalidate=300";

const getRequestId = (request: NextRequest): string =>
  request.headers.get("x-request-id") ??
  request.headers.get("x-vercel-id") ??
  crypto.randomUUID();

const toErrorResponse = (
  requestId: string,
  status: 400 | 500,
  message: string,
): NextResponse =>
  NextResponse.json(
    {
      error: {
        code: status === 400 ? "INVALID_REQUEST" : "SF_CHANNEL_DASHBOARD_FAILED",
        message,
        requestId,
        timestamp: new Date().toISOString(),
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const requestId = getRequestId(request);
  const startedAt = Date.now();

  let filters;
  let window;

  try {
    filters = resolveRevenueFiltersFromSearchParams(request.nextUrl.searchParams);
    window = resolveRevenueWindowFromSearchParams(request.nextUrl.searchParams);
  } catch (error) {
    if (error instanceof ZodError) {
      return toErrorResponse(
        requestId,
        400,
        error.issues[0]?.message ?? "Invalid filters.",
      );
    }

    return toErrorResponse(requestId, 400, "Invalid filters.");
  }

  try {
    const { payload, cacheHit } = await getScorecardChannelDashboardPayload(filters, window);

    console.info(
      JSON.stringify({
        event: "sf_channel_dashboard_success",
        route: "/api/sf/channel-dashboard",
        requestId,
        customerChannel: filters.customerChannel,
        salesChannel: filters.salesChannel,
        from: window.from,
        to: window.to,
        cacheHit,
        latencyMs: Date.now() - startedAt,
      }),
    );

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": SUCCESS_CACHE_CONTROL,
        "x-sf-cache": cacheHit ? "hit" : "miss",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Salesforce error";

    console.error(
      JSON.stringify({
        event: "sf_channel_dashboard_error",
        route: "/api/sf/channel-dashboard",
        requestId,
        customerChannel: filters.customerChannel,
        salesChannel: filters.salesChannel,
        from: window?.from,
        to: window?.to,
        latencyMs: Date.now() - startedAt,
        message,
      }),
    );

    return toErrorResponse(requestId, 500, message);
  }
};
