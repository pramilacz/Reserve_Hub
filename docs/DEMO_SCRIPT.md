# Demo video script (target: 4 minutes)

Record your screen with the app running and seeded (`npm run db:setup && npm run dev`). Speak in your own
words; treat this as a checklist, not a script to read aloud. Keep it between 3 and 5 minutes.

**0:00 to 0:30, the problem and the idea**
- "The organization has shared rooms, equipment and vehicles, and manual coordination causes overlapping
  bookings and uncertainty about availability."
- "So I built a central reservation system focused on two things: making double-booking impossible, and
  making availability obvious."

**0:30 to 1:30, the schedule board** (as Kasun, a member)
- Show the home page: resources grouped by type, time across, your bookings in solid blue, others' lighter.
- Change the day with Prev/Next and the date picker. Point at the red "now" line and greyed past slots.
- Click a free slot: it opens the booking form pre-filled.

**1:30 to 2:30, booking and conflicts**
- Pick a resource and a time that is already taken. Show the amber warning appear live, and the
  availability panel on the right (free windows are clickable).
- Submit anyway to show the server's 409 message naming who holds the slot.
- Choose a free window and book it; it appears on the board.
- Open the booking: reschedule it, then cancel it (two-step confirm). Mention cancelled slots free up at once.

**2:30 to 3:15, admin and reporting**
- Switch to Amaya (admin) via the header. Show Resources: add one, retire one.
- Show Reservations list filters (resource, person, status, dates) and that admins can cancel anyone's.
- Open Usage: bookings, hours and share of bookable time per resource.

**3:15 to 4:15, technical decisions** (show code briefly)
- `prisma/migrations/…_init/migration.sql`: the exclusion constraint. Explain race conditions and why the
  database, not application code, is the source of truth.
- Run `npm test`: point at the concurrency test (12 parallel requests, one winner).
- Mention: layered services, Zod validation at the boundary, UTC storage with org-timezone display,
  minimal demo auth with one seam to replace it.

**4:15 to 4:30, close**
- "Out of scope by choice: recurring bookings, notifications, real authentication. Those are my next steps."
