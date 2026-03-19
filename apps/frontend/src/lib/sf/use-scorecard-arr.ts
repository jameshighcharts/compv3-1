"use client";

import * as React from "react";

import { type SfScorecardArrResponse } from "@contracts/sales";

type ScorecardArrError = {
  error?: {
    message?: string;
  };
};

export type ScorecardArrState = {
  data: SfScorecardArrResponse | null;
  loading: boolean;
  error: string | null;
};

export type ScorecardArrFilters = {
  enabled?: boolean;
  initialData?: SfScorecardArrResponse | null;
};

export function useScorecardArr(
  filters: ScorecardArrFilters = {},
): ScorecardArrState {
  const enabled = filters.enabled ?? true;
  const initialData = filters.initialData ?? null;
  const skipInitialFetchRef = React.useRef(Boolean(enabled && initialData));
  const [data, setData] = React.useState<SfScorecardArrResponse | null>(initialData);
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

    fetch("/api/sf/arr", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as ScorecardArrError | null;
          const message = payload?.error?.message;

          throw new Error(message ?? `Request failed (${response.status})`);
        }

        return response.json() as Promise<SfScorecardArrResponse>;
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
            : "Failed to load scorecard ARR data.",
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
