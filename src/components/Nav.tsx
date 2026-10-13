"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icons: Record<string, React.ReactNode> = {
  schedule: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  box: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3.3 7.5L12 12.5l8.7-5M12 22V12.5" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
};

const links = [
  { href: "/", label: "Schedule", icon: "schedule" },
  { href: "/reservations", label: "Reservations", icon: "list" },
  { href: "/resources", label: "Resources", icon: "box" },
  { href: "/usage", label: "Usage", icon: "chart" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1 lg:flex-col">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className="nav-item">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {icons[l.icon]}
            </svg>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
