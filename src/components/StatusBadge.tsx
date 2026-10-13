export function StatusBadge({
  kind,
  live,
  children,
}: {
  kind: "ok" | "muted" | "danger" | "accent";
  /** Show a pulsing dot (for something happening right now). */
  live?: boolean;
  children: React.ReactNode;
}) {
  const styles = {
    ok: { background: "var(--color-ok-soft)", color: "var(--color-ok)" },
    muted: { background: "var(--color-paper)", color: "var(--color-muted)" },
    danger: { background: "var(--color-danger-soft)", color: "var(--color-danger)" },
    accent: { background: "var(--color-accent-soft)", color: "var(--color-accent-strong)" },
  }[kind];
  return (
    <span className="badge" style={styles}>
      {live && <span className="live-dot" aria-hidden />}
      {children}
    </span>
  );
}
