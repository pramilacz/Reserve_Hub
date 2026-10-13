import Link from "next/link";
import type { ResourceType } from "@prisma/client";
import { RULES } from "@/lib/config";
import { TYPE_GROUP_LABEL } from "@/lib/labels";
import { formatRange, formatTime, localParts, zonedToUtc } from "@/lib/time";

type BoardResource = {
  id: string;
  name: string;
  type: ResourceType;
  location: string | null;
  capacity: number | null;
  reservations: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    user: { id: string; name: string };
  }[];
};

/** Each resource type has its own colour: solid = yours, tint = someone else's. */
const TYPE_COLOR: Record<ResourceType, { solid: string; tint: string }> = {
  ROOM: { solid: "var(--color-type-room)", tint: "#e6e8ff" },
  EQUIPMENT: { solid: "var(--color-type-equipment)", tint: "#d8f2ee" },
  VEHICLE: { solid: "var(--color-type-vehicle)", tint: "#ffead0" },
  OTHER: { solid: "var(--color-type-other)", tint: "#eceef6" },
};

const HALF_HOURS = (RULES.CLOSE_HOUR - RULES.OPEN_HOUR) * 2;
const SPAN_MIN = (RULES.CLOSE_HOUR - RULES.OPEN_HOUR) * 60;
const OPEN_MIN = RULES.OPEN_HOUR * 60;

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
const pct = (min: number) => `${(min / SPAN_MIN) * 100}%`;

/**
 * Day timeline: one row per resource, time across. Free half-hour cells are
 * links that open the booking form pre-filled; booked blocks open the details.
 * It is a server component, so it needs no client JavaScript.
 */
export function ScheduleBoard({
  date,
  resources,
  currentUserId,
  now,
}: {
  date: string;
  resources: BoardResource[];
  currentUserId: string;
  now: Date;
}) {
  const nowParts = localParts(now);
  const showNow =
    nowParts.date === date &&
    nowParts.minutesOfDay >= OPEN_MIN &&
    nowParts.minutesOfDay <= OPEN_MIN + SPAN_MIN;

  // group by type, keeping the order the query gave us
  const groups = new Map<ResourceType, BoardResource[]>();
  for (const r of resources) groups.set(r.type, [...(groups.get(r.type) ?? []), r]);

  let rowIndex = 0;
  const hours = Array.from({ length: RULES.CLOSE_HOUR - RULES.OPEN_HOUR }, (_, i) => RULES.OPEN_HOUR + i);

  return (
    <div className="table-wrap shadow-sm">
      <div style={{ minWidth: 820 }}>
        {/* time axis */}
        <div className="flex border-b" style={{ borderColor: "var(--color-line)", background: "#f8f8fe" }}>
          <div className="w-56 shrink-0 px-4 py-2 text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
            Resource
          </div>
          <div className="relative flex-1">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="border-l px-1.5 py-2 text-xs"
                  style={{ borderColor: "var(--color-line)", color: "var(--color-muted)" }}
                >
                  {hourLabel(h)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {[...groups.entries()].map(([type, rows]) => (
          <section key={type} aria-label={TYPE_GROUP_LABEL[type]}>
            <div
              className="px-4 py-1.5 text-xs font-semibold"
              style={{ background: "var(--color-paper)", color: "var(--color-muted)" }}
            >
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[type].solid }} />
                {TYPE_GROUP_LABEL[type]}
              </span>
            </div>
            {rows.map((res) => {
              const isFirstRow = rowIndex === 0;
              rowIndex++;
              return (
              <div
                key={res.id}
                className="anim-rise flex border-t transition-colors hover:bg-[#fafaff]"
                style={{ borderColor: "var(--color-line)", ["--i" as string]: rowIndex } as React.CSSProperties}
              >
                <div className="w-56 shrink-0 px-4 py-2.5">
                  <Link href={`/resources`} className="block text-sm font-semibold hover:underline">
                    {res.name}
                  </Link>
                  <span className="block truncate text-xs" style={{ color: "var(--color-muted)" }}>
                    {[res.location, res.capacity ? `seats ${res.capacity}` : null].filter(Boolean).join(", ")}
                  </span>
                </div>

                <div className="relative h-16 flex-1">
                  {/* free cells: 30-minute click targets */}
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${HALF_HOURS}, 1fr)` }}>
                    {Array.from({ length: HALF_HOURS }, (_, i) => {
                      const minutes = OPEN_MIN + i * 30;
                      const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
                      const cellEnd = zonedToUtc(date, time).getTime() + 30 * 60_000;
                      const past = cellEnd <= now.getTime();
                      const strong = i % 2 === 0;
                      const cls = "h-full border-l";
                      const style = { borderColor: strong ? "var(--color-line)" : "#ecedf7" };
                      if (past) {
                        return <div key={i} className={cls} style={{ ...style, background: "#f6f7fc" }} aria-hidden />;
                      }
                      return (
                        <Link
                          key={i}
                          href={`/reservations/new?resourceId=${res.id}&date=${date}&start=${time}`}
                          className={`${cls} cell`}
                          style={style}
                          aria-label={`Reserve ${res.name} from ${formatTime(zonedToUtc(date, time))}`}
                          title={`Reserve from ${formatTime(zonedToUtc(date, time))}`}
                        />
                      );
                    })}
                  </div>

                  {/* booked blocks */}
                  {res.reservations.map((b) => {
                    const s = localParts(b.startTime);
                    const e = localParts(b.endTime);
                    const startMin = Math.max(s.date < date ? OPEN_MIN : s.minutesOfDay, OPEN_MIN);
                    const endMin = Math.min(e.date > date ? OPEN_MIN + SPAN_MIN : e.minutesOfDay, OPEN_MIN + SPAN_MIN);
                    const mine = b.user.id === currentUserId;
                    const tone = TYPE_COLOR[res.type];
                    return (
                      <Link
                        key={b.id}
                        href={`/reservations/${b.id}`}
                        title={`${b.title}\n${formatRange(b.startTime, b.endTime)}\n${b.user.name}`}
                        className="booking absolute inset-y-1.5 overflow-hidden rounded-lg px-2.5 py-1 text-xs leading-tight shadow-sm"
                        style={{
                          left: pct(startMin - OPEN_MIN),
                          width: pct(endMin - startMin),
                          ["--i" as string]: res.reservations.indexOf(b),
                          background: mine ? tone.solid : tone.tint,
                          color: mine ? "#fff" : "var(--color-ink)",
                          borderLeft: `4px solid ${tone.solid}`,
                        }}
                      >
                        <span className="block truncate font-semibold">{b.title}</span>
                        <span className="block truncate opacity-80">{b.user.name}</span>
                      </Link>
                    );
                  })}

                  {showNow && (
                    <div
                      aria-hidden
                      className={`now-line ${isFirstRow ? "now-first" : ""}`}
                      style={{ left: pct(nowParts.minutesOfDay - OPEN_MIN) }}
                    />
                  )}
                </div>
              </div>
            );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
