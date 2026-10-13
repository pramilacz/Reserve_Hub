# Resource Reservation Management System

A web app for booking shared rooms, equipment and vehicles **without double-booking**.
Built for the PrimeWave Lab software engineering internship assessment.

**Stack:** Next.js 16 (App Router) · TypeScript · PostgreSQL · Prisma · Zod · Tailwind CSS · Vitest

**Preview:**
<img width="1920" height="1020" alt="image" src="https://github.com/user-attachments/assets/dd8a208e-a80c-4c92-b4be-170f1d9d863d" />

## The problem, and the approach

The organization's pain is *overlapping reservations and unclear availability*, caused by informal
communication and manual records. So the design centers on two things:

1. **Overlaps must be impossible, not just unlikely.** The rule "two confirmed reservations for the same
   resource may never overlap" is enforced by PostgreSQL itself (an exclusion constraint), so it holds even
   when two people click "Reserve" at the same instant. Application code does not rely on a
   check-then-insert, which has a race condition.
2. **Availability must be obvious.** The home page is a day timeline: resources as rows, time across,
   free slots clickable. The booking form shows live availability and warns about clashes as you type.

## Features

- **Day schedule board** for every resource, grouped by type, with a "now" marker. Click a free slot to book it.
- **Reservations:** create, reschedule/edit, cancel (soft delete, so history is kept). Clear conflict
  messages that say who holds the slot and when.
- **Resources:** administrators add, edit and retire resources (retired = no new bookings, history stays).
- **Reservation list** with filters (resource, person, status, date range) and pagination.
- **Usage statistics:** reservations, hours booked and share of bookable time per resource, cancellation
  rate, most active people (aggregated in SQL).
- **Roles:** administrators manage resources and any reservation; members manage their own.
- **Reliability rules:** server-side validation, 15-minute grid, 15 min to 8 h per booking, same-day only,
  07:00 to 21:00, no past bookings, up to 90 days ahead. All times stored in UTC and shown in the
  organization's timezone.
- **Tests:** unit tests for the rules, and integration tests against real PostgreSQL, including a
  concurrency test (12 simultaneous requests for one slot: exactly one wins).

## Quick start

Prerequisites: **Node.js 20.9+** and **PostgreSQL 14+** (or Docker).

```bash
# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Start PostgreSQL. Either use Docker...
docker compose up -d
#    ...or point DATABASE_URL at your own PostgreSQL in step 3.

# 3. Configure environment
cp .env.example .env          # edit DATABASE_URL if needed

# 4. Create the tables and load sample data
npm run db:setup              # = prisma migrate deploy + seed

# 5. Run
npm run dev                   # http://localhost:3000
```

Open the app and pick a user on the first screen. There are no passwords in this demo (see
[Decisions](docs/DECISIONS.md#authentication)). Use **Amaya Fernando** (administrator) to manage
resources, or any member to see the member view. You can switch user from the header at any time.

> The seed script **wipes** users, resources and reservations before inserting sample data. It is meant
> for development databases only.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Reset and load sample data |
| `npm test` | Unit and integration tests (needs the database from step 2/3) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/reservations` | PostgreSQL connection |
| `NEXT_PUBLIC_ORG_TIMEZONE` | `Asia/Colombo` | Timezone used to enter and display times |

Operating hours, slot size and duration limits live in one file: [`src/lib/config.ts`](src/lib/config.ts).

## How it is organized

```
prisma/
  schema.prisma              data model
  migrations/…_init/         SQL, including the hand-written overlap constraint
  seed.ts                    sample data
src/
  app/                       pages (server components) and /api route handlers
  components/                UI; only forms and buttons are client components
  lib/
    services/                business logic: reservations, resources, stats
    rules.ts                 pure time-window rules (unit tested)
    validation.ts            Zod schemas for every API input
    time.ts                  timezone helpers (UTC in the database, org timezone in the UI)
    errors.ts, api.ts        consistent error type and JSON error responses
    auth.ts                  the only file that knows how "who am I" works
tests/                       unit + integration tests
docs/                        ER diagram, design decisions, demo script
```

Pages read through the **service layer** directly; browser forms call the **REST API**, which uses the same
services. Business rules therefore live in one place whichever way they are reached.

## Data model

See [`docs/er-diagram.md`](docs/er-diagram.md) (Mermaid, renders on GitHub) and
[`docs/er-diagram.dbml`](docs/er-diagram.dbml) (import into dbdiagram.io for a shareable link).

Three tables: `users`, `resources`, `reservations`. The interesting part is on `reservations`:

```sql
CHECK ("endTime" > "startTime")

EXCLUDE USING gist (
  "resourceId" WITH =,
  tstzrange("startTime", "endTime", '[)') WITH &&
) WHERE ("status" = 'CONFIRMED')
```

`[)` means 10:00 to 11:00 and 11:00 to 12:00 may sit back to back. Cancelling flips `status`, which removes
the row from the constraint and frees the slot automatically.

## API

All endpoints return JSON. Errors look like `{ "error": { "code", "message", "details?" } }` with a
matching HTTP status (400 validation, 401, 403, 404, 409 conflict).

| Method & path | Who | Purpose |
| --- | --- | --- |
| `POST /api/session`, `DELETE /api/session` | anyone | Pick / clear the demo identity |
| `GET /api/me` | signed in | Current user |
| `GET /api/resources[?includeInactive=true]` | signed in | List resources |
| `POST /api/resources` | admin | Create a resource |
| `GET/PATCH /api/resources/:id` | read: signed in, write: admin | Read / edit / retire |
| `GET /api/resources/:id/availability?date=YYYY-MM-DD` | signed in | Booked intervals and free windows |
| `GET /api/schedule?date=YYYY-MM-DD` | signed in | Everything the day board shows |
| `GET /api/reservations?resourceId&userId&status&from&to&page&pageSize` | signed in | Filtered list |
| `POST /api/reservations` | signed in | Create (`startTime`/`endTime` as ISO 8601 UTC) |
| `GET/PATCH/DELETE /api/reservations/:id` | owner or admin for writes | Read / reschedule / cancel |
| `GET /api/stats?days=7\|30\|90` | signed in | Usage statistics |

## Assumptions and trade-offs

- **Authentication is deliberately minimal** (pick a seeded user; the choice is kept in a cookie). The brief
  warns against unnecessary complexity and the assessment is about reservations. `src/lib/auth.ts` is the
  single seam to replace with a real provider.
- **One organization, one timezone.** Times are stored in UTC, so supporting more zones later is a display
  change, not a data migration.
- **A reservation cannot span midnight** and must fall inside operating hours. This keeps the day board
  honest and the rules simple.
- **No recurring reservations, approval workflows or notifications.** These are natural next steps but out of
  scope for a focused exercise.
- Retiring a resource keeps its existing reservations (they are history and may be upcoming). Administrators
  see how many upcoming reservations a resource has when editing it.

## Troubleshooting

- **`prisma migrate dev` reports drift:** the first migration was written by hand to include the PostgreSQL
  exclusion constraint, which Prisma's schema language cannot express. `prisma migrate deploy` (used by
  `npm run db:migrate`) applies it as-is. If you prefer, you can regenerate the baseline with
  `npx prisma migrate dev --create-only` and paste the "Hand-written" section of the existing migration at the end.
- **`CREATE EXTENSION btree_gist` fails:** it ships with PostgreSQL's contrib package (included in the
  official Docker image and in standard installers). Install `postgresql-contrib` if your distribution splits it out.
- **Tests fail to connect:** they use `DATABASE_URL` from `.env`. They create and delete their own uniquely
  named rows and do not touch your seed data.
