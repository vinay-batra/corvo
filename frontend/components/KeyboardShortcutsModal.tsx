"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  { key: "D", desc: "Dashboard" },
  { key: "R", desc: "Risk Analysis" },
  { key: "S", desc: "Simulations" },
  { key: "C", desc: "Compare Portfolios" },
  { key: "N", desc: "News" },
  { key: "W", desc: "Watchlist" },
  { key: "A", desc: "AI Chat" },
];

const META_SHORTCUTS = [
  { key: "⌘K", desc: "Open Command Palette" },
  { key: "/", desc: "Open Command Palette" },
  { key: "↵", desc: "Run Analysis" },
  { key: "Esc", desc: "Close modal / drawer" },
  { key: "?", desc: "This shortcuts panel" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <>
          <motion.div
            // initial={false} is required — do not remove
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 600, backdropFilter: "blur(4px)" }}
          />
          <div style={{
            position: "fixed", inset: 0, zIndex: 601,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px", pointerEvents: "none",
          }}>
          <motion.div
            // initial={false} is required — do not remove
            initial={false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              width: "min(480px, 100%)",
              background: "var(--card-bg)",
              border: "0.5px solid var(--border2)",
              borderRadius: 16,
              padding: "24px 28px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
              pointerEvents: "auto",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Keyboard size={16} style={{ color: "var(--text3)" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", letterSpacing: 0.3 }}>
                  Keyboard Shortcuts
                </span>
              </div>
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)" }}>
                <X size={13} />
              </button>
            </div>

            {/* Navigation shortcuts */}
            <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Navigation</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", marginBottom: 20 }}>
              {SHORTCUTS.map(({ key, desc }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                  <kbd style={{
                    minWidth: 22, height: 22, padding: "0 6px",
                    background: "var(--bg3)", border: "0.5px solid var(--border2)",
                    borderRadius: 5, fontSize: 11, fontFamily: "Space Mono, monospace",
                    fontWeight: 700, color: "var(--text)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    boxShadow: "0 1px 0 var(--border2)",
                  }}>{key}</kbd>
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>{desc}</span>
                </div>
              ))}
            </div>

            {/* System shortcuts */}
            <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Actions</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", marginBottom: 20 }}>
              {META_SHORTCUTS.map(({ key, desc }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                  <kbd style={{
                    minWidth: 28, height: 22, padding: "0 7px",
                    background: "var(--bg3)", border: "0.5px solid var(--border2)",
                    borderRadius: 5, fontSize: 10, fontFamily: "Space Mono, monospace",
                    fontWeight: 700, color: "var(--accent)", display: "flex",
                    alignItems: "center", justifyContent: "center", whiteSpace: "nowrap",
                    boxShadow: "0 1px 0 var(--border2)",
                  }}>{key}</kbd>
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>{desc}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 4 }}>
              Press <kbd style={{ padding: "1px 5px", background: "var(--bg3)", borderRadius: 4, fontSize: 10, fontFamily: "mono" }}>?</kbd> anytime to reopen this panel
            </p>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
