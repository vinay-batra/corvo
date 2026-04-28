"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

interface Props {
  onClose: () => void;
}

export default function ReferralModal({ onClose }: Props) {
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const code = user.id.replace(/-/g, "").slice(0, 8);
          setReferralLink(`https://corvo.capital/app?ref=${code}`);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shareText = `Just ran my portfolio through Corvo and learned more about my risk in 5 minutes than I have in years. Free, no BS: ${referralLink}`;

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        // initial={false} is required — do not remove
        initial={false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}
        style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "28px 28px 24px", width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 4 }}>Refer a friend</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Invite friends to Corvo</div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Reward callouts */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <div style={{ flex: 1, padding: "10px 12px", background: "rgba(var(--accent-rgb), 0.06)", border: "0.5px solid rgba(var(--accent-rgb), 0.18)", borderRadius: 9 }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Space Mono, monospace", color: "var(--accent)", lineHeight: 1 }}>+5</div>
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4, lineHeight: 1.4 }}>bonus AI messages per sign-up</div>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", background: "rgba(var(--accent-rgb), 0.06)", border: "0.5px solid rgba(var(--accent-rgb), 0.18)", borderRadius: 9 }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Space Mono, monospace", color: "var(--accent)", lineHeight: 1 }}>+1 mo</div>
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4, lineHeight: 1.4 }}>Pro free when referral upgrades</div>
          </div>
        </div>

        {/* Link display */}
        <div style={{ background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 9, padding: "11px 14px", marginBottom: 10, fontFamily: "Space Mono, monospace", fontSize: 12, color: "var(--text2)", wordBreak: "break-all" as const }}>
          {referralLink || "Loading..."}
        </div>

        {/* Copy button */}
        <button onClick={copy} disabled={!referralLink}
          style={{ width: "100%", padding: "11px", fontSize: 13, fontWeight: 600, borderRadius: 9, border: "none", background: copied ? "#5cb88a" : "var(--accent)", color: "var(--bg)", cursor: referralLink ? "pointer" : "not-allowed", transition: "background 0.2s", letterSpacing: 0.3, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 10 }}>
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy referral link
            </>
          )}
        </button>

        {/* Share row */}
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 9, color: "var(--text)", textDecoration: "none", fontSize: 12, fontWeight: 500, transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border2)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent("You should check out Corvo")}&body=${encodeURIComponent(shareText)}`}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 9, color: "var(--text)", textDecoration: "none", fontSize: 12, fontWeight: 500, transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border2)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2,4 12,13 22,4" />
            </svg>
            Send via email
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
