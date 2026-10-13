"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function DateNav({
  date,
  prev,
  next,
  today,
}: {
  date: string;
  prev: string;
  next: string;
  today: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/?date=${prev}`} className="btn" aria-label="Previous day">
        ‹ Prev
      </Link>
      <Link href={`/?date=${today}`} className="btn" aria-disabled={date === today}>
        Today
      </Link>
      <Link href={`/?date=${next}`} className="btn" aria-label="Next day">
        Next ›
      </Link>
      <label className="sr-only" htmlFor="pick-date">
        Go to date
      </label>
      <input
        id="pick-date"
        type="date"
        className="field !w-auto"
        value={date}
        onChange={(e) => e.target.value && router.push(`/?date=${e.target.value}`)}
      />
    </div>
  );
}
