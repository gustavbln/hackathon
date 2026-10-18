/** Chart series in their fixed, validated order (see --series-* in app/globals.css). Never cycled. */
const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"] as const;

export const FOCUS_SERIES = SERIES.length;

export function seriesColor(index: number): string {
  return SERIES[index] ?? "var(--series-other)";
}
