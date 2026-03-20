"use client";

import * as React from "react";

import { type PipelineClosedRange, type SfOpportunityPipelineResponse } from "@contracts/sales";

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
  closedRange?: PipelineClosedRange;
  initialDataClosedRange?: PipelineClosedRange;
};

const DEFAULT_CLOSED_RANGE: PipelineClosedRange = "ytd";

export function useSalesforcePipeline(
  filters: SalesforcePipelineFilters = {},
): SalesforcePipelineState {
  const enabled = filters.enabled ?? true;
  const initialData = filters.initialData ?? null;
  const closedRange = filters.closedRange ?? DEFAULT_CLOSED_RANGE;
  const initialDataClosedRange = filters.initialDataClosedRange ?? DEFAULT_CLOSED_RANGE;
  const skipInitialFetchRef = React.useRef(
    Boolean(enabled && initialData && closedRange === initialDataClosedRange),
  );
  const previousClosedRangeRef = React.useRef<PipelineClosedRange>(closedRange);
  const [data, setData] = React.useState<SfOpportunityPipelineResponse | null>(initialData);
  const [loading, setLoading] = React.useState(enabled && initialData === null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    const closedRangeChanged = previousClosedRangeRef.current !== closedRange;
    previousClosedRangeRef.current = closedRange;

    if (closedRangeChanged && closedRange === initialDataClosedRange && initialData) {
      React.startTransition(() => {
        setData(initialData);
        setError(null);
      });
    }

    if (skipInitialFetchRef.current && closedRange === initialDataClosedRange) {
      skipInitialFetchRef.current = false;
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      closedRange,
    });

    fetch(`/api/sf/pipeline?${params.toString()}`, {
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
  }, [closedRange, enabled, initialData, initialDataClosedRange]);

  return { data, loading, error };
}
