"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Cropper from "react-easy-crop";
import { supabase } from "../../lib/supabase";
import { SOUND_KEY } from "../../hooks/useSoundEffects";
import ReferralsDashboard from "@/components/ReferralsDashboard";
import FeedbackButton from "../../components/FeedbackButton";
import { useToast } from "../../components/Toast";

// ── Constants ──────────────────────────────────────────────────────────────────

const PERIODS    = ["6mo", "1y", "2y", "5y"] as const;
const BENCHMARKS = [
  { ticker: "^GSPC", label: "S&P 500" },
  { ticker: "^IXIC", label: "Nasdaq" },
  { ticker: "^DJI",  label: "Dow Jones" },
  { ticker: "^RUT",  label: "Russell 2K" },
  { ticker: "QQQ",   label: "QQQ ETF" },
  { ticker: "GLD",   label: "Gold" },
];

type Category = "profile" | "preferences" | "notifications" | "investor" | "referrals" | "account";

const NAV_ITEMS: { id: Category; label: string; terms: string[] }[] = [
  { id: "profile",       label: "Profile",          terms: ["display name", "photo", "avatar", "email", "member since", "profile", "name", "picture"] },
  { id: "preferences",   label: "Preferences",      terms: ["analysis period", "benchmark", "theme", "dark mode", "light mode", "sound", "sound effects", "preferences", "period"] },
  { id: "notifications", label: "Notifications",    terms: ["morning briefing", "week in review", "monthly summary", "price alerts", "notifications", "email", "alerts"] },
  { id: "investor",      label: "Investor Profile", terms: ["investor type", "age range", "goals", "income", "risk tolerance", "investment horizon", "investor profile", "risk", "horizon"] },
  { id: "referrals",     label: "Referrals",        terms: ["referrals", "invite", "refer", "referral", "code"] },
  { id: "account",       label: "Account",          terms: ["onboarding", "tour", "delete account", "account", "replay", "danger", "delete"] },
];

// ── Shared sub-components ──────────────────────────────────────────────────────

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: "0.5px solid var(--border)" }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      role="switch"
      aria-checked={on}
      style={{ width: 38, height: 22, borderRadius: 11, background: on ? "var(--accent)" : "var(--border2)", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "var(--bg)", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", margin: "0 0 20px", letterSpacing: "-0.3px" }}>
      {children}
    </h2>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6, letterSpacing: 0.3 }}>{children}</div>;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SettingsPage({
  onClose, onProfileSaved, onReplayOnboarding, onReplayTour,
}: {
  onClose?: () => void;
  onProfileSaved?: (profile: { displayName: string; avatarUrl: string | null }) => void;
  onReplayOnboarding?: () => void;
  onReplayTour?: () => void;
}) {
  const { toast } = useToast();

  // ── Nav state ──────────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<Category>("profile");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNav = useMemo(() => {
    if (!searchQuery.trim()) return NAV_ITEMS;
    const q = searchQuery.toLowerCase().trim();
    return NAV_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.terms.some(t => t.includes(q))
    );
  }, [searchQuery]);

  // When search result changes, auto-select first match
  useEffect(() => {
    if (filteredNav.length > 0 && !filteredNav.find(i => i.id === activeCategory)) {
      setActiveCategory(filteredNav[0].id);
    }
  }, [filteredNav, activeCategory]);

  // ── User / Profile ─────────────────────────────────────────────────────────
  const [user, setUser]               = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved]   = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Crop modal ─────────────────────────────────────────────────────────────
  const [cropSrc, setCropSrc]       = useState<string | null>(null);
  const [crop, setCrop]             = useState({ x: 0, y: 0 });
  const [zoom, setZoom]             = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // ── Preferences ────────────────────────────────────────────────────────────
  const [period, setPeriod]       = useState("1y");
  const [benchmark, setBenchmark] = useState("^GSPC");
  const [dark, setDark]           = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // ── Notifications ──────────────────────────────────────────────────────────
  const [morningBriefing, setMorningBriefing]         = useState(false);
  const [marketCloseSummary, setMarketCloseSummary]   = useState(true);
  const [weekInReview, setWeekInReview]               = useState(false);
  const [monthlySummary, setMonthlySummary]           = useState(false);
  const [priceAlerts, setPriceAlerts]                 = useState(true);
  const [emailTheme, setEmailTheme]                   = useState<"light" | "dark">("light");
  const [emailThemeSupported, setEmailThemeSupported] = useState(false);

  // ── Push notifications ─────────────────────────────────────────────────────
  const [pushPermission, setPushPermission]               = useState<NotificationPermission | "unsupported">("default");
  const [pushMorningBriefing, setPushMorningBriefing]     = useState(false);
  const [pushMarketClose, setPushMarketClose]             = useState(false);
  const [pushPriceAlerts, setPushPriceAlerts]             = useState(false);
  const [pushPriceTargets, setPushPriceTargets]           = useState(false);
  const [pushWeeklyCheckup, setPushWeeklyCheckup]         = useState(false);
  const [pushEarningsReminders, setPushEarningsReminders] = useState(false);

  // ── Investor profile ───────────────────────────────────────────────────────
  const [investorType, setInvestorType]           = useState("");
  const [primaryGoals, setPrimaryGoals]           = useState<string[]>([]);
  const [ageRange, setAgeRange]                   = useState("");
  const [incomeRange, setIncomeRange]             = useState("");
  const [riskTolerance, setRiskTolerance]         = useState("");
  const [investmentHorizon, setInvestmentHorizon] = useState("");
  const [savingProfileQ, setSavingProfileQ]       = useState(false);
  const [profileQSaved, setProfileQSaved]         = useState(false);

  // ── Delete account ─────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]                   = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/auth"; return; }
      setUser(user);

      const { data: profile } = await supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).single();
      if (profile) { setDisplayName(profile.display_name || ""); setAvatarUrl(profile.avatar_url || null); }

      // Try loading all notification prefs including push columns and email_theme.
      // maybeSingle avoids PGRST116 on missing rows; a schema error (column doesn't
      // exist yet) surfaces as a non-null error here.
      const { data: prefs, error: prefsError } = await supabase
        .from("email_preferences")
        .select("morning_briefing,market_close_summary,week_in_review,monthly_summary,price_alerts,email_theme,push_morning_briefing,push_market_close,push_price_alerts,push_price_targets,push_weekly_checkup,push_earnings_reminders")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!prefsError) {
        setEmailThemeSupported(true);
        if (prefs) {
          setMorningBriefing(prefs.morning_briefing ?? false);
          setMarketCloseSummary(prefs.market_close_summary ?? true);
          setWeekInReview(prefs.week_in_review ?? false);
          setMonthlySummary(prefs.monthly_summary ?? false);
          setPriceAlerts(prefs.price_alerts ?? true);
          setEmailTheme(prefs.email_theme === "dark" ? "dark" : "light");
          setPushMorningBriefing(prefs.push_morning_briefing ?? false);
          setPushMarketClose(prefs.push_market_close ?? false);
          setPushPriceAlerts(prefs.push_price_alerts ?? false);
          setPushPriceTargets(prefs.push_price_targets ?? false);
          setPushWeeklyCheckup(prefs.push_weekly_checkup ?? false);
          setPushEarningsReminders(prefs.push_earnings_reminders ?? false);
        }
      } else {
        // Newer push/email_theme columns may not exist yet — fall back to basics
        const { data: prefsBasic } = await supabase
          .from("email_preferences")
          .select("morning_briefing,market_close_summary,week_in_review,monthly_summary,price_alerts")
          .eq("user_id", user.id)
          .maybeSingle();
        if (prefsBasic) {
          setMorningBriefing(prefsBasic.morning_briefing ?? false);
          setMarketCloseSummary(prefsBasic.market_close_summary ?? true);
          setWeekInReview(prefsBasic.week_in_review ?? false);
          setMonthlySummary(prefsBasic.monthly_summary ?? false);
          setPriceAlerts(prefsBasic.price_alerts ?? true);
        }
      }

      // Check browser notification permission
      if (typeof window !== "undefined") {
        if (!("Notification" in window)) {
          setPushPermission("unsupported");
        } else {
          setPushPermission(Notification.permission);
        }
      }

      setPeriod(localStorage.getItem("corvo_period") || "1y");
      setBenchmark(localStorage.getItem("corvo_benchmark") || "^GSPC");
      const theme = localStorage.getItem("corvo_theme");
      const isDark = theme === "dark";
      setDark(isDark);
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
      setSoundEnabled(localStorage.getItem(SOUND_KEY) === "true");

      const m = user.user_metadata || {};
      setInvestorType(m.investor_type || "");
      setPrimaryGoals(Array.isArray(m.primary_goals) ? m.primary_goals : []);
      setAgeRange(m.age_range || "");
      setIncomeRange(m.income_range || "");
      setRiskTolerance(m.risk_tolerance || "");
      setInvestmentHorizon(m.investment_horizon || "");
    })();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (cropSrc) { setCropSrc(null); return; }
        if (showDeleteConfirm) { setShowDeleteConfirm(false); return; }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cropSrc, showDeleteConfirm]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    await supabase.from("profiles").upsert({ id: user.id, display_name: displayName, updated_at: new Date().toISOString() }, { onConflict: "id" });
    setSavingProfile(false); setProfileSaved(true); setTimeout(() => setProfileSaved(false), 1500);
    onProfileSaved?.({ displayName, avatarUrl });
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }): Promise<Blob | null> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise<void>(resolve => { image.onload = () => resolve(); });
    const canvas = document.createElement("canvas");
    const size = Math.min(pixelCrop.width, pixelCrop.height);
    canvas.width = size; canvas.height = size;
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
    let blob = await getCroppedImg(cropSrc, croppedAreaPixels);
    if (!blob) { setAvatarLoading(false); return; }
    if (blob.size > 500 * 1024) {
      const img = new Image();
      img.src = cropSrc;
      await new Promise<void>(resolve => { img.onload = () => resolve(); });
      const canvas = document.createElement("canvas");
      canvas.width = 400; canvas.height = 400;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 400, 400);
      blob = await new Promise(resolve => canvas.toBlob(b => resolve(b!), "image/jpeg", 0.75));
    }
    const path = `${user.id}/avatar.jpg`;
    if (!blob) { setAvatarLoading(false); return; }
    const { error } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").upsert({ id: user.id, avatar_url: url, updated_at: new Date().toISOString() }, { onConflict: "id" });
      setAvatarUrl(url);
      onProfileSaved?.({ displayName, avatarUrl: url });
    }
    setAvatarLoading(false);
  };

  const saveNotifs = async (mb: boolean, mcs: boolean, wr: boolean, ms: boolean, pa: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("email_preferences").upsert({ user_id: user.id, morning_briefing: mb, market_close_summary: mcs, week_in_review: wr, monthly_summary: ms, price_alerts: pa, updated_at: new Date().toISOString() });
      if (error) throw error;
    } catch {
      toast("Failed to save notification preferences. Please try again.", "error");
    }
  };

  const saveEmailTheme = async (theme: "light" | "dark") => {
    if (!user || !emailThemeSupported) return;
    try {
      const { error } = await supabase.from("email_preferences").upsert({ user_id: user.id, email_theme: theme, updated_at: new Date().toISOString() });
      if (error) throw error;
    } catch {
      toast("Failed to save email theme. Please try again.", "error");
    }
  };

  const requestPushPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPushPermission(result);
  };

  const savePushPrefs = async (
    pmb: boolean, pmc: boolean, ppa: boolean, ppt: boolean, pwc: boolean, per: boolean
  ) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("email_preferences").upsert({
        user_id: user.id,
        push_morning_briefing: pmb,
        push_market_close: pmc,
        push_price_alerts: ppa,
        push_price_targets: ppt,
        push_weekly_checkup: pwc,
        push_earnings_reminders: per,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } catch {
      toast("Failed to save push notification preferences. Please try again.", "error");
    }
  };

  const saveProfileQuestionnaire = async () => {
    if (!user) return;
    setSavingProfileQ(true);
    await supabase.auth.updateUser({
      data: { investor_type: investorType, primary_goals: primaryGoals, age_range: ageRange, income_range: incomeRange, risk_tolerance: riskTolerance, investment_horizon: investmentHorizon },
    });
    setSavingProfileQ(false);
    setProfileQSaved(true);
    setTimeout(() => setProfileQSaved(false), 1500);
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("corvo_theme", next ? "dark" : "light");
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/user`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server error ${res.status}`);
      }
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      alert(`Deletion failed: ${err instanceof Error ? err.message : String(err)}`);
      setDeleting(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const initials = (displayName || user?.email || "?")[0]?.toUpperCase();
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", fontSize: 13, borderRadius: "var(--radius)",
    border: "0.5px solid var(--border)", background: "var(--bg3)",
    color: "var(--text)", outline: "none", width: "100%",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, width: "100%", cursor: "pointer",
  };

  const btnOutline: React.CSSProperties = {
    padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: "var(--radius)",
    border: "0.5px solid var(--border2)", background: "transparent",
    color: "var(--text2)", cursor: "pointer", transition: "border-color 0.15s",
  };

  const btnSave = (saved: boolean): React.CSSProperties => ({
    padding: "8px 18px", fontSize: 12, fontWeight: 600, borderRadius: "var(--radius)",
    border: "none", background: saved ? "rgba(var(--accent-rgb), 0.7)" : "var(--accent)",
    color: "var(--bg)", cursor: "pointer", transition: "background 0.2s",
  });

  // ── Category panels ────────────────────────────────────────────────────────

  const renderProfile = () => (
    <div>
      <SectionTitle>Profile</SectionTitle>

      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 0", borderBottom: "0.5px solid var(--border)", marginBottom: 4 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border2)" }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(var(--accent-rgb), 0.12)", border: "2px solid rgba(var(--accent-rgb), 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
              {initials}
            </div>
          )}
          {avatarLoading && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 18, height: 18, border: "2px solid var(--border2)", borderTopColor: "var(--text)", borderRadius: "50%", animation: "s-spin 0.8s linear infinite" }} />
            </div>
          )}
        </div>
        <div>
          <button onClick={() => fileRef.current?.click()} style={btnOutline}>Upload photo</button>
          <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 5 }}>JPG, PNG, WEBP · max 2MB</p>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => {
              if (e.target.files?.[0]) {
                const reader = new FileReader();
                reader.onload = ev => { setCrop({ x: 0, y: 0 }); setZoom(1); setCropSrc(ev.target?.result as string); };
                reader.readAsDataURL(e.target.files[0]);
              }
              e.target.value = "";
            }} />
        </div>
      </div>

      {/* Display name */}
      <div style={{ padding: "14px 0", borderBottom: "0.5px solid var(--border)" }}>
        <FieldLabel>Display name</FieldLabel>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="Enter display name" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={saveProfile} disabled={savingProfile} style={btnSave(profileSaved)}>
            {profileSaved ? "Saved" : savingProfile ? "..." : "Save"}
          </button>
        </div>
      </div>

      <Row label="Email" desc="Managed by your auth provider">
        <span style={{ fontSize: 13, color: "var(--text3)" }}>{user?.email || "N/A"}</span>
      </Row>
      <Row label="Member since">
        <span style={{ fontSize: 13, color: "var(--text3)" }}>{memberSince}</span>
      </Row>
    </div>
  );

  const renderPreferences = () => (
    <div>
      <SectionTitle>Preferences</SectionTitle>
      <Row label="Default analysis period">
        <div style={{ display: "flex", gap: 4 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => { setPeriod(p); localStorage.setItem("corvo_period", p); }}
              style={{ padding: "4px 10px", fontSize: 11, fontFamily: "var(--font-mono)", borderRadius: 6, border: "0.5px solid var(--border)", background: period === p ? "var(--text)" : "transparent", color: period === p ? "var(--bg)" : "var(--text3)", cursor: "pointer", transition: "all 0.15s" }}>
              {p}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Default benchmark">
        <select value={benchmark} onChange={e => { setBenchmark(e.target.value); localStorage.setItem("corvo_benchmark", e.target.value); }}
          style={{ ...selectStyle, width: "auto" }}>
          {BENCHMARKS.map(b => <option key={b.ticker} value={b.ticker}>{b.label}</option>)}
        </select>
      </Row>
      <Row label="Theme" desc="Dark mode affects the entire app interface">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>{dark ? "Dark" : "Light"}</span>
          <Toggle on={dark} onChange={toggleTheme} />
        </div>
      </Row>
      <Row label="Sound effects" desc="Subtle audio feedback on tab switches and interactions">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>{soundEnabled ? "On" : "Off"}</span>
          <Toggle on={soundEnabled} onChange={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            localStorage.setItem(SOUND_KEY, String(next));
          }} />
        </div>
      </Row>
    </div>
  );

  const renderNotifications = () => (
    <div>
      <SectionTitle>Notifications</SectionTitle>

      {/* Email Notifications group */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, paddingBottom: 8, borderBottom: "0.5px solid var(--border)" }}>
          Email Notifications
        </div>
        <Row label="Morning Briefing" desc="Daily portfolio and market teaser delivered at 6am ET">
          <Toggle on={morningBriefing} onChange={() => { const v = !morningBriefing; setMorningBriefing(v); void saveNotifs(v, marketCloseSummary, weekInReview, monthlySummary, priceAlerts); }} />
        </Row>
        <Row label="Market Close Summary" desc="Daily recap of your holdings at 4:05pm ET with best and worst performers">
          <Toggle on={marketCloseSummary} onChange={() => { const v = !marketCloseSummary; setMarketCloseSummary(v); void saveNotifs(morningBriefing, v, weekInReview, monthlySummary, priceAlerts); }} />
        </Row>
        <Row label="Week in Review" desc="Weekly recap of your portfolio performance sent every Monday at 6am ET">
          <Toggle on={weekInReview} onChange={() => { const v = !weekInReview; setWeekInReview(v); void saveNotifs(morningBriefing, marketCloseSummary, v, monthlySummary, priceAlerts); }} />
        </Row>
        <Row label="Monthly Summary" desc="Month-end portfolio return summary sent on the 1st of each month">
          <Toggle on={monthlySummary} onChange={() => { const v = !monthlySummary; setMonthlySummary(v); void saveNotifs(morningBriefing, marketCloseSummary, weekInReview, v, priceAlerts); }} />
        </Row>
        <Row label="Price Alerts" desc="Instant email when a monitored stock crosses your alert price">
          <Toggle on={priceAlerts} onChange={() => { const v = !priceAlerts; setPriceAlerts(v); void saveNotifs(morningBriefing, marketCloseSummary, weekInReview, monthlySummary, v); }} />
        </Row>
        {emailThemeSupported && (
          <Row label="Email Theme" desc="Choose light or dark background for all Corvo emails">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>{emailTheme === "dark" ? "Dark" : "Light"}</span>
              <Toggle on={emailTheme === "dark"} onChange={() => {
                const next: "light" | "dark" = emailTheme === "dark" ? "light" : "dark";
                setEmailTheme(next);
                void saveEmailTheme(next);
              }} />
            </div>
          </Row>
        )}
      </div>

      {/* Push Notifications group */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, paddingBottom: 8, borderBottom: "0.5px solid var(--border)" }}>
          Push Notifications
        </div>

        {pushPermission === "unsupported" ? (
          <div style={{ fontSize: 12, color: "var(--text3)", padding: "12px 0", lineHeight: 1.5 }}>
            Your browser does not support push notifications.
          </div>
        ) : pushPermission === "denied" ? (
          <div style={{ margin: "12px 0", padding: "12px 14px", borderRadius: "var(--radius)", border: "0.5px solid var(--border)", background: "var(--bg3)" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Browser notifications are blocked</div>
            <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
              To re-enable, open your browser settings, find the Corvo site entry under Notifications, and change the permission to Allow. You may need to reload the page after.
            </div>
          </div>
        ) : pushPermission === "default" ? (
          <div style={{ margin: "12px 0 16px" }}>
            <button
              onClick={requestPushPermission}
              style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, borderRadius: "var(--radius)", border: "0.5px solid var(--accent)", background: "rgba(var(--accent-rgb), 0.08)", color: "var(--accent)", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--accent-rgb), 0.16)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(var(--accent-rgb), 0.08)")}
            >
              Enable Browser Notifications
            </button>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 7, lineHeight: 1.5 }}>
              You can still configure your preferences below. Notifications will fire once permission is granted.
            </div>
          </div>
        ) : null}

        <Row label="Morning Briefing" desc="Push notification at 6am ET with your daily market brief">
          <Toggle on={pushMorningBriefing} onChange={() => { const v = !pushMorningBriefing; setPushMorningBriefing(v); void savePushPrefs(v, pushMarketClose, pushPriceAlerts, pushPriceTargets, pushWeeklyCheckup, pushEarningsReminders); }} />
        </Row>
        <Row label="Market Close Summary" desc="Push alert at 4:05pm ET summarizing today's portfolio moves">
          <Toggle on={pushMarketClose} onChange={() => { const v = !pushMarketClose; setPushMarketClose(v); void savePushPrefs(pushMorningBriefing, v, pushPriceAlerts, pushPriceTargets, pushWeeklyCheckup, pushEarningsReminders); }} />
        </Row>
        <Row label="Price Alerts" desc="Instant push when a stock hits your alert price">
          <Toggle on={pushPriceAlerts} onChange={() => { const v = !pushPriceAlerts; setPushPriceAlerts(v); void savePushPrefs(pushMorningBriefing, pushMarketClose, v, pushPriceTargets, pushWeeklyCheckup, pushEarningsReminders); }} />
        </Row>
        <Row label="Price Target Hit" desc="Push notification when a stock reaches your saved price target">
          <Toggle on={pushPriceTargets} onChange={() => { const v = !pushPriceTargets; setPushPriceTargets(v); void savePushPrefs(pushMorningBriefing, pushMarketClose, pushPriceAlerts, v, pushWeeklyCheckup, pushEarningsReminders); }} />
        </Row>
        <Row label="Weekly Portfolio Checkup" desc="Monday morning push summarizing your portfolio health score">
          <Toggle on={pushWeeklyCheckup} onChange={() => { const v = !pushWeeklyCheckup; setPushWeeklyCheckup(v); void savePushPrefs(pushMorningBriefing, pushMarketClose, pushPriceAlerts, pushPriceTargets, v, pushEarningsReminders); }} />
        </Row>
        <Row label="Earnings Reminders" desc="Push reminder the day before a holding in your portfolio reports earnings">
          <Toggle on={pushEarningsReminders} onChange={() => { const v = !pushEarningsReminders; setPushEarningsReminders(v); void savePushPrefs(pushMorningBriefing, pushMarketClose, pushPriceAlerts, pushPriceTargets, pushWeeklyCheckup, v); }} />
        </Row>
      </div>
    </div>
  );

  const renderInvestorProfile = () => (
    <div>
      <SectionTitle>Investor Profile</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <FieldLabel>Investor type</FieldLabel>
            <select value={investorType} onChange={e => setInvestorType(e.target.value)} style={selectStyle}>
              <option value="">Not set</option>
              <option value="beginner">Beginner investor</option>
              <option value="active">Active trader</option>
              <option value="longterm">Long-term investor</option>
              <option value="professional">Finance professional</option>
            </select>
          </div>
          <div>
            <FieldLabel>Age range</FieldLabel>
            <select value={ageRange} onChange={e => setAgeRange(e.target.value)} style={selectStyle}>
              <option value="">Not set</option>
              <option value="under18">Under 18</option>
              <option value="18-24">18 to 24</option>
              <option value="25-34">25 to 34</option>
              <option value="35-44">35 to 44</option>
              <option value="45-54">45 to 54</option>
              <option value="55-64">55 to 64</option>
              <option value="65+">65 or older</option>
            </select>
          </div>
        </div>

        <div>
          <FieldLabel>Primary goals (select up to 3)</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {[
              { id: "track", label: "Track performance" },
              { id: "risk",  label: "Reduce risk" },
              { id: "learn", label: "Learn investing" },
              { id: "taxes", label: "Optimize taxes" },
              { id: "wealth", label: "Build wealth" },
              { id: "retirement", label: "Save for retirement" },
            ].map(g => {
              const sel = primaryGoals.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    if (sel) setPrimaryGoals(prev => prev.filter(x => x !== g.id));
                    else if (primaryGoals.length < 3) setPrimaryGoals(prev => [...prev, g.id]);
                  }}
                  style={{ padding: "5px 13px", fontSize: 11, borderRadius: 20, border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`, background: sel ? "rgba(var(--accent-rgb), 0.1)" : "transparent", color: sel ? "var(--accent)" : "var(--text3)", cursor: "pointer", transition: "all 0.15s" }}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <FieldLabel>Annual income</FieldLabel>
            <select value={incomeRange} onChange={e => setIncomeRange(e.target.value)} style={selectStyle}>
              <option value="">Not set</option>
              <option value="under30k">Under $30k</option>
              <option value="30-60k">$30k to $60k</option>
              <option value="60-100k">$60k to $100k</option>
              <option value="100-200k">$100k to $200k</option>
              <option value="200k+">$200k or more</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>
          </div>
          <div>
            <FieldLabel>Risk tolerance</FieldLabel>
            <select value={riskTolerance} onChange={e => setRiskTolerance(e.target.value)} style={selectStyle}>
              <option value="">Not set</option>
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
              <option value="very_aggressive">Very Aggressive</option>
            </select>
          </div>
        </div>

        <div>
          <FieldLabel>Investment horizon</FieldLabel>
          <select value={investmentHorizon} onChange={e => setInvestmentHorizon(e.target.value)} style={{ ...selectStyle, width: "auto", minWidth: 200 }}>
            <option value="">Not set</option>
            <option value="under1y">Less than 1 year</option>
            <option value="1-3y">1 to 3 years</option>
            <option value="3-5y">3 to 5 years</option>
            <option value="5-10y">5 to 10 years</option>
            <option value="10y+">10 or more years</option>
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={saveProfileQuestionnaire} disabled={savingProfileQ} style={btnSave(profileQSaved)}>
            {profileQSaved ? "Saved" : savingProfileQ ? "..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderReferrals = () => (
    <div>
      <SectionTitle>Referrals</SectionTitle>
      <ReferralsDashboard />
    </div>
  );

  const renderAccount = () => (
    <div>
      <SectionTitle>Account</SectionTitle>

      <Row label="Replay onboarding" desc="Restart the full setup questionnaire from step 1">
        <button
          onClick={() => { window.location.href = "/onboarding?replay=true"; }}
          style={btnOutline}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border2)")}>
          Restart
        </button>
      </Row>

      {onReplayTour && (
        <Row label="Replay dashboard tour" desc="Re-run the guided tooltip tour of dashboard features">
          <button onClick={onReplayTour} style={btnOutline}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border2)")}>
            Start tour
          </button>
        </Row>
      )}

      <div style={{ marginTop: 28, padding: 18, border: "0.5px solid rgba(var(--red-rgb, 224,92,92), 0.25)", borderRadius: "var(--radius-lg)", background: "rgba(var(--red-rgb, 224,92,92), 0.04)" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Delete account</div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14, lineHeight: 1.5 }}>
          This permanently deletes your account and all saved portfolios. This action cannot be undone.
        </div>
        <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, borderRadius: "var(--radius)", border: "1px solid rgba(var(--red-rgb, 224,92,92), 0.4)", background: "transparent", color: "var(--red)", cursor: "pointer" }}>
          Delete account
        </button>
      </div>
    </div>
  );

  const renderCategory = () => {
    switch (activeCategory) {
      case "profile":       return renderProfile();
      case "preferences":   return renderPreferences();
      case "notifications": return renderNotifications();
      case "investor":      return renderInvestorProfile();
      case "referrals":     return renderReferrals();
      case "account":       return renderAccount();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}>
      <style>{`
        @keyframes s-spin { to { transform: rotate(360deg); } }
        @keyframes s-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .s-nav-btn:hover { background: var(--bg3) !important; color: var(--text) !important; }
        .s-nav-btn.active { color: var(--accent) !important; background: rgba(var(--accent-rgb), 0.08) !important; }
        @media (max-width: 768px) {
          .s-sidebar { display: none !important; }
          .s-mobile-nav { display: flex !important; }
          .s-body { flex-direction: column !important; }
          .s-content { padding: 20px 16px !important; max-width: 100% !important; }
          .s-grid-2 { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .s-mobile-nav { display: none !important; }
        }
      `}</style>

      {/* ── Sticky header ── */}
      <header style={{ height: 52, borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, background: "var(--bg)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
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
        <div style={{ width: "0.5px", height: 16, background: "var(--border)" }} />
        <img src="/corvo-logo.svg" width={22} height={18} alt="Corvo" style={{ opacity: 0.85 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Settings</span>
      </header>

      {/* ── Mobile top tab bar ── */}
      <div className="s-mobile-nav" style={{ overflowX: "auto", borderBottom: "0.5px solid var(--border)", padding: "0 12px", gap: 2, WebkitOverflowScrolling: "touch" as any, scrollbarWidth: "none" as any }}>
        <style>{`.s-mobile-nav::-webkit-scrollbar { display: none; }`}</style>
        {filteredNav.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveCategory(item.id)}
            style={{
              display: "inline-block", whiteSpace: "nowrap",
              padding: "10px 14px", fontSize: 12, fontWeight: activeCategory === item.id ? 600 : 400,
              borderRadius: 0, border: "none",
              borderBottom: activeCategory === item.id ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
              color: activeCategory === item.id ? "var(--accent)" : "var(--text3)",
              cursor: "pointer", transition: "color 0.15s",
            }}>
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Two-column body ── */}
      <div className="s-body" style={{ display: "flex", maxWidth: 920, margin: "0 auto", minHeight: "calc(100vh - 52px)" }}>

        {/* ── Left sidebar ── */}
        <aside className="s-sidebar" style={{ width: 220, flexShrink: 0, borderRight: "0.5px solid var(--border)", padding: "24px 0", position: "sticky", top: 52, height: "calc(100vh - 52px)", overflowY: "auto" }}>

          {/* Search */}
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ position: "relative" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "7px 10px 7px 30px", fontSize: 12, borderRadius: "var(--radius)", border: "0.5px solid var(--border)", background: "var(--bg3)", color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 0, display: "flex", lineHeight: 1 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
            {searchQuery && filteredNav.length === 0 && (
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 10, textAlign: "center" }}>No results</p>
            )}
          </div>

          {/* Nav items */}
          <nav>
            {filteredNav.map(item => (
              <button
                key={item.id}
                className={`s-nav-btn${activeCategory === item.id ? " active" : ""}`}
                onClick={() => { setActiveCategory(item.id); setSearchQuery(""); }}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 16px", fontSize: 13, fontWeight: activeCategory === item.id ? 500 : 400,
                  background: "transparent",
                  borderLeft: activeCategory === item.id ? "2px solid var(--accent)" : "2px solid transparent",
                  border: "none",
                  borderLeftWidth: 2, borderLeftStyle: "solid",
                  borderLeftColor: activeCategory === item.id ? "var(--accent)" : "transparent",
                  color: activeCategory === item.id ? "var(--accent)" : "var(--text3)",
                  cursor: "pointer", transition: "all 0.13s",
                  marginBottom: 1,
                }}>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Right content ── */}
        <main className="s-content" style={{ flex: 1, padding: "28px 36px", maxWidth: 600, animation: "s-fadein 0.25s ease" }} key={activeCategory}>
          {renderCategory()}
        </main>
      </div>

      {/* ── Avatar crop modal ── */}
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
              <div style={{ position: "relative", width: "100%", height: 300, borderRadius: 10, overflow: "hidden", background: "var(--bg)" }}>
                <Cropper image={cropSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
              </div>
              <div style={{ marginTop: 18, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>Zoom</div>
                <input type="range" min={0.5} max={3} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setCropSrc(null)} style={{ flex: 1, padding: 10, fontSize: 13, borderRadius: 9, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleCropSave} style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 600, borderRadius: 9, border: "none", background: "var(--accent)", color: "var(--bg)", cursor: "pointer" }}>Save photo</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirm modal ── */}
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
              style={{ background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 400 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>Delete account?</div>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 24 }}>
                All your portfolios, goals, and preferences will be permanently deleted. This cannot be undone.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: 10, fontSize: 13, borderRadius: 9, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>Cancel</button>
                <button onClick={deleteAccount} disabled={deleting} style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 600, borderRadius: 9, border: "none", background: "var(--red)", color: "var(--bg)", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1 }}>
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FeedbackButton />
    </div>
  );
}
