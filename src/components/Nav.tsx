"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Schedule" },
  { href: "/reservations", label: "Reservations" },
  { href: "/resources", label: "Resources" },
  { href: "/usage", label: "Usage" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className="rounded-md px-3 py-1.5 text-sm font-medium"
            style={{
              background: active ? "var(--color-accent-soft)" : "transparent",
              color: active ? "var(--color-accent-strong)" : "var(--color-muted)",
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
