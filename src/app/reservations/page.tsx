import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { first } from "@/lib/labels";
import { currentTime, formatDate, formatRange, isValidDateStr, todayInOrg } from "@/lib/time";
import { listReservations } from "@/lib/services/reservations";
import { listResources } from "@/lib/services/resources";
import { CancelButton } from "@/components/CancelButton";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { title: "Reservations" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ReservationsPage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const sp = await searchParams;

  // First visit (no filters in the URL): show upcoming, confirmed reservations.
  const hasFilters = ["resourceId", "userId", "status", "from", "to"].some((k) => sp[k] !== undefined);
  const resourceId = first(sp, "resourceId") || undefined;
  const userId = first(sp, "userId") || undefined;
  const statusParam = hasFilters ? first(sp, "status") ?? "" : "CONFIRMED";
  const status = statusParam === "CONFIRMED" || statusParam === "CANCELLED" ? statusParam : undefined;
  const fromRaw = hasFilters ? first(sp, "from") ?? "" : todayInOrg();
  const toRaw = first(sp, "to") ?? "";
  const from = isValidDateStr(fromRaw) ? fromRaw : undefined;
  const to = isValidDateStr(toRaw) ? toRaw : undefined;
  const page = Math.max(1, Number(first(sp, "page")) || 1);

  const [{ items, total, pageSize }, resources, users] = await Promise.all([
    listReservations({ resourceId, userId, status, from, to, page, pageSize: 20 }),
    listResources({ includeInactive: true }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const nowMs = currentTime().getTime();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const qs = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({
      resourceId: resourceId ?? "",
      userId: userId ?? "",
      status: statusParam,
      from: fromRaw,
      to: toRaw,
      ...overrides,
    });
    return `/reservations?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
            {total} match{total === 1 ? "" : "es"}.{" "}
            <Link href={`/reservations?userId=${user.id}&status=CONFIRMED&from=${todayInOrg()}&to=`} className="link">
              Show only mine
            </Link>
          </p>
        </div>
        <Link href="/reservations/new" className="btn btn-primary">
          New reservation
        </Link>
      </div>

      <form method="get" className="panel grid items-end gap-4 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label className="label" htmlFor="f-resource">Resource</label>
          <select id="f-resource" name="resourceId" className="field" defaultValue={resourceId ?? ""}>
            <option value="">All</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-user">Person</label>
          <select id="f-user" name="userId" className="field" defaultValue={userId ?? ""}>
            <option value="">Everyone</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-status">Status</label>
          <select id="f-status" name="status" className="field" defaultValue={statusParam}>
            <option value="">All</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-from">From</label>
          <input id="f-from" name="from" type="date" className="field" defaultValue={fromRaw} />
        </div>
        <div>
          <label className="label" htmlFor="f-to">To</label>
          <input id="f-to" name="to" type="date" className="field" defaultValue={toRaw} />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit">Apply</button>
          <Link href="/reservations?status=&from=" className="btn">Clear</Link>
        </div>
      </form>

      {items.length === 0 ? (
        <div className="panel p-6 text-sm">
          No reservations match these filters.{" "}
          <Link href="/reservations/new" className="link">Make one</Link> or{" "}
          <Link href="/reservations?status=&from=" className="link">clear the filters</Link>.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Resource</th>
                <th>Title</th>
                <th>Reserved by</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const canManage = user.role === "ADMIN" || r.userId === user.id;
                const cancellable = canManage && r.status === "CONFIRMED" && r.endTime.getTime() > nowMs;
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">
                      <span className="block font-medium">{formatDate(r.startTime)}</span>
                      <span style={{ color: "var(--color-muted)" }}>{formatRange(r.startTime, r.endTime)}</span>
                    </td>
                    <td>{r.resource.name}</td>
                    <td>
                      <Link href={`/reservations/${r.id}`} className="link">{r.title}</Link>
                    </td>
                    <td>{r.user.name}</td>
                    <td>
                      {r.status === "CANCELLED" ? (
                        <StatusBadge kind="danger">Cancelled</StatusBadge>
                      ) : r.endTime.getTime() <= nowMs ? (
                        <StatusBadge kind="muted">Finished</StatusBadge>
                      ) : (
                        <StatusBadge kind="ok">Confirmed</StatusBadge>
                      )}
                    </td>
                    <td className="text-right">{cancellable && <CancelButton reservationId={r.id} small />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? <Link className="btn" href={qs({ page: String(page - 1) })}>‹ Previous</Link> : <span />}
          <span style={{ color: "var(--color-muted)" }}>Page {page} of {pages}</span>
          {page < pages ? <Link className="btn" href={qs({ page: String(page + 1) })}>Next ›</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
