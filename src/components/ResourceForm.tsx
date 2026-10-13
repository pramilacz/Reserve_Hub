"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { queueToast } from "@/lib/toast";

type Initial = {
  id?: string;
  name: string;
  type: string;
  location: string;
  capacity: string;
  description: string;
  isActive: boolean;
};

export function ResourceForm({ mode, initial }: { mode: "create" | "edit"; initial: Initial }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Initial>(k: K, value: Initial[K]) => setV((p) => ({ ...p, [k]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const capacity = v.capacity.trim() === "" ? null : Number(v.capacity);
    const body: Record<string, unknown> = {
      name: v.name,
      type: v.type,
      location: v.location || null,
      capacity,
      description: v.description || null,
    };
    if (mode === "edit") body.isActive = v.isActive;

    try {
      const res = await fetch(mode === "create" ? "/api/resources" : `/api/resources/${initial.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? "Could not save the resource.");
        if (Array.isArray(data?.error?.details)) {
          const fe: Record<string, string> = {};
          for (const d of data.error.details) if (d.field) fe[d.field] = d.message;
          setFieldErrors(fe);
        }
        return;
      }
      queueToast(mode === "create" ? "Resource added" : "Resource saved");
      router.push("/resources");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5" noValidate>
      {error && (
        <div role="alert" className="anim-pop rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--color-danger)", background: "var(--color-danger-soft)" }}>
          {error}
        </div>
      )}
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" className="field" value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={80} required />
        {fieldErrors.name && <p className="mt-1 text-sm" style={{ color: "var(--color-danger)" }}>{fieldErrors.name}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="type">Type</label>
          <select id="type" className="field" value={v.type} onChange={(e) => set("type", e.target.value)}>
            <option value="ROOM">Room</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="capacity">Capacity <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(optional)</span></label>
          <input id="capacity" type="number" min={1} className="field" value={v.capacity} onChange={(e) => set("capacity", e.target.value)} />
          {fieldErrors.capacity && <p className="mt-1 text-sm" style={{ color: "var(--color-danger)" }}>{fieldErrors.capacity}</p>}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="location">Location <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(optional)</span></label>
        <input id="location" className="field" value={v.location} onChange={(e) => set("location", e.target.value)} maxLength={120} placeholder="e.g. Floor 3" />
      </div>
      <div>
        <label className="label" htmlFor="description">Description <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(optional)</span></label>
        <textarea id="description" className="field" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
      </div>

      {mode === "edit" && (
        <label className="panel flex items-start gap-3 p-4 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          <span>
            <span className="block font-medium">Available for reservations</span>
            <span className="hint !mt-0 block">
              Untick to retire this resource. Existing reservations stay in place, but nobody can book it again.
            </span>
          </span>
        </label>
      )}

      <div className="flex gap-3">
        <button className="btn btn-primary" type="submit" disabled={busy || v.name.trim().length < 2}>
          {busy && <span className="spinner" />}
          {busy ? "Saving" : mode === "create" ? "Add resource" : "Save changes"}
        </button>
        <button className="btn" type="button" onClick={() => router.push("/resources")}>Cancel</button>
      </div>
    </form>
  );
}
