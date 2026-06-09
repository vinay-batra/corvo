import { useEffect, useRef } from "react";

/**
 * Runs `fn` immediately, then every `ms`, but ONLY while the tab is visible.
 * Pauses on tab-hide; on re-show it runs `fn` once immediately (catch-up) and
 * resumes the interval. Pass the deps that should restart the interval in `deps`
 * (the same deps that previously gated the manual setInterval effect).
 *
 * The caller's `fn` keeps its own AbortController / cancel-flag logic - this
 * hook only governs WHEN `fn` fires, not how it fetches.
 */
export function useVisibilityInterval(fn: () => void, ms: number, deps: unknown[] = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (typeof document === "undefined") return;
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = () => fnRef.current();
    const start = () => {
      if (id != null) return;
      tick(); // catch up immediately on (re)start
      id = setInterval(tick, ms);
    };
    const stop = () => { if (id != null) { clearInterval(id); id = null; } };
    const onVis = () => { if (document.hidden) stop(); else start(); };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}
