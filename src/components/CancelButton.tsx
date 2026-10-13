"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Two-step cancel so a stray click never frees someone's slot. */
export function CancelButton({
  reservationId,
  small,
  redirectTo,
}: {
  reservationId: string;
  small?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const size = small ? "btn-sm" : "";

  async function cancel() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/reservations/${reservationId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "Could not cancel. Please try again.");
      setBusy(false);
      return;
    }
    if (redirectTo) router.push(redirectTo);
    router.refresh();
    setBusy(false);
    setConfirming(false);
  }

  if (!confirming) {
    return (
      <button className={`btn btn-danger ${size}`} onClick={() => setConfirming(true)}>
        Cancel reservation
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button className={`btn btn-danger-solid ${size}`} onClick={cancel} disabled={busy}>
        {busy ? "Cancelling…" : "Yes, cancel it"}
      </button>
      <button className={`btn ${size}`} onClick={() => setConfirming(false)} disabled={busy}>
        Keep it
      </button>
      {error && (
        <span role="alert" className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </span>
      )}
    </span>
  );
}
