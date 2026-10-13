import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, parseQuery, route } from "@/lib/api";
import { reservationCreateSchema, reservationListQuery } from "@/lib/validation";
import { createReservation, listReservations } from "@/lib/services/reservations";

export const GET = route(async (req: Request) => {
  await requireUser();
  return NextResponse.json(await listReservations(parseQuery(req, reservationListQuery)));
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = await parseBody(req, reservationCreateSchema);
  return NextResponse.json({ reservation: await createReservation(user, input) }, { status: 201 });
});
