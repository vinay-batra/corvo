"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const C = { amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", border: "rgba(255,255,255,0.08)", navy: "#0a0e14", cream: "#e8e0cc", cream2: "rgba(232,224,204,0.5)", cream3: "rgba(232,224,204,0.25)" };

interface UserMenuProps {
  onEmailPrefs?: () => void;
  onReferral?: () => void;
  onSettings?: () => void;
  avatarUrl?: string | null;
  displayName?: string;
}

export default function UserMenu({ onEmailPrefs, onReferral, onSettings, avatarUrl, displayName }: UserMenuProps) {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  if (!user) return (
    <a href="/auth" style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, letterSpacing: 1, background: "transparent", border: `1px solid rgba(201,168,76,0.3)`, color: C.amber, textDecoration: "none", transition: "all 0.2s", fontWeight: 500 }}
      onMouseEnter={e => { (e.target as any).style.background = C.amber2; }}
      onMouseLeave={e => { (e.target as any).style.background = "transparent"; }}>LOG IN</a>
  );

  const label = displayName || user.email?.split("@")[0] || "";
  const initials = label[0]?.toUpperCase() || "?";

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px 5px 5px", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 9, cursor: "pointer", transition: "border-color 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(201,168,76,0.35)", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.amber2, border: "1px solid rgba(201,168,76,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.amber, fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
        )}
        <span style={{ fontSize: 12, color: C.cream2 }}>{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.15 }}
            style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 6, minWidth: 180, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "8px 12px", fontSize: 11, color: C.cream3, borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 4 }}>{user.email}</div>
            {onSettings ? (
              <button onClick={() => { setOpen(false); onSettings(); }}
                style={{ width: "100%", padding: "8px 12px", background: "none", border: "none", color: C.cream, fontSize: 12, cursor: "pointer", textAlign: "left", borderRadius: 6, transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>Settings</button>
            ) : (
              <a href="/settings"
                style={{ display: "block", width: "100%", padding: "8px 12px", background: "none", border: "none", color: C.cream, fontSize: 12, cursor: "pointer", textAlign: "left", borderRadius: 6, transition: "background 0.1s", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>Settings</a>
            )}
            {onEmailPrefs && (
              <button onClick={() => { setOpen(false); onEmailPrefs(); }}
                style={{ width: "100%", padding: "8px 12px", background: "none", border: "none", color: C.cream, fontSize: 12, cursor: "pointer", textAlign: "left", borderRadius: 6, transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>Email Preferences</button>
            )}
            {onReferral && (
              <button onClick={() => { setOpen(false); onReferral(); }}
                style={{ width: "100%", padding: "8px 12px", background: "none", border: "none", color: C.cream, fontSize: 12, cursor: "pointer", textAlign: "left", borderRadius: 6, transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>Invite Friends</button>
            )}
            <button onClick={signOut}
              style={{ width: "100%", padding: "8px 12px", background: "none", border: "none", color: "#e05c5c", fontSize: 12, cursor: "pointer", textAlign: "left", borderRadius: 6, transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(224,92,92,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}