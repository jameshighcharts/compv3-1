"use client";

import * as React from "react";

import {
  DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  type RevenueCustomerChannel,
  type RevenueRange,
  type SfHistoricalResponse,
} from "@contracts/sales";

type HistoricalError = {
  error?: {
    message?: string;
  };
};

export type ScorecardHistoricalState = {
  data: SfHistoricalResponse | null;
  loading: boolean;
  error: string | null;
};

type HistoricalWindow =
  | RevenueRange
  | {
      from: string;
      to: string;
    };

type HistoricalFilters = {
  customerChannel?: RevenueCustomerChannel;
  enabled?: boolean;
  initialData?: SfHistoricalResponse | null;
};

function useHistoricalMonthlyWindow(): HistoricalWindow {
  const [monthlyWindow] = React.useState<HistoricalWindow>(() => ({
    from: "2022-03-01",
    to: new Date().toISOString().slice(0, 10),
  }));

  return monthlyWindow;
}

function resolveHistoricalWindowSearchParams(
  window: HistoricalWindow,
): Record<string, string> {
  if (typeof window === "string") {
    return { range: window };
  }

  return {
    from: window.from,
    to: window.to,
  };
}

export function useScorecardHistoricalMonthlyData(
  window?: HistoricalWindow,
  filters: HistoricalFilters = {},
): ScorecardHistoricalState {
  const monthlyWindow = useHistoricalMonthlyWindow();
  const selectedWindow = window ?? monthlyWindow;
  const customerChannel = filters.customerChannel ?? DEFAULT_REVENUE_CUSTOMER_CHANNEL;
  const enabled = filters.enabled ?? true;
  const initialData = filters.initialData ?? null;
  const range = typeof selectedWindow === "string" ? selectedWindow : null;
  const from = typeof selectedWindow === "string" ? null : selectedWindow.from;
  const to = typeof selectedWindow === "string" ? null : selectedWindow.to;
  const skipInitialFetchRef = React.useRef(Boolean(enabled && initialData));
  const [data, setData] = React.useState<SfHistoricalResponse | null>(initialData);
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
    const searchParams = new URLSearchParams({
      ...resolveHistoricalWindowSearchParams(range ?? { from: from ?? "", to: to ?? "" }),
      customerChannel,
    });

    setLoading(true);
    setError(null);

    fetch(`/api/sf/historical?${searchParams.toString()}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as HistoricalError | null;
          const message = payload?.error?.message;

          throw new Error(message ?? `Request failed (${response.status})`);
        }

        return response.json() as Promise<SfHistoricalResponse>;
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
            : "Failed to load historical revenue data.",
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
  }, [customerChannel, enabled, range, from, to]);

  return { data, loading, error };
}
