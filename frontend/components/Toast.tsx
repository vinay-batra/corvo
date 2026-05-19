"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";

type ToastType = "success" | "error" | "info";
interface Toast { id: number; message: string; type: ToastType }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// Error toasts are sticky-until-dismissed by default since users need to
// read the error and decide what to do. Success and info still auto-dismiss
// after 3.5s but now also offer a manual close so users can clear them sooner.
const AUTO_DISMISS_MS: Record<ToastType, number | null> = {
  success: 3500,
  info: 3500,
  error: null,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    const ms = AUTO_DISMISS_MS[type];
    if (ms != null) {
      const handle = setTimeout(() => dismiss(id), ms);
      timers.current.set(id, handle);
    }
  }, [dismiss]);

  // Clean up any pending timeouts on unmount so we don't setState after teardown.
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} role={t.type === "error" ? "alert" : undefined}>
            <span style={{ flex: 1, minWidth: 0 }}>{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              style={{
                marginLeft: 12,
                width: 24,
                height: 24,
                padding: 0,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                opacity: 0.7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                transition: "opacity 0.15s, background 0.15s",
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "transparent"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
