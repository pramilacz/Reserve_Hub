import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/auth";
import { TYPE_LABEL } from "@/lib/labels";
import { listResources } from "@/lib/services/resources";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { title: "Resources" };

export default async function ResourcesPage() {
  const user = await requireUserOrRedirect();
  const isAdmin = user.role === "ADMIN";
  const resources = await listResources({ includeInactive: isAdmin });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Resources</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
            Everything that can be reserved. {isAdmin ? "You can add, edit and retire resources." : "Administrators manage this list."}
          </p>
        </div>
        {isAdmin && (
          <Link href="/resources/new" className="btn btn-primary">
            Add resource
          </Link>
        )}
      </div>

      {resources.length === 0 ? (
        <div className="panel p-6 text-sm">
          No resources yet.{" "}
          {isAdmin ? <Link className="link" href="/resources/new">Add the first one</Link> : "Ask an administrator to add some."}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r, idx) => (
                <tr key={r.id} className="anim-rise" style={{ opacity: r.isActive ? 1 : 0.65, ["--i" as string]: Math.min(idx, 12) } as React.CSSProperties}>
                  <td>
                    <span className="block font-medium">{r.name}</span>
                    {r.description && (
                      <span className="block max-w-sm text-xs" style={{ color: "var(--color-muted)" }}>{r.description}</span>
                    )}
                  </td>
                  <td>{TYPE_LABEL[r.type]}</td>
                  <td>{r.location ?? "-"}</td>
                  <td>{r.capacity ?? "-"}</td>
                  <td>{r.isActive ? <StatusBadge kind="ok">Available</StatusBadge> : <StatusBadge kind="muted">Retired</StatusBadge>}</td>
                  <td className="whitespace-nowrap text-right">
                    <span className="inline-flex gap-2">
                      {r.isActive && (
                        <Link className="btn btn-sm" href={`/reservations/new?resourceId=${r.id}`}>Reserve</Link>
                      )}
                      {isAdmin && (
                        <Link className="btn btn-sm" href={`/resources/${r.id}/edit`}>Edit</Link>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
