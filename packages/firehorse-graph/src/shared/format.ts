/** One date formatter, so a timestamp reads the same wherever it appears. */
export function formatTimestamp(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
): string | undefined {
  if (!value) return undefined;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleString(undefined, options);
}

/** A date alone, for metadata rows and memory timestamps. */
export function formatDay(value: string | null | undefined): string {
  return formatTimestamp(value, { year: "numeric", month: "short", day: "numeric" }) ?? "—";
}

/** A date with the time of day, for naming a session by when it ran. */
export function formatMinute(value: string | null | undefined): string | undefined {
  return formatTimestamp(value, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
