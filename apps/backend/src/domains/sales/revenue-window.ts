import type { RevenueRange } from "@contracts/sales";

const toUtcStartOfDay = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

const addUtcDays = (value: Date, delta: number): Date => {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
};

const firstOfUtcMonth = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));

const shiftUtcMonths = (value: Date, delta: number): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + delta, 1));

export const formatDateOnlyUtc = (value: Date): string =>
  `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate(),
  ).padStart(2, "0")}`;

export const getRevenueRangeWindow = (
  range: RevenueRange,
  now: Date = new Date(),
): { from: string; to: string; label: string } => {
  const end = toUtcStartOfDay(now);

  if (range === "30d") {
    return {
      from: formatDateOnlyUtc(addUtcDays(end, -29)),
      to: formatDateOnlyUtc(end),
      label: "Last 30 days",
    };
  }

  if (range === "90d") {
    return {
      from: formatDateOnlyUtc(addUtcDays(end, -89)),
      to: formatDateOnlyUtc(end),
      label: "Last 90 days",
    };
  }

  if (range === "ytd") {
    const start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
    return {
      from: formatDateOnlyUtc(start),
      to: formatDateOnlyUtc(end),
      label: "Year to date",
    };
  }

  const start = shiftUtcMonths(firstOfUtcMonth(end), -11);

  return {
    from: formatDateOnlyUtc(start),
    to: formatDateOnlyUtc(end),
    label: "Last 12 months",
  };
};
