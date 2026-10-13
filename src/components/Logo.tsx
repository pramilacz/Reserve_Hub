/**
 * Reserve Hub logo: a calendar (the schedule) with a check mark (a confirmed,
 * conflict-free booking) on an indigo tile.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Reserve Hub"
    >
      <defs>
        <linearGradient id="rh-logo-g" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7C6CFF" />
          <stop offset="1" stopColor="#3B30D1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#rh-logo-g)" />
      <rect x="10" y="12" width="28" height="27" rx="7.5" fill="#fff" />
      <path d="M10 21V19.5A7.5 7.5 0 0 1 17.5 12H30.5A7.5 7.5 0 0 1 38 19.5V21Z" fill="#C9C4FF" />
      <rect x="16.5" y="8" width="3.2" height="8.5" rx="1.6" fill="#fff" />
      <rect x="28.3" y="8" width="3.2" height="8.5" rx="1.6" fill="#fff" />
      <path
        d="M17 30.5l5 5 9-10"
        stroke="#4338CA"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="logo-check"
      />
    </svg>
  );
}

export function Logo({
  size = 36,
  tone = "dark",
  className,
}: {
  size?: number;
  tone?: "dark" | "light";
  className?: string;
}) {
  const light = tone === "light";
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <LogoMark size={size} className="logo-mark" />
      <span className="leading-none" style={{ fontSize: size * 0.56 }}>
        <span className="font-extrabold tracking-tight" style={{ color: light ? "#fff" : "var(--color-ink)" }}>
          Reserve
        </span>{" "}
        <span className="font-extrabold tracking-tight" style={{ color: light ? "#a5b0ff" : "var(--color-accent)" }}>
          Hub
        </span>
      </span>
    </span>
  );
}
