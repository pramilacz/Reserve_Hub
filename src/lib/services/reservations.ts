import { Prisma, type Reservation, type User } from "@prisma/client";
import { prisma } from "../db";
import { RULES } from "../config";
import { AppError, Errors } from "../errors";
import { checkTimeWindow } from "../rules";
import {
  addDays,
  dayBoundsUtc,
  formatRange,
  formatDate,
  zonedToUtc,
} from "../time";
import type {
  ReservationCreateInput,
  ReservationListQuery,
  ReservationUpdateInput,
} from "../validation";

const OVERLAP_CONSTRAINT = "reservations_no_overlap";

const reservationInclude = {
  resource: { select: { id: true, name: true, type: true } },
  user: { select: { id: true, name: true } },
} satisfies Prisma.ReservationInclude;

export type ReservationWithRefs = Prisma.ReservationGetPayload<{
  include: typeof reservationInclude;
}>;

/**
 * Did this error come from the exclusion constraint? We look at the whole
 * error (message + metadata) because the exact shape differs between Prisma
 * versions/drivers, but the constraint name and SQLSTATE 23P01
 * (exclusion_violation) are always present somewhere.
 */
export function isOverlapViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  let text = "";
  try {
    text = `${(err as Error).message ?? ""} ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`;
  } catch {
    text = String((err as Error).message ?? "");
  }
  return text.includes(OVERLAP_CONSTRAINT) || text.includes("23P01");
}

const emptyToNull = (v: string | null | undefined) =>
  v === undefined ? undefined : v?.trim() ? v.trim() : null;

function canManage(actor: User, reservation: Pick<Reservation, "userId">) {
  return actor.role === "ADMIN" || reservation.userId === actor.id;
}

/** Find who currently holds the slot, to give the user a useful error. */
async function describeConflict(resourceId: string, start: Date, end: Date, excludeId?: string) {
  const conflict = await prisma.reservation.findFirst({
    where: {
      resourceId,
      status: "CONFIRMED",
      startTime: { lt: end },
      endTime: { gt: start },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: { user: { select: { name: true } } },
    orderBy: { startTime: "asc" },
  });
  if (!conflict) return null;
  return {
    id: conflict.id,
    title: conflict.title,
    bookedBy: conflict.user.name,
    startTime: conflict.startTime,
    endTime: conflict.endTime,
  };
}

async function conflictError(resourceId: string, start: Date, end: Date, excludeId?: string) {
  const conflict = await describeConflict(resourceId, start, end, excludeId);
  const who = conflict
    ? ` "${conflict.title}" (${conflict.bookedBy}) already holds ${formatRange(
        conflict.startTime,
        conflict.endTime,
      )} on ${formatDate(conflict.startTime)}.`
    : "";
  return new AppError(
    "RESERVATION_CONFLICT",
    `That time overlaps an existing reservation.${who}`,
    409,
    { conflict },
  );
}

async function assertBookable(resourceId: string) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw Errors.notFound("Resource");
  if (!resource.isActive) {
    throw new AppError(
      "RESOURCE_INACTIVE",
      `${resource.name} is not available for reservations.`,
      409,
    );
  }
  return resource;
}

/* ------------------------------ Commands ------------------------------ */

export async function createReservation(actor: User, input: ReservationCreateInput) {
  const problem = checkTimeWindow(input.startTime, input.endTime);
  if (problem) throw Errors.validation(problem, [{ field: "startTime", message: problem }]);

  await assertBookable(input.resourceId);

  try {
    return await prisma.reservation.create({
      data: {
        resourceId: input.resourceId,
        userId: actor.id,
        title: input.title,
        notes: emptyToNull(input.notes),
        startTime: input.startTime,
        endTime: input.endTime,
      },
      include: reservationInclude,
    });
  } catch (err) {
    // The database is the source of truth for overlaps. If two people submit
    // the same slot at the same instant, exactly one insert succeeds and the
    // other lands here.
    if (isOverlapViolation(err)) {
      throw await conflictError(input.resourceId, input.startTime, input.endTime);
    }
    throw err;
  }
}

export async function updateReservation(actor: User, id: string, input: ReservationUpdateInput) {
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound("Reservation");
  if (!canManage(actor, existing)) throw Errors.forbidden("You can only change your own reservations.");
  if (existing.status === "CANCELLED") {
    throw new AppError("INVALID_STATE", "A cancelled reservation cannot be changed.", 409);
  }
  if (existing.startTime.getTime() <= Date.now()) {
    throw new AppError("INVALID_STATE", "A reservation that has already started cannot be changed.", 409);
  }

  const resourceId = input.resourceId ?? existing.resourceId;
  const startTime = input.startTime ?? existing.startTime;
  const endTime = input.endTime ?? existing.endTime;

  const timeChanged = input.startTime || input.endTime;
  if (timeChanged) {
    const problem = checkTimeWindow(startTime, endTime);
    if (problem) throw Errors.validation(problem, [{ field: "startTime", message: problem }]);
  }
  if (resourceId !== existing.resourceId) await assertBookable(resourceId);

  try {
    return await prisma.reservation.update({
      where: { id },
      data: {
        resourceId,
        title: input.title,
        notes: emptyToNull(input.notes),
        startTime,
        endTime,
      },
      include: reservationInclude,
    });
  } catch (err) {
    if (isOverlapViolation(err)) throw await conflictError(resourceId, startTime, endTime, id);
    throw err;
  }
}

/** Cancelling is a soft delete: history and usage statistics are preserved. */
export async function cancelReservation(actor: User, id: string) {
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound("Reservation");
  if (!canManage(actor, existing)) throw Errors.forbidden("You can only cancel your own reservations.");
  if (existing.status === "CANCELLED") return existing; // idempotent
  if (existing.endTime.getTime() <= Date.now()) {
    throw new AppError("INVALID_STATE", "A reservation that has already ended cannot be cancelled.", 409);
  }
  return prisma.reservation.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    include: reservationInclude,
  });
}

/* ------------------------------- Queries ------------------------------- */

export async function getReservation(id: string): Promise<ReservationWithRefs> {
  const r = await prisma.reservation.findUnique({ where: { id }, include: reservationInclude });
  if (!r) throw Errors.notFound("Reservation");
  return r;
}

export async function listReservations(q: ReservationListQuery) {
  const where: Prisma.ReservationWhereInput = {
    resourceId: q.resourceId,
    userId: q.userId,
    status: q.status,
  };
  // "from"/"to" are inclusive local dates. A reservation matches if it overlaps the range.
  if (q.from) where.endTime = { gt: dayBoundsUtc(q.from).start };
  if (q.to) where.startTime = { lt: dayBoundsUtc(q.to).end };

  const [total, items] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      include: reservationInclude,
      orderBy: [{ startTime: "asc" }, { id: "asc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize };
}

/** Everything the day-view board needs: active resources + their bookings that day. */
export async function getDaySchedule(date: string) {
  const { start, end } = dayBoundsUtc(date);
  const resources = await prisma.resource.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      reservations: {
        where: { status: "CONFIRMED", startTime: { lt: end }, endTime: { gt: start } },
        orderBy: { startTime: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  return { date, resources };
}

/** Booked intervals and free windows for one resource on one local day. */
export async function getAvailability(resourceId: string, date: string) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw Errors.notFound("Resource");

  const open = zonedToUtc(date, `${String(RULES.OPEN_HOUR).padStart(2, "0")}:00`);
  const close = zonedToUtc(date, `${String(RULES.CLOSE_HOUR).padStart(2, "0")}:00`);

  const booked = await prisma.reservation.findMany({
    where: { resourceId, status: "CONFIRMED", startTime: { lt: close }, endTime: { gt: open } },
    orderBy: { startTime: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });

  const free: { start: Date; end: Date }[] = [];
  let cursor = open;
  for (const r of booked) {
    if (r.startTime > cursor) free.push({ start: cursor, end: r.startTime });
    if (r.endTime > cursor) cursor = r.endTime;
  }
  if (cursor < close) free.push({ start: cursor, end: close });

  return {
    resource: { id: resource.id, name: resource.name, isActive: resource.isActive },
    date,
    open,
    close,
    booked: booked.map((r) => ({
      id: r.id,
      title: r.title,
      startTime: r.startTime,
      endTime: r.endTime,
      user: r.user,
    })),
    free,
  };
}

export { addDays };
