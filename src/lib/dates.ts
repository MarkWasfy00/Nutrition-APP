export const APP_TZ = "Africa/Cairo";

/** Calendar day (YYYY-MM-DD) in the app timezone. */
export function dayString(date: Date = new Date(), tz = APP_TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export const today = () => dayString();

function parse(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(day: string, n: number) {
  const d = parse(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(day: string) {
  return parse(day).getUTCDay();
}

export function diffDays(from: string, to: string) {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

/** 1-based plan week for a day, or null when outside the 4-week plan. */
export function planWeekOf(startDay: string, day: string) {
  const d = diffDays(startDay, day);
  if (d < 0 || d >= 28) return null;
  return Math.floor(d / 7) + 1;
}
