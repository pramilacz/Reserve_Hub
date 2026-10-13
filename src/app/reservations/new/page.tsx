import { requireUserOrRedirect } from "@/lib/auth";
import { first } from "@/lib/labels";
import { isValidDateStr, todayInOrg } from "@/lib/time";
import { listResources } from "@/lib/services/resources";
import { ReservationForm } from "@/components/ReservationForm";
import Link from "next/link";

export const metadata = { title: "New reservation" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewReservationPage({ searchParams }: Props) {
  await requireUserOrRedirect();
  const sp = await searchParams;
  const resources = await listResources();

  const resourceId = resources.some((r) => r.id === first(sp, "resourceId")) ? first(sp, "resourceId")! : "";
  const dateParam = first(sp, "date");
  const date = dateParam && isValidDateStr(dateParam) && dateParam >= todayInOrg() ? dateParam : todayInOrg();
  const startParam = first(sp, "start");
  const start = startParam && /^\d{2}:\d{2}$/.test(startParam) ? startParam : "09:00";
  const [h, m] = start.split(":").map(Number);
  const endMin = Math.min(h * 60 + m + 60, 21 * 60);
  const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New reservation</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
          Pick a resource and a time. We check for clashes as you go.
        </p>
      </div>
      {resources.length === 0 ? (
        <p className="panel p-6 text-sm">
          There is nothing to reserve yet. <Link className="link" href="/resources">Go to resources</Link>.
        </p>
      ) : (
        <ReservationForm
          mode="create"
          resources={resources.map((r) => ({ id: r.id, name: r.name, type: r.type, location: r.location }))}
          initial={{ resourceId, date, start, end, title: "", notes: "" }}
        />
      )}
    </div>
  );
}
