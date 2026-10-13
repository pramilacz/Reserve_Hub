/**
 * Organization-wide settings. Change these in one place.
 *
 * All timestamps are STORED in UTC. The organization's timezone is only used
 * for entering and displaying times, and for deciding what "a day" means.
 */
export const ORG_TZ = process.env.NEXT_PUBLIC_ORG_TIMEZONE || "Asia/Colombo";

export const RULES = {
  /** Resources can be reserved from this hour (org-local, 24h clock)... */
  OPEN_HOUR: 7,
  /** ...until this hour. */
  CLOSE_HOUR: 21,
  /** Start and end times must fall on this boundary (minutes). */
  SLOT_MINUTES: 15,
  MIN_MINUTES: 15,
  /** Longest single reservation: 8 hours. */
  MAX_MINUTES: 8 * 60,
  /** How far ahead a reservation may be made. */
  MAX_ADVANCE_DAYS: 90,
} as const;

export const SESSION_COOKIE = "rrms_user";
