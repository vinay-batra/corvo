"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Cropper from "react-easy-crop";
import { supabase } from "../../lib/supabase";
import { SOUND_KEY } from "../../hooks/useSoundEffects";
import ReferralsDashboard from "@/components/ReferralsDashboard";
import FeedbackButton from "../../components/FeedbackButton";
import ProfileEditor from "../../components/ProfileEditor";
import GoalsModal from "../../components/GoalsModal";
import { useToast } from "../../components/Toast";

const PERIODS    = ["6mo", "1y", "2y", "5y"] as const;
const BENCHMARKS = [
  { ticker: "^GSPC", label: "S&P 500" },
  { ticker: "^IXIC", label: "Nasdaq" },
  { ticker: "^DJI",  label: "Dow Jones" },
  { ticker: "^RUT",  label: "Russell 2K" },
  { ticker: "QQQ",   label: "QQQ ETF" },
  { ticker: "GLD",   label: "Gold" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 14, paddingBottom: 8, borderBottom: "0.5px solid var(--bg3)" }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--bg3)" }}>
      <div>
        <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 16 }}>{children}</div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ width: 38, height: 22, borderRadius: 11, background: on ? "#c9a84c" : "var(--border)", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "var(--bg)", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

export default function SettingsPage({ onClose, onProfileSaved, onReplayOnboarding, onReplayTour }: { onClose?: () => void; onProfileSaved?: (profile: { displayName: string; avatarUrl: string | null }) => void; onReplayOnboarding?: () => void; onReplayTour?: () => void }) {
  const { toast } = useToast();
  const [user, setUser]               = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved]   = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Crop modal state
  const [cropSrc, setCropSrc]       = useState<string | null>(null);
  const [crop, setCrop]             = useState({ x: 0, y: 0 });
  const [zoom, setZoom]             = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Preferences (localStorage)
  const [period, setPeriod]       = useState("1y");
  const [benchmark, setBenchmark] = useState("^GSPC");
  const [dark, setDark]           = useState(false);

  // Notifications (Supabase)
  const [weeklyDigest, setWeeklyDigest]           = useState(true);
  const [priceAlerts, setPriceAlerts]             = useState(true);
  const [newsSummary, setNewsSummary]             = useState(false);

  // Sound effects (localStorage)
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Goals
  const [goals, setGoals]               = useState<any>(null);
  const [showGoalsEditor, setShowGoalsEditor] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]                   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/auth"; return; }
      setUser(user);

      // Load profile
      const { data: profile } = await supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).single();
      if (profile) { setDisplayName(profile.display_name || ""); setAvatarUrl(profile.avatar_url || null); }

      // Load email prefs
      const { data: prefs } = await supabase.from("email_preferences").select("*").eq("user_id", user.id).single();
      if (prefs) { setWeeklyDigest(prefs.weekly_digest); setPriceAlerts(prefs.price_alerts); setNewsSummary(prefs.news_summary); }

      // Load localStorage prefs
      setPeriod(localStorage.getItem("corvo_period") || "1y");
      setBenchmark(localStorage.getItem("corvo_benchmark") || "^GSPC");
      const theme = localStorage.getItem("corvo_theme");
      const isDark = theme === "dark";
      setDark(isDark);
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
      setSoundEnabled(localStorage.getItem(SOUND_KEY) === "true");
      const raw = localStorage.getItem("corvo_goals");
      if (raw && raw !== "skipped") { try { setGoals(JSON.parse(raw)); } catch { /* ignore */ } }
    })();
  }, []);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    await supabase.from("profiles").upsert({ id: user.id, display_name: displayName, updated_at: new Date().toISOString() }, { onConflict: "id" });
    setSavingProfile(false); setProfileSaved(true); setTimeout(() => setProfileSaved(false), 1500);
    onProfileSaved?.({ displayName, avatarUrl });
  };

  // Canvas crop utility
  const getCroppedImg = async (imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }): Promise<Blob | null> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise<void>(resolve => { image.onload = () => resolve(); });
    const canvas = document.createElement("canvas");
    const size = Math.min(pixelCrop.width, pixelCrop.height);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size);
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.85));
  };

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropSave = async () => {
    if (!cropSrc || !croppedAreaPixels || !user) return;
    setCropSrc(null);
    setAvatarLoading(true);
    const blob = await getCroppedImg(cropSrc, croppedAreaPixels);
    if (!blob) { setAvatarLoading(false); return; }
    // Compress if > 500KB by reducing quality
    let finalBlob = blob;
    if (blob.size > 500 * 1024) {
      const img = new Image();
      img.src = cropSrc;
      await new Promise<void>(resolve => { img.onload = () => resolve(); });
      const canvas = document.createElement("canvas");
      canvas.width = 400; canvas.height = 400;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 400, 400);
      finalBlob = await new Promise(resolve => canvas.toBlob(b => resolve(b!), "image/jpeg", 0.75));
    }
    const path = `${user.id}/avatar.jpg`;
    const { error } = await supabase.storage.from("avatars").upload(path, finalBlob, { upsert: true, contentType: "image/jpeg" });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").upsert({ id: user.id, avatar_url: url, updated_at: new Date().toISOString() }, { onConflict: "id" });
      setAvatarUrl(url);
      onProfileSaved?.({ displayName, avatarUrl: url });
    }
    setAvatarLoading(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (cropSrc) setCropSrc(null);
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        if (showGoalsEditor) setShowGoalsEditor(false);
        if (showGoalsModal) setShowGoalsModal(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cropSrc, showDeleteConfirm, showGoalsEditor, showGoalsModal]);

  const onFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => { setCrop({ x: 0, y: 0 }); setZoom(1); setCropSrc(e.target?.result as string); };
    reader.readAsDataURL(file);
  };

  const savePref = (key: string, val: string) => localStorage.setItem(key, val);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("corvo_theme", next ? "dark" : "light");
  };

  const saveNotifs = async (wd: boolean, pa: boolean, ns: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("email_preferences").upsert({ user_id: user.id, weekly_digest: wd, price_alerts: pa, news_summary: ns, updated_at: new Date().toISOString() });
      if (error) throw error;
    } catch {
      toast("Failed to save notification preferences. Please try again.", "error");
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      // Get the current session JWT to authenticate the delete request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/user`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server error ${res.status}`);
      }

      // Hard-delete confirmed, clear local state and redirect
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      alert(`Deletion failed: ${err instanceof Error ? err.message : String(err)}`);
      setDeleting(false);
    }
  };

  const initials = (displayName || user?.email || "?")[0]?.toUpperCase();
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";
  const benchmarkLabel = BENCHMARKS.find(b => b.ticker === benchmark)?.label ?? benchmark;

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", fontSize: 13, borderRadius: 8,
    border: "0.5px solid var(--border)", background: "var(--bg3)",
    color: "var(--text)", outline: "none", width: "100%",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, width: "auto", cursor: "pointer",
  };

  return (
    <div style={{ minHeight: "100vh", overflowY: "auto", background: "transparent", color: "var(--text)", fontFamily: "Inter,sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadein{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:600px){
          .settings-main{padding:20px 16px!important}
          .settings-row{flex-wrap:wrap!important;gap:8px!important}
          .settings-row>div:last-child{flex-shrink:0}
        }
      `}</style>

      {/* Header */}
      <header style={{ height: 52, borderBottom: "0.5px solid var(--bg3)", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, background: "var(--bg)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        {onClose ? (
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", background: "none", border: "none", fontSize: 12, cursor: "pointer", transition: "color 0.15s", padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
            ← Back
          </button>
        ) : (
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 12, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
            ← Back
          </Link>
        )}
        <div style={{ width: "0.5px", height: 16, background: "var(--bg3)" }} />
        <img src="/corvo-logo.svg" width={22} height={18} alt="Corvo" style={{ opacity: 0.85 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Settings</span>
      </header>

      <main className="settings-main" style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px", animation: "fadein 0.5s ease" }}>

        {/* PROFILE */}
        <Section title="Profile">
          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 0", borderBottom: "0.5px solid var(--border)" }}>
            <div style={{ position: "relative" }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border2)" }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(184,134,11,0.15)", border: "2px solid rgba(184,134,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                  {initials}
                </div>
              )}
              {avatarLoading && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                </div>
              )}
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()}
                style={{ padding: "7px 14px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>
                Upload photo
              </button>
              <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 5 }}>JPG, PNG, WEBP · max 2MB</p>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { if (e.target.files?.[0]) onFileSelect(e.target.files[0]); e.target.value = ""; }} />
            </div>
          </div>
          {/* Display name */}
          <div style={{ padding: "12px 0", borderBottom: "0.5px solid var(--border)" }}>
            <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, marginBottom: 8 }}>Display name</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="Enter display name" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={saveProfile} disabled={savingProfile}
                style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", background: profileSaved ? "#5cb88a" : "var(--accent)", color: "#0a0e14", cursor: "pointer", transition: "background 0.2s", whiteSpace: "nowrap" as const }}>
                {profileSaved ? "✓ Saved" : savingProfile ? "…" : "Save"}
              </button>
            </div>
          </div>
          <Row label="Email" desc="Managed by your auth provider">
            <span style={{ fontSize: 13, color: "var(--text3)" }}>{user?.email || "N/A"}</span>
          </Row>
          <Row label="Member since">
            <span style={{ fontSize: 13, color: "var(--text3)" }}>{memberSince}</span>
          </Row>
        </Section>

        {/* PREFERENCES */}
        <Section title="Preferences">
          <Row label="Default analysis period">
            <div style={{ display: "flex", gap: 4 }}>
              {PERIODS.map(p => (
                <button key={p} onClick={() => { setPeriod(p); savePref("corvo_period", p); }}
                  style={{ padding: "4px 10px", fontSize: 11, fontFamily: "var(--font-mono)", borderRadius: 6, border: "0.5px solid var(--border)", background: period === p ? "var(--text)" : "transparent", color: period === p ? "var(--bg)" : "var(--text3)", cursor: "pointer", transition: "all 0.15s" }}>
                  {p}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Default benchmark">
            <select value={benchmark} onChange={e => { setBenchmark(e.target.value); savePref("corvo_benchmark", e.target.value); }} style={selectStyle}>
              {BENCHMARKS.map(b => <option key={b.ticker} value={b.ticker}>{b.label}</option>)}
            </select>
          </Row>
          <Row label="Theme" desc="Dark mode affects the app interface">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>{dark ? "Dark" : "Light"}</span>
              <Toggle on={dark} onChange={toggleTheme} />
            </div>
          </Row>
          <Row label="Sound Effects" desc="Subtle whoosh on tab switches and audio feedback on interactions (on by default)">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>{soundEnabled ? "On" : "Off"}</span>
              <Toggle on={soundEnabled} onChange={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                localStorage.setItem(SOUND_KEY, String(next));
              }} />
            </div>
          </Row>
        </Section>

        {/* NOTIFICATIONS */}
        <Section title="Notifications">
          <Row label="Weekly portfolio digest" desc="Portfolio performance summary every Monday">
            <Toggle on={weeklyDigest} onChange={() => { const v = !weeklyDigest; setWeeklyDigest(v); void saveNotifs(v, priceAlerts, newsSummary); }} />
          </Row>
          <Row label="Price alerts" desc="Alerts when holdings hit your set thresholds">
            <Toggle on={priceAlerts} onChange={() => { const v = !priceAlerts; setPriceAlerts(v); void saveNotifs(weeklyDigest, v, newsSummary); }} />
          </Row>
          <Row label="Market news summary" desc="Weekly roundup of market news for your holdings">
            <Toggle on={newsSummary} onChange={() => { const v = !newsSummary; setNewsSummary(v); void saveNotifs(weeklyDigest, priceAlerts, v); }} />
          </Row>
        </Section>

        {/* REFERRALS */}
        <Section title="Referrals">
          <ReferralsDashboard />
        </Section>

        {/* ONBOARDING */}
        {(onReplayOnboarding || onReplayTour) && (
          <Section title="Onboarding">
            {onReplayOnboarding && (
              <Row label="Replay Onboarding" desc="Restart the setup wizard from step 1">
                <button onClick={onReplayOnboarding}
                  style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "0.5px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#c9a84c")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border2)")}>
                  Restart
                </button>
              </Row>
            )}
            {onReplayTour && (
              <Row label="Replay Dashboard Tour" desc="Re-run the guided tooltip tour of dashboard features">
                <button onClick={onReplayTour}
                  style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "0.5px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#c9a84c")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border2)")}>
                  Start Tour
                </button>
              </Row>
            )}
          </Section>
        )}

        {/* PROFILE & GOALS */}
        <Section title="Profile &amp; Goals">
          <Row label="Investor Profile" desc="Customize your age, salary, risk tolerance, and investment goals">
            <button onClick={() => setShowGoalsModal(true)}
              style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "0.5px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#c9a84c")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border2)")}>
              Edit
            </button>
          </Row>
        </Section>

        {/* DANGER ZONE */}
        <Section title="Danger Zone">
          <div style={{ padding: "16px", border: "0.5px solid rgba(224,92,92,0.25)", borderRadius: 10, background: "rgba(224,92,92,0.04)" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Delete account</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>This will permanently delete your account and all saved portfolios. This action cannot be undone.</div>
            <button onClick={() => setShowDeleteConfirm(true)}
              style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid rgba(224,92,92,0.4)", background: "transparent", color: "#e05c5c", cursor: "pointer" }}>
              Delete account
            </button>
          </div>
        </Section>
      </main>

      {/* Avatar crop modal */}
      <AnimatePresence>
        {cropSrc && (
          <motion.div
            // initial={false} is required — do not remove
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              style={{ background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 420 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>Crop photo</div>
              {/* Crop area */}
              <div style={{ position: "relative", width: "100%", height: 300, borderRadius: 10, overflow: "hidden", background: "#000" }}>
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              {/* Zoom slider */}
              <div style={{ marginTop: 18, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>Zoom</div>
                <input type="range" min={0.5} max={3} step={0.05} value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
              </div>
              {/* Buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setCropSrc(null)}
                  style={{ flex: 1, padding: 10, fontSize: 13, borderRadius: 9, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleCropSave}
                  style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 600, borderRadius: 9, border: "none", background: "var(--accent)", color: "#0a0e14", cursor: "pointer" }}>
                  Save photo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            // initial={false} is required — do not remove
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              style={{ background: "var(--card-bg)", border: "0.5px solid rgba(224,92,92,0.3)", borderRadius: 14, padding: "28px", width: "100%", maxWidth: 400 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>Delete account?</div>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 24 }}>
                All your portfolios, goals, and preferences will be permanently deleted. You cannot undo this.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1, padding: "10px", fontSize: 13, borderRadius: 9, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={deleteAccount} disabled={deleting}
                  style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 600, borderRadius: 9, border: "none", background: "#e05c5c", color: "#fff", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1 }}>
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Goals editor modal (ProfileEditor, for legacy use) */}
      <AnimatePresence>
        {showGoalsEditor && (
          <ProfileEditor
            goals={goals}
            onSave={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowGoalsEditor(false); }}
            onClose={() => setShowGoalsEditor(false)}
          />
        )}
      </AnimatePresence>

      {/* Goals modal */}
      <AnimatePresence>
        {showGoalsModal && (
          <GoalsModal
            onComplete={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowGoalsModal(false); }}
            onSkip={() => setShowGoalsModal(false)}
          />
        )}
      </AnimatePresence>

      <FeedbackButton />
    </div>
  );
}
