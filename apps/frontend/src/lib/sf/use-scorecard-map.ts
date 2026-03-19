"use client";

import * as React from "react";

import {
  DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  DEFAULT_REVENUE_SALES_CHANNEL,
  DEFAULT_SCORECARD_MAP_INTERVAL,
  type ScorecardMapInterval,
  type RevenueCustomerChannel,
  type RevenueSalesChannel,
  type SfScorecardMapResponse,
} from "@contracts/sales";

type ScorecardMapError = {
  error?: {
    message?: string;
  };
};

export type ScorecardMapState = {
  data: SfScorecardMapResponse | null;
  loading: boolean;
  error: string | null;
};

export type ScorecardMapFilters = {
  interval?: ScorecardMapInterval;
  customerChannel?: RevenueCustomerChannel;
  salesChannel?: RevenueSalesChannel;
  enabled?: boolean;
  initialData?: SfScorecardMapResponse | null;
};

export function useScorecardMap(
  filters: ScorecardMapFilters = {},
): ScorecardMapState {
  const interval = filters.interval ?? DEFAULT_SCORECARD_MAP_INTERVAL;
  const customerChannel = filters.customerChannel ?? DEFAULT_REVENUE_CUSTOMER_CHANNEL;
  const salesChannel = filters.salesChannel ?? DEFAULT_REVENUE_SALES_CHANNEL;
  const enabled = filters.enabled ?? true;
  const initialData = filters.initialData ?? null;
  const skipInitialFetchRef = React.useRef(Boolean(enabled && initialData));
  const [data, setData] = React.useState<SfScorecardMapResponse | null>(initialData);
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
      interval,
      customerChannel,
      salesChannel,
    });

    setLoading(true);
    setError(null);

    fetch(`/api/sf/scorecard-map?${searchParams.toString()}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as ScorecardMapError | null;
          const message = payload?.error?.message;

          throw new Error(message ?? `Request failed (${response.status})`);
        }

        return response.json() as Promise<SfScorecardMapResponse>;
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
            : "Failed to load scorecard map data.",
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
  }, [customerChannel, enabled, interval, salesChannel]);

  return { data, loading, error };
}
