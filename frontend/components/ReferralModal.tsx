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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const ref = user.id.replace(/-/g, "").slice(0, 8);
        setReferralLink(`https://corvo.capital/app?ref=${ref}`);
      }
    })();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}
        style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "28px 28px 24px", width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 4 }}>Share</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Invite friends to Corvo</div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 20 }}>
          Share your link with friends. When they sign up and analyze their first portfolio, you unlock +5 AI chat messages per day (up to +25 total).
        </p>

        <div style={{ background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text2)", wordBreak: "break-all" as const }}>
          {referralLink || "Loading…"}
        </div>

        <button onClick={copy} disabled={!referralLink}
          style={{ width: "100%", padding: "11px", fontSize: 13, fontWeight: 600, borderRadius: 9, border: "none", background: copied ? "#5cb88a" : "#c9a84c", color: "#0a0e14", cursor: referralLink ? "pointer" : "not-allowed", transition: "background 0.2s", letterSpacing: 0.5 }}>
          {copied ? "✓ Copied!" : "Copy link"}
        </button>
      </motion.div>
    </motion.div>
  );
}
