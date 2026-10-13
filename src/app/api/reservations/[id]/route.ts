import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, route } from "@/lib/api";
import { reservationUpdateSchema } from "@/lib/validation";
import {
  cancelReservation,
  getReservation,
  updateReservation,
} from "@/lib/services/reservations";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  return NextResponse.json({ reservation: await getReservation(id) });
});

/** Reschedule or edit details. */
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await parseBody(req, reservationUpdateSchema);
  return NextResponse.json({ reservation: await updateReservation(user, id, input) });
});

/** Cancels (soft delete). The record is kept for history and statistics. */
export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json({ reservation: await cancelReservation(user, id) });
});
