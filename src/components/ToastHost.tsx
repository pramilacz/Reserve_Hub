"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { takeToast, type ToastKind } from "@/lib/toast";

const COLORS: Record<ToastKind, { bar: string; icon: string }> = {
  success: { bar: "var(--color-ok)", icon: "M5 13l4 4L19 7" },
  info: { bar: "var(--color-accent)", icon: "M12 8v4m0 4h.01" },
  error: { bar: "var(--color-danger)", icon: "M6 6l12 12M18 6L6 18" },
};

export function ToastHost() {
  const pathname = usePathname();
  const [toast, setToast] = useState<{ id: number; message: string; kind: ToastKind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const flush = () => {
      const t = takeToast();
      if (!t) return;
      setToast({ id: Date.now(), ...t });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), 3800);
    };
    flush(); // a toast queued before this navigation
    window.addEventListener("rh:toast", flush);
    return () => {
      window.removeEventListener("rh:toast", flush);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pathname]);

  if (!toast) return null;
  const c = COLORS[toast.kind];
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 sm:justify-end sm:pr-8">
      <div
        key={toast.id}
        role="status"
        className="toast panel pointer-events-auto flex items-center gap-3 overflow-hidden py-3 pl-0 pr-5 shadow-xl"
      >
        <span className="self-stretch" style={{ width: 4, background: c.bar }} />
        <span className="grid h-7 w-7 place-items-center rounded-full text-white" style={{ background: c.bar }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={c.icon} />
          </svg>
        </span>
        <span className="text-sm font-semibold">{toast.message}</span>
        <button
          className="ml-2 rounded p-1 text-xs"
          style={{ color: "var(--color-muted)" }}
          onClick={() => setToast(null)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
