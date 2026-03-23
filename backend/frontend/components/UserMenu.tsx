"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function UserMenu() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!user) {
    return (
      <a href="/auth" style={{
        padding: "7px 16px", borderRadius: 8, fontSize: 10, letterSpacing: 2,
        background: "rgba(0,255,160,0.08)", border: "1px solid rgba(0,255,160,0.25)",
        color: "#00ffa0", fontFamily: "'Orbitron', monospace", textDecoration: "none",
        transition: "all 0.2s", cursor: "pointer",
      }}>LOG IN</a>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8, cursor: "pointer", color: "rgba(226,232,240,0.6)", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12,
      }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(0,255,160,0.15)", border: "1px solid rgba(0,255,160,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#00ffa0", fontFamily: "'Orbitron', monospace" }}>
          {user.email?.[0]?.toUpperCase()}
        </div>
        {user.email?.split("@")[0]}
      </button>

      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#0a1020", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 6, minWidth: 160, zIndex: 100 }}>
          <div style={{ padding: "8px 12px", fontSize: 11, color: "rgba(226,232,240,0.3)", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 4 }}>
            {user.email}
          </div>
          <button onClick={signOut} style={{
            width: "100%", padding: "8px 12px", background: "none", border: "none",
            color: "#ff4d6d", fontSize: 12, cursor: "pointer", textAlign: "left",
            fontFamily: "'Space Grotesk', sans-serif", borderRadius: 6,
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,77,109,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >Sign out</button>
        </div>
      )}
    </div>
  );
}
