import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/auth";
import { first, TYPE_LABEL } from "@/lib/labels";
import { RULES } from "@/lib/config";
import { formatDateShort } from "@/lib/time";
import { getUsageStats } from "@/lib/services/stats";

export const metadata = { title: "Usage" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function UsagePage({ searchParams }: Props) {
  await requireUserOrRedirect();
  const sp = await searchParams;
  const requested = Number(first(sp, "days"));
  const days = [7, 30, 90].includes(requested) ? requested : 30;
  const stats = await getUsageStats(days);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Usage</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--color-muted)" }}>
            {formatDateShort(stats.from)} to {formatDateShort(stats.to)}: {stats.totalBookings} confirmed reservation
            {stats.totalBookings === 1 ? "" : "s"} totalling {stats.totalHours} hours.{" "}
            {stats.cancelled > 0 &&
              `${stats.cancelled} were cancelled (${Math.round(stats.cancellationRate * 100)}% of all bookings made).`}
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Period">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/usage?days=${d}`}
              aria-current={d === days ? "page" : undefined}
              className="btn"
              style={d === days ? { background: "var(--color-accent-soft)", borderColor: "var(--color-accent)", color: "var(--color-accent-strong)" } : undefined}
            >
              {d} days
            </Link>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Reservations</th>
              <th>Hours booked</th>
              <th style={{ width: "40%" }}>Share of bookable time in use</th>
            </tr>
          </thead>
          <tbody>
            {stats.resources.map((r, idx) => (
              <tr key={r.id} style={{ opacity: r.isActive ? 1 : 0.6 }}>
                <td>
                  <span className="block font-medium">{r.name}</span>
                  <span className="block text-xs" style={{ color: "var(--color-muted)" }}>
                    {TYPE_LABEL[r.type]}
                    {!r.isActive && ", retired"}
                  </span>
                </td>
                <td>{r.bookings}</td>
                <td>{r.hours}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2.5 flex-1 overflow-hidden rounded-sm"
                      style={{ background: "var(--color-paper)" }}
                      role="img"
                      aria-label={`${Math.round(r.utilization * 100)} percent`}
                    >
                      <div
                        className="anim-grow h-full rounded-sm"
                        style={{
                          width: `${Math.max(r.utilization * 100, r.hours > 0 ? 1 : 0)}%`,
                          background: "linear-gradient(90deg, #7c6cff, #4f46e5)",
                          ["--i" as string]: idx,
                        } as React.CSSProperties}
                      />
                    </div>
                    <span className="w-10 text-right text-xs" style={{ color: "var(--color-muted)" }}>
                      {Math.round(r.utilization * 100)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">
        Share of bookable time = hours booked out of every bookable hour in the period ({RULES.OPEN_HOUR}:00 to{" "}
        {RULES.CLOSE_HOUR}:00, every day, weekends included).
      </p>

      {stats.topUsers.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Most active people</h2>
          <ol className="panel divided text-sm">
            {stats.topUsers.map((u) => (
              <li key={u.name} className="flex items-center justify-between px-4 py-2.5">
                <span>{u.name}</span>
                <span style={{ color: "var(--color-muted)" }}>{u.bookings} reservations</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
