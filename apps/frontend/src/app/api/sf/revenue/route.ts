import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  getRevenuePayload,
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
        code: status === 400 ? "INVALID_REQUEST" : "SF_REVENUE_FAILED",
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

  let window;
  const filters = resolveRevenueFiltersFromSearchParams(request.nextUrl.searchParams);

  try {
    window = resolveRevenueWindowFromSearchParams(request.nextUrl.searchParams);
  } catch (error) {
    if (error instanceof ZodError) {
      return toErrorResponse(
        requestId,
        400,
        error.issues[0]?.message ?? "Invalid date interval.",
      );
    }

    return toErrorResponse(requestId, 400, "Invalid date interval.");
  }

  try {
    const { payload, cacheHit } = await getRevenuePayload(window, filters);

    console.info(
      JSON.stringify({
        event: "sf_revenue_success",
        route: "/api/sf/revenue",
        requestId,
        range: window.range ?? "custom",
        from: window.from,
        to: window.to,
        label: window.label,
        customerChannel: filters.customerChannel,
        salesChannel: filters.salesChannel,
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
        event: "sf_revenue_error",
        route: "/api/sf/revenue",
        requestId,
        range: window.range ?? "custom",
        from: window.from,
        to: window.to,
        customerChannel: filters.customerChannel,
        salesChannel: filters.salesChannel,
        latencyMs: Date.now() - startedAt,
        message,
      }),
    );

    return toErrorResponse(requestId, 500, message);
  }
};
