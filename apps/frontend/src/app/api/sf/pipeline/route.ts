import { NextResponse } from "next/server";

import { getOpportunityPipelinePayload } from "@backend/domains/sales";

const SUCCESS_CACHE_CONTROL = "s-maxage=120, stale-while-revalidate=300";
const ROUTE_TIMEOUT_MS = Number(process.env.SF_ROUTE_TIMEOUT_MS ?? 15_000);

class RouteTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteTimeoutError";
  }
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new RouteTimeoutError(`${label} timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const getRequestId = (request: Request): string =>
  request.headers.get("x-request-id") ??
  request.headers.get("x-vercel-id") ??
  crypto.randomUUID();

const toErrorResponse = (
  requestId: string,
  message: string,
  status: number,
): NextResponse =>
  NextResponse.json(
    {
      error: {
        code: "SF_PIPELINE_FAILED",
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

export const GET = async (request: Request): Promise<NextResponse> => {
  const requestId = getRequestId(request);
  const startedAt = Date.now();

  try {
    const { payload, cacheHit } = await withTimeout(
      getOpportunityPipelinePayload(),
      ROUTE_TIMEOUT_MS,
      "Salesforce pipeline request",
    );

    console.info(
      JSON.stringify({
        event: "sf_pipeline_success",
        route: "/api/sf/pipeline",
        requestId,
        cacheHit,
        opportunities: payload.deals.length,
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
    const status = error instanceof RouteTimeoutError ? 504 : 500;

    console.error(
      JSON.stringify({
        event: "sf_pipeline_error",
        route: "/api/sf/pipeline",
        requestId,
        latencyMs: Date.now() - startedAt,
        message,
        status,
      }),
    );

    return toErrorResponse(requestId, message, status);
  }
};
