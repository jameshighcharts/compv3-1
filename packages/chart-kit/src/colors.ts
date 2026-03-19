export const CHART_PALETTE = [
  "#9198F0",
  "#6DDFA0",
  "#F7A85E",
  "#7DBFCE",
  "#EBD95F",
] as const;

export const chartColor = (index: number): string => {
  const safeIndex = ((index % CHART_PALETTE.length) + CHART_PALETTE.length) % CHART_PALETTE.length;
  return CHART_PALETTE[safeIndex];
};
