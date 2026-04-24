"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

const C = { amber: "var(--accent)", amber2: "rgba(184,134,11,0.1)", border: "var(--border)", navy: "var(--bg)", cream: "var(--text)", cream2: "var(--text2)", cream3: "var(--text3)" };

interface UserMenuProps {
  onEmailPrefs?: () => void;
  onReferral?: () => void;
  onSettings?: () => void;
  onProfile?: () => void;
  onReplayOnboarding?: () => void;
  onReplayTour?: () => void;
  avatarUrl?: string | null;
  displayName?: string;
}

export default function UserMenu({ onEmailPrefs, onReferral, onSettings, onProfile, onReplayOnboarding, onReplayTour, avatarUrl: avatarUrlProp, displayName: displayNameProp }: UserMenuProps) {
  const pathname = usePathname();
  const isInApp = pathname?.startsWith("/app");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ displayName: string; avatarUrl: string | null } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => {});
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile from DB when no props provided (public nav context)
  useEffect(() => {
    if (!user || displayNameProp) return;
    supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) {
          const name = data.display_name || user.email?.split("@")[0] || "User";
          setProfile({ displayName: name, avatarUrl: data.avatar_url || null });
        }
      }).then(() => {}).catch(() => {});
  }, [user, displayNameProp]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const menu = document.getElementById("usermenu-dropdown");
      const btn = document.getElementById("usermenu-btn");
      if (menu && !menu.contains(target) && btn && !btn.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const signOut = async () => {
    await supabase.auth.signOut();
    ["corvo_tour_completed", "corvo_onboarding_skipped", "corvo_setup_banner_dismissed", "corvo_pending_referral"].forEach(k => localStorage.removeItem(k));
    window.location.href = "/";
  };

  if (!user) return (
    <a href="/auth" style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, letterSpacing: 1, background: "transparent", border: "1px solid rgba(201,168,76,0.3)", color: C.amber, textDecoration: "none", transition: "all 0.2s", fontWeight: 500 }}
      onMouseEnter={e => { (e.target as any).style.background = C.amber2; }}
      onMouseLeave={e => { (e.target as any).style.background = "transparent"; }}>LOG IN</a>
  );

  const resolvedName = displayNameProp || profile?.displayName || user.email?.split("@")[0] || "";
  const resolvedAvatar = avatarUrlProp !== undefined ? avatarUrlProp : profile?.avatarUrl ?? null;
  const label = resolvedName;
  const initials = label[0]?.toUpperCase() || "?";

  const itemStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 13, color: "var(--text2)", textDecoration: "none", transition: "background 0.15s", background: "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left", fontFamily: "Inter,sans-serif" };

  return (
    <div style={{ position: "relative" }}>
      <button
        id="usermenu-btn"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px 5px 5px", height: 32, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 24, cursor: "pointer", transition: "border-color 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
      >
        {resolvedAvatar ? (
          <img src={resolvedAvatar} alt="Avatar" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#c9a84c", flexShrink: 0 }}>
            {initials}
          </div>
        )}
        <span style={{ fontSize: 12, color: "var(--text)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="usermenu-dropdown"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", minWidth: 182, maxWidth: "calc(100vw - 32px)", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 6, backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", zIndex: 200 }}
          >
            <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              {resolvedAvatar ? (
                <img src={resolvedAvatar} alt="Avatar" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#c9a84c", flexShrink: 0 }}>
                  {initials}
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 600, color: C.cream }}>{resolvedName || user.email?.split("@")[0]}</div>
            </div>

            {/* My Account */}
            <Link href="/account" onClick={() => setOpen(false)} style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              My Account
            </Link>

            {/* Referrals */}
            {onReferral ? (
              <button onClick={() => { setOpen(false); onReferral(); }} style={itemStyle}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                Referrals
              </button>
            ) : (
              <Link href="/referrals" onClick={() => setOpen(false)} style={itemStyle}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                Referrals
              </Link>
            )}

            {/* Replay Tour — in-app only */}
            {onReplayTour && (
              <button onClick={() => { setOpen(false); onReplayTour(); }} style={itemStyle}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                Replay Tour
              </button>
            )}

            {/* Replay Onboarding — in-app only */}
            {onReplayOnboarding && (
              <button onClick={() => { setOpen(false); onReplayOnboarding(); }} style={itemStyle}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                Replay Onboarding
              </button>
            )}

            {/* Settings */}
            {onSettings ? (
              <button id="tour-settings-btn" onClick={() => { setOpen(false); onSettings(); }} style={itemStyle}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                Settings
              </button>
            ) : (
              <Link href="/settings" onClick={() => setOpen(false)} style={itemStyle}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                Settings
              </Link>
            )}

            {!isInApp && (
              <>
                {/* Go to App */}
                <Link href="/app" onClick={() => setOpen(false)} style={itemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                  Go to App
                </Link>
              </>
            )}

            <div style={{ height: "0.5px", background: "var(--border)", margin: "4px 6px" }} />

            <button onClick={signOut} style={{ ...itemStyle, color: "rgba(224,92,92,0.8)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(224,92,92,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
