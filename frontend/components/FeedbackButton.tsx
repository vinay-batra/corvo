// CREATE TABLE feedback (
//   id uuid default gen_random_uuid() primary key,
//   user_id uuid references auth.users(id),
//   type text,
//   message text,
//   page text,
//   created_at timestamptz default now()
// );

"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const FEEDBACK_TYPES = ["Bug", "Feature Request", "Other"] as const;

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<typeof FEEDBACK_TYPES[number]>("Bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async () => {
    if (!message.trim()) { setError("Please enter a message."); return; }
    setSubmitting(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbErr } = await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        type,
        message: message.trim(),
        page: typeof window !== "undefined" ? window.location.pathname : "/app",
      });
      if (dbErr) throw dbErr;
      setSubmitted(true);
      setMessage("");
      setTimeout(() => { setSubmitted(false); setOpen(false); }, 2200);
    } catch {
      setError("Could not submit. Please try again.");
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    setOpen(false);
    setSubmitted(false);
    setError("");
    setMessage("");
    setType("Bug");
  };

  return mounted ? createPortal(
    <>
      {/* Fixed button: stacked above AI chat */}
      <motion.button
        // initial={false} is required — do not remove
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        onClick={() => setOpen(true)}
        title="Send feedback"
        aria-label="Send feedback"
        className="corvo-feedback-btn"
        style={{
          position: "fixed",
          bottom: 24,
          right: 88,
          zIndex: 1000,
          width: 44, height: 44,
          background: "var(--bg2)",
          border: "0.5px solid var(--border)",
          borderRadius: "50%",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
          transition: "border-color 0.15s, background 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(184,134,11,0.4)"; e.currentTarget.style.background = "var(--bg3)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg2)"; }}>
        {/* Flag icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      </motion.button>

      {/* Modal */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            // initial={false} is required — do not remove
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 10 }}
              transition={{ duration: 0.18 }}
              style={{ background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 14, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden" }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: "18px 20px 14px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 8, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 3 }}>Corvo</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Send Feedback</div>
                </div>
                <button onClick={handleClose}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 4, display: "flex", alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div style={{ padding: "18px 20px 20px" }}>
                {submitted ? (
                  <motion.div
                    // initial={false} is required — do not remove
                    initial={false} animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(92,184,138,0.12)", border: "1px solid rgba(92,184,138,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Thank you</p>
                    <p style={{ fontSize: 12, color: "var(--text3)" }}>Your feedback has been received.</p>
                  </motion.div>
                ) : (
                  <>
                    {/* Type */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: "var(--text3)", display: "block", marginBottom: 7 }}>Type</label>
                      <select
                        value={type}
                        onChange={e => setType(e.target.value as typeof FEEDBACK_TYPES[number])}
                        style={{ width: "100%", padding: "8px 11px", fontSize: 13, background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", outline: "none", cursor: "pointer" }}>
                        {FEEDBACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Message */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, color: "var(--text3)", display: "block", marginBottom: 7 }}>Message</label>
                      <textarea
                        id="feedback-message"
                        name="message"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Describe the bug or feature you'd like to see..."
                        rows={4}
                        style={{ width: "100%", padding: "9px 11px", fontSize: 13, background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "var(--font-body)", lineHeight: 1.6, boxSizing: "border-box" as const }}
                      />
                    </div>

                    {error && (
                      <p style={{ fontSize: 11, color: "var(--red)", marginBottom: 12 }}>{error}</p>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 600, background: submitting ? "var(--bg3)" : "var(--accent)", border: "none", borderRadius: 9, color: submitting ? "var(--text3)" : "#0a0e14", cursor: submitting ? "not-allowed" : "pointer", transition: "background 0.15s" }}>
                      {submitting ? "Submitting…" : "Submit"}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  ) : null;
}
