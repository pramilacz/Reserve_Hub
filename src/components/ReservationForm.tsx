"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RULES } from "@/lib/config";
import { formatRange, formatTime, localParts, todayInOrg, zonedToUtc } from "@/lib/time";

type ResourceOption = { id: string; name: string; type: string; location: string | null };

type Initial = {
  id?: string;
  resourceId: string;
  date: string;
  start: string;
  end: string;
  title: string;
  notes: string;
};

type Booked = { id: string; title: string; startTime: string; endTime: string; user: { name: string } };
type Availability = { booked: Booked[]; free: { start: string; end: string }[] };

const GROUPS: Record<string, string> = { ROOM: "Rooms", EQUIPMENT: "Equipment", VEHICLE: "Vehicles", OTHER: "Other" };

/** "09:15" options on the booking grid. */
function timeOptions(kind: "start" | "end") {
  const out: { value: string; label: string }[] = [];
  const from = RULES.OPEN_HOUR * 60 + (kind === "end" ? RULES.SLOT_MINUTES : 0);
  const to = RULES.CLOSE_HOUR * 60 - (kind === "start" ? RULES.SLOT_MINUTES : 0);
  for (let m = from; m <= to; m += RULES.SLOT_MINUTES) {
    const value = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    out.push({ value, label: formatTime(zonedToUtc("2026-01-01", value)) });
  }
  return out;
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, RULES.CLOSE_HOUR * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function ReservationForm({
  mode,
  resources,
  initial,
}: {
  mode: "create" | "edit";
  resources: ResourceOption[];
  initial: Initial;
}) {
  const router = useRouter();
  const [resourceId, setResourceId] = useState(initial.resourceId);
  const [date, setDate] = useState(initial.date);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [title, setTitle] = useState(initial.title);
  const [notes, setNotes] = useState(initial.notes);

  const [avail, setAvail] = useState<Availability | null>(null);
  const [availError, setAvailError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const startOptions = useMemo(() => timeOptions("start"), []);
  const endOptions = useMemo(() => timeOptions("end"), []);

  // Live availability for the chosen resource and day.
  useEffect(() => {
    if (!resourceId || !date) return;
    const ctrl = new AbortController();
    fetch(`/api/resources/${resourceId}/availability?date=${date}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Availability) => {
        setAvail(data);
        setAvailError(false);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setAvailError(true);
      });
    return () => ctrl.abort();
  }, [resourceId, date, refreshKey]);

  const startUtc = start && date ? zonedToUtc(date, start) : null;
  const endUtc = end && date ? zonedToUtc(date, end) : null;

  // Friendly early warning. The server (and database) remain the authority.
  const clashes = useMemo(() => {
    if (!avail || !startUtc || !endUtc) return [];
    return avail.booked.filter(
      (b) =>
        b.id !== initial.id &&
        new Date(b.startTime) < endUtc &&
        new Date(b.endTime) > startUtc,
    );
  }, [avail, startUtc, endUtc, initial.id]);

  function onStartChange(value: string) {
    setStart(value);
    // keep the end sensible: default to one hour later when it would be invalid
    if (end <= value) setEnd(addMinutes(value, 60));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!startUtc || !endUtc || endUtc <= startUtc) {
      setError("The end time must be after the start time.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        resourceId,
        title,
        notes: notes || null,
        startTime: startUtc.toISOString(),
        endTime: endUtc.toISOString(),
      };
      const res = await fetch(mode === "create" ? "/api/reservations" : `/api/reservations/${initial.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? "Something went wrong. Please try again.");
        if (Array.isArray(data?.error?.details)) {
          const fe: Record<string, string> = {};
          for (const d of data.error.details) if (d.field) fe[d.field] = d.message;
          setFieldErrors(fe);
        }
        if (res.status === 409) setRefreshKey((k) => k + 1); // someone just took it: refresh the list
        return;
      }
      router.push(`/?date=${date}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const grouped = useMemo(() => {
    const m = new Map<string, ResourceOption[]>();
    for (const r of resources) m.set(r.type, [...(m.get(r.type) ?? []), r]);
    return [...m.entries()];
  }, [resources]);

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]" noValidate>
      <div className="space-y-5">
        {error && (
          <div role="alert" className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: "var(--color-danger)", background: "var(--color-danger-soft)" }}>
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="resource">
            Resource
          </label>
          <select id="resource" className="field" value={resourceId} onChange={(e) => setResourceId(e.target.value)} required>
            <option value="" disabled>
              Choose a resource
            </option>
            {grouped.map(([type, list]) => (
              <optgroup key={type} label={GROUPS[type] ?? type}>
                {list.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.location ? ` (${r.location})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="date">
              Date
            </label>
            <input id="date" type="date" className="field" value={date} min={todayInOrg()} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="start">
              Start
            </label>
            <select id="start" className="field" value={start} onChange={(e) => onStartChange(e.target.value)}>
              {startOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="end">
              End
            </label>
            <select id="end" className="field" value={end} onChange={(e) => setEnd(e.target.value)}>
              {endOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {fieldErrors.startTime && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{fieldErrors.startTime}</p>}
        <p className="hint !mt-0">
          Between {RULES.OPEN_HOUR}:00 and {RULES.CLOSE_HOUR}:00, in {RULES.SLOT_MINUTES}-minute steps, up to {RULES.MAX_MINUTES / 60} hours.
        </p>

        {clashes.length > 0 && !error && (
          <div role="status" className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: "#d9b24a", background: "var(--color-warn-soft)" }}>
            This time overlaps{" "}
            {clashes.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ", "}
                <strong>{c.title}</strong> ({c.user.name}, {formatRange(c.startTime, c.endTime)})
              </span>
            ))}
            . Pick another time, or check the list on the right.
          </div>
        )}

        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="What is it for? e.g. Sprint planning" required />
          {fieldErrors.title && <p className="mt-1 text-sm" style={{ color: "var(--color-danger)" }}>{fieldErrors.title}</p>}
        </div>

        <div>
          <label className="label" htmlFor="notes">
            Notes <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea id="notes" className="field" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary" disabled={submitting || !resourceId || !title.trim()}>
            {submitting ? "Saving…" : mode === "create" ? "Reserve" : "Save changes"}
          </button>
          <button type="button" className="btn" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </div>

      {/* availability for the chosen day */}
      <aside aria-label="Availability" className="panel h-fit p-4">
        <h2 className="text-sm font-semibold">Availability on this day</h2>
        {availError ? (
          <p className="hint">Could not load availability.</p>
        ) : !avail ? (
          <p className="hint">{resourceId ? "Loading…" : "Choose a resource to see when it is free."}</p>
        ) : (
          <div className="mt-3 space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Free</p>
              {avail.free.length === 0 ? (
                <p className="mt-1">Fully booked.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {avail.free.map((f) => (
                    <li key={f.start}>
                      <button
                        type="button"
                        className="link"
                        title="Use this window"
                        onClick={() => {
                          setStart(localParts(new Date(f.start)).time);
                          setEnd(localParts(new Date(f.end)).time);
                        }}
                      >
                        {formatRange(f.start, f.end)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Already reserved</p>
              {avail.booked.length === 0 ? (
                <p className="mt-1">Nothing yet.</p>
              ) : (
                <ul className="mt-1 space-y-1.5">
                  {avail.booked.map((b) => (
                    <li key={b.id}>
                      <span className="block font-medium">{formatRange(b.startTime, b.endTime)}</span>
                      <span className="block text-xs" style={{ color: "var(--color-muted)" }}>
                        {b.title}, {b.user.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </aside>
    </form>
  );
}
