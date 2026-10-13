import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/config";
import { Errors } from "@/lib/errors";
import { parseBody, route } from "@/lib/api";

const schema = z.object({ userId: z.string().min(1) });

/** Pick who you are (demo-grade identity, see lib/auth.ts). */
export const POST = route(async (req: Request) => {
  const { userId } = await parseBody(req, schema);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound("User");

  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
});

export const DELETE = route(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
