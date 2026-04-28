"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
import { posthog } from "@/lib/posthog";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  LayoutDashboard, ShieldAlert, FlaskConical, Newspaper,
  MessageSquare, Eye, PanelLeftOpen,
  Sun, Moon, CandlestickChart, Sparkles, BookOpen,
  Calendar, CheckCircle2, ClipboardList,
} from "lucide-react";
import CommandPalette from "../../components/CommandPalette";
import InfoModal from "../../components/InfoModal";
import StockDetail from "../../components/StockDetail";
import { OverviewSkeleton } from "../../components/SkeletonLoader";
import { useSoundEffects, unlockAudio, SOUND_KEY } from "../../hooks/useSoundEffects";
import { usePWAInstall } from "../../hooks/usePWAInstall";
import PortfolioBuilder from "../../components/PortfolioBuilder";
import Metrics from "../../components/Metrics";
import PerformanceChart from "../../components/PerformanceChart";
import HealthScore from "../../components/HealthScore";
import AiInsights from "../../components/AiInsights";
import BenchmarkComparison from "../../components/BenchmarkComparison";
import Breakdown from "../../components/Breakdown";
import AiChat from "../../components/AiChat";
import SavedPortfolios from "../../components/SavedPortfolios";
import UserMenu from "../../components/UserMenu";
import SectorExposureChart from "../../components/SectorExposureChart";
import DividendTracker from "../../components/DividendTracker";
import TaxLossHarvester from "../../components/TaxLossHarvester";
import MonteCarloChart from "../../components/MonteCarloChart";
import NewsFeed from "../../components/NewsFeed";
import ExportPDF from "../../components/ExportPDF";
import GoalsModal from "../../components/GoalsModal";
import ProfileEditor from "../../components/ProfileEditor";
import OnboardingTour from "../../components/OnboardingTour";
import TourInviteModal from "../../components/TourInviteModal";
import { fetchPortfolio, fetchNaturalLanguageEdit, NLEditResult } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import AlertsPanel from "../../components/AlertsPanel";
import WhatIfDrawer from "../../components/WhatIfDrawer";
import Watchlist from "../../components/Watchlist";
import MarketBrief from "../../components/MarketBrief";
import EmailPreferences from "../../components/EmailPreferences";
import ReferralModal from "../../components/ReferralModal";
import SettingsPage from "../settings/page";
import GreetingBar from "../../components/GreetingBar";
import KeyboardShortcutsModal from "../../components/KeyboardShortcutsModal";
import PositionsTab from "../../components/PositionsTab";
import TransactionsTab from "../../components/TransactionsTab";
import RetirementSimulator from "../../components/RetirementSimulator";
import MobileBottomNav from "../../components/MobileBottomNav";
import DashboardTour from "../../components/DashboardTour";
import FeedbackButton from "../../components/FeedbackButton";
import { type SavedPortfolioLine } from "../../components/PerformanceChart";
import EarningsCalendar from "../../components/EarningsCalendar";
import EarningsImpactPreview from "../../components/EarningsImpactPreview";
import EventsCalendar from "../../components/EventsCalendar";
import PriceTargetTracker from "../../components/PriceTargetTracker";
import { InsiderActivitySummary } from "../../components/InsiderActivity";

const TABS = [
  { id: "overview",   label: "Dashboard",  Icon: LayoutDashboard,  href: null },
  { id: "positions",  label: "Positions",  Icon: CandlestickChart, href: null },
  { id: "stocks",     label: "Stocks",     Icon: CandlestickChart, href: null },
  { id: "risk",       label: "Income & Tax", Icon: ShieldAlert,      href: null },
  { id: "simulate",   label: "Simulations",Icon: FlaskConical,     href: null },
  { id: "news",       label: "News",       Icon: Newspaper,        href: null },
  { id: "watchlist",     label: "Watchlist",    Icon: Eye,           href: null },
  { id: "transactions",  label: "Transactions", Icon: ClipboardList, href: null },
  { id: "learn",         label: "Learn",        Icon: BookOpen,      href: "/learn" },
] as const;

const MOB_TAB_ICONS: Record<string, React.ReactNode> = {
  overview:  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  positions: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  stocks:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  risk:      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  simulate:  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  news:      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a4 4 0 01-4-4V6"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>,
  watchlist:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  transactions: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></svg>,
  learn:        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
};

const PERIODS = ["6mo", "1y", "2y", "5y"];
const PERIOD_LABELS: Record<string, string> = { "6mo": "6M", "1y": "1Y", "2y": "2Y", "5y": "5Y" };

const PRESETS = [
  { label: "Tech Heavy",  assets: [{ ticker: "AAPL", weight: 0.25 }, { ticker: "MSFT", weight: 0.25 }, { ticker: "NVDA", weight: 0.25 }, { ticker: "GOOGL", weight: 0.25 }] },
  { label: "Diversified", assets: [{ ticker: "SPY",  weight: 0.40 }, { ticker: "BND",  weight: 0.30 }, { ticker: "GLD",  weight: 0.15 }, { ticker: "VNQ",   weight: 0.15 }] },
  { label: "Crypto Mix",  assets: [{ ticker: "BTC",  weight: 0.60 }, { ticker: "ETH",  weight: 0.40 }] },
  { label: "Dividend",    assets: [{ ticker: "VIG",  weight: 0.35 }, { ticker: "SCHD", weight: 0.35 }, { ticker: "JNJ",  weight: 0.15 }, { ticker: "KO",    weight: 0.15 }] },
];

const BENCHMARKS = [
  { ticker: "^GSPC",  label: "S&P 500" },
  { ticker: "^IXIC",  label: "Nasdaq" },
  { ticker: "^DJI",   label: "Dow Jones" },
  { ticker: "^RUT",   label: "Russell 2K" },
  { ticker: "QQQ",    label: "QQQ ETF" },
  { ticker: "GLD",    label: "Gold" },
];

function BenchmarkDropdown({ localBenchmark, benchmarks, onSelect }: { localBenchmark: string; benchmarks: { ticker: string; label: string }[]; onSelect: (ticker: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ padding: "4px 10px", fontSize: 11, background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 5, cursor: "pointer", color: "var(--text2)", display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>vs</span>{benchmarks.find(b => b.ticker === localBenchmark)?.label ?? localBenchmark}<span style={{ fontSize: 11, color: "var(--text3)" }}>▾</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            // initial={false} is required — do not remove
            initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 10, overflow: "hidden", zIndex: 50, minWidth: 130, boxShadow: "var(--shadow)" }}>
            {benchmarks.map(b => (
              <button key={b.ticker} onClick={() => { onSelect(b.ticker); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "7px 12px", background: b.ticker === localBenchmark ? "var(--bg3)" : "transparent", border: "none", color: "var(--text)", fontSize: 11, cursor: "pointer" }}>
                {b.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Thin icon button helper
function IconBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", transition: "background 0.15s, color 0.15s", flexShrink: 0 }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}>
      {children}
    </button>
  );
}

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("corvo_theme");
    const isDark = stored ? stored === "dark" : false;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("corvo_theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

function useS() {
  return {
    app:        { display: "flex", height: "100vh", background: "var(--bg)", fontFamily: "var(--font-body)" } as React.CSSProperties,
    sidebarTop: { height: 52, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "0.5px solid var(--border)" },
    logo:       { fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "var(--text)" },
    logoSub:    { fontSize: 11, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const },
    section:    { padding: "10px 14px", borderBottom: "0.5px solid var(--border)" },
    label:      { fontSize: 9, letterSpacing: 3, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 8 },
    main:       { flex: 1, display: "flex", flexDirection: "column" as const, background: "var(--bg)", minWidth: 0, overflow: "hidden" },
    topbar:     { height: 52, flexShrink: 0, borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "var(--bg2)", gap: 8 },
    content:    { flex: 1, overflowY: "auto" as const, overflowX: "hidden" as const, padding: "20px 24px", overscrollBehavior: "none" as const, overscrollBehaviorY: "none" as const },
    card:       { border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 0 0 0.5px var(--border)" } as React.CSSProperties,
    cardHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
    cardAccent: { width: 3, height: 14, background: "var(--accent)", borderRadius: 1 },
    cardTitle:  { fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const },
    metricsGrid:{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 },
    bottomGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  };
}

function TooltipCardHeader({ title, sections }: { title: string; sections: { label: string; text: string }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <div style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 1 }} />
      <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>{title}</span>
      <InfoModal title={title} sections={sections} />
    </div>
  );
}

function DarkModeToggle({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <IconBtn onClick={toggle} title={dark ? "Light mode" : "Dark mode"}>
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </IconBtn>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 14 }}>
      <div style={{ width: 24, height: 24, border: "1.5px solid var(--border2)", borderTopColor: "var(--text)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ fontSize: 11, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Analyzing...</p>
    </div>
  );
}

function Empty() {
  const steps = [
    { n: "1", label: "Add a ticker", desc: "Search any stock, ETF, or crypto in the sidebar", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
    { n: "2", label: "Set your weight", desc: "Enter how much of your portfolio each holding represents", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-1m6 0l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-1m0-1v-1m0 1l-6 1" },
    { n: "3", label: "Hit Analyze", desc: "Get Sharpe ratio, Monte Carlo, drawdown, AI insights and more", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  ];
  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false}
      animate={{ opacity: 1 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 96px)", gap: 0, textAlign: "center", padding: "0 32px" }}>

      {/* Header */}
      <motion.div
        // initial={false} is required — do not remove
        initial={false} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(201,168,76,0.1)", border: "0.5px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, marginBottom: 10 }}>Build your portfolio</h2>
        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, maxWidth: 320 }}>
          Three steps to full risk analysis and AI insights.
        </p>
      </motion.div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 380, width: "100%", marginBottom: 48 }}>
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 0", borderBottom: i < steps.length - 1 ? "0.5px solid var(--border)" : "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, border: "0.5px solid rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{s.n}</span>
            </div>
            <div style={{ textAlign: "left", paddingTop: 2 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{s.label}</p>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>{s.desc}</p>
            </div>
            <div style={{ marginLeft: "auto", paddingTop: 6, flexShrink: 0, opacity: 0.25 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.icon} />
              </svg>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Presets hint */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: "0.5px solid var(--border)", background: "var(--bg2)" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        <p style={{ fontSize: 12, color: "var(--text3)" }}>
          Or click <span style={{ color: "var(--accent)", fontWeight: 600 }}>Presets</span> in the sidebar to load a sample portfolio instantly
        </p>
      </div>
    </motion.div>
  );
}

const ComparePlot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const CURRENCIES = ["USD", "GBP", "EUR", "JPY", "CAD"];
const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", JPY: "¥", CAD: "C$" };
const RATES_CACHE_KEY = "corvo_fx_rates";

function useCurrency() {
  const [currency, setCurrencyState] = useState("USD");
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const stored = localStorage.getItem("corvo_currency") || "USD";
    setCurrencyState(stored);
    fetchRate(stored);
  }, []);

  const fetchRate = async (cur: string) => {
    if (cur === "USD") { setRate(1); return; }
    try {
      const cacheRaw = sessionStorage.getItem(RATES_CACHE_KEY);
      if (cacheRaw) {
        const cache = JSON.parse(cacheRaw);
        if (Date.now() - cache.ts < 3600000 && cache.rates[cur]) {
          setRate(cache.rates[cur]);
          return;
        }
      }
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const data = await res.json();
      sessionStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: data.rates }));
      setRate(data.rates[cur] ?? 1);
    } catch {}
  };

  const setCurrency = (cur: string) => {
    setCurrencyState(cur);
    localStorage.setItem("corvo_currency", cur);
    fetchRate(cur);
  };

  return { currency, rate, setCurrency };
}

// ── Push notification prompt ───────────────────────────────────────────────────
const NOTIF_ASKED_KEY = "corvo_notif_asked";
const VAPID_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function NotificationPrompt({ onDismiss }: { onDismiss: () => void }) {
  const [loading, setLoading] = useState(false);

  const enable = async () => {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { localStorage.setItem(NOTIF_ASKED_KEY, "denied"); onDismiss(); return; }

      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js");

      // Get VAPID public key from backend
      const keyRes = await fetch(`${VAPID_API}/push/vapid-public-key`);
      if (!keyRes.ok) throw new Error("VAPID key unavailable");
      const { public_key } = await keyRes.json();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });

      // Get user id from supabase
      const { supabase } = await import("../../lib/supabase");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetch(`${VAPID_API}/push/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, subscription: sub.toJSON() }),
        });
      }
      localStorage.setItem(NOTIF_ASKED_KEY, "granted");
    } catch {
      // silently ignore, push subscription is non-critical
    }
    setLoading(false);
    onDismiss();
  };

  const dismiss = () => { localStorage.setItem(NOTIF_ASKED_KEY, "later"); onDismiss(); };

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 800, width: "min(380px, calc(100vw - 32px)", background: "var(--card-bg)", border: "0.5px solid rgba(184,134,11,0.3)", borderRadius: 14, padding: "16px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", display: "flex", gap: 14, alignItems: "flex-start" }}>
      <span style={{ flexShrink: 0, display: "flex", alignItems: "center", color: "var(--accent)", paddingTop: 2 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Enable price alerts</p>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.55, marginBottom: 12 }}>
          Get notified when your stocks move. Enable browser notifications to stay on top of your alerts.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={enable} disabled={loading}
            style={{ flex: 1, padding: "8px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--bg)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Enabling…" : "Enable"}
          </button>
          <button onClick={dismiss}
            style={{ padding: "8px 12px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text3)", cursor: "pointer" }}>
            Maybe later
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Portfolio Performance Trend ───────────────────────────────────────────────
type PerfSnapshot = { date: string; portfolio_value: number; cumulative_return: number };
const PERF_RANGES = ["1W", "1M", "3M", "ALL"] as const;
type PerfRange = typeof PERF_RANGES[number];

function PortfolioPerformanceTrend({
  history, range, setRange, loading, portfolioName,
}: {
  history: PerfSnapshot[];
  range: PerfRange;
  setRange: (r: PerfRange) => void;
  loading: boolean;
  portfolioName: string;
}) {
  const AMBER = "#b8860b";
  const filtered = (() => {
    if (range === "ALL") return history;
    const cutoff = new Date();
    if (range === "1W") cutoff.setDate(cutoff.getDate() - 7);
    else if (range === "1M") cutoff.setMonth(cutoff.getMonth() - 1);
    else if (range === "3M") cutoff.setMonth(cutoff.getMonth() - 3);
    return history.filter(s => new Date(s.date) >= cutoff);
  })();

  const hasChart = filtered.length >= 2;
  const hasOneSnapshot = history.length === 1;

  return (
    <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px var(--border)" }}>
      <style>{`@keyframes perfPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.45;transform:scale(0.75)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: hasChart ? 16 : 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: portfolioName ? 5 : 0 }}>
            <div style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 1, flexShrink: 0 }} />
            <Calendar size={11} style={{ color: "var(--text3)", flexShrink: 0 }} />
            <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Portfolio Performance</span>
            <div title="Updates every time you analyze" style={{ display: "flex", alignItems: "center", cursor: "default" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: AMBER, animation: "perfPulse 2s ease-in-out infinite" }} />
            </div>
          </div>
          {portfolioName && (
            <span style={{ fontSize: 11, color: "var(--text2)", marginLeft: 20, display: "block" }}>{portfolioName}</span>
          )}
        </div>
        {hasChart && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {PERF_RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                style={{ padding: "3px 9px", fontSize: 11, borderRadius: 5, border: `0.5px solid ${range === r ? AMBER : "var(--border)"}`, background: range === r ? `${AMBER}18` : "transparent", color: range === r ? AMBER : "var(--text3)", cursor: "pointer", transition: "all 0.15s" }}>
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 0" }}>
          <div style={{ height: 120, borderRadius: 6, background: "var(--bg3)", animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: 11, width: "40%", borderRadius: 4, background: "var(--bg3)", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 16px 16px" }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.3px", lineHeight: 1.3 }}>
            Building your history
          </p>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, maxWidth: 400, margin: "0 auto" }}>
            Today's snapshot is being captured automatically. Check back tomorrow to see your first trend.
          </p>
        </div>
      ) : hasOneSnapshot ? (
        <div style={{ padding: "16px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>Building your history</span>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>Day 1</span>
          </div>
          <div style={{ height: 3, background: "var(--bg3)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ width: "14%", height: "100%", background: AMBER, borderRadius: 2 }} />
          </div>
          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
            First snapshot saved. Trend chart appears tomorrow with a second data point. Snapshots are collected automatically each day.
          </p>
        </div>
      ) : (
        <>
          <ComparePlot
            data={[{
              type: "scatter",
              mode: "lines",
              x: filtered.map(s => s.date),
              y: filtered.map(s => +((s.cumulative_return) * 100).toFixed(3)),
              line: { color: AMBER, width: 2 },
              fill: "tozeroy",
              fillcolor: `${AMBER}14`,
              hovertemplate: "%{x}<br><b>%{y:.2f}%</b><extra></extra>",
            }]}
            layout={{
              height: 160,
              margin: { t: 4, r: 4, b: 32, l: 44 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              xaxis: { showgrid: false, zeroline: false, tickfont: { size: 9, color: "#8a8a8a" }, type: "date" },
              yaxis: { showgrid: true, gridcolor: "rgba(255,255,255,0.05)", zeroline: true, zerolinecolor: "rgba(255,255,255,0.12)", tickfont: { size: 9, color: "#8a8a8a" }, ticksuffix: "%" },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%" }}
            useResizeHandler
          />
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
            {filtered.length} data point{filtered.length !== 1 ? "s" : ""} · updated on each analysis
          </p>
        </>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer as ArrayBuffer;
}

// ── Stocks search mini-component (module-level so hooks are stable) ───────────

const TAPE_TICKERS = ["AAPL","MSFT","NVDA","GOOGL","AMZN","TSLA","META","SPY","QQQ","BTC-USD"];
const CARD_TICKERS = ["AAPL","MSFT","NVDA","GOOGL","AMZN","TSLA","META","SPY","BTC-USD"];
const TICKER_NAMES: Record<string,string> = {
  AAPL: "Apple Inc", MSFT: "Microsoft", NVDA: "NVIDIA", GOOGL: "Alphabet",
  AMZN: "Amazon", TSLA: "Tesla", META: "Meta", SPY: "S&P 500 ETF",
  QQQ: "NASDAQ 100 ETF", "BTC-USD": "Bitcoin",
};

const ORB_CONFIGS = [
  { w: 320, h: 320, top: "5%",  left: "-8%",  color: "rgba(184,134,11,0.04)", dur: 9 },
  { w: 260, h: 260, top: "60%", left: "85%",  color: "rgba(91,155,213,0.04)", dur: 11 },
  { w: 200, h: 200, top: "30%", left: "70%",  color: "rgba(184,134,11,0.03)", dur: 8 },
  { w: 400, h: 400, top: "70%", left: "10%",  color: "rgba(91,155,213,0.03)", dur: 12 },
  { w: 240, h: 240, top: "10%", left: "55%",  color: "rgba(184,134,11,0.04)", dur: 10 },
  { w: 180, h: 180, top: "45%", left: "35%",  color: "rgba(91,155,213,0.04)", dur: 13 },
];

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return <div className="mini-sparkline" style={{ width: 50, height: 22 }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 50, H = 22;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mini-sparkline" style={{ overflow: "hidden", flexShrink: 0, display: "block" }}>
      <polyline points={pts} fill="none" stroke={positive ? "#5cb88a" : "#e05c5c"} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

interface WatchlistStockData { ticker: string; name?: string; price: number | null; change: number | null; change_pct: number | null; sparkline: number[]; }

function StocksSearch({ onSelect }: { onSelect: (t: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ticker:string;name:string}[]>([]);
  const [busy, setBusy] = useState(false);
  const [liveData, setLiveData] = useState<Record<string, WatchlistStockData>>({});
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fetch live prices for cards, with localStorage cache (60s TTL)
  useEffect(() => {
    const CACHE_KEY = "corvo_live_market_cache";
    const TTL = 60000;
    const tickers = encodeURIComponent(CARD_TICKERS.join(","));
    const url = `${API}/watchlist-data?tickers=${tickers}`;

    const applyData = (results: WatchlistStockData[]) => {
      const map: Record<string, WatchlistStockData> = {};
      results.forEach(s => { if (s?.ticker) map[s.ticker] = s; });
      if (Object.keys(map).length > 0) setLiveData(map);
    };

    // Seed from cache immediately so cards render without waiting
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached?.data) applyData(cached.data);
      if (cached?.ts && Date.now() - cached.ts < TTL) return; // fresh — skip background fetch
    } catch {}

    const doFetch = () =>
      fetch(url)
        .then(r => r.json())
        .then(d => {
          const results: WatchlistStockData[] = d.results ?? [];
          if (results.length === 0) throw new Error("empty results");
          applyData(results);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: results, ts: Date.now() })); } catch {}
        });
    doFetch().catch(() => {
      setTimeout(() => doFetch().catch(() => {}), 1000);
    });
  }, [API]);

  useEffect(() => {
    if (!q) { setResults([]); return; }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`${API}/search-ticker?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        setResults((d.results || []).slice(0, 8));
      } catch {} finally { setBusy(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const fmtPrice = (p: number | null) => p == null ? "-" : p >= 1000 ? `$${p.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : `$${p.toFixed(2)}`;
  const fmtPct   = (p: number | null) => p == null ? "" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;

  return (
    <div className="stocks-outer" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 120px)", padding: "0 24px", overflowX: "hidden", width: "100%" }}>
    <div style={{ width: "100%", maxWidth: 760, position: "relative" }}>
      <style>{`
        @keyframes orb-float { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-18px) } }
        @media(max-width:768px){
          .stocks-outer{padding:0 12px!important}
          .stocks-grid{grid-template-columns:repeat(3,1fr)!important;overflow-x:hidden!important}
          .stocks-card{overflow:hidden!important;min-width:0!important}
          .mini-sparkline{width:36px!important;height:18px!important;max-width:36px!important}
        }
      `}</style>

      {/* Ambient orbs */}
      {ORB_CONFIGS.map((o, i) => (
        <div key={i} style={{
          position: "absolute", pointerEvents: "none", zIndex: 0,
          width: o.w, height: o.h, top: o.top, left: o.left,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
          animation: `orb-float ${o.dur}s ease-in-out infinite`,
          animationDelay: `${i * 1.3}s`,
        }} />
      ))}

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 12, zIndex: 1 }}>
        <p style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 10 }}>Stock Lookup</p>
        <input
          className="accent-input"
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search any ticker or company…"
          style={{ width: "100%", padding: "10px 14px", fontSize: 14, border: "0.5px solid var(--border2)", borderRadius: 10, background: "var(--input-bg)", color: "var(--text)", outline: "none" }}
        />
        {busy && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, border: "1.5px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
      </div>

      {/* Search results */}
      {results.length > 0 ? (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden", position: "relative", zIndex: 1 }}>
          {results.map((r: any) => (
            <div key={r.ticker} onClick={() => onSelect(r.ticker)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer", borderBottom: "0.5px solid var(--border)", transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div>
                <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{r.ticker}</span>
                <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 10 }}>{r.name}</span>
              </div>
            </div>
          ))}
        </div>
      ) : !q ? (
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Animated stat cards grid */}
          <div>
            <p style={{ fontSize: 9, letterSpacing: 1.8, color: "var(--text3)", textTransform: "uppercase", marginBottom: 10 }}>Live Market</p>
            <div className="stocks-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {CARD_TICKERS.map((ticker, i) => {
                const s = liveData[ticker];
                const pos = (s?.change_pct ?? 0) >= 0;
                return (
                  <motion.div
                    key={ticker}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                    onClick={() => onSelect(ticker)}
                    className="stocks-card"
                    style={{ padding: "10px 12px", borderRadius: 10, border: "0.5px solid var(--border)", background: "var(--bg2)", cursor: "pointer", transition: "border-color 0.15s, background 0.15s", overflow: "hidden", minWidth: 0 }}
                    whileHover={{ scale: 1.02 }}
                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg3)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(184,134,11,0.4)"; }}
                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg2)"; (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{ticker}</div>
                        <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 1, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{TICKER_NAMES[ticker] ?? ticker}</div>
                      </div>
                      <MiniSparkline data={s?.sparkline ?? []} positive={pos} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{fmtPrice(s?.price ?? null)}</span>
                      {s?.change_pct != null && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: pos ? "#5cb88a" : "#e05c5c" }}>{fmtPct(s.change_pct)}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
}

interface TopbarActionsProps {
  dark: boolean;
  toggleDark: () => void;
  alertCount: number;
  avatarUrl: string | null | undefined;
  displayName: string;
  data: any;
  assets: any[];
  exportCSV: () => void;
  setShowAlerts: (v: boolean) => void;
  setShowEmailPrefs: (v: boolean) => void;
  setShowReferral: (v: boolean) => void;
  setShowSettings: (v: boolean) => void;
  setShowProfile: (v: boolean) => void;
  setShowDashboardTour: (v: boolean) => void;
}

const TopbarActions = memo(function TopbarActions({
  dark, toggleDark, alertCount, avatarUrl, displayName,
  data, assets, exportCSV,
  setShowAlerts, setShowEmailPrefs, setShowReferral, setShowSettings,
  setShowProfile, setShowDashboardTour,
}: TopbarActionsProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [aiToast, setAiToast] = useState(false);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Alerts bell */}
        <button id="tour-desk-bell" onClick={() => setShowAlerts(true)} title="Alerts" aria-label="Price alerts"
          style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0, transition: "background 0.15s", color: "var(--text2)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {alertCount > 0 && (
            <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", border: "1.5px solid var(--bg3)" }} />
          )}
        </button>

        {/* Dark mode */}
        <div id="tour-dark-mode-toggle">
          <button onClick={toggleDark} title={dark ? "Light mode" : "Dark mode"}
            style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s", color: "var(--text2)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}>
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        {/* Export dropdown */}
        <div id="tour-desk-export" style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setOverflowOpen(o => !o)}
            title="Export"
            style={{ height: 32, padding: "0 12px", borderRadius: 8, border: "0.5px solid var(--border)", background: overflowOpen ? "var(--bg3)" : "transparent", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-mono)", color: overflowOpen ? "var(--accent)" : "var(--text3)", display: "flex", alignItems: "center", gap: 5, letterSpacing: 0.5, transition: "all 0.15s", whiteSpace: "nowrap" }}
            onMouseEnter={e => { if (!overflowOpen) { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}}
            onMouseLeave={e => { if (!overflowOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}}>
            Export ↓
          </button>
          {overflowOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setOverflowOpen(false)} />
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 10, overflow: "hidden", zIndex: 100, minWidth: 160, boxShadow: "var(--shadow-md)" }}>
                <ExportPDF data={data} assets={assets} menuItem onClose={() => setOverflowOpen(false)} onAiGenerationStart={() => setAiToast(true)} onAiGenerationEnd={() => setAiToast(false)} />
                {data && (
                  <button onClick={() => { exportCSV(); setOverflowOpen(false); }}
                    style={{ width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 12, color: "var(--text)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    ↓ Download CSV
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div id="tour-profile-btn" style={{ display: "flex", alignItems: "center" }}>
          <UserMenu
            onEmailPrefs={() => setShowEmailPrefs(true)}
            onReferral={() => setShowReferral(true)}
            onSettings={() => setShowSettings(true)}
            onProfile={() => setShowProfile(true)}
            onReplayOnboarding={() => { window.location.href = "/onboarding?replay=true"; }}
            onReplayTour={() => {
              localStorage.removeItem("corvo_tour_completed");
              setShowSettings(false);
              setShowDashboardTour(true);
            }}
            avatarUrl={avatarUrl}
            displayName={displayName}
          />
        </div>
      </div>

      {/* AI Report generation toast */}
      {aiToast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "var(--card-bg)", border: "0.5px solid rgba(201,168,76,0.4)", borderRadius: 10, padding: "11px 18px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.4)", pointerEvents: "none" }}>
          <div style={{ width: 12, height: 12, border: "1.5px solid rgba(201,168,76,0.3)", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>Generating your AI report... this may take a minute.</span>
        </div>
      )}
    </>
  );
});

// Returns 3-4 contextual NL command suggestions based on current portfolio composition.
// Defined at module level so it can be called inside SidebarInner without capturing stale closures.
function getNLSuggestions(assets: { ticker: string; weight: number }[]): string[] {
  if (assets.length === 0) return [];
  const total = assets.reduce((s, a) => s + a.weight, 0) || 1;
  const byPct = assets.map(a => ({ ticker: a.ticker.toUpperCase(), pct: (a.weight / total) * 100 })).filter(a => a.ticker);
  const suggestions: string[] = [];

  const largest = byPct.reduce((m, a) => (a.pct > m.pct ? a : m), byPct[0]);
  if (largest && largest.pct > 24) suggestions.push(`Reduce ${largest.ticker} by half`);

  const TECH = new Set(["NVDA","AAPL","MSFT","GOOGL","GOOG","META","AMZN","TSLA","AMD","AVGO","INTC","QQQ","XLK","SMH","SOXX"]);
  const techPct = byPct.filter(a => TECH.has(a.ticker)).reduce((s, a) => s + a.pct, 0);
  if (techPct > 35) suggestions.push("Reduce tech exposure");

  if (byPct.length > 1) suggestions.push("Rebalance to equal weight");

  const INTL = new Set(["VEU","VXUS","EFA","EEM","VWO","IEFA","IXUS","SCHF"]);
  if (!byPct.some(a => INTL.has(a.ticker))) suggestions.push("Add international exposure");

  const BONDS = new Set(["BND","AGG","TLT","IEF","SHY","LQD","VBTLX","SGOV","BIL"]);
  if (!byPct.some(a => BONDS.has(a.ticker))) suggestions.push("Make it more conservative");

  return suggestions.slice(0, 4);
}

// Card and CardHeader are module-level so React never remounts their children
// when the parent page re-renders (e.g. on scroll triggering showBackToTop).
// Defining these inside AppPage created a new function reference every render,
// causing React to unmount/remount children like MonteCarloChart and re-fire simulations.
const _CARD_BASE: React.CSSProperties = {
  border: "0.5px solid var(--border)",
  borderRadius: 12,
  padding: "18px 20px",
  background: "var(--card-bg)",
  marginBottom: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 0 0 0.5px var(--border)",
};
const Card = memo(function Card({ children, style = {} }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  const [hov, setHov] = useState(false);
  const cardStyle: React.CSSProperties = {
    ..._CARD_BASE,
    ...style,
    borderLeft: hov ? "2px solid rgba(184,134,11,0.5)" : "0.5px solid var(--border)",
    transition: "border-left 0.15s, box-shadow 0.15s",
    boxShadow: hov ? "0 4px 16px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.12), 0 0 0 0.5px var(--border)",
  };
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={cardStyle}>
      {children}
    </div>
  );
});
const CardHeader = function CardHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <div style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 1 }} />
      <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>{title}</span>
    </div>
  );
};

export default function AppPage() {
  const [assets, setAssets]               = useState<{ ticker: string; weight: number; purchasePrice?: number }[]>([]);
  const [portfolioStale, setPortfolioStale] = useState(false);
  const lastAnalyzedAssetsRef             = useRef<string>("");
  const [period, setPeriod]               = useState("1y");
  const [benchmark, setBenchmark]         = useState("^GSPC");
  const [data, setData]                   = useState<any>(null);
  const [loading, setLoading]             = useState(false);
  const [analyzeComplete, setAnalyzeComplete] = useState(false);
  const [activeTab, setActiveTab]         = useState("overview");
  const [goals, setGoals]                 = useState<any>(null);
  const [showGoals, setShowGoals]         = useState(false);
  const [showTour, setShowTour]           = useState(false);
  const [showSetupBanner, setShowSetupBanner] = useState(false);
  const [showProfile, setShowProfile]     = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [benchOpen, setBenchOpen]         = useState(false);
  const [localBenchmark, setLocalBenchmark] = useState("^GSPC");
  const [localBenchmarkSeries, setLocalBenchmarkSeries] = useState<{ ticker: string; cumulative: number[] } | null>(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
const [paletteOpen, setPaletteOpen]   = useState(false);
  const [stockTicker, setStockTicker]   = useState<string | null>(null);
  const sound = useSoundEffects();
  const [showAlerts, setShowAlerts]         = useState(false);
  const [showEmailPrefs, setShowEmailPrefs]     = useState(false);
  const [unsubscribeMode, setUnsubscribeMode]   = useState(false);
  const [showReferral, setShowReferral]         = useState(false);
  const [errorMsg, setErrorMsg]                 = useState<string | null>(null);
  const [skippedTickers, setSkippedTickers]     = useState<string[]>([]);
  const errorDismissRef                         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tourNeededRef                           = useRef<boolean>(false);
  const [alertCount, setAlertCount]   = useState(0);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);
  const [wsidOpen, setWsidOpen] = useState(false);
  const [wsidLoading, setWsidLoading] = useState(false);
  const [wsidResult, setWsidResult] = useState<string | null>(null);
  const [wsidError, setWsidError] = useState<string | null>(null);
  const [nlCommand, setNlCommand] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [nlPending, setNlPending] = useState<NLEditResult | null>(null);
  const [newsSubTab, setNewsSubTab] = useState<"news" | "earnings" | "events">("news");
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showDashboardTour, setShowDashboardTour] = useState(false);
  const [showTourInvite, setShowTourInvite] = useState(false);
  const [savedPortfolioLines, setSavedPortfolioLines] = useState<SavedPortfolioLine[]>([]);
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);
  const [userId, setUserId]         = useState<string | null>(null);
  const [navProfile, setNavProfile] = useState<{ displayName: string; avatarUrl: string | null | undefined }>({ displayName: "", avatarUrl: undefined });
  const referralCodeRef             = useRef<string>("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const [portfolioInputValue, setPortfolioInputValue] = useState<number>(() => {
    if (typeof window === "undefined") return 10000;
    const stored = localStorage.getItem("corvo_portfolio_value");
    return stored ? Number(stored) : 10000;
  });
  // Sync portfolioInputValue from localStorage: fire on mount + cross-tab storage events
  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem("corvo_portfolio_value");
      if (stored) setPortfolioInputValue(Number(stored));
    };
    handler(); // read immediately on mount to catch any value set before this effect ran
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  // Short-lived polling fallback: catches same-tab writes that don't fire storage events
  useEffect(() => {
    const end = Date.now() + 5000;
    const id = setInterval(() => {
      const stored = localStorage.getItem("corvo_portfolio_value");
      if (stored) setPortfolioInputValue(Number(stored));
      if (Date.now() >= end) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([]);
  const [savedPortfolioId, setSavedPortfolioId] = useState<string | null>(null);
  const [savedPortfolioName, setSavedPortfolioName] = useState<string>("");
  const [perfHistory, setPerfHistory] = useState<PerfSnapshot[]>([]);
  const [perfRange, setPerfRange] = useState<PerfRange>("ALL");
  const [perfLoading, setPerfLoading] = useState(false);
  const autoSnapshotAttemptedRef = useRef<string | null>(null);
  const hadLocalRestoreRef = useRef(false);
  const [initializing, setInitializing] = useState(true);
  const [hasSavedPortfolios, setHasSavedPortfolios] = useState(false);
  const contentRef = useRef<HTMLElement | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { dark, toggle: toggleDark }  = useTheme();
  const { currency, rate, setCurrency } = useCurrency();
  const { canInstall, install: installPWA } = usePWAInstall();
  const S = useS();

  // Warn before tab close/refresh if unsaved assets exist
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (assets.length > 0 && !savedPortfolioId) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [assets, savedPortfolioId]);

  useEffect(() => {
    const g = localStorage.getItem("corvo_goals");
    if (g && g !== "skipped") { try { setGoals(JSON.parse(g)); } catch {} }
    // showGoals is controlled by the onboarding Supabase check below, not localStorage

    // Load alert count
    try {
      const raw = localStorage.getItem("corvo_alerts");
      if (raw) setAlertCount(JSON.parse(raw).length);
    } catch {}

    // Load portfolio assets carried over from /onboarding
    try {
      const obAssets = localStorage.getItem("corvo_onboarding_assets");
      if (obAssets) {
        const parsed = JSON.parse(obAssets);
        if (Array.isArray(parsed) && parsed.length > 0) { setAssets(parsed); hadLocalRestoreRef.current = true; }
        localStorage.removeItem("corvo_onboarding_assets");
      }
    } catch {}

    // Show TourInviteModal when arriving fresh from /onboarding
    if (localStorage.getItem("corvo_just_onboarded") === "true") {
      localStorage.removeItem("corvo_just_onboarded");
      if (localStorage.getItem("corvo_tour_offered") !== "true") {
        setShowTourInvite(true);
      }
    }

    // Restore portfolio state saved before navigating to Learn
    try {
      const savedAssets = localStorage.getItem("corvo_saved_assets");
      const savedData = localStorage.getItem("corvo_saved_data");
      if (savedAssets) {
        const parsed = JSON.parse(savedAssets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssets(parsed);
          hadLocalRestoreRef.current = true;
          localStorage.removeItem("corvo_saved_assets");
        }
      }
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed && typeof parsed === "object" && "portfolio_return" in parsed) {
            setData(parsed);
          }
        } catch {}
        localStorage.removeItem("corvo_saved_data");
      }
    } catch {}

    const params = new URLSearchParams(window.location.search);

    // Capture referral code from ?ref= and persist it for the first portfolio analysis
    const refCode = params.get("ref") || localStorage.getItem("corvo_pending_referral") || "";
    if (refCode) {
      referralCodeRef.current = refCode;
      localStorage.setItem("corvo_pending_referral", refCode);
    }

    // Portfolio sharing via base64 URL param
    const portfolioParam = params.get("portfolio");
    if (portfolioParam) {
      try {
        const decoded = JSON.parse(atob(portfolioParam));
        if (Array.isArray(decoded) && decoded.length > 0) {
          setAssets(decoded);
          setShowGoals(false);
        }
      } catch {}
    }

    // Unsubscribe from digest via email link
    if (params.get("unsubscribe") === "true") {
      setUnsubscribeMode(true);
      setShowEmailPrefs(true);
    }

    // Demo mode
    if (params.get("demo") === "true") {
      posthog.capture("demo_mode_started");
      const demoAssets = [
        { ticker: "SPY", weight: 0.40 },
        { ticker: "QQQ", weight: 0.30 },
        { ticker: "GLD", weight: 0.15 },
        { ticker: "BND", weight: 0.15 },
      ];
      setAssets(demoAssets);
      setShowGoals(false);
      setLoading(true);
      setData(null);
      fetchPortfolio(demoAssets, "1y", "^GSPC")
        .then((result: any) => { setData(result); setActiveTab("overview"); })
        .catch(() => { setErrorMsg("Demo failed to load. Please try again."); })
        .finally(() => setLoading(false));
    }

    // Load nav profile and (on first visit per session) redirect to /onboarding if not yet complete
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setInitializing(false); return; }
      setUserId(user.id);

      // Always load nav profile (avatar + display name)
      const { data: navP } = await supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).single();
      const bestName =
        navP?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "";
      setNavProfile({ displayName: bestName, avatarUrl: navP?.avatar_url || null });

      // ── Auto-load most recent saved portfolio for returning users ──────────────
      // Runs on every mount so that navigating back to the dashboard always
      // restores the portfolio — no sessionStorage gate that would break re-entry.
      console.log("[auto-load] hadLocalRestoreRef:", hadLocalRestoreRef.current);
      if (!hadLocalRestoreRef.current) {
        const urlParams = new URLSearchParams(window.location.search);
        const hasUrlOverride = !!urlParams.get("portfolio") || urlParams.get("demo") === "true";
        console.log("[auto-load] hasUrlOverride:", hasUrlOverride);
        if (!hasUrlOverride) {
          try {
            console.log("[auto-load] querying Supabase portfolios for user:", user.id);
            // Note: do NOT select 'period' — that column does not exist in the table.
            // Order by updated_at; fall back to created_at if updated_at is absent.
            let portfolioRow: any = null;
            const { data: byUpdated, error: updErr } = await supabase
              .from("portfolios")
              .select("id, name, tickers, weights, updated_at")
              .eq("user_id", user.id)
              .order("updated_at", { ascending: false })
              .limit(1);
            console.log("[auto-load] updated_at query result:", { byUpdated, updErr });
            if (!updErr && byUpdated?.[0]) {
              portfolioRow = byUpdated[0];
            } else {
              console.warn("[auto-load] updated_at sort failed, trying created_at:", updErr?.message);
              const { data: byCreated, error: creErr } = await supabase
                .from("portfolios")
                .select("id, name, tickers, weights")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1);
              console.log("[auto-load] created_at query result:", { byCreated, creErr });
              if (!creErr && byCreated?.[0]) portfolioRow = byCreated[0];
            }
            const latest = portfolioRow;
            console.log("[auto-load] latest portfolio row:", latest);
            setHasSavedPortfolios(!!latest);
            if (latest) {
              const tickers: string[] = latest.tickers ?? [];
              const weights: number[] = latest.weights ?? [];
              console.log("[auto-load] tickers:", tickers, "weights:", weights);
              const autoAssets = tickers
                .map((t: string, i: number) => ({ ticker: t, weight: weights[i] ?? 0 }))
                .filter((a: any) => a.ticker && a.weight > 0);
              console.log("[auto-load] autoAssets:", autoAssets);
              if (autoAssets.length > 0) {
                const prd = "1y";
                setPeriod(prd);
                setAssets(autoAssets);
                setSavedPortfolioId(latest.id);
                setSavedPortfolioName(latest.name || "");
                setLoading(true);
                console.log("[auto-load] calling fetchPortfolio...");
                try {
                  const result = await fetchPortfolio(autoAssets, prd, "^GSPC", user.id, "");
                  console.log("[auto-load] fetchPortfolio result:", result ? { keys: Object.keys(result), error: result.error } : result);
                  if (result && !result.error) {
                    setData(result);
                    setActiveTab("overview");
                    setPortfolioStale(false);
                    lastAnalyzedAssetsRef.current = autoAssets
                      .map((a: any) => `${a.ticker}:${a.weight.toFixed(4)}`)
                      .sort().join(",") + `|${prd}|^GSPC`;
                    if (result.skipped_tickers?.length) setSkippedTickers(result.skipped_tickers);
                    console.log("[auto-load] data set successfully");
                  } else {
                    console.warn("[auto-load] fetchPortfolio returned error or empty:", result);
                  }
                } catch (fetchErr) {
                  console.error("[auto-load] fetchPortfolio threw:", fetchErr);
                }
                setLoading(false);
              } else {
                console.warn("[auto-load] autoAssets empty after filter — tickers/weights mismatch?");
              }
            } else {
              console.log("[auto-load] no saved portfolio found for this user");
            }
          } catch (outerErr) {
            console.error("[auto-load] outer error:", outerErr);
          }
        }
      }
      setInitializing(false);
      // ── END auto-load ─────────────────────────────────────────────────────────

      // Only run the onboarding check once per browser session (not on every navigation to /app).
      if (sessionStorage.getItem("corvo_session_checked") === "true") return;
      sessionStorage.setItem("corvo_session_checked", "true");

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      // Consider onboarding done if either source confirms it
      const alreadyDone = profile?.onboarding_completed === true || user.user_metadata?.onboarding_complete === true;
      if (alreadyDone) return;

      // Safety: if the user already has saved portfolios they have used the
      // app before — never redirect them to onboarding regardless of flags.
      const { count: portfolioCount } = await supabase
        .from("portfolios")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (portfolioCount && portfolioCount > 0) return;

      // Redirect to /onboarding unless viewing a shared portfolio or demo
      const params2 = new URLSearchParams(window.location.search);
      if (!params2.get("portfolio") && params2.get("demo") !== "true") {
        window.location.replace("/onboarding");
      }
    })();
  }, []);

  const handleAnalyze = async () => {
    const valid = assets.filter(a => a.ticker && a.weight > 0);
    if (!valid.length) return;
    setLoading(true); setData(null); setErrorMsg(null); setSkippedTickers([]); setAnalyzeComplete(false);
    setWsidResult(null); setWsidOpen(false);
    if (errorDismissRef.current) clearTimeout(errorDismissRef.current);
    try {
      const pendingRef = referralCodeRef.current;
      const result = await fetchPortfolio(valid, period, benchmark, userId || "", pendingRef);
      // Handle backend error responses (e.g. no price data for all tickers)
      if (result.error) {
        setErrorMsg(result.error);
        errorDismissRef.current = setTimeout(() => setErrorMsg(null), 10000);
        setLoading(false);
        return;
      }
      // Clear pending referral after first successful analysis
      if (pendingRef) {
        referralCodeRef.current = "";
        localStorage.removeItem("corvo_pending_referral");
      }
      if (result.skipped_tickers?.length) setSkippedTickers(result.skipped_tickers);
      setData(result);
      setActiveTab("overview");
      setAnalyzeComplete(true);
      // Record the portfolio state that produced these results so we can detect drift
      lastAnalyzedAssetsRef.current = valid
        .map(a => `${a.ticker}:${a.weight.toFixed(4)}`)
        .sort().join(",") + `|${period}|${benchmark}`;
      setPortfolioStale(false);
      sound.success();
      posthog.capture("portfolio_analyzed", { ticker_count: valid.length, tickers: valid.map(a => a.ticker) });
      setTimeout(() => setAnalyzeComplete(false), 600);
      // Fire-and-forget: snapshot for saved portfolios (logged-in users only)
      if (userId) {
        const currentTickers = valid.map(a => a.ticker).sort().join(",");
        (async () => {
          try {
            const { data: pfs } = await supabase.from("portfolios").select("id,name,tickers").eq("user_id", userId);
            const match = pfs?.find((p: any) =>
              ((p.tickers as string[]) || []).slice().sort().join(",") === currentTickers
            );
            if (match) {
              setSavedPortfolioId(match.id);
              setSavedPortfolioName(match.name || "");
              const API_SNAP = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
              fetch(`${API_SNAP}/portfolio/snapshot`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: userId,
                  portfolio_id: match.id,
                  tickers: valid.map(a => a.ticker).join(","),
                  weights: valid.map(a => a.weight).join(","),
                }),
              }).catch(() => {});
            } else {
              setSavedPortfolioId(null);
            }
          } catch { setSavedPortfolioId(null); }
        })();
      }
    } catch {
      setErrorMsg("Analysis failed. Server may be temporarily unavailable.");
      errorDismissRef.current = setTimeout(() => setErrorMsg(null), 10000);
    }
    setLoading(false);
  };

  const handleAnalyzeRef = useRef(handleAnalyze);
  useEffect(() => { handleAnalyzeRef.current = handleAnalyze; });

  const handleWhatShouldIDo = async () => {
    if (wsidOpen && wsidResult) { setWsidOpen(false); return; }
    setWsidOpen(true);
    if (wsidResult) return;
    setWsidLoading(true);
    setWsidError(null);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const valid = assets.filter(a => a.ticker && a.weight > 0);
      const total = valid.reduce((s, a) => s + a.weight, 0) || 1;
      const body = {
        tickers: valid.map(a => a.ticker),
        weights: valid.map(a => a.weight / total),
        portfolio_return: data?.portfolio_return ?? 0,
        portfolio_volatility: data?.portfolio_volatility ?? 0,
        sharpe_ratio: data?.sharpe_ratio ?? 0,
        max_drawdown: data?.max_drawdown ?? 0,
        period,
        portfolio_value: portfolioInputValue || null,
        health_score: data?.health_score ?? null,
        user_goals: goals || {},
        user_id: userId || "",
      };
      const res = await fetch(`${API}/what-should-i-do`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setWsidResult(json.recommendations);
    } catch (e: any) {
      setWsidError("Could not load recommendations. Try again.");
    } finally {
      setWsidLoading(false);
    }
  };

  // Sync localBenchmark when data arrives from a new analysis
  useEffect(() => {
    if (data?.benchmark_ticker) {
      setLocalBenchmark(data.benchmark_ticker);
      setLocalBenchmarkSeries(null);
    }
  }, [data]);

  // Fetch override benchmark series when user changes chart benchmark without re-analyzing
  useEffect(() => {
    if (!data || !assets.length || localBenchmark === (data.benchmark_ticker ?? "^GSPC")) {
      setLocalBenchmarkSeries(null);
      return;
    }
    const valid = assets.filter(a => a.ticker && a.weight > 0);
    fetchPortfolio(valid, period, localBenchmark, "", "").then(res => {
      setLocalBenchmarkSeries({ ticker: localBenchmark, cumulative: res.benchmark_cumulative || res.benchmark || [] });
    }).catch(() => {});
  }, [localBenchmark]);

  // Mark results stale whenever the portfolio, period, or benchmark changes after a successful analysis
  useEffect(() => {
    if (!data) return;
    const key = assets
      .filter(a => a.ticker && a.weight > 0)
      .map(a => `${a.ticker}:${a.weight.toFixed(4)}`)
      .sort().join(",") + `|${period}|${benchmark}`;
    if (lastAnalyzedAssetsRef.current && key !== lastAnalyzedAssetsRef.current) {
      setPortfolioStale(true);
    }
  }, [assets, data, period, benchmark]);

  // ── Detect saved portfolio from assets (pre-analysis) ───────────────────────
  useEffect(() => {
    if (!assets.length) { setSavedPortfolioId(null); setSavedPortfolioName(""); return; }
    const currentTickers = assets.map(a => a.ticker).filter(Boolean).sort().join(",");
    if (!currentTickers) return;

    // Check localStorage first (works for logged-out users too)
    try {
      const saved: any[] = JSON.parse(localStorage.getItem("corvo_saved_portfolios") || "[]");
      const match = saved.find(p => {
        const t = (p.tickers || (p.assets || []).map((a: any) => a.ticker)).slice().sort().join(",");
        return t === currentTickers;
      });
      if (match) { setSavedPortfolioId(match.id); setSavedPortfolioName(match.name || ""); return; }
    } catch {}

    // Supabase fallback for logged-in users
    if (!userId) { setSavedPortfolioId(null); setSavedPortfolioName(""); return; }
    (async () => {
      try {
        const { data: pfs } = await supabase.from("portfolios").select("id,name,tickers").eq("user_id", userId);
        const match = pfs?.find((p: any) =>
          ((p.tickers as string[]) || []).slice().sort().join(",") === currentTickers
        );
        if (match) { setSavedPortfolioId(match.id); setSavedPortfolioName(match.name || ""); }
        else { setSavedPortfolioId(null); setSavedPortfolioName(""); }
      } catch { setSavedPortfolioId(null); setSavedPortfolioName(""); }
    })();
  }, [assets, userId]);

  // ── Load portfolio performance history when savedPortfolioId is known ────────
  useEffect(() => {
    if (!savedPortfolioId || !userId) { setPerfHistory([]); return; }
    setPerfLoading(true);
    const API_H = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${API_H}/portfolio/history?portfolio_id=${savedPortfolioId}&user_id=${userId}`)
      .then(r => r.json())
      .then(d => setPerfHistory(d.snapshots || []))
      .catch(() => setPerfHistory([]))
      .finally(() => setPerfLoading(false));
  }, [savedPortfolioId, userId]);

  // ── Auto-snapshot on dashboard load (once per portfolio per session) ──────────
  useEffect(() => {
    if (!savedPortfolioId || !userId || perfLoading) return;
    if (autoSnapshotAttemptedRef.current === savedPortfolioId) return;
    const today = new Date().toISOString().slice(0, 10);
    const hasToday = perfHistory.some(s => s.date?.slice(0, 10) === today);
    autoSnapshotAttemptedRef.current = savedPortfolioId;
    if (hasToday) return;
    const valid = assets.filter(a => a.ticker && a.weight > 0);
    if (!valid.length) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/portfolio/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        portfolio_id: savedPortfolioId,
        tickers: valid.map(a => a.ticker).join(","),
        weights: valid.map(a => a.weight).join(","),
      }),
    }).then(r => {
      if (r.ok) {
        fetch(`${apiUrl}/portfolio/history?portfolio_id=${savedPortfolioId}&user_id=${userId}`)
          .then(r => r.json())
          .then(d => setPerfHistory(d.snapshots || []))
          .catch(() => {});
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPortfolioId, userId, perfLoading]);

  // ── Background snapshot for ALL saved portfolios once per session ───────────
  const allSnapshotFiredRef = useRef(false);
  useEffect(() => {
    if (!userId || allSnapshotFiredRef.current) return;
    allSnapshotFiredRef.current = true;
    const today = new Date().toISOString().slice(0, 10);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    (async () => {
      try {
        const savedRaw = localStorage.getItem("corvo_saved_portfolios");
        const localPfs: any[] = savedRaw ? JSON.parse(savedRaw) : [];
        const { data: dbPfs } = await supabase.from("portfolios").select("id,tickers,name").eq("user_id", userId);
        const allPfs = [...(dbPfs || []).map((p: any) => ({ id: p.id, assets: p.assets || [] })), ...localPfs.map((p: any) => ({ id: p.id, assets: p.assets || [] }))];
        const uniqueIds = new Set<string>();
        for (const pf of allPfs) {
          if (!pf.id || uniqueIds.has(pf.id) || !pf.assets?.length) continue;
          uniqueIds.add(pf.id);
          const { data: hist } = await supabase.from("portfolio_snapshots").select("date").eq("portfolio_id", pf.id).gte("date", today).limit(1);
          if (hist && hist.length > 0) continue;
          const valid = pf.assets.filter((a: any) => a.ticker && a.weight > 0);
          if (!valid.length) continue;
          fetch(`${apiUrl}/portfolio/snapshot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, portfolio_id: pf.id, tickers: valid.map((a: any) => a.ticker).join(","), weights: valid.map((a: any) => a.weight).join(",") }),
          }).catch(() => {});
        }
      } catch {}
    })();
  }, [userId]);

  // ── Load saved portfolio overlay lines when analysis completes ────────────────
  useEffect(() => {
    if (!data) return;
    const SAVED_PALETTE = ["#5cb88a", "#5b9cf6", "#e05c5c", "#a78bfa", "#fb923c", "#38bdf8"];
    try {
      const raw = localStorage.getItem("corvo_saved_portfolios");
      const saved: any[] = raw ? JSON.parse(raw) : [];
      if (!saved.length) return;
      const currentKey = assets.map(a => a.ticker).sort().join(",");
      const others = saved.filter(p => {
        const t = ((p.assets || []) as any[]).map((a: any) => a.ticker).sort().join(",");
        return t && t !== currentKey;
      }).slice(0, 6);
      if (!others.length) return;
      // Fetch portfolio data for each saved portfolio in parallel (silent errors)
      const fetchLine = async (p: any, color: string): Promise<SavedPortfolioLine | null> => {
        try {
          const { fetchPortfolio: fp } = await import("../../lib/api");
          const pAssets = (p.assets || []).filter((a: any) => a.ticker && a.weight > 0);
          if (!pAssets.length) return null;
          const res: any = await fp(pAssets, period, benchmark);
          const dates: string[] = res.dates || [];
          const cumulative: number[] = res.portfolio_cumulative || res.growth || [];
          if (!dates.length || !cumulative.length) return null;
          return { id: p.id || p.name, name: p.name || "Saved", color, dates, cumulative, visible: false };
        } catch { return null; }
      };
      Promise.all(others.map((p, i) => fetchLine(p, SAVED_PALETTE[i % SAVED_PALETTE.length]))).then(results => {
        const lines = results.filter(Boolean) as SavedPortfolioLine[];
        if (lines.length) setSavedPortfolioLines(lines);
      });
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── Show notification prompt once after login ────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    const asked = localStorage.getItem(NOTIF_ASKED_KEY);
    if (asked) return;
    // Check user's push_notifications preference before prompting
    (async () => {
      try {
        const { data } = await supabase
          .from("email_preferences")
          .select("push_notifications")
          .eq("user_id", userId)
          .single();
        // If the user explicitly disabled push, don't prompt again
        if (data && data.push_notifications === false) return;
      } catch {
        // No row yet means default true — proceed with prompt
      }
      setTimeout(() => setShowNotifPrompt(true), 3000);
    })();
  }, [userId]);


  const isPortfolioSaved = (() => {
    if (!assets.length) return false;
    try {
      const saved = JSON.parse(localStorage.getItem("corvo_saved_portfolios") || "[]");
      const currentTickers = assets.map(a => a.ticker).sort().join(",");
      return saved.some((p: any) => (p.tickers || p.assets?.map((a: any) => a.ticker) || []).sort().join(",") === currentTickers);
    } catch { return false; }
  })();
  // Load watchlist tickers for right panel
  useEffect(() => {
    try {
      const raw = localStorage.getItem("corvo_watchlist");
      if (raw) {
        const arr = JSON.parse(raw);
        setWatchlistTickers((Array.isArray(arr) ? arr : []).map((e: any) => typeof e === "string" ? e : e.ticker).filter(Boolean));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showHelpModal) { setShowHelpModal(false); return; }
      if (paletteOpen) { setPaletteOpen(false); return; }
      if (stockTicker) { setStockTicker(null); return; }
      if (whatIfOpen) { setWhatIfOpen(false); return; }
      if (showGoals) { setShowGoals(false); return; }
      if (showProfile) { setShowProfile(false); return; }
      if (showSettings) { setShowSettings(false); return; }
      if (showAlerts) { setShowAlerts(false); return; }
      if (showEmailPrefs) { setShowEmailPrefs(false); return; }
      if (showReferral) { setShowReferral(false); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen, stockTicker, whatIfOpen, showGoals, showProfile, showSettings, showAlerts, showEmailPrefs, showReferral, showHelpModal]);

  // Unlock Web Audio API on first user interaction
  useEffect(() => {
    const unlock = () => { unlockAudio(); window.removeEventListener("click", unlock, true); };
    window.addEventListener("click", unlock, true);
    return () => window.removeEventListener("click", unlock, true);
  }, []);

  // Back-to-top visibility
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const next = el.scrollTop > 400;
      setShowBackToTop(prev => prev === next ? prev : next);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const exportCSV = () => {
    if (!data || !assets.length) return;
    const total = assets.reduce((s, a) => s + a.weight, 0);
    const rows: (string | number)[][] = [
      ["Ticker", "Weight (%)"],
      ...assets.map(a => [a.ticker, ((a.weight / total) * 100).toFixed(1)]),
      [],
      ["Portfolio Summary"],
      ["Period Return (%)", (data.portfolio_return * 100).toFixed(2)],
      ["Volatility (%)", (data.portfolio_volatility * 100).toFixed(2)],
      ["Sharpe Ratio", data.sharpe_ratio?.toFixed(2) ?? ""],
      ["Max Drawdown (%)", (data.max_drawdown * 100).toFixed(2)],
      ["Period", period],
      ["Benchmark", benchLabel],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const uri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const a = document.createElement("a");
    a.href = uri;
    a.download = `corvo_${assets.map(a => a.ticker).join("-")}_${period}.csv`;
    a.click();
  };

  const benchLabel = BENCHMARKS.find(b => b.ticker === benchmark)?.label ?? benchmark;
  const normalWeights = (arr: typeof assets) => {
    const total = arr.reduce((s, a) => s + a.weight, 0);
    return arr.map(a => a.weight / total);
  };


  const SidebarInner = () => (
    <>
      {/* Logo → homepage */}
      <div className="c-sidebar-logo" style={{ ...S.sidebarTop, borderLeft: "3px solid var(--accent)", paddingLeft: 13 }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/corvo-logo.svg" width={26} height={26} alt="Corvo" style={{ flexShrink: 0, opacity: 0.9 }} />
          <div style={S.logo}>CORVO</div>
        </Link>
      </div>

      {/* Natural language editor */}
      <div style={{ padding: "10px 14px 0", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: "var(--text3)", textTransform: "uppercase", marginBottom: 7 }}>Edit with AI</div>
        {(() => {
          const runNLCommand = async (cmd: string) => {
            if (!cmd.trim() || !assets.length || nlLoading) return;
            setNlCommand(cmd);
            setNlLoading(true);
            setNlError(null);
            setNlPending(null);
            try {
              const result = await fetchNaturalLanguageEdit(cmd.trim(), assets);
              if ("error" in result) {
                setNlError(result.error);
              } else {
                setNlPending(result);
              }
            } catch {
              setNlError("Request failed. Check your connection and try again.");
            } finally {
              setNlLoading(false);
            }
          };
          const chips = nlCommand === "" ? getNLSuggestions(assets) : [];
          return (
            <>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={nlCommand}
                  onChange={e => { setNlCommand(e.target.value); setNlError(null); }}
                  onKeyDown={e => { if (e.key === "Enter") runNLCommand(nlCommand); }}
                  placeholder={assets.length ? "e.g. sell half my NVDA and put it in QQQ" : "Add holdings first"}
                  disabled={nlLoading || !assets.length}
                  style={{ width: "100%", padding: "8px 32px 8px 10px", fontSize: 11, background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 7, color: "var(--text)", outline: "none", fontFamily: "var(--font-body)", boxSizing: "border-box", opacity: assets.length ? 1 : 0.5 }}
                />
                {nlLoading ? (
                  <div style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, border: "1.5px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", pointerEvents: "none" }} />
                ) : nlCommand.trim() && assets.length ? (
                  <button
                    onClick={() => runNLCommand(nlCommand)}
                    style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--accent)", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center" }}
                    aria-label="Run command"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                ) : null}
              </div>
              {nlError && (
                <p style={{ fontSize: 11, color: "#e05c5c", marginTop: 5, lineHeight: 1.4 }}>{nlError}</p>
              )}
              {chips.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                  {chips.map(chip => (
                    <button
                      key={chip}
                      onClick={() => runNLCommand(chip)}
                      style={{ padding: "3px 9px", fontSize: 10, fontFamily: "var(--font-body)", background: "var(--bg3)", border: "0.5px solid var(--border2)", borderRadius: 12, color: "var(--text3)", cursor: "pointer", lineHeight: 1.5, letterSpacing: 0.2, transition: "all 0.12s", whiteSpace: "nowrap" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"; e.currentTarget.style.color = "var(--text)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text3)"; }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </>
          );
        })()}
        <div style={{ marginBottom: 10 }} />
      </div>

      {/* Builder */}
      <div id="tour-ticker-area" style={{ flex: 1, overflow: "auto", overscrollBehavior: "none", padding: "12px 14px" }}>
        <PortfolioBuilder assets={assets} onAssetsChange={setAssets} onAnalyze={handleAnalyze} loading={loading} />
      </div>

      {/* Analyze button */}
      <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--border)" }}>
        {portfolioStale && (
          <div style={{ marginBottom: 8, padding: "7px 11px", borderRadius: 7, border: "0.5px solid rgba(184,134,11,0.35)", background: "rgba(184,134,11,0.07)", fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>
            Settings changed. Click {hasSavedPortfolios ? "New Analysis" : "Analyze"} to update results.
          </div>
        )}
        {(() => {
          const validA = assets.filter(a => a.ticker && a.weight > 0);
          const totalW = validA.reduce((s, a) => s + a.weight, 0);
          // Allow fraction weights (sum ≈ 1) or integer weights (sum ≈ 100) gracefully
          const isBalanced = validA.length === 0 ||
            Math.abs(totalW - 1) < 0.015 ||
            Math.abs(totalW - 100) < 1.5;
          const hasHoldings = validA.length > 0;
          const canAnalyze = !loading && hasHoldings && isBalanced;
          return (
            <>
              <motion.button
                id="tour-desk-analyze"
                onClick={canAnalyze ? handleAnalyze : undefined}
                disabled={!canAnalyze}
                initial={false}
                animate={analyzeComplete ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                whileHover={canAnalyze ? { scale: 1.02 } : {}}
                whileTap={canAnalyze ? { scale: 0.97 } : {}}
                transition={{ duration: 0.35 }}
                style={{ width: "100%", padding: "11px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 2, textTransform: "uppercase" as const, background: loading ? "transparent" : canAnalyze ? "var(--bg)" : "var(--bg3)", color: loading || !canAnalyze ? "var(--text3)" : "var(--accent)", border: canAnalyze ? "1px solid rgba(201,168,76,0.55)" : "0.5px solid var(--border2)", borderRadius: 9, cursor: canAnalyze ? "pointer" : "not-allowed", transition: "background 0.2s, color 0.2s, border-color 0.2s", animation: loading ? "analyze-ring 1.2s ease-out infinite" : canAnalyze ? "analyzePulse 2.5s ease-in-out infinite" : "none" }}>
                {loading ? "Analyzing..." : hasSavedPortfolios ? "New Analysis" : "Analyze"}
              </motion.button>
              {hasHoldings && !isBalanced && (
                <p style={{ fontSize: 11, color: "#e05c5c", textAlign: "center", marginTop: 5, lineHeight: 1.4 }}>
                  Weights must total 100% before analyzing.
                  {" "}<span style={{ color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => {
                      const total = validA.reduce((s, a) => s + a.weight, 0);
                      if (!total) return;
                      setAssets(assets.map(a => ({ ...a, weight: a.weight / total })));
                    }}>
                    Equalize
                  </span>
                </p>
              )}
            </>
          );
        })()}
      </div>

      {/* Period */}
      <div style={S.section}>
        <div style={S.label}>Period</div>
        <div style={{ display: "flex", gap: 4 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: "5px 0", fontSize: 11, fontFamily: "var(--font-mono)", background: period === p ? "var(--text)" : "transparent", border: "0.5px solid var(--border)", borderRadius: 6, color: period === p ? "var(--bg)" : "var(--text2)", cursor: "pointer", transition: "all 0.15s" }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Benchmark */}
      <div style={{ ...S.section, position: "relative" }}>
        <div style={S.label}>Benchmark</div>
        <button onClick={() => setBenchOpen(o => !o)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--text)" }}>
          <span>{benchLabel}</span><span style={{ color: "var(--text3)", fontSize: 9 }}>▾</span>
        </button>
        <AnimatePresence initial={false}>
          {benchOpen && (
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ position: "absolute", bottom: "100%", left: 14, right: 14, background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 10, overflow: "hidden", zIndex: 50, marginBottom: 4, boxShadow: "var(--shadow)" }}>
              {BENCHMARKS.map(b => (
                <button key={b.ticker} onClick={() => { setBenchmark(b.ticker); setBenchOpen(false); }}
                  style={{ width: "100%", textAlign: "left", padding: "8px 12px", background: b.ticker === benchmark ? "var(--bg3)" : "transparent", border: "none", color: "var(--text)", fontSize: 12, cursor: "pointer" }}>
                  {b.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Saved portfolios */}
      <div style={{ ...S.section, borderBottom: "none" }}>
        <SavedPortfolios assets={assets} data={data} onLoad={(a: any) => setAssets(a)} />
      </div>

    </>
  );


  const handleSidebarDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      setSidebarWidth(Math.min(400, Math.max(200, startW + ev.clientX - startX)));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };


  return (
    <div style={S.app}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes analyze-ring{0%{box-shadow:0 0 0 0 rgba(184,134,11,0.5)}70%{box-shadow:0 0 0 8px rgba(184,134,11,0)}100%{box-shadow:0 0 0 0 rgba(184,134,11,0)}}
        @keyframes analyzePulse{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.4)}50%{box-shadow:0 0 0 6px rgba(201,168,76,0)}}
        @media(max-width:768px){
          .c-sidebar{display:none!important}
          .c-topbar{display:none!important}
          .c-sidebar-logo{display:none!important}
          .c-mob-bar{display:flex!important}
          .c-mob-bottom-nav{display:none!important}
          .c-metrics{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
          .c-bgrid{grid-template-columns:1fr!important}
          .c-risk-grid{grid-template-columns:1fr!important}
          .c-risk-2col{grid-template-columns:1fr!important}
          .c-content{padding:12px 10px!important;padding-bottom:calc(80px + env(safe-area-inset-bottom,0px))!important}
          .c-ai-tab{height:calc(100dvh - 136px)!important}
          #tour-desk-chat{display:flex!important;bottom:20px!important;right:14px!important;width:44px!important;height:44px!important}
          .c-alloc-row{flex-direction:column!important}
          .c-alloc-row>*{flex:none!important;width:100%!important}
          .c-mob-bar #usermenu-btn>span{display:none!important}
          .c-mob-bar #usermenu-btn{padding:3px!important;gap:0!important}
          .c-mob-bar #usermenu-btn svg:last-child{display:none!important}
          .c-banner{flex-wrap:wrap!important;gap:8px!important}
          .c-banner-text{flex:1 1 100%!important;min-width:0!important}
          .c-banner-actions{flex-shrink:0!important}
          .c-perf-controls{flex-wrap:wrap!important;gap:6px!important}
          .c-perf-controls>*{flex-shrink:0!important}
        }
        @media(min-width:769px){
          .c-mob-bar{display:none!important}
          .c-mob-drawer{display:none!important}
          .c-mob-bottom-nav{display:none!important}
        }
        .c-mob-tabs{scrollbar-width:none;overscroll-behavior-x:contain;overscroll-behavior-y:none}
        .c-mob-tabs::-webkit-scrollbar{display:none}
      `}</style>

      {/* Desktop sidebar */}
      <div
        id="tour-desk-sidebar"
        className="c-sidebar"
        style={{ width: 340, flexShrink: 0, borderRight: "0.5px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--bg2)", overflow: "hidden", position: "relative" }}>
        {SidebarInner()}
      </div>

      {/* Mobile drawer */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <>
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="c-mob-drawer"
              style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 260, background: "var(--bg2)", borderRight: "0.5px solid var(--border)", zIndex: 201, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {SidebarInner()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div style={{ ...S.main, flexDirection: "row" as const }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, minWidth: 0, overflow: "hidden" }}>
        {/* Mobile top bar — two rows: brand/actions + tabs */}
        <div className="c-mob-bar" style={{ display: "none", flexDirection: "column", borderBottom: "0.5px solid var(--border)", background: "var(--bg2)", flexShrink: 0 }}>
          {/* Row 1: left icons | action icons */}
          <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid var(--border)", padding: "0 4px" }}>
            {/* Left: sidebar toggle + home */}
            <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <button id="tour-mob-hamburger" onClick={() => setSidebarOpen(true)} title="Open portfolio builder" aria-label="Open sidebar"
                style={{ width: 44, height: 44, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <Link id="tour-mob-home" href="/" title="Home" aria-label="Go to homepage"
                style={{ width: 44, height: 44, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", textDecoration: "none" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </Link>
            </div>
            {/* Right actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
              {/* Alerts bell */}
              <button id="tour-mob-bell" onClick={() => setShowAlerts(true)} title="Alerts" aria-label="Price alerts"
                style={{ width: 32, height: 32, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", color: "var(--text2)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {alertCount > 0 && <span style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", border: "1.5px solid var(--bg2)" }} />}
              </button>
              {/* Theme toggle */}
              <button onClick={toggleDark} title={dark ? "Light mode" : "Dark mode"}
                style={{ width: 32, height: 32, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
                {dark ? <Sun size={13} /> : <Moon size={13} />}
              </button>
              {/* Export CSV */}
              <button onClick={exportCSV} title="Export CSV" disabled={!data}
                style={{ width: 32, height: 32, borderRadius: 7, border: "none", background: "transparent", cursor: data ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", opacity: data ? 1 : 0.35 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              {/* PWA Install */}
              {canInstall && (
                <button onClick={installPWA} title="Install app"
                  style={{ width: 32, height: 32, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v12"/><path d="M8 10l4 4 4-4"/><rect x="3" y="17" width="18" height="4" rx="1"/>
                  </svg>
                </button>
              )}
              {/* User avatar */}
              <div id="tour-mob-profile" style={{ display: "flex", alignItems: "center" }}>
                <UserMenu
                  onEmailPrefs={() => setShowEmailPrefs(true)}
                  onReferral={() => setShowReferral(true)}
                  onSettings={() => setShowSettings(true)}
                  onProfile={() => setShowProfile(true)}
                  onReplayOnboarding={() => { window.location.href = "/onboarding?replay=true"; }}
                  onReplayTour={() => { localStorage.removeItem("corvo_tour_completed"); setShowSettings(false); setShowDashboardTour(true); }}
                  avatarUrl={navProfile.avatarUrl}
                  displayName={navProfile.displayName}
                />
              </div>
            </div>
          </div>
          {/* Row 2: scrollable tab bar */}
          <div id="tour-mob-tabs" className="c-mob-tabs" style={{ display: "flex", overflowX: "auto", height: 40 }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const ts: React.CSSProperties = { padding: "0 11px", height: 40, fontSize: 12, border: "none", borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent", background: "transparent", color: isActive ? "var(--text)" : "var(--text3)", cursor: "pointer", fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", textDecoration: "none", boxSizing: "border-box" as const, transition: "color 0.15s" };
              if (tab.href) return <Link key={tab.id} href={tab.href} style={ts} onClick={() => { try { localStorage.setItem("corvo_saved_assets", JSON.stringify(assets)); if (data) localStorage.setItem("corvo_saved_data", JSON.stringify(data)); } catch {} }}>{tab.label}</Link>;
              return <button key={tab.id} onClick={() => { sound.whoosh(); setActiveTab(tab.id); if (tab.id === "stocks") setStockTicker(null); }} style={ts}>{tab.label}</button>;
            })}
          </div>
        </div>

        {/* Desktop topbar */}
        <header className="c-topbar" style={S.topbar}>
          {/* Tabs with animated underline indicator */}
          <div id="tour-desk-tabs" style={{ display: "flex", gap: 0, flex: 1, overflowX: "auto", position: "relative" }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const tabStyle: React.CSSProperties = {
                position: "relative",
                padding: "10px 14px", fontSize: 13, borderRadius: 0, flexShrink: 0,
                border: "none", background: "transparent",
                color: isActive ? "var(--text)" : "var(--text3)",
                cursor: "pointer", fontWeight: isActive ? 600 : 400,
                display: "flex", alignItems: "center", gap: 5, textDecoration: "none",
                transition: "color 0.15s", letterSpacing: 0.2,
              };
              const content = (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tab-indicator"
                      initial={false}
                      style={{ position: "absolute", bottom: 0, left: "10%", right: "10%", height: 2, borderRadius: 1, background: "var(--accent)", zIndex: 0 }}
                      transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    />
                  )}
                  <span style={{ position: "relative", zIndex: 1 }}>
                    {tab.label}
                  </span>
                </>
              );
              if (tab.href) return <Link key={tab.id} href={tab.href} style={tabStyle} onClick={() => { try { localStorage.setItem("corvo_saved_assets", JSON.stringify(assets)); if (data) localStorage.setItem("corvo_saved_data", JSON.stringify(data)); } catch {} }}>{content}</Link>;
              return <button key={tab.id} onClick={() => { sound.whoosh(); setActiveTab(tab.id); if (tab.id === "stocks") setStockTicker(null); }} style={tabStyle}>{content}</button>;
            })}
          </div>

          <TopbarActions
            dark={dark}
            toggleDark={toggleDark}
            alertCount={alertCount}
            avatarUrl={navProfile.avatarUrl}
            displayName={navProfile.displayName}
            data={data}
            assets={assets}
            exportCSV={exportCSV}
            setShowAlerts={setShowAlerts}
            setShowEmailPrefs={setShowEmailPrefs}
            setShowReferral={setShowReferral}
            setShowSettings={setShowSettings}
            setShowProfile={setShowProfile}
            setShowDashboardTour={setShowDashboardTour}
          />
        </header>

        {/* Content */}
        <main ref={contentRef} className="c-content" style={S.content}>
          {/* Setup banner (shown when user skipped onboarding) */}
          <AnimatePresence initial={false}>
            {showSetupBanner && (
              <motion.div
                // initial={false} is required — do not remove
                initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="c-banner"
                style={{ border: "0.5px solid rgba(184,134,11,0.25)", borderRadius: 10, padding: "11px 16px", background: "rgba(184,134,11,0.05)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div className="c-banner-text" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--accent)", fontSize: 13, flexShrink: 0 }}>◎</span>
                  <span style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.4 }}>
                    Complete your setup: add your portfolio to unlock AI insights and risk analysis.
                  </span>
                </div>
                <div className="c-banner-actions" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => { setShowSetupBanner(false); window.location.href = "/onboarding"; }}
                    style={{ padding: "6px 14px", fontSize: 11, fontWeight: 600, borderRadius: 6, background: "var(--accent)", border: "none", color: "var(--bg)", cursor: "pointer", transition: "opacity 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    Complete Setup
                  </button>
                  <button onClick={() => { setShowSetupBanner(false); localStorage.setItem("corvo_setup_banner_dismissed", "true"); }}
                    style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "rgba(184,134,11,0.1)", color: "var(--text3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skipped tickers warning banner */}
          <AnimatePresence initial={false}>
            {skippedTickers.length > 0 && (
              <motion.div
                // initial={false} is required — do not remove
                initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="c-banner"
                style={{ border: "0.5px solid rgba(184,134,11,0.25)", borderRadius: 10, padding: "11px 16px", background: "rgba(184,134,11,0.05)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div className="c-banner-text" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)", flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.4 }}>
                    No price data found for: <strong style={{ color: "var(--accent)" }}>{skippedTickers.join(", ")}</strong>. Analysis ran with remaining holdings.
                  </span>
                </div>
                <button className="c-banner-actions" onClick={() => setSkippedTickers([])}
                  style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "rgba(184,134,11,0.1)", color: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error banner */}
          <AnimatePresence initial={false}>
            {errorMsg && (
              <motion.div
                // initial={false} is required — do not remove
                initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="c-banner"
                style={{ border: "0.5px solid rgba(224,92,92,0.4)", borderRadius: 10, padding: "12px 16px", background: "rgba(224,92,92,0.07)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span className="c-banner-text" style={{ fontSize: 13, color: "#e05c5c" }}>{errorMsg}</span>
                <div className="c-banner-actions" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={handleAnalyze}
                    style={{ padding: "5px 12px", fontSize: 11, borderRadius: 6, border: "0.5px solid rgba(224,92,92,0.4)", background: "transparent", color: "#e05c5c", cursor: "pointer" }}>
                    Try again
                  </button>
                  <button onClick={() => setErrorMsg(null)}
                    style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "rgba(224,92,92,0.12)", color: "#e05c5c", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence initial={false} mode="wait">
            {activeTab === "stocks" ? (
              <motion.div key="stocks" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                {stockTicker ? (
                  <StockDetail ticker={stockTicker} onBack={() => setStockTicker(null)} onSelectTicker={t => setStockTicker(t)} />
                ) : (
                  <StocksSearch onSelect={setStockTicker} />
                )}
              </motion.div>
            ) : activeTab === "positions" ? (
              <motion.div key="positions" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={S.cardAccent} />
                    <span style={S.cardTitle}>All Positions</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text3)", marginLeft: 10 }}>All saved portfolios · click any row to open stock detail</p>
                </div>
                <PositionsTab
                  onSelectTicker={t => { setStockTicker(t); setActiveTab("stocks"); }}
                />
                {/* Price Target Tracker */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={S.cardAccent} />
                    <span style={S.cardTitle}>Price Targets</span>
                  </div>
                  <PriceTargetTracker assets={assets} />
                </div>
              </motion.div>
            ) : activeTab === "news" && data ? (
              <motion.div key="news" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <Card>
                  {/* News sub-tabs */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
                    {(["news", "earnings", "events"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setNewsSubTab(tab)}
                        style={{
                          padding: "5px 13px",
                          borderRadius: 8,
                          border: newsSubTab === tab ? "0.5px solid var(--accent)" : "0.5px solid var(--border)",
                          background: newsSubTab === tab ? "rgba(184,134,11,0.08)" : "transparent",
                          color: newsSubTab === tab ? "var(--accent)" : "var(--text3)",
                          fontSize: 11,
                          fontWeight: newsSubTab === tab ? 600 : 400,
                          cursor: "pointer",
                        }}
                      >
                        {tab === "news" ? "News" : tab === "earnings" ? "Earnings" : "Events"}
                      </button>
                    ))}
                  </div>
                  {newsSubTab === "news" && (
                    <>
                      <TooltipCardHeader title="Market News" sections={[{ label: "How it works", text: "Live news fetched for every ticker in your portfolio. Sentiment badges (Positive / Negative / Neutral) are determined by headline analysis." }]} />
                      <NewsFeed assets={assets} />
                    </>
                  )}
                  {newsSubTab === "earnings" && (
                    <>
                      <TooltipCardHeader title="Earnings Calendar" sections={[{ label: "How it works", text: "Upcoming earnings dates for your holdings within the next 60 days. Red border means earnings in 7 days or less." }]} />
                      <EarningsCalendar assets={assets} />
                    </>
                  )}
                  {newsSubTab === "events" && (
                    <>
                      <TooltipCardHeader title="Economic Events" sections={[{ label: "How it works", text: "High-impact economic events for the next 30 days, including Fed decisions, CPI releases, and jobs reports." }]} />
                      <EventsCalendar />
                    </>
                  )}
                </Card>
              </motion.div>
            ) : activeTab === "watchlist" ? (
              <motion.div key="watchlist" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <Watchlist />
              </motion.div>
            ) : !data && !loading && !initializing ? (
              <motion.div key="empty" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <Empty />
              </motion.div>
            ) : (loading || initializing) && !data ? (
              <motion.div key="loading" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}><OverviewSkeleton /></motion.div>
            ) : activeTab === "overview" ? (
              <motion.div key="overview" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                {/* Stale-portfolio banner */}
                {portfolioStale && (
                  <motion.div
                    // initial={false} is required — do not remove
                    initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                    className="c-banner"
                    style={{ border: "0.5px solid rgba(184,134,11,0.35)", borderRadius: 10, padding: "10px 16px", background: "rgba(184,134,11,0.07)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, zIndex: 10, position: "relative" }}>
                    <span className="c-banner-text" style={{ fontSize: 12, color: "var(--text2)" }}>
                      Assets have changed. Re-analyze to update results.
                    </span>
                    <button
                      onClick={handleAnalyze}
                      className="c-banner-actions"
                      style={{ padding: "6px 14px", fontSize: 11, fontWeight: 600, borderRadius: 6, background: "var(--accent)", border: "none", color: "var(--bg)", cursor: "pointer", flexShrink: 0 }}>
                      Reanalyze
                    </button>
                  </motion.div>
                )}

                {/* Greeting + portfolio pulse + quick actions */}
                <GreetingBar
                  displayName={navProfile.displayName}
                  portfolioData={data}
                  assets={assets}
                  perfHistory={perfHistory}
                  portfolioValue={portfolioInputValue}
                />
<div style={{ height: 1, background: "linear-gradient(90deg, var(--accent) 0%, rgba(184,134,11,0.15) 60%, transparent 100%)", marginBottom: 16, opacity: 0.4 }} />

                {/* What Should I Do Today */}
                <div style={{ marginBottom: 20 }}>
                  <div
                    onClick={handleWhatShouldIDo}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleWhatShouldIDo(); }}
                    style={{
                      width: "100%", borderRadius: 12, cursor: "pointer",
                      border: "0.5px solid rgba(201,168,76,0.45)",
                      background: wsidOpen ? "rgba(201,168,76,0.11)" : "rgba(201,168,76,0.07)",
                      padding: "20px 24px", transition: "all 0.18s",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.14)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.6)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = wsidOpen ? "rgba(201,168,76,0.11)" : "rgba(201,168,76,0.07)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.45)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 10, flexShrink: 0,
                        background: "rgba(201,168,76,0.15)", border: "0.5px solid rgba(201,168,76,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Sparkles size={22} color="var(--accent)" />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)", marginBottom: 3, letterSpacing: -0.2 }}>
                          What should I do today?
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.4 }}>
                          Get 2-3 specific actions based on your portfolio and goals
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: "8px 18px", fontSize: 12, fontWeight: 600, borderRadius: 7,
                      background: "var(--accent)", color: "var(--bg)", flexShrink: 0,
                      display: "flex", alignItems: "center", gap: 6, pointerEvents: "none",
                    }}>
                      {wsidLoading ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                            <path d="M21 12a9 9 0 11-6.219-8.56" />
                          </svg>
                          Analyzing...
                        </>
                      ) : wsidOpen && wsidResult ? "Close" : "Get Actions"}
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {wsidOpen && (
                      <motion.div
                        // initial={false} is required — do not remove
                        initial={false}
                        animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{ overflow: "clip" }}
                      >
                        <div style={{
                          background: "var(--card-bg)", border: "0.5px solid var(--border2)",
                          borderRadius: 12, padding: "20px 24px",
                        }}>
                          {wsidLoading ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text3)", fontSize: 12 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                                <path d="M21 12a9 9 0 11-6.219-8.56" />
                              </svg>
                              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                              Analyzing your portfolio and today's market...
                            </div>
                          ) : wsidError ? (
                            <div style={{ fontSize: 12, color: "var(--red)" }}>{wsidError}</div>
                          ) : wsidResult ? (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>
                                Today's Actions
                              </div>
                              <ol style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                                {wsidResult.split(/\n/).filter(l => l.trim()).map((line, i) => {
                                  const text = line.replace(/^\d+\.\s*/, "").trim();
                                  if (!text) return null;
                                  return (
                                    <li key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>
                                      {text}
                                    </li>
                                  );
                                })}
                              </ol>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                                <button
                                  onClick={e => { e.stopPropagation(); setWsidResult(null); handleWhatShouldIDo(); }}
                                  style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                >
                                  Refresh
                                </button>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    const msg = `Here are my recommended actions for today from my portfolio analysis:\n\n${wsidResult}\n\nI'd like to explore these further. Where should I start?`;
                                    setChatInitialMessage(msg);
                                    setChatOpen(true);
                                  }}
                                  style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "0.5px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                                >
                                  <MessageSquare size={11} />
                                  Continue in AI chat
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Earnings Impact Preview — only renders when holdings have earnings within 14 days */}
                <EarningsImpactPreview assets={assets} />

                <motion.div
                  id="tour-desk-metrics"
                  key="stats-row"
                  className="c-metrics"
                  style={{ ...S.metricsGrid, gridTemplateColumns: assets.some(a => (a.purchasePrice ?? 0) > 0) && (portfolioInputValue ?? 0) > 0 ? "repeat(5,1fr)" : "repeat(4,1fr)" }}
                  initial={false}
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
                  <Metrics
                    data={data}
                    currency={currency}
                    rate={rate}
                    period={period}
                    sparklineValues={(data.portfolio_cumulative || data.growth || []).slice(-14)}
                    assets={assets}
                    portfolioValue={portfolioInputValue}
                  />
                </motion.div>
                <motion.div id="tour-desk-chart" key="perf-card" initial={false} whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} transition={{ duration: 0.15 }}>
                  <Card>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ ...S.cardHeader, marginBottom: 0 }}><div style={S.cardAccent} /><span style={S.cardTitle}>Performance</span></div>
                      <div className="c-perf-controls" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {/* Period selector: adjacent to graph */}
                        <div style={{ display: "flex", gap: 3 }}>
                          {PERIODS.map(p => (
                            <button key={p} onClick={() => setPeriod(p)}
                              style={{ padding: "4px 9px", fontSize: 11, fontFamily: "var(--font-mono)", background: period === p ? "var(--text)" : "transparent", border: "0.5px solid var(--border)", borderRadius: 5, color: period === p ? "var(--bg)" : "var(--text3)", cursor: "pointer", transition: "all 0.15s" }}>
                              {PERIOD_LABELS[p]}
                            </button>
                          ))}
                        </div>
                        {/* Benchmark selector: chart-only, does NOT trigger re-analyze */}
                        <BenchmarkDropdown localBenchmark={localBenchmark} benchmarks={BENCHMARKS} onSelect={setLocalBenchmark} />
                        <button onClick={() => setWhatIfOpen(true)}
                          style={{ padding: "4px 10px", fontSize: 11, borderRadius: 5, border: "0.5px solid var(--border2)", background: "transparent", color: "var(--text3)", cursor: "pointer", letterSpacing: 0.5, transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}>
                          What-If →
                        </button>
                      </div>
                    </div>
                    <PerformanceChart
                      data={data}
                      period={period}
                      savedLines={savedPortfolioLines}
                      onSavedLinesChange={setSavedPortfolioLines}
                      customDateRange={customDateRange}
                      onCustomDateChange={setCustomDateRange}
                      benchmarkOverride={localBenchmarkSeries ?? undefined}
                    />
                  </Card>
                </motion.div>
                <motion.div
                  key="bottom-grid"
                  className="c-bgrid"
                  style={{ ...S.bottomGrid }}
                  initial={false}
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}>
                  {[
                    {
                      title: "Health Score",
                      content: <HealthScore data={data} userId={userId} apiUrl={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} />,
                      sections: [
                        { label: "Plain English", text: "A composite score from 0-100 that grades your portfolio on returns, risk-adjusted performance, stability, and resilience." },
                        { label: "Example", text: "Score 78 = Good. Strong returns and Sharpe ratio, but some volatility keeping it from Excellent." },
                        { label: "What's Good", text: "75-100 is Excellent. 50-74 Good. 25-49 Fair. Below 25 needs attention. Aim for 60+ for a solid long-term portfolio." },
                      ],
                    },
                    {
                      title: "AI Insights",
                      content: <AiInsights data={data} assets={assets} onAskAi={() => setChatOpen(true)} />,
                      sections: [
                        { label: "Plain English", text: "AI-generated observations about your portfolio's risk, diversification, and performance characteristics." },
                        { label: "Example", text: "The AI might flag that 3 of your 4 holdings are in the same sector, increasing concentration risk." },
                        { label: "What's Good", text: "Use insights as a starting point for research, not as financial advice. Diversification and balance are key themes to watch." },
                      ],
                    },
                    {
                      title: `vs ${benchLabel}`,
                      content: <BenchmarkComparison data={data} />,
                      sections: [
                        { label: "Plain English", text: `Compares your portfolio's return against ${benchLabel} over the same period.` },
                        { label: "Example", text: "If your portfolio returned +18% and S&P 500 returned +10%, you outperformed by +8 percentage points (pp)." },
                        { label: "What's Good", text: "Consistently beating your benchmark by 2–5pp is exceptional. Even matching it while taking less risk is a win." },
                      ],
                    },
                  ].map(({ title, content, sections }) => (
                    <motion.div key={title} initial={false} style={{ display: "flex", flexDirection: "column" }}>
                      <Card style={{ marginBottom: 0, flex: 1 }}><TooltipCardHeader title={title} sections={sections} />{content}</Card>
                    </motion.div>
                  ))}
                </motion.div>
                <div className="c-alloc-row" style={{ display: "flex", gap: 16, marginTop: 12 }}>
                  <motion.div key="allocation-card" initial={false} style={{ flex: 3 }}>
                    <Card style={{ marginBottom: 0, height: "100%" }}><TooltipCardHeader title="Allocation" sections={[
                      { label: "Plain English", text: "Shows how your total portfolio value is split across your holdings, expressed as a percentage of the whole. Each bar segment represents one position's share of the portfolio." },
                      { label: "Example", text: "If you hold AAPL at 40%, MSFT at 35%, and GOOGL at 25%, those three segments together fill the full bar and add up to 100%." },
                      { label: "What's Good", text: "No single position dominating more than 25-30% reduces concentration risk. A well-diversified portfolio spreads weight across 5+ holdings without any one outsized bet." },
                    ]} /><Breakdown assets={assets} portfolioValue={portfolioInputValue} /></Card>
                  </motion.div>
                  <motion.div key="sector-card" initial={false} style={{ flex: 2 }}>
                    <Card style={{ marginBottom: 0, height: "100%" }}><TooltipCardHeader title="Sector Exposure" sections={[
                      { label: "Plain English", text: "Shows how your portfolio weight is distributed across market sectors, aggregated from each holding's sector classification." },
                      { label: "Example", text: "If AAPL and MSFT together make up 70% of your portfolio, Technology will show 70% exposure." },
                      { label: "What's Good", text: "A diversified portfolio spreads across 4+ sectors. Heavy concentration in one sector amplifies both gains and losses." },
                    ]} /><SectorExposureChart assets={assets} /></Card>
                  </motion.div>
                </div>
                {/* Insider Activity summary */}
                {assets.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Card style={{ marginBottom: 0 }}>
                      <TooltipCardHeader
                        title="Insider Activity"
                        sections={[
                          { label: "Plain English", text: "Shows recent SEC Form 4 filings for your holdings. These are open market purchases and sales by company executives, directors, and major shareholders." },
                          { label: "Why it matters", text: "Insider buying with personal money is one of the strongest bullish signals available. Executives have the most information about their company's prospects. Selling is less informative since it has many non-bearish explanations." },
                          { label: "What to watch", text: "Focus on C-suite purchases (CEO, CFO, COO). Large buys after a price decline are particularly significant. Isolated small sales by a single executive are usually noise." },
                        ]}
                      />
                      <InsiderActivitySummary assets={assets} />
                    </Card>
                  </div>
                )}

                {data && !isPortfolioSaved && (
                  <motion.div
                    // initial={false} is required — do not remove
                    initial={false}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0" }}>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>Want to compare this later?</span>
                    <button
                      onClick={() => {
                        const el = document.querySelector("[data-save-trigger]") as HTMLElement | null;
                        if (el) el.click();
                      }}
                      style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                      Save this portfolio →
                    </button>
                  </motion.div>
                )}
              </motion.div>
            ) : activeTab === "risk" ? (
              <motion.div key="risk" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <div style={{ marginBottom: 12 }}>
                  <Card style={{ marginBottom: 0 }}><TooltipCardHeader title="Dividend Income" sections={[{label:"Plain English",text:"Shows the estimated annual dividend income from your holdings based on current yields and a $10,000 portfolio value."},{label:"Example",text:"If JNJ has a 3% yield and makes up 30% of your $10k portfolio, you'd earn ~$90/year from it."},{label:"What's Good",text:"Tickers highlighted in amber have an ex-dividend date within 30 days. You must own the stock before that date to receive the dividend."}]} /><DividendTracker assets={assets} /></Card>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Card style={{ marginBottom: 0 }}><TooltipCardHeader title="Tax Loss Harvesting" sections={[{label:"Plain English",text:"Identifies holdings trading below your purchase price that could be sold to realize a tax loss, then replaced with a similar investment to maintain market exposure."},{label:"Example",text:"If you bought NVDA at $150 and it's now $120, you can sell it for a $30/share loss to offset capital gains, then buy a sector ETF like SOXX to stay exposed to semiconductors."},{label:"What's Good",text:"The IRS wash-sale rule disallows the loss if you repurchase the same (or substantially identical) security within 30 days. Suggested replacements are deliberately different securities in the same sector."},{label:"How to use",text:"Enter your purchase prices for each ticker in the sidebar. Only tickers with a purchase price and a current unrealized loss will appear here."}]} /><TaxLossHarvester assets={assets} portfolioValue={portfolioInputValue} /></Card>
                </div>
                <div className="c-risk-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <motion.div key="cge-card" initial={false}>
                    <Card style={{ marginBottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 160 }}>
                      <CardHeader title="Capital Gains Estimator" />
                      <span style={{ color: "var(--text3)", fontSize: 13 }}>Coming soon</span>
                    </Card>
                  </motion.div>
                  <motion.div key="div-cal-card" initial={false}>
                    <Card style={{ marginBottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 160 }}>
                      <CardHeader title="Dividend Calendar" />
                      <span style={{ color: "var(--text3)", fontSize: 13 }}>Coming soon</span>
                    </Card>
                  </motion.div>
                </div>
              </motion.div>
            ) : activeTab === "simulate" ? (
              <motion.div key="simulate" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} style={{ overscrollBehavior: "none" }}>
                <Card key="mc-card"><TooltipCardHeader title="Monte Carlo Simulation" sections={[
                  { label: "What it shows", text: "Monte Carlo simulation runs 8,500 randomized scenarios based on your portfolio's historical returns and volatility. The bands show the range of possible outcomes, not guarantees." },
                  { label: "Horizon control", text: "Select 1 to 30 years. Shorter horizons are more precise; longer horizons show the compounding range but with wider uncertainty." },
                ]} /><MonteCarloChart key="mc-chart" assets={assets} period={period} portfolioValue={portfolioInputValue} /></Card>
                <Card key="retire-card" style={{ marginTop: 16 }}>
                  <TooltipCardHeader title="What if I Retire in X Years?" sections={[
                    { label: "What it shows", text: "Runs 8,500 Monte Carlo scenarios projecting your portfolio to retirement. The confidence interval and histogram show the full distribution of outcomes in today's dollars." },
                    { label: "How it works", text: "Uses your current holdings, historical volatility, and long-term expected returns. Advanced settings let you model contributions, inflation, fees, and tax drag." },
                    { label: "Interpreting results", text: "Results are inflation-adjusted by default. The median is the most likely single outcome. The confidence interval captures the realistic range across most scenarios." },
                  ]} />
                  <RetirementSimulator key="retire-sim"
                    assets={assets}
                    portfolioValue={portfolioInputValue}
                  />
                </Card>
              </motion.div>
            ) : activeTab === "transactions" ? (
              <motion.div key="transactions" initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <TransactionsTab />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>{/* end inner flex column */}

</div>{/* end S.main outer row */}

      {/* AI Chat: slide-in panel */}
      {chatOpen && (
        <AiChat
          data={data}
          assets={assets}
          goals={goals}
          initialMessage={chatInitialMessage}
          currentPage={{
            overview:     "portfolio dashboard (overview tab)",
            positions:    "portfolio dashboard (positions tab)",
            risk:         "portfolio dashboard (income and tax tab)",
            news:         "portfolio dashboard (news tab)",
            watchlist:    "portfolio dashboard (watchlist tab)",
            simulate:     "portfolio dashboard (Monte Carlo simulations tab)",
            transactions: "portfolio dashboard (transactions tab)",
            stocks:       "portfolio dashboard (stock detail overlay)",
          }[activeTab] || `portfolio dashboard (${activeTab} tab)`}
          onClose={() => { setChatOpen(false); setChatInitialMessage(undefined); }}
        />
      )}

      {/* Floating AI Chat button */}
      <motion.button
        // initial={false} is required — do not remove
        initial={false}
        id="tour-desk-chat"
        onClick={() => { setChatInitialMessage(undefined); setChatOpen(v => !v); }}
        title="AI Chat (A)"
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", damping: 20 }}
        style={{
          position: "fixed", bottom: "var(--fab-bottom)", right: "var(--fab-edge)", zIndex: 250,
          width: 52, height: 52, borderRadius: "50%",
          background: chatOpen ? "var(--bg3)" : "var(--accent)",
          border: chatOpen ? "1px solid var(--border2)" : "none",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: chatOpen ? "none" : "0 4px 20px rgba(184,134,11,0.35)",
          transition: "background 0.2s, box-shadow 0.2s, border 0.2s",
        }}
        onMouseEnter={e => { if (!chatOpen) e.currentTarget.style.background = "#d4b05a"; }}
        onMouseLeave={e => { if (!chatOpen) e.currentTarget.style.background = "var(--accent)"; }}
      >
        <MessageSquare size={20} color={chatOpen ? "var(--text2)" : "var(--bg)"} />
      </motion.button>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={id => { setActiveTab(id); sound.whoosh(); }}
        onProfile={() => setShowProfile(true)}
        onAiChat={() => { setChatInitialMessage(undefined); setChatOpen(v => !v); sound.whoosh(); }}
      />


      <AnimatePresence initial={false}>
        {showGoals && <GoalsModal onComplete={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowGoals(false); }} onSkip={() => { localStorage.setItem("corvo_goals", "skipped"); setShowGoals(false); }} />}
      </AnimatePresence>
      {showTourInvite && (
        <TourInviteModal
          onAccept={() => {
            localStorage.setItem("corvo_tour_offered", "true");
            setShowTourInvite(false);
            setShowDashboardTour(true);
          }}
          onDecline={() => {
            localStorage.setItem("corvo_tour_offered", "true");
            setShowTourInvite(false);
          }}
        />
      )}
      {showDashboardTour && (
        <DashboardTour onComplete={() => {
          setShowDashboardTour(false);
          localStorage.setItem("corvo_tour_completed", "true");
        }} />
      )}
      <AnimatePresence initial={false}>
        {showTour && <OnboardingTour
          assets={assets}
          dataAvailable={data !== null}
          onComplete={async () => {
            setShowTour(false);
            tourNeededRef.current = false;
            localStorage.setItem("corvo_tour_completed", "true");
            const { data: { user } } = await supabase.auth.getUser();
            if (user) await supabase.from("profiles").upsert({ id: user.id, onboarding_completed: true, updated_at: new Date().toISOString() });
          }} />}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {showProfile && <ProfileEditor goals={goals} onSave={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowProfile(false); }} onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {showSettings && (
          <motion.div
            // initial={false} is required — do not remove
            initial={false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 280 }}
            style={{ position: "fixed", inset: 0, zIndex: 490, background: "var(--bg)", overflowY: "auto", overscrollBehavior: "none" }}>
            <SettingsPage
              onClose={() => setShowSettings(false)}
              onProfileSaved={(p) => setNavProfile({ displayName: p.displayName, avatarUrl: p.avatarUrl })}
              onReplayOnboarding={() => {
                setShowSettings(false);
                window.location.href = "/onboarding?replay=true";
              }}
              onReplayTour={() => {
                localStorage.removeItem("corvo_tour_completed");
                setShowSettings(false);
                setShowDashboardTour(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {showReferral && <ReferralModal onClose={() => setShowReferral(false)} />}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {showEmailPrefs && (
          <EmailPreferences
            onClose={() => { setShowEmailPrefs(false); setUnsubscribeMode(false); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {showAlerts && (
          <AlertsPanel
            assets={assets}
            onClose={() => {
              setShowAlerts(false);
              try {
                const raw = localStorage.getItem("corvo_alerts");
                setAlertCount(raw ? JSON.parse(raw).length : 0);
              } catch {}
            }}
          />
        )}
      </AnimatePresence>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        tabs={TABS}
        onTab={id => { setActiveTab(id); sound.whoosh(); }}
        onStockSearch={t => { setStockTicker(t); setActiveTab("stocks"); }}
        onAnalyze={handleAnalyze}
        onToggleDark={toggleDark}
        dark={dark}
      />

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal open={showHelpModal} onClose={() => setShowHelpModal(false)} />

      {/* What-If drawer */}
      <WhatIfDrawer
        open={whatIfOpen}
        onClose={() => setWhatIfOpen(false)}
        assets={assets}
        period={period}
        benchmark={benchmark}
        currentData={data}
        onApply={(a) => { setAssets(a); setWhatIfOpen(false); setTimeout(() => handleAnalyzeRef.current(), 50); }}
      />

      {/* Push notification prompt */}
      <AnimatePresence initial={false}>
        {showNotifPrompt && <NotificationPrompt onDismiss={() => setShowNotifPrompt(false)} />}
      </AnimatePresence>

      {/* Natural language edit — before/after modal */}
      <AnimatePresence initial={false}>
        {nlPending && (
          <motion.div
            // initial={false} required — do not remove
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}
            onClick={() => setNlPending(null)}
          >
            <motion.div
              // initial={false} required — do not remove
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 14, padding: "22px 22px 18px", maxWidth: 480, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.32)", maxHeight: "90vh", overflowY: "auto" }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 14, background: nlPending.mode === "preview" ? "rgba(59,130,246,0.8)" : "var(--accent)", borderRadius: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>
                    {nlPending.mode === "preview" ? "Simulated Preview" : "Confirm Change"}
                  </span>
                  {nlPending.mode === "preview" && (
                    <span style={{ fontSize: 9, letterSpacing: 1, color: "rgba(59,130,246,0.9)", background: "rgba(59,130,246,0.1)", border: "0.5px solid rgba(59,130,246,0.3)", borderRadius: 4, padding: "2px 6px" }}>NOT APPLIED</span>
                  )}
                </div>
                <button onClick={() => setNlPending(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 16, lineHeight: 1, padding: "2px 4px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* AI explanation */}
              {nlPending.explanation && (
                <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.65, marginBottom: 14, padding: "10px 12px", background: "var(--bg3)", borderRadius: 8, border: "0.5px solid var(--border)" }}>
                  {nlPending.explanation}
                </p>
              )}

              {/* Before / after comparison table */}
              <div style={{ borderRadius: 8, border: "0.5px solid var(--border)", overflow: "hidden", marginBottom: 12 }}>
                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 10px 56px 56px", gap: 0, padding: "6px 12px", background: "var(--bg2)", borderBottom: "0.5px solid var(--border)" }}>
                  {["Ticker", "Before", "", "After", "Change"].map((h, i) => (
                    <span key={i} style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", textAlign: i > 0 ? "right" : "left" }}>{h}</span>
                  ))}
                </div>
                {(() => {
                  const beforeMap = new Map((nlPending.before_tickers || []).map((t, i) => [t, (nlPending.before_weights || [])[i] ?? 0]));
                  const afterMap = new Map(nlPending.tickers.map((t, i) => [t, nlPending.weights[i]]));
                  const allTickers = Array.from(new Set([...(nlPending.before_tickers || []), ...nlPending.tickers]));
                  return allTickers.map((t, rowIdx) => {
                    const before = beforeMap.has(t) ? beforeMap.get(t)! : null;
                    const after = afterMap.has(t) ? afterMap.get(t)! : null;
                    const delta = (after ?? 0) - (before ?? 0);
                    const isNew = before === null;
                    const isRemoved = after === null;
                    const deltaColor = delta > 0.05 ? "#5cb88a" : delta < -0.05 ? "#e05c5c" : "var(--text3)";
                    return (
                      <div key={t} style={{ display: "grid", gridTemplateColumns: "1fr 56px 10px 56px 56px", alignItems: "center", padding: "7px 12px", borderBottom: rowIdx < allTickers.length - 1 ? "0.5px solid var(--border)" : "none", background: isNew ? "rgba(92,184,138,0.04)" : isRemoved ? "rgba(224,92,92,0.04)" : "transparent" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{t}</span>
                          {isNew && <span style={{ fontSize: 8, letterSpacing: 0.8, color: "#5cb88a", background: "rgba(92,184,138,0.12)", padding: "1px 5px", borderRadius: 3 }}>NEW</span>}
                          {isRemoved && <span style={{ fontSize: 8, letterSpacing: 0.8, color: "#e05c5c", background: "rgba(224,92,92,0.12)", padding: "1px 5px", borderRadius: 3 }}>OUT</span>}
                        </span>
                        <span style={{ fontFamily: "Space Mono, monospace", fontSize: 11, color: "var(--text3)", textAlign: "right" }}>{before !== null ? `${before.toFixed(1)}%` : "--"}</span>
                        <span style={{ fontSize: 9, color: "var(--text3)", textAlign: "center" }}>→</span>
                        <span style={{ fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: after !== null ? 600 : 400, color: after !== null ? "var(--text)" : "var(--text3)", textAlign: "right" }}>{after !== null ? `${after.toFixed(1)}%` : "--"}</span>
                        <span style={{ fontFamily: "Space Mono, monospace", fontSize: 11, color: deltaColor, textAlign: "right" }}>
                          {isNew ? `+${(after ?? 0).toFixed(1)}%` : isRemoved ? `(${(before ?? 0).toFixed(1)}%)` : Math.abs(delta) > 0.05 ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%` : "--"}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Impact metrics */}
              {nlPending.impact && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "Largest position", before: `${nlPending.impact.concentration_before.toFixed(1)}%`, after: `${nlPending.impact.concentration_after.toFixed(1)}%`, improved: nlPending.impact.concentration_after < nlPending.impact.concentration_before - 0.5 },
                    { label: "Holdings count", before: String(nlPending.impact.holdings_before), after: String(nlPending.impact.holdings_after), improved: nlPending.impact.holdings_after >= nlPending.impact.holdings_before },
                  ].map(m => (
                    <div key={m.label} style={{ padding: "8px 10px", background: "var(--bg3)", borderRadius: 7, border: "0.5px solid var(--border)" }}>
                      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 5 }}>{m.label}</div>
                      <div style={{ fontFamily: "Space Mono, monospace", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "var(--text3)" }}>{m.before}</span>
                        <span style={{ color: "var(--text3)", fontSize: 9 }}>→</span>
                        <span style={{ color: m.improved ? "#5cb88a" : m.after === m.before ? "var(--text2)" : "#e05c5c", fontWeight: 700 }}>{m.after}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Impact summary */}
              {nlPending.impact_summary && (
                <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6, marginBottom: 16, fontStyle: "italic" }}>
                  {nlPending.impact_summary}
                </p>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    const newAssets = nlPending.tickers.map((ticker, i) => ({ ticker, weight: nlPending.weights[i] / 100 }));
                    setAssets(newAssets);
                    setNlPending(null);
                    setNlCommand("");
                  }}
                  style={{ flex: 1, padding: "10px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 1.5, textTransform: "uppercase", background: "var(--bg)", color: "var(--accent)", border: "1px solid rgba(201,168,76,0.55)", borderRadius: 8, cursor: "pointer", transition: "opacity 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  {nlPending.mode === "preview" ? "Apply Anyway" : "Apply"}
                </button>
                <button
                  onClick={() => setNlPending(null)}
                  style={{ flex: 1, padding: "10px", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase", background: "transparent", color: "var(--text3)", border: "0.5px solid var(--border)", borderRadius: 8, cursor: "pointer" }}
                >
                  {nlPending.mode === "preview" ? "Close" : "Cancel"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback button */}
      <FeedbackButton hasChat />

      {/* Back to top */}
      <button
        className={`back-to-top${showBackToTop ? " visible" : ""}`}
        onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        title="Back to top">
        ↑
      </button>

    </div>
  );
}
