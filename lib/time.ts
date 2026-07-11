export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  const table: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.348, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let unit = "second";
  let value = secs;
  let acc = 1;
  for (const [factor, name] of table) {
    if (value < factor) {
      unit = name;
      break;
    }
    acc *= factor;
    value = secs / acc;
    unit = name;
  }
  const v = Math.floor(value);
  return v <= 1 && unit === "second"
    ? "just now"
    : `${v} ${unit}${v === 1 ? "" : "s"} ago`;
}
