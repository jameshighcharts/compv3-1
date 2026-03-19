export type SalesGaugeTargets = {
  base: number;
  budget: number;
  high: number;
  max: number;
};

export type SalesTargetKey = "base" | "budget" | "high";

type DailyTargetRates = Record<SalesTargetKey, number>;

type SalesGaugeTargetSummary = {
  month: SalesGaugeTargets;
  ytd: SalesGaugeTargets;
};

type SalesTargetWindowSummary = {
  toDate: SalesGaugeTargets;
  total: SalesGaugeTargets;
};

export type SalesTargetSummary = {
  month: SalesTargetWindowSummary;
  ytd: SalesTargetWindowSummary;
};

export type SalesTargetBenchmark = {
  key: SalesTargetKey;
  name: string;
  amount: number;
  revenueLeft: number;
  pctReached: number;
  pctOnTrack: number;
  dailyTarget: number;
};

export const SALES_TARGET_BENCHMARKS = [
  { key: "base", name: "Base" },
  { key: "budget", name: "Budget" },
  { key: "high", name: "High" },
] as const satisfies ReadonlyArray<{ key: SalesTargetKey; name: string }>;

const YEARLY_DAILY_TARGETS: Record<number, DailyTargetRates> = {
  2025: {
    base: 43_650.79,
    budget: 49_603.17,
    high: 55_555.56,
  },
  2026: {
    base: 51_587.3,
    budget: 55_555.56,
    high: 59_523.81,
  },
};

const MONTH_LABEL_TO_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const FALLBACK_DAILY_TARGETS = YEARLY_DAILY_TARGETS[2026];

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const atLocalMidday = (year: number, monthIndex: number, day: number): Date =>
  new Date(year, monthIndex, day, 12, 0, 0, 0);

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return atLocalMidday(year, month - 1, day);
};

const getNorwegianHolidayKeys = (year: number): Set<string> => {
  const easterSunday = getEasterSunday(year);
  const holidays = [
    atLocalMidday(year, 0, 1),
    addDays(easterSunday, -3),
    addDays(easterSunday, -2),
    addDays(easterSunday, 1),
    addDays(easterSunday, 39),
    addDays(easterSunday, 50),
    atLocalMidday(year, 4, 1),
    atLocalMidday(year, 4, 17),
    atLocalMidday(year, 11, 24),
    atLocalMidday(year, 11, 25),
    atLocalMidday(year, 11, 26),
  ];

  return new Set(holidays.map(toDateKey));
};

const isWorkingTargetDay = (date: Date, holidayKeys: Set<string>): boolean => {
  const day = date.getDay();

  if (day === 0 || day === 6) {
    return false;
  }

  return !holidayKeys.has(toDateKey(date));
};

const getDailyTargetsForYear = (year: number): DailyTargetRates =>
  YEARLY_DAILY_TARGETS[year] ?? FALLBACK_DAILY_TARGETS;

const toGaugeTargets = (totals: DailyTargetRates): SalesGaugeTargets => ({
  ...totals,
  max: totals.high * 1.1,
});

const sumTargetsForRange = (start: Date, end: Date): SalesGaugeTargets => {
  if (start > end) {
    return toGaugeTargets({
      base: 0,
      budget: 0,
      high: 0,
    });
  }

  const totals: DailyTargetRates = {
    base: 0,
    budget: 0,
    high: 0,
  };

  const cursor = new Date(start);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const holidayKeys = getNorwegianHolidayKeys(year);

    if (isWorkingTargetDay(cursor, holidayKeys)) {
      const dailyTargets = getDailyTargetsForYear(year);
      totals.base += dailyTargets.base;
      totals.budget += dailyTargets.budget;
      totals.high += dailyTargets.high;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return toGaugeTargets(totals);
};

const parseLatestMonth = (
  months: string[],
): { year: number; monthIndex: number } | null => {
  const latestLabel = months.at(-1)?.trim();

  if (!latestLabel) {
    return null;
  }

  const match = /^([A-Z][a-z]{2}) '(\d{2})$/.exec(latestLabel);

  if (!match) {
    return null;
  }

  const [, monthLabel, yearSuffix] = match;
  const monthIndex = MONTH_LABEL_TO_INDEX[monthLabel];

  if (monthIndex === undefined) {
    return null;
  }

  const year = 2000 + Number(yearSuffix);

  if (!Number.isInteger(year)) {
    return null;
  }

  return {
    year,
    monthIndex,
  };
};

const getTargetEndDate = (
  year: number,
  monthIndex: number,
  now: Date,
): Date => {
  if (year === now.getFullYear() && monthIndex === now.getMonth()) {
    return atLocalMidday(year, monthIndex, now.getDate());
  }

  return atLocalMidday(year, monthIndex + 1, 0);
};

const getMonthEndDate = (year: number, monthIndex: number): Date =>
  atLocalMidday(year, monthIndex + 1, 0);

const getYearEndDate = (year: number): Date =>
  atLocalMidday(year, 11, 31);

const roundPct = (value: number): number =>
  Math.round(value * 10) / 10;

const ratioToPct = (actual: number, target: number): number => {
  if (target <= 0) {
    return 0;
  }

  return roundPct((actual / target) * 100);
};

export const resolveSalesTargetSummary = (
  months: string[],
  now: Date = new Date(),
): SalesTargetSummary => {
  const latestMonth = parseLatestMonth(months);
  const year = latestMonth?.year ?? now.getFullYear();
  const monthIndex = latestMonth?.monthIndex ?? now.getMonth();
  const monthStart = atLocalMidday(year, monthIndex, 1);
  const ytdStart = atLocalMidday(year, 0, 1);
  const toDateEnd = getTargetEndDate(year, monthIndex, now);
  const monthEnd = getMonthEndDate(year, monthIndex);
  const yearEnd = getYearEndDate(year);

  return {
    month: {
      toDate: sumTargetsForRange(monthStart, toDateEnd),
      total: sumTargetsForRange(monthStart, monthEnd),
    },
    ytd: {
      toDate: sumTargetsForRange(ytdStart, toDateEnd),
      total: sumTargetsForRange(ytdStart, yearEnd),
    },
  };
};

export const resolveSalesGaugeTargets = (
  months: string[],
  now: Date = new Date(),
): SalesGaugeTargetSummary => {
  const summary = resolveSalesTargetSummary(months, now);

  return {
    month: summary.month.toDate,
    ytd: summary.ytd.toDate,
  };
};

export const buildSalesTargetBenchmarks = (
  actual: number,
  totalTargets: SalesGaugeTargets,
  toDateTargets: SalesGaugeTargets,
): SalesTargetBenchmark[] => {
  const year = new Date().getFullYear();
  const dailyRates = getDailyTargetsForYear(year);

  return SALES_TARGET_BENCHMARKS.map(({ key, name }) => {
    const amount = totalTargets[key];

    return {
      key,
      name,
      amount,
      revenueLeft: Math.max(amount - actual, 0),
      pctReached: ratioToPct(actual, amount),
      pctOnTrack: ratioToPct(actual, toDateTargets[key]),
      dailyTarget: dailyRates[key],
    };
  });
};
