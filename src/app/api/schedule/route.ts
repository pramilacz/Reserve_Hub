import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseQuery, route } from "@/lib/api";
import { dateQuery } from "@/lib/validation";
import { getDaySchedule } from "@/lib/services/reservations";

export const GET = route(async (req: Request) => {
  await requireUser();
  const { date } = parseQuery(req, dateQuery);
  return NextResponse.json(await getDaySchedule(date));
});
