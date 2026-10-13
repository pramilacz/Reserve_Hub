/**
 * Seeds demo data. WARNING: wipes users, resources and reservations first,
 * so only run it on a development database.
 *
 * Bookings are generated relative to "today" (organization timezone) so the
 * schedule always looks alive. A fixed random seed keeps results repeatable.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { addDays, todayInOrg, zonedToUtc } from "../src/lib/time";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TITLES: Record<string, string[]> = {
  ROOM: ["Team standup", "Sprint planning", "Client call", "Design review", "Interview panel", "1:1 catch-up", "Quarterly review", "Workshop"],
  EQUIPMENT: ["Product demo", "Site visit shoot", "Training session", "Photo day", "Conference talk"],
  VEHICLE: ["Client visit", "Supplier pickup", "Airport run", "Site inspection", "Delivery"],
  OTHER: ["General use"],
};

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all(
    [
      { name: "Amaya Fernando", email: "amaya@example.test", role: "ADMIN" as const },
      { name: "Kasun Perera", email: "kasun@example.test", role: "MEMBER" as const },
      { name: "Dilini Silva", email: "dilini@example.test", role: "MEMBER" as const },
      { name: "Tharindu Jayasuriya", email: "tharindu@example.test", role: "MEMBER" as const },
      { name: "Nimali Wickramasinghe", email: "nimali@example.test", role: "MEMBER" as const },
    ].map((data) => prisma.user.create({ data })),
  );

  // popularity: chance that a resource is booked on a given day
  const defs = [
    { name: "Boardroom", type: "ROOM", location: "Floor 5", capacity: 14, description: "Video-conference ready, seats 14.", popularity: 0.75 },
    { name: "Meeting Room A", type: "ROOM", location: "Floor 3", capacity: 6, description: "Small room with whiteboard.", popularity: 0.9 },
    { name: "Meeting Room B", type: "ROOM", location: "Floor 3", capacity: 8, description: "Round table, wall display.", popularity: 0.6 },
    { name: "Training Lab", type: "ROOM", location: "Floor 2", capacity: 20, description: "20 workstations and a projector.", popularity: 0.35 },
    { name: "Portable Projector", type: "EQUIPMENT", location: "IT store, Floor 1", capacity: null, description: "Collect and return at the IT store.", popularity: 0.4 },
    { name: "Camera Kit", type: "EQUIPMENT", location: "IT store, Floor 1", capacity: null, description: "Mirrorless camera, tripod and lights.", popularity: 0.25 },
    { name: "Company Van", type: "VEHICLE", location: "Basement parking", capacity: 8, description: "Needs a valid licence, fuel card in the glovebox.", popularity: 0.5 },
    { name: "Pool Car", type: "VEHICLE", location: "Basement parking", capacity: 4, description: "Compact sedan for client visits.", popularity: 0.55 },
  ] as const;

  const resources = await Promise.all(
    defs.map((d) =>
      prisma.resource.create({
        data: { name: d.name, type: d.type, location: d.location, capacity: d.capacity, description: d.description },
      }),
    ),
  );
  await prisma.resource.create({
    data: { name: "Old Conference Room", type: "ROOM", location: "Floor 1", capacity: 10, description: "Closed for renovation.", isActive: false },
  });

  const rand = mulberry32(2026);
  const today = todayInOrg();
  const rows: Prisma.ReservationCreateManyInput[] = [];

  for (let offset = -29; offset <= 7; offset++) {
    const date = addDays(today, offset);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) continue; // quiet weekends

    resources.forEach((resource, i) => {
      // future days are a bit emptier so there is room to book
      const chance = defs[i].popularity * (offset > 0 ? 0.7 : 1);
      if (rand() > chance) return;

      // walk a cursor through the day so slots never overlap (30-minute grid)
      let cursor = 16 + Math.floor(rand() * 6); // 08:00..10:30
      const titles = TITLES[resource.type];
      while (cursor < 38) {
        const len = 2 + Math.floor(rand() * 5); // 1h..3.5h
        const end = Math.min(cursor + len, 40); // 20:00 max
        const toTime = (s: number) =>
          `${String(Math.floor(s / 2)).padStart(2, "0")}:${s % 2 ? "30" : "00"}`;
        const user = users[Math.floor(rand() * users.length)];
        const cancelled = rand() < 0.08;
        rows.push({
          resourceId: resource.id,
          userId: user.id,
          title: titles[Math.floor(rand() * titles.length)],
          startTime: zonedToUtc(date, toTime(cursor)),
          endTime: zonedToUtc(date, toTime(end)),
          status: cancelled ? "CANCELLED" : "CONFIRMED",
          cancelledAt: cancelled ? zonedToUtc(addDays(date, -1), "15:00") : null,
        });
        cursor = end + 1 + Math.floor(rand() * 6); // gap of 30min..3h
        if (rand() < 0.35) break; // not every day is packed
      }
    });
  }

  await prisma.reservation.createMany({ data: rows });
  console.log(
    `Seeded ${users.length} users, ${resources.length + 1} resources, ${rows.length} reservations.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
