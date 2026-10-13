import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseQuery, route } from "@/lib/api";
import { dateQuery } from "@/lib/validation";
import { getAvailability } from "@/lib/services/reservations";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (req: Request, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const { date } = parseQuery(req, dateQuery);
  return NextResponse.json(await getAvailability(id, date));
});
