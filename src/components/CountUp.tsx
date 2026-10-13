"use client";

import { useEffect, useState } from "react";

/** Animates 0 → `to`. Respects prefers-reduced-motion (jumps straight to the value). */
export function CountUp({ to, suffix = "", duration = 900 }: { to: number; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduce ? 0 : duration;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = total === 0 ? 1 : Math.min(1, (now - start) / total);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3)))); // ease-out
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return (
    <>
      {value}
      {suffix}
    </>
  );
}
