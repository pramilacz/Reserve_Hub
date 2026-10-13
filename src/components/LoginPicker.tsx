"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type U = { id: string; name: string; email: string; role: "ADMIN" | "MEMBER" };

export function LoginPicker({ users }: { users: U[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function pick(userId: string) {
    setPending(userId);
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.push("/");
    router.refresh();
  }

  return (
    <ul className="mt-8 space-y-2.5">
      {users.map((u, i) => (
        <li key={u.id} className="anim-rise" style={{ ["--i" as string]: i + 3 } as React.CSSProperties}>
          <button
            className="panel lift flex w-full items-center gap-4 px-4 py-3 text-left disabled:opacity-60"
            disabled={pending !== null}
            onClick={() => pick(u.id)}
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #7c6cff, #3b30d1)" }}
              aria-hidden
            >
              {u.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{u.name}</span>
              <span className="block truncate text-xs" style={{ color: "var(--color-muted)" }}>
                {u.email}
              </span>
            </span>
            <span
              className="badge"
              style={{
                background: u.role === "ADMIN" ? "var(--color-accent-soft)" : "var(--color-paper)",
                color: u.role === "ADMIN" ? "var(--color-accent-strong)" : "var(--color-muted)",
              }}
            >
              {pending === u.id ? (
                <>
                  <span className="spinner" /> Signing in
                </>
              ) : u.role === "ADMIN" ? (
                "Administrator"
              ) : (
                "Member"
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
