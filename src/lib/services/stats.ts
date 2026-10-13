import { prisma } from "../db";
import { RULES } from "../config";
import { addDays, dayBoundsUtc, todayInOrg } from "../time";

type Row = {
  resourceId: string;
  bookings: number;
  hours: number;
};

/**
 * Usage over the last `days` local days (including today).
 * Aggregation happens in SQL, so cost stays flat as reservations accumulate.
 */
export async function getUsageStats(days: number) {
  const today = todayInOrg();
  const fromDate = addDays(today, -(days - 1));
  const from = dayBoundsUtc(fromDate).start;
  const to = dayBoundsUtc(today).end;

  const perResource = await prisma.$queryRaw<Row[]>`
    SELECT "resourceId",
           COUNT(*)::int AS bookings,
           COALESCE(SUM(EXTRACT(EPOCH FROM ("endTime" - "startTime"))) / 3600.0, 0)::float8 AS hours
    FROM "reservations"
    WHERE "status" = 'CONFIRMED'
      AND "startTime" >= ${from}
      AND "startTime" <  ${to}
    GROUP BY "resourceId"
  `;

  const cancelled = await prisma.reservation.count({
    where: { status: "CANCELLED", startTime: { gte: from, lt: to } },
  });

  const resources = await prisma.resource.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const bookableHoursPerDay = RULES.CLOSE_HOUR - RULES.OPEN_HOUR;
  const bookableHours = bookableHoursPerDay * days;
  const byId = new Map(perResource.map((r) => [r.resourceId, r]));

  const rows = resources.map((res) => {
    const row = byId.get(res.id);
    const hours = row?.hours ?? 0;
    return {
      id: res.id,
      name: res.name,
      type: res.type,
      isActive: res.isActive,
      bookings: row?.bookings ?? 0,
      hours: Math.round(hours * 10) / 10,
      utilization: Math.min(1, hours / bookableHours),
    };
  });
  rows.sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));

  const topUsers = await prisma.$queryRaw<{ name: string; bookings: number }[]>`
    SELECT u."name", COUNT(*)::int AS bookings
    FROM "reservations" r
    JOIN "users" u ON u."id" = r."userId"
    WHERE r."status" = 'CONFIRMED'
      AND r."startTime" >= ${from}
      AND r."startTime" <  ${to}
    GROUP BY u."name"
    ORDER BY bookings DESC, u."name"
    LIMIT 5
  `;

  const totalBookings = rows.reduce((n, r) => n + r.bookings, 0);
  const totalHours = Math.round(rows.reduce((n, r) => n + r.hours, 0) * 10) / 10;

  return {
    days,
    from: fromDate,
    to: today,
    totalBookings,
    totalHours,
    cancelled,
    cancellationRate: totalBookings + cancelled ? cancelled / (totalBookings + cancelled) : 0,
    resources: rows,
    topUsers,
  };
}
