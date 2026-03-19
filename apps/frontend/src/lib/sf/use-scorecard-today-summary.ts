"use client";

import * as React from "react";

import { type SfTodaySummaryResponse } from "@contracts/sales";

type TodaySummaryError = {
  error?: {
    message?: string;
  };
};

export type ScorecardTodaySummaryState = {
  data: SfTodaySummaryResponse | null;
  loading: boolean;
  error: string | null;
};

export type ScorecardTodaySummaryFilters = {
  enabled?: boolean;
  initialData?: SfTodaySummaryResponse | null;
};

export function useScorecardTodaySummary(
  filters: ScorecardTodaySummaryFilters = {},
): ScorecardTodaySummaryState {
  const enabled = filters.enabled ?? true;
  const initialData = filters.initialData ?? null;
  const skipInitialFetchRef = React.useRef(Boolean(enabled && initialData));
  const [data, setData] = React.useState<SfTodaySummaryResponse | null>(initialData);
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

    fetch("/api/sf/today-summary", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as TodaySummaryError | null;
          const message = payload?.error?.message;

          throw new Error(message ?? `Request failed (${response.status})`);
        }

        return response.json() as Promise<SfTodaySummaryResponse>;
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
            : "Failed to load scorecard today summary.",
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
