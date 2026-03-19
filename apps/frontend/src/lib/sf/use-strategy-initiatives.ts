"use client";

import * as React from "react";

import { type SfStrategyInitiativesResponse } from "@contracts/sales";

type StrategyInitiativesError = {
  error?: {
    message?: string;
  };
};

export type StrategyInitiativesState = {
  data: SfStrategyInitiativesResponse | null;
  loading: boolean;
  error: string | null;
};

export function useStrategyInitiatives(): StrategyInitiativesState {
  const [data, setData] = React.useState<SfStrategyInitiativesResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch("/api/sf/strategy-initiatives", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as StrategyInitiativesError | null;
          const message = payload?.error?.message;

          throw new Error(message ?? `Request failed (${response.status})`);
        }

        return response.json() as Promise<SfStrategyInitiativesResponse>;
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
            : "Failed to load strategy initiatives.",
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
  }, []);

  return { data, loading, error };
}
