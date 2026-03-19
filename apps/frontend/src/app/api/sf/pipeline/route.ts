import { NextResponse } from "next/server";

import { getOpportunityPipelinePayload } from "@backend/domains/sales";

const SUCCESS_CACHE_CONTROL = "s-maxage=120, stale-while-revalidate=300";

const getRequestId = (request: Request): string =>
  request.headers.get("x-request-id") ??
  request.headers.get("x-vercel-id") ??
  crypto.randomUUID();

const toErrorResponse = (
  requestId: string,
  message: string,
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
      status: 500,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

export const GET = async (request: Request): Promise<NextResponse> => {
  const requestId = getRequestId(request);
  const startedAt = Date.now();

  try {
    const { payload, cacheHit } = await getOpportunityPipelinePayload();

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

    console.error(
      JSON.stringify({
        event: "sf_pipeline_error",
        route: "/api/sf/pipeline",
        requestId,
        latencyMs: Date.now() - startedAt,
        message,
      }),
    );

    return toErrorResponse(requestId, message);
  }
};
