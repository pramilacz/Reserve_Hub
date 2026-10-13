import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/api";

export const GET = route(async () => NextResponse.json({ user: await requireUser() }));
