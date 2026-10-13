import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/auth";
import { first } from "@/lib/labels";
import { addDays, currentTime, formatDateStr, isValidDateStr, todayInOrg } from "@/lib/time";
import { getDaySchedule } from "@/lib/services/reservations";
import { RULES } from "@/lib/config";
import { CountUp } from "@/components/CountUp";
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
  const now = currentTime();
  const all = resources.flatMap((r) => r.reservations);
  const mine = all.filter((b) => b.user.id === user.id).length;
  const bookedHours = all.reduce((h, b) => h + (b.endTime.getTime() - b.startTime.getTime()) / 3_600_000, 0);
  const dayLoad = resources.length
    ? Math.min(1, bookedHours / (resources.length * (RULES.CLOSE_HOUR - RULES.OPEN_HOUR)))
    : 0;
  const freeNow =
    date === today
      ? resources.filter((r) => !r.reservations.some((b) => b.startTime <= now && b.endTime > now)).length
      : null;
  const tiles: { label: string; to?: number; suffix?: string; text?: string; note: string; accent: string }[] = [
    { label: "Reservations", to: bookingCount, note: "on this day", accent: "var(--color-type-room)" },
    { label: "Day load", to: Math.round(dayLoad * 100), suffix: "%", note: "of bookable hours", accent: "var(--color-type-equipment)" },
    freeNow === null
      ? { label: "Free right now", text: "-", note: "shown for today", accent: "var(--color-type-vehicle)" }
      : { label: "Free right now", to: freeNow, suffix: ` of ${resources.length}`, note: "resources available", accent: "var(--color-type-vehicle)" },
    { label: "Your bookings", to: mine, note: "on this day", accent: "var(--color-accent)" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{formatDateStr(date)}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
            Click any free slot on the board to reserve it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateNav date={date} prev={addDays(date, -1)} next={addDays(date, 1)} today={today} />
          <Link href={`/reservations/new?date=${date}`} className="btn btn-primary">
            New reservation
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {tiles.map((t, i) => (
          <div
            key={t.label}
            className="panel lift anim-pop relative overflow-hidden px-5 py-4 shadow-sm"
            style={{ ["--i" as string]: i } as React.CSSProperties}
          >
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: t.accent }} aria-hidden />
            <p className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
              {t.label}
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-ink)" }}>
              {t.to === undefined ? t.text : <CountUp to={t.to} suffix={t.suffix} />}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
              {t.note}
            </p>
          </div>
        ))}
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
          <ScheduleBoard date={date} resources={resources} currentUserId={user.id} now={now} />
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: "var(--color-muted)" }} aria-label="Legend">
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-5 rounded-sm" style={{ background: "var(--color-type-room)" }} /> Your reservation (solid)
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-5 rounded-sm" style={{ background: "#e6e8ff", borderLeft: "3px solid var(--color-type-room)" }} />
              Someone else&apos;s (tinted)
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--color-type-room)" }} /> Rooms
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--color-type-equipment)" }} /> Equipment
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--color-type-vehicle)" }} /> Vehicles
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
