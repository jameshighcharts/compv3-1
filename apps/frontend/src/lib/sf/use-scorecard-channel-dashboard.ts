"use client";

import * as React from "react";

import {
  DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  DEFAULT_REVENUE_RANGE,
  DEFAULT_REVENUE_SALES_CHANNEL,
  type RevenueCustomerChannel,
  type RevenueRange,
  type RevenueSalesChannel,
  type SfScorecardChannelDashboardResponse,
} from "@contracts/sales";

type ScorecardChannelDashboardError = {
  error?: {
    message?: string;
  };
};

export type ScorecardChannelDashboardState = {
  data: SfScorecardChannelDashboardResponse | null;
  loading: boolean;
  error: string | null;
};

export type ScorecardChannelDashboardFilters = {
  customerChannel?: RevenueCustomerChannel;
  range?: RevenueRange;
  salesChannel?: RevenueSalesChannel;
  enabled?: boolean;
  initialData?: SfScorecardChannelDashboardResponse | null;
};

export function useScorecardChannelDashboard(
  filters: ScorecardChannelDashboardFilters = {},
): ScorecardChannelDashboardState {
  const customerChannel = filters.customerChannel ?? DEFAULT_REVENUE_CUSTOMER_CHANNEL;
  const range = filters.range ?? DEFAULT_REVENUE_RANGE;
  const salesChannel = filters.salesChannel ?? DEFAULT_REVENUE_SALES_CHANNEL;
  const enabled = filters.enabled ?? true;
  const initialData = filters.initialData ?? null;
  const skipInitialFetchRef = React.useRef(Boolean(enabled && initialData));
  const [data, setData] = React.useState<SfScorecardChannelDashboardResponse | null>(initialData);
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
      range,
      salesChannel,
    });

    setLoading(true);
    setError(null);

    fetch(`/api/sf/channel-dashboard?${searchParams.toString()}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as ScorecardChannelDashboardError | null;
          const message = payload?.error?.message;

          throw new Error(message ?? `Request failed (${response.status})`);
        }

        return response.json() as Promise<SfScorecardChannelDashboardResponse>;
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
            : "Failed to load scorecard channel dashboard.",
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
  }, [customerChannel, enabled, range, salesChannel]);

  return { data, loading, error };
}
