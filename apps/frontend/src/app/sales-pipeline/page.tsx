import { type SfOpportunityPipelineResponse } from "@contracts/sales";
import { unstable_noStore as noStore } from "next/cache";

import { SalesPipelineView } from "@/domains/pipeline/screen";

const PRELOAD_TIMEOUT_MS = Number(process.env.SF_PIPELINE_PRELOAD_TIMEOUT_MS ?? 2_500);

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          resolve(null);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function loadInitialPipelineData(): Promise<SfOpportunityPipelineResponse | null> {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  try {
    noStore();

    const { getOpportunityPipelinePayload } = await import(
      "@backend/domains/sales/opportunity-pipeline"
    );
    const payload = await withTimeout(
      getOpportunityPipelinePayload().then(({ payload: responsePayload }) => responsePayload),
      PRELOAD_TIMEOUT_MS,
    );

    if (payload === null) {
      console.warn(`Sales pipeline preload timed out after ${PRELOAD_TIMEOUT_MS}ms.`);
    }

    return payload;
  } catch (error) {
    console.error("Failed to preload sales pipeline data.", error);
    return null;
  }
}

export default async function SalesPipelinePage() {
  const initialData = await loadInitialPipelineData();

  return <SalesPipelineView initialData={initialData} />;
}
