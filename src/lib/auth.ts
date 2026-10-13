import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { SESSION_COOKIE } from "./config";
import { Errors } from "./errors";

/**
 * Deliberately simple "who am I" mechanism for this exercise: the browser
 * holds a cookie with a seeded user's id. There are no passwords. A real
 * deployment would swap this one file for a proper auth provider; everything
 * else only depends on getCurrentUser()/requireUser()/requireAdmin().
 */
export async function getCurrentUser(): Promise<User | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

/** For API routes: throws a 401 AppError. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthenticated();
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw Errors.forbidden("Only administrators can do that.");
  return user;
}

/** For pages: redirects to the user picker. */
export async function requireUserOrRedirect(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
