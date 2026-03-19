"use client";

import * as React from "react";

import {
  DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  DEFAULT_REVENUE_SALES_CHANNEL,
  type RevenueCustomerChannel,
  type RevenueSalesChannel,
  type SfTopDealsResponse,
} from "@contracts/sales";

type TopDealsError = {
  error?: {
    message?: string;
  };
};

export type ScorecardTopDealsState = {
  data: SfTopDealsResponse | null;
  loading: boolean;
  error: string | null;
};

export type ScorecardTopDealsFilters = {
  customerChannel?: RevenueCustomerChannel;
  salesChannel?: RevenueSalesChannel;
  enabled?: boolean;
  initialData?: SfTopDealsResponse | null;
};

export function useScorecardTopDeals(
  filters: ScorecardTopDealsFilters = {},
): ScorecardTopDealsState {
  const customerChannel = filters.customerChannel ?? DEFAULT_REVENUE_CUSTOMER_CHANNEL;
  const salesChannel = filters.salesChannel ?? DEFAULT_REVENUE_SALES_CHANNEL;
  const enabled = filters.enabled ?? true;
  const initialData = filters.initialData ?? null;
  const skipInitialFetchRef = React.useRef(Boolean(enabled && initialData));
  const [data, setData] = React.useState<SfTopDealsResponse | null>(initialData);
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
      customerChannel,
      salesChannel,
    });

    setLoading(true);
    setError(null);

    fetch(`/api/sf/top-deals?${searchParams.toString()}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as TopDealsError | null;
          const message = payload?.error?.message;

          throw new Error(message ?? `Request failed (${response.status})`);
        }

        return response.json() as Promise<SfTopDealsResponse>;
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
            : "Failed to load top deals data.",
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
  }, [customerChannel, enabled, salesChannel]);

  return { data, loading, error };
}
