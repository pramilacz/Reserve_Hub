/**
 * Integration tests against the real PostgreSQL database in DATABASE_URL.
 * They create their own uniquely-named users/resources and delete only those,
 * so they are safe to run next to your development data.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Resource, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  cancelReservation,
  createReservation,
  getAvailability,
  isOverlapViolation,
  updateReservation,
} from "@/lib/services/reservations";
import { addDays, todayInOrg, zonedToUtc } from "@/lib/time";

const run = Math.random().toString(36).slice(2, 8);
let admin: User, alice: User, bob: User;
let room: Resource, retired: Resource;

// Each test uses its own future day so tests never collide with each other.
let dayCounter = 5;
const nextDay = () => addDays(todayInOrg(), dayCounter++);
const slot = (date: string, from: string, to: string) => ({
  startTime: zonedToUtc(date, from),
  endTime: zonedToUtc(date, to),
});
const book = (actor: User, date: string, from: string, to: string, resourceId = room.id) =>
  createReservation(actor, { resourceId, title: "Test", ...slot(date, from, to) });

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "OK";
  } catch (e) {
    return e instanceof AppError ? e.code : `UNEXPECTED:${String(e)}`;
  }
}

beforeAll(async () => {
  admin = await prisma.user.create({ data: { name: `Admin ${run}`, email: `admin-${run}@t.test`, role: "ADMIN" } });
  alice = await prisma.user.create({ data: { name: `Alice ${run}`, email: `alice-${run}@t.test` } });
  bob = await prisma.user.create({ data: { name: `Bob ${run}`, email: `bob-${run}@t.test` } });
  room = await prisma.resource.create({ data: { name: `Room ${run}`, type: "ROOM" } });
  retired = await prisma.resource.create({ data: { name: `Retired ${run}`, type: "ROOM", isActive: false } });
});

afterAll(async () => {
  const userIds = [admin.id, alice.id, bob.id];
  await prisma.reservation.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.resource.deleteMany({ where: { id: { in: [room.id, retired.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("overlap prevention", () => {
  it("allows a booking, then rejects any overlap with a helpful conflict", async () => {
    const d = nextDay();
    await book(alice, d, "09:00", "10:00");

    for (const [from, to] of [["09:00", "10:00"], ["09:30", "10:30"], ["08:00", "09:15"], ["08:00", "11:00"], ["09:15", "09:45"]]) {
      expect(await code(book(bob, d, from, to))).toBe("RESERVATION_CONFLICT");
    }

    try {
      await book(bob, d, "09:30", "10:30");
    } catch (e) {
      const err = e as AppError;
      expect(err.status).toBe(409);
      expect(err.message).toContain(`Alice ${run}`);
      expect((err.details as { conflict: { bookedBy: string } }).conflict.bookedBy).toBe(`Alice ${run}`);
    }
  });

  it("allows back-to-back bookings (end time is exclusive)", async () => {
    const d = nextDay();
    await book(alice, d, "09:00", "10:00");
    expect(await code(book(bob, d, "10:00", "11:00"))).toBe("OK");
    expect(await code(book(bob, d, "08:00", "09:00"))).toBe("OK");
  });

  it("lets different resources be booked at the same time", async () => {
    const d = nextDay();
    const other = await prisma.resource.create({ data: { name: `Other ${run}-${d}`, type: "EQUIPMENT" } });
    await book(alice, d, "09:00", "10:00");
    expect(await code(book(bob, d, "09:00", "10:00", other.id))).toBe("OK");
    await prisma.reservation.deleteMany({ where: { resourceId: other.id } });
    await prisma.resource.delete({ where: { id: other.id } });
  });

  it("frees the slot when a reservation is cancelled", async () => {
    const d = nextDay();
    const r = await book(alice, d, "09:00", "10:00");
    expect(await code(book(bob, d, "09:00", "10:00"))).toBe("RESERVATION_CONFLICT");
    await cancelReservation(alice, r.id);
    expect(await code(book(bob, d, "09:00", "10:00"))).toBe("OK");
  });

  it("holds under concurrency: 12 simultaneous requests for one slot, exactly 1 wins", async () => {
    const d = nextDay();
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => code(book(i % 2 ? alice : bob, d, "13:00", "14:00"))),
    );
    expect(results.filter((r) => r === "OK")).toHaveLength(1);
    expect(results.filter((r) => r === "RESERVATION_CONFLICT")).toHaveLength(11);

    const stored = await prisma.reservation.count({
      where: { resourceId: room.id, status: "CONFIRMED", startTime: zonedToUtc(d, "13:00") },
    });
    expect(stored).toBe(1);
  });

  it("is enforced by the database itself, even if application code is bypassed", async () => {
    const d = nextDay();
    await book(alice, d, "09:00", "10:00");
    const direct = prisma.reservation.create({
      data: { resourceId: room.id, userId: bob.id, title: "Sneaky", ...slot(d, "09:30", "10:30") },
    });
    await expect(direct).rejects.toSatisfy((e: unknown) => isOverlapViolation(e));
  });

  it("database also rejects an end time before the start time", async () => {
    const d = nextDay();
    await expect(
      prisma.reservation.create({
        data: { resourceId: room.id, userId: bob.id, title: "Bad", ...slot(d, "11:00", "10:00") },
      }),
    ).rejects.toThrow();
  });
});

describe("rescheduling", () => {
  it("moves a reservation to a free slot, and refuses an occupied one", async () => {
    const d = nextDay();
    const a = await book(alice, d, "09:00", "10:00");
    await book(bob, d, "11:00", "12:00");

    expect(await code(updateReservation(alice, a.id, slot(d, "11:30", "12:30")))).toBe("RESERVATION_CONFLICT");
    expect(await code(updateReservation(alice, a.id, slot(d, "10:00", "11:00")))).toBe("OK");
    // can extend into its own old time without conflicting with itself
    expect(await code(updateReservation(alice, a.id, slot(d, "09:30", "10:45")))).toBe("OK");
  });

  it("cannot change a cancelled reservation", async () => {
    const d = nextDay();
    const a = await book(alice, d, "09:00", "10:00");
    await cancelReservation(alice, a.id);
    expect(await code(updateReservation(alice, a.id, { title: "x" }))).toBe("INVALID_STATE");
  });
});

describe("permissions", () => {
  it("members manage only their own reservations; admins manage any", async () => {
    const d = nextDay();
    const a = await book(alice, d, "09:00", "10:00");
    expect(await code(cancelReservation(bob, a.id))).toBe("FORBIDDEN");
    expect(await code(updateReservation(bob, a.id, { title: "hijack" }))).toBe("FORBIDDEN");
    expect(await code(updateReservation(admin, a.id, { title: "renamed" }))).toBe("OK");
    expect(await code(cancelReservation(admin, a.id))).toBe("OK");
  });

  it("cancelling twice is harmless", async () => {
    const d = nextDay();
    const a = await book(alice, d, "09:00", "10:00");
    await cancelReservation(alice, a.id);
    expect(await code(cancelReservation(alice, a.id))).toBe("OK");
  });
});

describe("validation and resource state", () => {
  it("refuses unknown and inactive resources", async () => {
    const d = nextDay();
    expect(await code(book(alice, d, "09:00", "10:00", retired.id))).toBe("RESOURCE_INACTIVE");
    expect(await code(book(alice, d, "09:00", "10:00", "does-not-exist"))).toBe("NOT_FOUND");
  });

  it("applies the time rules", async () => {
    const d = nextDay();
    expect(await code(book(alice, d, "10:00", "09:00"))).toBe("VALIDATION_ERROR");
    expect(await code(book(alice, d, "09:10", "10:00"))).toBe("VALIDATION_ERROR");
    expect(await code(book(alice, d, "05:00", "06:00"))).toBe("VALIDATION_ERROR");
    expect(await code(book(alice, addDays(todayInOrg(), -2), "09:00", "10:00"))).toBe("VALIDATION_ERROR");
  });
});

describe("availability", () => {
  it("reports booked intervals and the free windows between them", async () => {
    const d = nextDay();
    await book(alice, d, "09:00", "10:00");
    await book(bob, d, "10:00", "12:00");
    const a = await getAvailability(room.id, d);
    expect(a.booked).toHaveLength(2);
    expect(a.free.map((f) => [f.start.toISOString(), f.end.toISOString()])).toEqual([
      [zonedToUtc(d, "07:00").toISOString(), zonedToUtc(d, "09:00").toISOString()],
      [zonedToUtc(d, "12:00").toISOString(), zonedToUtc(d, "21:00").toISOString()],
    ]);
  });
});
