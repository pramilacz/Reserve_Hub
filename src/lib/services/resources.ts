import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { AppError, Errors } from "../errors";
import type { ResourceCreateInput, ResourceUpdateInput } from "../validation";

const emptyToNull = (v: string | null | undefined) =>
  v === undefined ? undefined : v?.trim() ? v.trim() : null;

function mapUniqueViolation(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new AppError("DUPLICATE", "A resource with that name already exists.", 409);
  }
  throw err;
}

export async function listResources(opts: { includeInactive?: boolean } = {}) {
  return prisma.resource.findMany({
    where: opts.includeInactive ? {} : { isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function getResource(id: string) {
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) throw Errors.notFound("Resource");
  return resource;
}

export async function createResource(input: ResourceCreateInput) {
  try {
    return await prisma.resource.create({
      data: {
        name: input.name,
        type: input.type,
        location: emptyToNull(input.location),
        capacity: input.capacity ?? null,
        description: emptyToNull(input.description),
      },
    });
  } catch (err) {
    mapUniqueViolation(err);
  }
}

export async function updateResource(id: string, input: ResourceUpdateInput) {
  await getResource(id);
  try {
    return await prisma.resource.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        location: emptyToNull(input.location),
        capacity: input.capacity,
        description: emptyToNull(input.description),
        isActive: input.isActive,
      },
    });
  } catch (err) {
    mapUniqueViolation(err);
  }
}

/** Number of upcoming confirmed reservations (useful when deactivating). */
export async function countUpcomingReservations(resourceId: string) {
  return prisma.reservation.count({
    where: { resourceId, status: "CONFIRMED", endTime: { gt: new Date() } },
  });
}
