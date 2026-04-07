"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

interface Props {
  onClose: () => void;
  autoDisableDigest?: boolean;
}

const OPTIONS = [
  { key: "weekly_digest" as const,  label: "Weekly portfolio digest",  desc: "Portfolio performance summary every Monday morning" },
  { key: "price_alerts"  as const,  label: "Price alerts",             desc: "Notifications when holdings hit your set thresholds"  },
  { key: "news_summary"  as const,  label: "Market news summary",      desc: "Weekly roundup of market news for your holdings"      },
] as const;

type Prefs = { weekly_digest: boolean; price_alerts: boolean; news_summary: boolean };

export default function EmailPreferences({ onClose, autoDisableDigest }: Props) {
  const [prefs, setPrefs]   = useState<Prefs>({ weekly_digest: true, price_alerts: true, news_summary: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [noUser, setNoUser]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setNoUser(true); setLoading(false); return; }
        const { data } = await supabase
          .from("email_preferences")
          .select("weekly_digest,price_alerts,news_summary")
          .eq("user_id", user.id)
          .single();
        if (data) setPrefs({ weekly_digest: data.weekly_digest, price_alerts: data.price_alerts, news_summary: data.news_summary });
      } catch {}
      setLoading(false);
    })();
  }, []);

  // When opened via unsubscribe link, auto-toggle digest off after load
  useEffect(() => {
    if (!loading && autoDisableDigest) {
      setPrefs(p => ({ ...p, weekly_digest: false }));
    }
  }, [loading, autoDisableDigest]);

  const toggle = (key: keyof Prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("email_preferences").upsert({
        user_id: user.id,
        ...prefs,
        updated_at: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1100);
    } catch {}
    setSaving(false);
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
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 4 }}>Account</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Email Preferences</div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>

        {noUser ? (
          <p style={{ fontSize: 13, color: "var(--text3)", textAlign: "center" as const, padding: "24px 0" }}>
            Sign in to manage email preferences.
          </p>
        ) : loading ? (
          <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 20, height: 20, border: "1.5px solid var(--border2)", borderTopColor: "var(--text)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {OPTIONS.map(opt => {
              const on = prefs[opt.key];
              return (
                <div key={opt.key} onClick={() => toggle(opt.key)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 10, border: `0.5px solid ${on ? "rgba(201,168,76,0.3)" : "var(--border)"}`, background: on ? "rgba(201,168,76,0.05)" : "var(--bg2)", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ flex: 1, paddingRight: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 3 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{opt.desc}</div>
                  </div>
                  {/* Toggle pill */}
                  <div style={{ width: 38, height: 22, borderRadius: 11, background: on ? "#c9a84c" : "var(--border2)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: on ? "#0a0e14" : "var(--bg)", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px", fontSize: 12, borderRadius: 9, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>
            Cancel
          </button>
          {!noUser && (
            <button onClick={save} disabled={saving || loading}
              style={{ flex: 2, padding: "10px", fontSize: 12, fontWeight: 600, borderRadius: 9, border: "none", background: saved ? "#5cb88a" : "#c9a84c", color: "#0a0e14", cursor: saving ? "not-allowed" : "pointer", transition: "background 0.2s", letterSpacing: 0.5 }}>
              {saved ? "✓ Saved" : saving ? "Saving…" : "Save Preferences"}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
