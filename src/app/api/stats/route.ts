import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseQuery, route } from "@/lib/api";
import { statsQuery } from "@/lib/validation";
import { getUsageStats } from "@/lib/services/stats";

export const GET = route(async (req: Request) => {
  await requireUser();
  const { days } = parseQuery(req, statsQuery);
  return NextResponse.json(await getUsageStats(days));
});
