import { ORG_TZ } from "./config";

/**
 * Timezone helpers built on Intl (no date library needed).
 * Dates are exchanged as UTC instants; "local" always means ORG_TZ.
 */

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

function zonedParts(utcMs: number, tz: string) {
  const p = Object.fromEntries(
    partsFormatter(tz)
      .formatToParts(new Date(utcMs))
      .map((x) => [x.type, x.value]),
  );
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Offset of `tz` from UTC at the given instant, in ms (e.g. +5:30 => 19_800_000). */
function tzOffsetMs(utcMs: number, tz: string): number {
  const p = zonedParts(utcMs, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function isValidDateStr(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Convert a wall-clock date + time in `tz` ("2026-10-12", "09:30") to a UTC Date. */
export function zonedToUtc(date: string, time: string, tz: string = ORG_TZ): Date {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
    throw new Error(`Invalid date/time: ${date} ${time}`);
  }
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes handle offsets that change near the guessed instant (DST).
  let utc = guess - tzOffsetMs(guess, tz);
  utc = guess - tzOffsetMs(utc, tz);
  return new Date(utc);
}

/** Wall-clock parts of a UTC instant in `tz`. */
export function localParts(d: Date, tz: string = ORG_TZ) {
  const p = zonedParts(d.getTime(), tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
    minutesOfDay: p.hour * 60 + p.minute,
  };
}

export function todayInOrg(now: Date = new Date(), tz: string = ORG_TZ): string {
  return localParts(now, tz).date;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** [start, end) of a local calendar day, as UTC instants. */
export function dayBoundsUtc(date: string, tz: string = ORG_TZ) {
  return {
    start: zonedToUtc(date, "00:00", tz),
    end: zonedToUtc(addDays(date, 1), "00:00", tz),
  };
}

export function formatTime(d: Date | string, tz: string = ORG_TZ): string {
  return new Date(d).toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(d: Date | string, tz: string = ORG_TZ): string {
  return new Date(d).toLocaleDateString("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateStr(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRange(start: Date | string, end: Date | string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatDuration(start: Date | string, end: Date | string): string {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** Current instant. Server components call this once per request. */
export function currentTime(): Date {
  return new Date();
}
