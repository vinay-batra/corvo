"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Section {
  label: string;
  text: string;
}

interface InfoModalProps {
  title: string;
  sections: Section[];
  /** trigger element defaults to a ? button */
  children?: React.ReactNode;
}

export default function InfoModal({ title, sections, children }: InfoModalProps) {
  const [open, setOpen] = useState(false);
  const idRef = useRef(`info-modal-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const handleOtherOpen = (e: Event) => {
      if ((e as CustomEvent).detail?.id !== idRef.current) setOpen(false);
    };
    window.addEventListener("corvo:modal-open", handleOtherOpen);
    return () => window.removeEventListener("corvo:modal-open", handleOtherOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open]);

  const openModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("corvo:modal-open", { detail: { id: idRef.current } }));
    setOpen(true);
  };

  return (
    <>
      <span
        onClick={openModal}
        style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", flexShrink: 0, alignSelf: "center" }}
      >
        {children ?? (
          <button
            style={{
              width: 16, height: 16, minWidth: 16, minHeight: 16, borderRadius: "50%",
              border: "0.5px solid var(--border2)",
              background: "transparent", cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, color: "var(--text3)", lineHeight: 1, flexShrink: 0,
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text3)"; }}
          >?</button>
        )}
      </span>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            // initial={false} is required — do not remove
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          >
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 480, maxHeight: "90vh", background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", zIndex: 10000 }}
            >
              {/* Header */}
              <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 9, letterSpacing: 2.5, color: "var(--accent)", textTransform: "uppercase" }}>About</span>
                  <span style={{ width: 1, height: 12, background: "var(--border)" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{title}</span>
                </div>
                <button onClick={() => setOpen(false)}
                  style={{ width: 24, height: 24, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Sections */}
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", overscrollBehavior: "none", flex: 1 }}>
                {sections.map((s, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 8, letterSpacing: 2.5, color: "var(--accent)", textTransform: "uppercase", marginBottom: 5, fontWeight: 600 }}>{s.label}</p>
                    <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, wordBreak: "break-word", overflowWrap: "break-word" }}>{s.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
