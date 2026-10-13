export function StatusBadge({ kind, children }: { kind: "ok" | "muted" | "danger" | "accent"; children: React.ReactNode }) {
  const styles = {
    ok: { background: "var(--color-ok-soft)", color: "var(--color-ok)" },
    muted: { background: "var(--color-paper)", color: "var(--color-muted)" },
    danger: { background: "var(--color-danger-soft)", color: "var(--color-danger)" },
    accent: { background: "var(--color-accent-soft)", color: "var(--color-accent-strong)" },
  }[kind];
  return (
    <span className="badge" style={styles}>
      {children}
    </span>
  );
}
