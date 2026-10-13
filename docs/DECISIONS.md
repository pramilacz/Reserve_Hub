# Design decisions and interview preparation

Use this to explain the project confidently. Everything here is also visible in the code; read the files
referenced so you can talk about them in your own words.

## Reading the brief

The scenario names three symptoms: *scheduling confusion*, *overlapping reservations* and *uncertainty
about availability*, plus a requirement that it *stays reliable as activity grows*. Those translated into:

| Symptom in the brief | What I built |
| --- | --- |
| Overlapping reservations | Database exclusion constraint, so overlaps are impossible |
| Uncertainty about availability | Day timeline board and a live availability panel in the form |
| Scheduling confusion | One source of truth, ownership of each booking, clear conflict messages |
| "Organize its resources" | Resource catalog with types, location, capacity, retire-instead-of-delete |
| "Understanding of their usage" | Usage page: bookings, hours and share of bookable time |
| Reliable as it grows | Indexed queries, pagination, SQL aggregation, concurrency-safe writes, tests |

## Key decisions

### Preventing double-booking in the database
The naive approach is "query for overlaps, then insert if none". Two simultaneous requests can both see
"free" and both insert. I used a PostgreSQL exclusion constraint instead:
`EXCLUDE USING gist (resourceId WITH =, tstzrange(start, end, '[)') WITH &&) WHERE (status = 'CONFIRMED')`.
The database serializes conflicting writes, so exactly one succeeds. The service catches the constraint
violation (SQLSTATE `23P01`) and turns it into a friendly 409 that names the existing booking.
`tests/reservations.integration.test.ts` fires 12 parallel requests at one slot and asserts a single winner,
and also inserts directly with Prisma to prove the rule holds even if application code is bypassed.

*Why `btree_gist`?* A GiST index can handle range overlap (`&&`) but not plain equality on a text column by
default. The extension adds equality support so one constraint can say "same resource AND overlapping time".

*Why `[)` ranges?* Start inclusive, end exclusive means back-to-back bookings (10 to 11, then 11 to 12) are
allowed, which is how people actually use rooms.

### Soft cancel
Cancelling sets `status = CANCELLED` instead of deleting. History and statistics are preserved, and because the
constraint only covers `CONFIRMED` rows, the slot is free again immediately.

### Time handling
All instants are stored as `timestamptz` (UTC). The organization's timezone is a single setting used to
interpret "9:00 AM" input and to decide where a "day" starts and ends. `src/lib/time.ts` does this with
`Intl` (no date library) and is unit tested, including a DST timezone.

### Layers
`src/lib/services/*` hold the business logic. Server-rendered pages call services directly; browser forms call
REST route handlers that call the same services. Validation (Zod) is at the boundary, pure time rules live in
`rules.ts` (easy to test), and every failure is an `AppError` mapped to a consistent JSON shape.

### Authentication
Intentionally minimal: choose a seeded user, stored in an httpOnly cookie. The brief warns against
unnecessary complexity and is about reservations, not identity. In production I would use a real provider
(for example Auth.js) and change only `src/lib/auth.ts`, because everything else asks `requireUser()` /
`requireAdmin()`. Authorization (members manage only their own bookings, admins manage all) is enforced in the
service layer, not just hidden in the UI.

### Prisma without engine binaries
The project uses Prisma's `queryCompiler` engine with the `pg` driver adapter. No native query-engine binary
is needed at runtime, which makes installs simpler, and it matches the direction Prisma is heading.

### UI
The home screen is the schedule board because "who has what, and when is it free?" is the question people
ask most. It is a server component (no client JavaScript needed for the board). Colour carries meaning: one
petrol-blue accent for "booked", a solid shade for your own bookings, red only for problems.

## What I would do next
Recurring reservations; approval for sensitive resources; email/calendar (ICS) notifications; real
authentication and organizations/teams; per-resource opening hours; a "find me a free room" search by
time and capacity; audit log of changes; end-to-end browser tests.

## Likely questions, with short answers

**How do you stop two people booking the same room at the same moment?**
The database enforces it with an exclusion constraint; the app handles the resulting error. A check in
application code alone would have a race window.

**Why not just check for overlaps in code?**
Check-then-insert is not atomic. Under concurrency both checks pass. The constraint closes that gap, and I
test it with parallel requests.

**What happens when a reservation is cancelled?**
`status` becomes `CANCELLED` and `cancelledAt` is set. The partial constraint ignores it, so the slot is
free, and history is kept for reporting.

**Why store times in UTC?**
Unambiguous, sortable, and safe across DST. Display and input use the organization's timezone.

**How does it scale?**
Indexes on `(resourceId, startTime)`, `(userId, startTime)` and `status`; the exclusion constraint's GiST index
makes overlap checks logarithmic; lists are paginated; statistics are aggregated in SQL instead of loading
rows into memory.

**What are the limits of your solution?**
Single timezone, simple demo authentication, no recurring bookings or notifications. All consciously out of
scope; the README lists them.

**How did you use AI tools?**
Be honest and specific about what you did yourself. For example: which decisions were yours, what you
reviewed and changed, what you ran and tested. You are expected to explain any part of the code.

**Walk me through creating a reservation.**
Form submits ISO UTC times to `POST /api/reservations` → `requireUser()` → Zod parse → `createReservation`:
validates the time window (`rules.ts`), confirms the resource exists and is active, inserts → if PostgreSQL
raises 23P01 it looks up the conflicting booking and returns 409 with details → otherwise 201.
