"use client";

export type ToastKind = "success" | "info" | "error";
const KEY = "rh:toast";

/**
 * Queue a toast. It shows immediately if the page stays put, or on the next
 * page after a navigation (the message survives in sessionStorage until shown).
 */
export function queueToast(message: string, kind: ToastKind = "success") {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ message, kind }));
  } catch {
    /* storage unavailable: skip the toast, the action itself still worked */
  }
  window.dispatchEvent(new Event("rh:toast"));
}

export function takeToast(): { message: string; kind: ToastKind } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
