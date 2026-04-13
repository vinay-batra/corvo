"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const LEVEL_NAMES: Record<number, string> = {
  1: "Newcomer", 2: "Analyst", 3: "Investor", 4: "Portfolio Pro",
  5: "Fund Manager", 6: "Market Wizard", 7: "Legend",
};

function getLevelName(level: number) {
  return LEVEL_NAMES[Math.min(level, 7)] ?? "Legend";
}

function xpToLevel(xp: number): { level: number; progress: number; xpForNext: number } {
  const thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  level = Math.min(level, 7);
  const current = thresholds[level - 1] ?? 0;
  const next = thresholds[level] ?? thresholds[thresholds.length - 1];
  const progress = next > current ? ((xp - current) / (next - current)) * 100 : 100;
  return { level, progress: Math.min(progress, 100), xpForNext: Math.max(next - xp, 0) };
}

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [memberSince, setMemberSince] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/auth"; return; }
      setUser(user);
      setMemberSince(user.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "");

      const { data: prof } = await supabase.from("profiles").select("display_name,avatar_url,xp").eq("id", user.id).single();
      setDisplayName(prof?.display_name || user.email?.split("@")[0] || "User");
      setAvatarUrl(prof?.avatar_url || null);
      setXp(prof?.xp ?? 0);
      setLoading(false);
    })();
  }, []);

  const { level, progress, xpForNext } = xpToLevel(xp);
  const initials = (displayName || user?.email || "?")[0]?.toUpperCase();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg,#0a0e14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 20, height: 20, border: "2px solid rgba(201,168,76,0.2)", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e14", color: "#e8e0cc", fontFamily: "Inter,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadein{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <PublicNav />

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "98px 24px 80px", animation: "fadein 0.5s ease" }}>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(201,168,76,0.25)" }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#c9a84c" }}>
              {initials}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e8e0cc", letterSpacing: -0.5, marginBottom: 4 }}>{displayName}</h1>
            <p style={{ fontSize: 13, color: "rgba(232,224,204,0.4)" }}>{user?.email}</p>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          <div style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px" }}>
            <p style={{ fontSize: 9, letterSpacing: 2, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", marginBottom: 8 }}>Member Since</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#e8e0cc" }}>{memberSince || "—"}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px" }}>
            <p style={{ fontSize: 9, letterSpacing: 2, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", marginBottom: 8 }}>Current Plan</p>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#c9a84c" }}>Free Beta</span>
              <span style={{ fontSize: 9, padding: "2px 7px", background: "rgba(201,168,76,0.1)", border: "0.5px solid rgba(201,168,76,0.25)", borderRadius: 10, color: "#c9a84c", letterSpacing: 1 }}>ACTIVE</span>
            </div>
          </div>
        </div>

        {/* XP / Level */}
        <div style={{ background: "rgba(255,255,255,0.018)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", marginBottom: 6 }}>Level {level} · {getLevelName(level)}</p>
              <p style={{ fontFamily: "Space Mono,monospace", fontSize: 28, fontWeight: 700, color: "#c9a84c", letterSpacing: -1, lineHeight: 1 }}>{xp.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(232,224,204,0.4)" }}>XP</span></p>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21L12 18L6.82 21L8 14.14L3 9.27L9.91 8.26L12 2Z" fill="#c9a84c" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #c9a84c, #f59e0b)", borderRadius: 3, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
          </div>
          <p style={{ fontSize: 11, color: "rgba(232,224,204,0.3)" }}>
            {level < 7 ? `${xpForNext.toLocaleString()} XP until Level ${level + 1} · ${getLevelName(level + 1)}` : "Max level reached"}
          </p>
        </div>

        {/* Quick links */}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 32 }}>
          <p style={{ fontSize: 9, letterSpacing: 2, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", marginBottom: 4 }}>Quick Links</p>
          <Link href="/app" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "rgba(201,168,76,0.06)", border: "0.5px solid rgba(201,168,76,0.15)", borderRadius: 12, textDecoration: "none", transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.15)")}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#c9a84c" }}>Go to App</span>
            </div>
            <span style={{ fontSize: 14, color: "rgba(201,168,76,0.5)" }}>→</span>
          </Link>
          <Link href="/settings" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 12, textDecoration: "none", transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,224,204,0.5)" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(232,224,204,0.65)" }}>Settings</span>
            </div>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>→</span>
          </Link>
          <Link href="/settings#referrals" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 12, textDecoration: "none", transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,224,204,0.5)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(232,224,204,0.65)" }}>Referrals</span>
            </div>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>→</span>
          </Link>
        </div>

      </main>
      <PublicFooter />
    </div>
  );
}
