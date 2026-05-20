"use client";

import { useEffect, useRef } from "react";

/**
 * Modal focus restoration.
 *
 * When a modal opens, capture whatever element had keyboard focus at that
 * moment (the button that triggered the modal). When the modal closes,
 * return focus to that element so screen readers and keyboard users land
 * back where they were instead of at the top of the document.
 *
 * Usage in a modal-owning component:
 *   const [open, setOpen] = useState(false);
 *   useReturnFocus(open);
 *
 * Caveats:
 *   - We only restore focus if the recorded trigger is still in the DOM. If
 *     the page navigated or the trigger unmounted, the call is a no-op so we
 *     don't focus a detached node.
 *   - If document.activeElement at open time is the body (no specific
 *     trigger had focus), we skip - returning "focus" to body is meaningless.
 */
export function useReturnFocus(open: boolean): void {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      // Capture the element that had focus the moment the modal opened.
      const active = typeof document !== "undefined" ? document.activeElement : null;
      if (active && active !== document.body && active instanceof HTMLElement) {
        triggerRef.current = active;
      } else {
        triggerRef.current = null;
      }
      return;
    }

    // Modal just closed; restore focus to the trigger if it still exists.
    const target = triggerRef.current;
    triggerRef.current = null;
    if (!target) return;
    if (typeof document !== "undefined" && !document.body.contains(target)) return;
    try {
      target.focus({ preventScroll: false });
    } catch {
      // focus() can throw on disabled / non-focusable nodes; swallow.
    }
  }, [open]);
}

export default useReturnFocus;
