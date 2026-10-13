import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { parseBody, route } from "@/lib/api";
import { resourceUpdateSchema } from "@/lib/validation";
import {
  countUpcomingReservations,
  getResource,
  updateResource,
} from "@/lib/services/resources";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  return NextResponse.json({ resource: await getResource(id) });
});

/** Edit a resource. Setting isActive=false retires it: existing bookings stay, new ones are refused. */
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const { id } = await params;
  const input = await parseBody(req, resourceUpdateSchema);
  const resource = await updateResource(id, input);
  const upcomingReservations =
    input.isActive === false ? await countUpcomingReservations(id) : undefined;
  return NextResponse.json({ resource, upcomingReservations });
});
