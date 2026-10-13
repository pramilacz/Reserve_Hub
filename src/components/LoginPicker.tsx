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
    <ul className="panel divided mt-6">
      {users.map((u) => (
        <li key={u.id}>
          <button
            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-paper disabled:opacity-60"
            disabled={pending !== null}
            onClick={() => pick(u.id)}
          >
            <span>
              <span className="block text-sm font-semibold">{u.name}</span>
              <span className="block text-xs" style={{ color: "var(--color-muted)" }}>
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
              {pending === u.id ? "Signing in…" : u.role === "ADMIN" ? "Administrator" : "Member"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
