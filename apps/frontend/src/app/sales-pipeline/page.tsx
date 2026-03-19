import { getOpportunityPipelinePayload } from "@backend/domains/sales";
import { type SfOpportunityPipelineResponse } from "@contracts/sales";

import { SalesPipelineView } from "@/domains/pipeline/screen";

export const dynamic = "force-dynamic";

async function loadInitialPipelineData(): Promise<SfOpportunityPipelineResponse | null> {
  try {
    const { payload } = await getOpportunityPipelinePayload();

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
