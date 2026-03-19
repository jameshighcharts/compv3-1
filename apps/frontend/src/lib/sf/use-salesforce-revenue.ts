"use client";

import * as React from "react";

import {
  DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  DEFAULT_REVENUE_SALES_CHANNEL,
  type RevenueCustomerChannel,
  type RevenueRange,
  type RevenueSalesChannel,
  type SfRevenueResponse,
} from "@contracts/sales";

type SfRevenueError = {
  error?: {
    message?: string;
  };
};

export type SalesforceRevenueState = {
  data: SfRevenueResponse | null;
  loading: boolean;
  error: string | null;
};

export type SalesforceRevenueWindow =
  | RevenueRange
  | {
      from: string;
      to: string;
    };

export type SalesforceRevenueFilters = {
  customerChannel?: RevenueCustomerChannel;
  salesChannel?: RevenueSalesChannel;
  enabled?: boolean;
  initialData?: SfRevenueResponse | null;
};

const resolveRevenueWindowSearchParams = (
  window: SalesforceRevenueWindow,
): Record<string, string> =>
  typeof window === "string"
    ? { range: window }
    : {
        from: window.from,
        to: window.to,
      };

export function useSalesforceRevenue(
  window: SalesforceRevenueWindow,
  filters: SalesforceRevenueFilters = {},
): SalesforceRevenueState {
  const customerChannel = filters.customerChannel ?? DEFAULT_REVENUE_CUSTOMER_CHANNEL;
  const salesChannel = filters.salesChannel ?? DEFAULT_REVENUE_SALES_CHANNEL;
  const enabled = filters.enabled ?? true;
  const initialData = filters.initialData ?? null;
  const range = typeof window === "string" ? window : null;
  const from = typeof window === "string" ? null : window.from;
  const to = typeof window === "string" ? null : window.to;
  const skipInitialFetchRef = React.useRef(Boolean(enabled && initialData));
  const [data, setData] = React.useState<SfRevenueResponse | null>(initialData);
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
      ...resolveRevenueWindowSearchParams(range ?? { from: from ?? "", to: to ?? "" }),
      customerChannel,
      salesChannel,
    });

    setLoading(true);
    setError(null);

    fetch(`/api/sf/revenue?${searchParams.toString()}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as SfRevenueError | null;
          const message = payload?.error?.message;

          throw new Error(message ?? `Request failed (${response.status})`);
        }

        return response.json() as Promise<SfRevenueResponse>;
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
            : "Failed to load Salesforce revenue data.",
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
  }, [customerChannel, enabled, salesChannel, range, from, to]);

  return { data, loading, error };
}
