import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/auth";
import { first } from "@/lib/labels";
import { addDays, currentTime, formatDateStr, isValidDateStr, todayInOrg } from "@/lib/time";
import { getDaySchedule } from "@/lib/services/reservations";
import { DateNav } from "@/components/DateNav";
import { ScheduleBoard } from "@/components/ScheduleBoard";

export const metadata = { title: "Schedule" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SchedulePage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const sp = await searchParams;
  const today = todayInOrg();
  const requested = first(sp, "date");
  const date = requested && isValidDateStr(requested) ? requested : today;

  const { resources } = await getDaySchedule(date);
  const bookingCount = resources.reduce((n, r) => n + r.reservations.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{formatDateStr(date)}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
            {bookingCount === 0
              ? "Nothing is booked yet. Click any free slot to reserve it."
              : `${bookingCount} reservation${bookingCount === 1 ? "" : "s"} across ${resources.length} resources. Click a free slot to reserve it.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateNav date={date} prev={addDays(date, -1)} next={addDays(date, 1)} today={today} />
          <Link href={`/reservations/new?date=${date}`} className="btn btn-primary">
            New reservation
          </Link>
        </div>
      </div>

      {resources.length === 0 ? (
        <div className="panel p-6 text-sm">
          There are no resources to reserve yet.{" "}
          {user.role === "ADMIN" ? (
            <Link className="link" href="/resources/new">
              Add the first resource
            </Link>
          ) : (
            "Ask an administrator to add some."
          )}
        </div>
      ) : (
        <>
          <ScheduleBoard date={date} resources={resources} currentUserId={user.id} now={currentTime()} />
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: "var(--color-muted)" }} aria-label="Legend">
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-5 rounded-sm" style={{ background: "var(--color-accent)" }} /> Your reservation
            </li>
            <li className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-5 rounded-sm"
                style={{ background: "var(--color-accent-soft)", borderLeft: "3px solid var(--color-accent)" }}
              />
              Reserved by someone else
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-5 rounded-sm border" style={{ borderColor: "var(--color-line-strong)" }} /> Free
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-0.5" style={{ background: "var(--color-danger)" }} /> Now
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
