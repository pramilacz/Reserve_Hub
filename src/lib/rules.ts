import { ORG_TZ, RULES } from "./config";
import { localParts } from "./time";

/**
 * Pure business rules for a reservation's time window. No database access, so
 * they are trivially unit-testable. (Overlap prevention is NOT here: that is
 * enforced by the database, see prisma/migrations/*_init/migration.sql.)
 *
 * Returns a human-readable message when the window is invalid, otherwise null.
 */
export function checkTimeWindow(
  start: Date,
  end: Date,
  now: Date = new Date(),
  tz: string = ORG_TZ,
): string | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Start and end times must be valid dates.";
  }
  if (end <= start) return "End time must be after the start time.";

  const minutes = (end.getTime() - start.getTime()) / 60000;
  if (minutes < RULES.MIN_MINUTES) {
    return `A reservation must be at least ${RULES.MIN_MINUTES} minutes long.`;
  }
  if (minutes > RULES.MAX_MINUTES) {
    return `A reservation can be at most ${RULES.MAX_MINUTES / 60} hours long.`;
  }

  // One minute of grace so a request sent "right now" is not rejected.
  if (start.getTime() < now.getTime() - 60_000) {
    return "A reservation cannot start in the past.";
  }
  const horizon = now.getTime() + RULES.MAX_ADVANCE_DAYS * 86_400_000;
  if (start.getTime() > horizon) {
    return `Reservations can only be made up to ${RULES.MAX_ADVANCE_DAYS} days ahead.`;
  }

  const s = localParts(start, tz);
  const e = localParts(end, tz);
  if (s.date !== e.date) return "A reservation must start and end on the same day.";

  if (s.minutesOfDay % RULES.SLOT_MINUTES !== 0 || e.minutesOfDay % RULES.SLOT_MINUTES !== 0) {
    return `Times must be on ${RULES.SLOT_MINUTES}-minute boundaries (for example 9:00 or 9:15).`;
  }

  if (s.minutesOfDay < RULES.OPEN_HOUR * 60 || e.minutesOfDay > RULES.CLOSE_HOUR * 60) {
    return `Reservations must fall between ${RULES.OPEN_HOUR}:00 and ${RULES.CLOSE_HOUR}:00.`;
  }
  return null;
}
