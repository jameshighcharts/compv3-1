"use client";

import * as React from "react";

import { type SfOpportunityPipelineResponse } from "@contracts/sales";

type OpportunityPipelineError = {
  error?: {
    message?: string;
  };
};

export type SalesforcePipelineState = {
  data: SfOpportunityPipelineResponse | null;
  loading: boolean;
  error: string | null;
};

export type SalesforcePipelineFilters = {
  enabled?: boolean;
  initialData?: SfOpportunityPipelineResponse | null;
};

export function useSalesforcePipeline(
  filters: SalesforcePipelineFilters = {},
): SalesforcePipelineState {
  const enabled = filters.enabled ?? true;
  const initialData = filters.initialData ?? null;
  const skipInitialFetchRef = React.useRef(Boolean(enabled && initialData));
  const [data, setData] = React.useState<SfOpportunityPipelineResponse | null>(initialData);
  const [loading, setLoading] = React.useState(enabled && initialData === null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch("/api/sf/pipeline", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload =
            (await response.json().catch(() => null)) as OpportunityPipelineError | null;
          const message = payload?.error?.message;

          throw new Error(message ?? `Request failed (${response.status})`);
        }

        return response.json() as Promise<SfOpportunityPipelineResponse>;
      })
      .then((payload) => {
        React.startTransition(() => {
          setData(payload);
          setError(null);
        });
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load Salesforce opportunity pipeline.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [enabled]);

  return { data, loading, error };
}
