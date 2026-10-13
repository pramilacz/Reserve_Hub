import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { currentTime, formatDate, formatDuration, formatRange, localParts } from "@/lib/time";
import { TYPE_LABEL } from "@/lib/labels";
import { getReservation, type ReservationWithRefs } from "@/lib/services/reservations";
import { listResources } from "@/lib/services/resources";
import { CancelButton } from "@/components/CancelButton";
import { ReservationForm } from "@/components/ReservationForm";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { title: "Reservation" };

type Props = { params: Promise<{ id: string }> };

export default async function ReservationPage({ params }: Props) {
  const user = await requireUserOrRedirect();
  const { id } = await params;

  let r: ReservationWithRefs;
  try {
    r = await getReservation(id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const now = currentTime().getTime();
  const canManage = user.role === "ADMIN" || r.userId === user.id;
  const cancelled = r.status === "CANCELLED";
  const started = r.startTime.getTime() <= now;
  const ended = r.endTime.getTime() <= now;
  const editable = canManage && !cancelled && !started;
  const cancellable = canManage && !cancelled && !ended;

  const resources = editable ? await listResources() : [];
  const s = localParts(r.startTime);
  const e = localParts(r.endTime);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/?date=${s.date}`} className="link text-sm">
          ‹ Back to the schedule
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{r.title}</h1>
          {cancelled ? (
            <StatusBadge kind="danger">Cancelled</StatusBadge>
          ) : ended ? (
            <StatusBadge kind="muted">Finished</StatusBadge>
          ) : started ? (
            <StatusBadge kind="accent">In progress</StatusBadge>
          ) : (
            <StatusBadge kind="ok">Confirmed</StatusBadge>
          )}
        </div>
      </div>

      <dl className="panel grid gap-x-8 gap-y-4 p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Resource</dt>
          <dd className="mt-0.5 font-medium">
            {r.resource.name} <span style={{ color: "var(--color-muted)" }}>({TYPE_LABEL[r.resource.type]})</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Reserved by</dt>
          <dd className="mt-0.5 font-medium">{r.user.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>When</dt>
          <dd className="mt-0.5 font-medium">
            {formatDate(r.startTime)}, {formatRange(r.startTime, r.endTime)}{" "}
            <span style={{ color: "var(--color-muted)" }}>({formatDuration(r.startTime, r.endTime)})</span>
          </dd>
        </div>
        {r.notes && (
          <div>
            <dt className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Notes</dt>
            <dd className="mt-0.5 whitespace-pre-wrap">{r.notes}</dd>
          </div>
        )}
      </dl>

      {!canManage && !cancelled && (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Only {r.user.name} or an administrator can change this reservation.
        </p>
      )}
      {canManage && !cancelled && started && (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          {ended ? "This reservation has finished." : "This reservation has started, so it can only be cancelled."}
        </p>
      )}

      {editable && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Reschedule or edit</h2>
          <ReservationForm
            mode="edit"
            resources={resources.map((x) => ({ id: x.id, name: x.name, type: x.type, location: x.location }))}
            initial={{
              id: r.id,
              resourceId: r.resourceId,
              date: s.date,
              start: s.time,
              end: e.time,
              title: r.title,
              notes: r.notes ?? "",
            }}
          />
        </section>
      )}

      {cancellable && (
        <section className="border-t pt-6" style={{ borderColor: "var(--color-line)" }}>
          <h2 className="mb-2 text-lg font-semibold">Cancel</h2>
          <p className="mb-3 text-sm" style={{ color: "var(--color-muted)" }}>
            The time slot becomes free for everyone straight away. The record is kept in the history.
          </p>
          <CancelButton reservationId={r.id} redirectTo="/reservations" />
        </section>
      )}
    </div>
  );
}
