"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type U = { id: string; name: string; role: "ADMIN" | "MEMBER" };

/** Demo identity switcher: lets a reviewer try the admin and member views quickly. */
export function UserSwitcher({ users, currentId }: { users: U[]; currentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchTo(userId: string) {
    setBusy(true);
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.push("/");
    router.refresh();
    setBusy(false);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span style={{ color: "var(--color-muted)" }}>Signed in as</span>
      <select
        className="field !w-auto !py-1.5"
        value={currentId}
        disabled={busy}
        onChange={(e) => switchTo(e.target.value)}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role === "ADMIN" ? "admin" : "member"})
          </option>
        ))}
      </select>
    </label>
  );
}
