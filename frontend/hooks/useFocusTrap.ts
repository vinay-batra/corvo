"use client";
import { useEffect, RefObject } from "react";

/**
 * Traps Tab focus inside `containerRef` while `active`, moves focus to the
 * first focusable element (or the container) on open, and restores focus to
 * whatever was focused before open on close. Pair with aria-modal="true".
 */
export default function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const SELECTOR =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Move focus in on open (next frame so the dialog has painted)
    const raf = requestAnimationFrame(() => {
      const f = focusables();
      (f[0] ?? container).focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      const activeEl = document.activeElement as HTMLElement;
      if (e.shiftKey && (activeEl === first || activeEl === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("keydown", onKeyDown);
      // Restore focus to the trigger after the dialog unmounts
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef]);
}
