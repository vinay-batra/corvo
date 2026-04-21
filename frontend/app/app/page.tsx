"use client";

import { useState, useEffect, useRef } from "react";
import { posthog } from "@/lib/posthog";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  LayoutDashboard, ShieldAlert, FlaskConical, Newspaper,
  MessageSquare, Eye, PanelLeftOpen,
  Sun, Moon, CandlestickChart, Sparkles, BookOpen,
  Calendar, CheckCircle2,
} from "lucide-react";
import CommandPalette from "../../components/CommandPalette";
import InfoModal from "../../components/InfoModal";
import StockDetail from "../../components/StockDetail";
import { OverviewSkeleton } from "../../components/SkeletonLoader";
import { useSoundEffects, unlockAudio, SOUND_KEY } from "../../hooks/useSoundEffects";
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
import OnboardingModal from "../../components/OnboardingModal";
import { fetchPortfolio } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import AlertsPanel from "../../components/AlertsPanel";
import WhatIfDrawer from "../../components/WhatIfDrawer";
import StockCompare from "../../components/StockCompare";
import Watchlist from "../../components/Watchlist";
import MarketBrief from "../../components/MarketBrief";
import EmailPreferences from "../../components/EmailPreferences";
import ReferralModal from "../../components/ReferralModal";
import SettingsPage from "../settings/page";
import ShareImageModal from "../../components/ShareImageModal";
import GreetingBar from "../../components/GreetingBar";
import KeyboardShortcutsModal from "../../components/KeyboardShortcutsModal";
import PositionsTab from "../../components/PositionsTab";
import MobileBottomNav from "../../components/MobileBottomNav";
import DashboardTour from "../../components/DashboardTour";
import FeedbackButton from "../../components/FeedbackButton";
import { type SavedPortfolioLine } from "../../components/PerformanceChart";

const TABS = [
  { id: "overview",   label: "Dashboard",  Icon: LayoutDashboard,  href: null },
  { id: "positions",  label: "Positions",  Icon: CandlestickChart, href: null },
  { id: "stocks",     label: "Stocks",     Icon: CandlestickChart, href: null },
  { id: "risk",       label: "Income & Tax", Icon: ShieldAlert,      href: null },
  { id: "simulate",   label: "Simulations",Icon: FlaskConical,     href: null },
  { id: "compare",    label: "Compare",    Icon: Eye,              href: null },
  { id: "news",       label: "News",       Icon: Newspaper,        href: null },
  { id: "watchlist",  label: "Watchlist",  Icon: Eye,              href: null },
  { id: "learn",      label: "Learn",      Icon: BookOpen,         href: "/learn" },
] as const;

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
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
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
    const isDark = stored ? stored === "dark" : true; // default: dark
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
    sidebarTop: { padding: "14px 16px 12px", borderBottom: "0.5px solid var(--border)" },
    logo:       { fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "var(--text)" },
    logoSub:    { fontSize: 11, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const },
    section:    { padding: "10px 14px", borderBottom: "0.5px solid var(--border)" },
    label:      { fontSize: 9, letterSpacing: 3, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 8 },
    main:       { flex: 1, display: "flex", flexDirection: "column" as const, background: "var(--bg)", minWidth: 0, overflow: "hidden" },
    topbar:     { height: 52, flexShrink: 0, borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "var(--bg2)", gap: 8 },
    content:    { flex: 1, overflowY: "auto" as const, overflowX: "hidden" as const, padding: "20px 24px", overscrollBehavior: "none", overscrollBehaviorY: "none" },
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
    { n: "1", label: "Add a ticker", desc: "Search any stock, ETF, or fund in the sidebar" },
    { n: "2", label: "Set your weight", desc: "Enter how much of your portfolio it represents" },
    { n: "3", label: "Hit Analyze", desc: "Get Sharpe ratio, Monte Carlo, drawdown, and more" },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 96px)", gap: 32, textAlign: "center", padding: "0 32px" }}>
      <div>
        <p style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.3px", color: "var(--text)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>BUILD YOUR PORTFOLIO</p>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, maxWidth: 300 }}>
          Three steps to full risk analysis and AI insights.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid var(--accent)", background: "rgba(184,134,11,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                {s.n}
              </div>
              <div style={{ paddingTop: 4 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 11, color: "var(--text3)", opacity: 1, letterSpacing: 0.3 }}>
        Or press Presets to start with a sample portfolio
      </p>
    </motion.div>
  );
}

const COMPARE_COLORS = ["#b8860b", "#b47ee0", "#5cb88a", "#e05c5c"];
const ComparePlot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

// ── Portfolio Comparison ──────────────────────────────────────────────────────
function CompareTab({ assets, period, benchmark, benchmarkLabel, currentData }: { assets: { ticker: string; weight: number }[]; period: string; benchmark: string; benchmarkLabel: string; currentData: any }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [savedPortfolios, setSavedPortfolios] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const insightKeyRef = useRef<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("corvo_saved_portfolios");
      if (raw) setSavedPortfolios(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    const activeNow = [
      { id: "__current__", name: "Current", result: currentData },
      ...savedPortfolios
        .filter(p => selected.includes(p.id) && results[p.id])
        .map(p => ({ id: p.id, name: p.name, result: results[p.id] })),
    ].filter(p => p.result);
    if (activeNow.length < 2) return;
    const key = activeNow.map(p => p.id).sort().join(",");
    if (key === insightKeyRef.current) return;
    insightKeyRef.current = key;
    setAiLoading(true); setAiInsight(""); setAiError(false);
    const summary = activeNow.map(p => `${p.name}: Return ${((p.result.portfolio_return||0)*100).toFixed(1)}%, Sharpe ${(p.result.sharpe_ratio||0).toFixed(2)}, Volatility ${((p.result.portfolio_volatility||0)*100).toFixed(1)}%, Drawdown ${((p.result.max_drawdown||0)*100).toFixed(1)}%`).join(" | ");
    fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Compare these portfolios and give a clear 2-3 sentence recommendation on which is better and why: ${summary}. Focus on risk-adjusted returns and max drawdown.`,
        history: [],
        portfolio_context: {},
      }),
    })
      .then(r => r.json())
      .then(d => { setAiInsight(d.reply || ""); setAiLoading(false); })
      .catch(() => { setAiError(true); setAiLoading(false); });
  }, [selected, results, currentData, savedPortfolios]);

  const analyzePortfolio = async (portfolio: any) => {
    if (results[portfolio.id] || loading[portfolio.id]) return;
    setLoading(p => ({ ...p, [portfolio.id]: true }));
    try {
      const total = portfolio.assets.reduce((s: number, a: any) => s + a.weight, 0);
      const norm = portfolio.assets.map((a: any) => ({ ...a, weight: a.weight / total }));
      const r = await fetch(`${API_URL}/portfolio?tickers=${norm.map((a: any) => a.ticker).join(",")}&weights=${norm.map((a: any) => a.weight.toFixed(4)).join(",")}&period=${period}&benchmark=${benchmark}`);
      const d = await r.json(); setResults(p => ({ ...p, [portfolio.id]: d }));
    } catch {}
    setLoading(p => ({ ...p, [portfolio.id]: false }));
  };

  const toggleSelect = (id: string, portfolio: any) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    if (!selected.includes(id)) analyzePortfolio(portfolio);
  };

  const allPortfolios = [
    { id: "__current__", name: "Current", result: currentData, loading: false, tickers: assets.map(a => a.ticker) },
    ...savedPortfolios.map(p => ({ id: p.id, name: p.name, result: results[p.id] || null, loading: loading[p.id] || false, tickers: (p.assets || []).map((a: any) => a.ticker), raw: p })),
  ];
  const active = allPortfolios.filter(p => (p.id === "__current__" || selected.includes(p.id)) && p.result);

  const generateAiInsight = async () => {
    if (active.length < 2) return;
    setAiLoading(true); setAiInsight(""); setAiError(false);
    try {
      const summary = active.map(p => `${p.name}: Return ${((p.result.portfolio_return||0)*100).toFixed(1)}%, Sharpe ${(p.result.sharpe_ratio||0).toFixed(2)}, Volatility ${((p.result.portfolio_volatility||0)*100).toFixed(1)}%, Drawdown ${((p.result.max_drawdown||0)*100).toFixed(1)}%`).join(" | ");
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Compare these portfolios and give a clear 2-3 sentence recommendation on which is better and why: ${summary}. Focus on risk-adjusted returns and max drawdown.`,
          history: [],
          portfolio_context: {},
        }),
      });
      const d = await res.json();
      setAiInsight(d.reply || "");
    } catch { setAiError(true); }
    setAiLoading(false);
  };

  const metrics = [
    { key: "portfolio_return",    label: "Annual Return",  fmt: (v: number) => `${(v*100).toFixed(1)}%`,  positive: true },
    { key: "portfolio_volatility",label: "Volatility",     fmt: (v: number) => `${(v*100).toFixed(1)}%`,  positive: false },
    { key: "sharpe_ratio",        label: "Sharpe Ratio",   fmt: (v: number) => v.toFixed(2),               positive: true },
    { key: "max_drawdown",        label: "Max Drawdown",   fmt: (v: number) => `${(v*100).toFixed(1)}%`,   positive: false },
  ];

  // Normalize value 0–100 for radar
  const normalize = (val: number, min: number, max: number) => max === min ? 50 : Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));

  const radarData = active.length >= 2 ? (() => {
    const dims = [
      { label: "Return",       vals: active.map(p => (p.result.portfolio_return || 0) * 100) },
      { label: "Sharpe",       vals: active.map(p => (p.result.sharpe_ratio || 0)) },
      { label: "Stability",    vals: active.map(p => 100 - (p.result.portfolio_volatility || 0) * 100) },
      { label: "Resilience",   vals: active.map(p => 100 - Math.abs((p.result.max_drawdown || 0) * 100)) },
      { label: "Diversif.",    vals: active.map(p => Math.min(100, (p.tickers.length / 8) * 100)) },
    ];
    return active.map((p, pi) => {
      const scores = dims.map(d => {
        const min = Math.min(...d.vals); const max = Math.max(...d.vals);
        return normalize(d.vals[pi], min, max);
      });
      return {
        type: "scatterpolar" as const,
        r: [...scores, scores[0]],
        theta: [...dims.map(d => d.label), dims[0].label],
        fill: "toself",
        name: p.name,
        line: { color: COMPARE_COLORS[pi % COMPARE_COLORS.length], width: 1.5 },
        fillcolor: COMPARE_COLORS[pi % COMPARE_COLORS.length] + "22",
      };
    });
  })() : [];

  const overlapData = active.length >= 2 ? (() => {
    const sets = active.map(p => new Set<string>(p.tickers));
    const result: { a: string; b: string; shared: string[]; unique_a: string[]; unique_b: string[] }[] = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        result.push({
          a: active[i].name, b: active[j].name,
          shared: (Array.from(sets[i]) as string[]).filter((t: string) => sets[j].has(t)),
          unique_a: (Array.from(sets[i]) as string[]).filter((t: string) => !sets[j].has(t)),
          unique_b: (Array.from(sets[j]) as string[]).filter((t: string) => !sets[i].has(t)),
        });
      }
    }
    return result;
  })() : [];

  return (
    <div>
      {/* Header + portfolio selector */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 20px", background: "var(--card-bg)", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: savedPortfolios.length > 0 || active.length > 0 ? 12 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 1 }} />
            <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Portfolio Comparison</span>
            <InfoModal title="Portfolio Comparison" sections={[{ label: "How it works", text: "Add multiple saved portfolios to compare their risk, return, and Sharpe ratio side by side. Save a portfolio first from the Dashboard." }]} />
            {active.length > 0 && <span style={{ fontSize: 11, color: "var(--text3)" }}>· {active.length} portfolio{active.length !== 1 ? "s" : ""} · {period.toUpperCase()} · vs {benchmarkLabel}</span>}
          </div>
        </div>
        {savedPortfolios.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {savedPortfolios.map(p => (
              <button key={p.id} onClick={() => toggleSelect(p.id, p)}
                style={{ padding: "6px 14px", fontSize: 12, borderRadius: 8, cursor: "pointer", transition: "all 0.15s", background: selected.includes(p.id) ? "var(--text)" : "transparent", border: "0.5px solid var(--border2)", color: selected.includes(p.id) ? "var(--bg)" : "var(--text2)" }}>
                {loading[p.id] ? "..." : p.name}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {[
              { n: "1", title: "Build a portfolio", desc: "Add tickers and weights in the left sidebar." },
              { n: "2", title: "Analyze it", desc: "Click Analyze (or press ↵) to run the full analysis." },
              { n: "3", title: "Save it", desc: "Use the Save button in the sidebar, it works without an account." },
              { n: "4", title: "Compare side by side", desc: "Return here to select saved portfolios and compare key metrics." },
            ].map(step => (
              <div key={step.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", border: "0.5px solid rgba(184,134,11,0.4)", background: "rgba(184,134,11,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0, fontFamily: "var(--font-mono)" }}>{step.n}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>{step.title}</p>
                  <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.55 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {active.length > 0 && (
        <>
          {/* Side-by-side metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(active.length, 4)}, 1fr)`, gap: 10, marginBottom: 12 }}>
            {active.map((p, pi) => {
              const color = COMPARE_COLORS[pi % COMPARE_COLORS.length];
              return (
                <div key={p.id} style={{ border: `0.5px solid ${color}44`, borderRadius: 12, overflow: "hidden", background: "var(--card-bg)" }}>
                  <div style={{ padding: "12px 16px", background: `${color}10`, borderBottom: `0.5px solid ${color}22` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{p.tickers.slice(0, 4).join(" · ")}{p.tickers.length > 4 ? ` +${p.tickers.length - 4}` : ""}</div>
                  </div>
                  {metrics.map((m) => {
                    const vals = active.map(q => q.result[m.key] ?? 0);
                    const best = m.positive ? Math.max(...vals) : Math.min(...vals);
                    const val = p.result[m.key] ?? 0;
                    const allEqual = vals.every(v => v === vals[0]);
                    const isBest = !allEqual && val === best;
                    return (
                      <div key={m.key} style={{ padding: "9px 16px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>{m.label}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: isBest ? 700 : 400, color: isBest ? color : "var(--text2)" }}>
                          {m.fmt(val)}{isBest && <span style={{ marginLeft: 4, fontSize: 11 }}>★</span>}
                        </span>
                      </div>
                    );
                  })}
                  <div style={{ padding: "10px 16px" }}>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 5, letterSpacing: 2 }}>SHARPE SCORE</div>
                    <div style={{ height: 3, background: "var(--bg3)", borderRadius: 2, marginBottom: 4 }}>
                      <div style={{ width: `${Math.min(100, Math.max(0, ((p.result.sharpe_ratio || 0) / 3) * 100))}%`, height: "100%", background: color, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color, fontWeight: 600 }}>{(p.result.sharpe_ratio || 0).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Radar + Overlap grid */}
          {active.length >= 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 1 }} />
                  <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Radar Comparison</span>
                </div>
                <ComparePlot
                  data={radarData}
                  layout={{
                    polar: {
                      bgcolor: "transparent",
                      radialaxis: { visible: true, range: [0, 100], gridcolor: "rgba(255,255,255,0.06)", tickfont: { size: 8, color: "rgba(232,224,204,0.3)" }, showticklabels: false },
                      angularaxis: { gridcolor: "rgba(255,255,255,0.06)", tickfont: { size: 9, color: "rgba(232,224,204,0.5)" } },
                    },
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                    showlegend: true,
                    legend: { font: { size: 10, color: "rgba(232,224,204,0.6)" }, bgcolor: "transparent" },
                    margin: { t: 10, b: 10, l: 30, r: 30 },
                    height: 260,
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 1 }} />
                  <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Holding Overlap</span>
                </div>
                {overlapData.map((ov, i) => (
                  <div key={i} style={{ marginBottom: i < overlapData.length - 1 ? 16 : 0 }}>
                    <p style={{ fontSize: 11, color: "var(--text2)", marginBottom: 8 }}>{ov.a} vs {ov.b}</p>
                    {ov.shared.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <p style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", marginBottom: 5 }}>SHARED ({ov.shared.length})</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {ov.shared.map(t => <span key={t} style={{ padding: "2px 8px", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600, borderRadius: 4, background: "rgba(184,134,11,0.1)", color: "var(--accent)", border: "0.5px solid rgba(184,134,11,0.2)" }}>{t}</span>)}
                        </div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[{ label: ov.a, tickers: ov.unique_a, ci: 0 }, { label: ov.b, tickers: ov.unique_b, ci: 1 }].map(col => (
                        <div key={col.label}>
                          <p style={{ fontSize: 10, letterSpacing: 2, color: COMPARE_COLORS[col.ci], marginBottom: 5 }}>ONLY {col.label.toUpperCase()}</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {col.tickers.length > 0 ? col.tickers.map(t => <span key={t} style={{ padding: "2px 6px", fontSize: 11, fontFamily: "var(--font-mono)", borderRadius: 4, background: "var(--bg3)", color: "var(--text2)" }}>{t}</span>) : <span style={{ fontSize: 11, color: "var(--text3)" }}>N/A</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {ov.shared.length === 0 && <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>No holdings in common. Highly independent portfolios.</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI insight: auto-generated */}
          {active.length >= 2 && (aiInsight || aiLoading || aiError) && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ border: "0.5px solid rgba(184,134,11,0.2)", borderRadius: 12, padding: "16px 18px", background: "rgba(184,134,11,0.04)", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Sparkles size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, letterSpacing: 2, color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>AI Comparison Insight</p>
                {aiLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {[100, 88, 72].map((w, i) => (
                      <div key={i} style={{ height: 12, width: `${w}%`, borderRadius: 4, background: "rgba(184,134,11,0.08)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                    ))}
                    <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
                  </div>
                ) : aiError ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>Could not generate insight.</span>
                    <button
                      onClick={generateAiInsight}
                      style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "0.5px solid rgba(184,134,11,0.3)", borderRadius: 5, padding: "3px 9px", cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(184,134,11,0.08)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>{aiInsight}</p>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

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
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 800, width: "min(380px, calc(100vw - 32px)", background: "var(--card-bg)", border: "0.5px solid rgba(184,134,11,0.3)", borderRadius: 14, padding: "16px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", display: "flex", gap: 14, alignItems: "flex-start" }}>
      <span style={{ flexShrink: 0, display: "flex", alignItems: "center", color: "var(--accent)", paddingTop: 2 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Enable price alerts</p>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.55, marginBottom: 12 }}>
          Get notified when your stocks move. Enable browser notifications to stay on top of your alerts.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={enable} disabled={loading}
            style={{ flex: 1, padding: "8px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", background: "var(--accent)", color: "#0a0e14", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
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
  if (!data || data.length < 2) return <div style={{ width: 60, height: 24 }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 60, H = 24;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={positive ? "#5cb88a" : "#e05c5c"} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

interface WatchlistStockData { ticker: string; name?: string; price: number | null; change: number | null; change_pct: number | null; sparkline: number[]; }

function StocksSearch({ onSelect, onCompare }: { onSelect: (t: string) => void; onCompare: () => void }) {
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
    doFetch().catch(err => {
      console.warn("[StocksSearch] watchlist-data failed, retrying in 1s:", err);
      setTimeout(() => doFetch().catch(e => console.error("[StocksSearch] retry failed:", e)), 1000);
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

  const fmtPrice = (p: number | null) => p == null ? "—" : p >= 1000 ? `$${p.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : `$${p.toFixed(2)}`;
  const fmtPct   = (p: number | null) => p == null ? "" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 120px)", padding: "0 24px" }}>
    <div style={{ width: "100%", maxWidth: 760, position: "relative" }}>
      <style>{`
        @keyframes orb-float { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-18px) } }
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

      {/* Compare Stocks button */}
      {!q && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, zIndex: 1, position: "relative" }}>
          <button
            onClick={onCompare}
            style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "rgba(184,134,11,0.08)", padding: "8px 24px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.03em" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "var(--bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(184,134,11,0.08)"; e.currentTarget.style.color = "var(--accent)"; }}>
            ⇄ Compare Stocks
          </button>
        </div>
      )}

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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {CARD_TICKERS.map((ticker, i) => {
                const s = liveData[ticker];
                const pos = (s?.change_pct ?? 0) >= 0;
                return (
                  <motion.div
                    key={ticker}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                    onClick={() => onSelect(ticker)}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "0.5px solid var(--border)", background: "var(--bg2)", cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSetupBanner, setShowSetupBanner] = useState(false);
  const [showProfile, setShowProfile]     = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [benchOpen, setBenchOpen]         = useState(false);
  const [localBenchmark, setLocalBenchmark] = useState("^GSPC");
  const [localBenchmarkSeries, setLocalBenchmarkSeries] = useState<{ ticker: string; cumulative: number[] } | null>(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
const [paletteOpen, setPaletteOpen]   = useState(false);
  const [stockTicker, setStockTicker]   = useState<string | null>(null);
  const [compareMode, setCompareMode]   = useState(false);
  const sound = useSoundEffects();
  const [showAlerts, setShowAlerts]         = useState(false);
  const [showEmailPrefs, setShowEmailPrefs]     = useState(false);
  const [unsubscribeMode, setUnsubscribeMode]   = useState(false);
  const [showReferral, setShowReferral]         = useState(false);
  const [errorMsg, setErrorMsg]                 = useState<string | null>(null);
  const errorDismissRef                         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tourNeededRef                           = useRef<boolean>(false);
  const [alertCount, setAlertCount]   = useState(0);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showDashboardTour, setShowDashboardTour] = useState(false);
  const [savedPortfolioLines, setSavedPortfolioLines] = useState<SavedPortfolioLine[]>([]);
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);
  const [userId, setUserId]         = useState<string | null>(null);
  const [navProfile, setNavProfile] = useState<{ displayName: string; avatarUrl: string | null }>({ displayName: "", avatarUrl: null });
  const referralCodeRef             = useRef<string>("");
  const [shareToast, setShareToast] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
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
  const contentRef = useRef<HTMLElement | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { dark, toggle: toggleDark }  = useTheme();
  const { currency, rate, setCurrency } = useCurrency();
  const S = useS();

  useEffect(() => {
    const g = localStorage.getItem("corvo_goals");
    if (g && g !== "skipped") { try { setGoals(JSON.parse(g)); } catch {} }
    // showGoals is controlled by the onboarding Supabase check below, not localStorage

    // Load alert count
    try {
      const raw = localStorage.getItem("corvo_alerts");
      if (raw) setAlertCount(JSON.parse(raw).length);
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

    // Check onboarding status: Supabase is the source of truth; localStorage is a fallback
    (async () => {
      // Show setup banner if user previously skipped onboarding
      if (localStorage.getItem("corvo_onboarding_skipped") === "true" &&
          localStorage.getItem("corvo_setup_banner_dismissed") !== "true") {
        setShowSetupBanner(true);
      }

      // Belt-and-suspenders: skip entirely if tour was already completed this browser session
      if (localStorage.getItem("corvo_tour_completed") === "true") return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Load nav profile (avatar + display name)
      const { data: navP } = await supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).single();
      if (navP) setNavProfile({ displayName: navP.display_name || "", avatarUrl: navP.avatar_url || null });

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      const needsTour = !profile || !profile.onboarding_completed;
      if (!needsTour) return;

      tourNeededRef.current = true;

      // New user: create profile row and send welcome email for OAuth signups
      if (!profile) {
        await supabase.from("profiles").upsert({
          id: user.id,
          onboarding_completed: false,
          updated_at: new Date().toISOString(),
        });
        if (user.app_metadata?.provider && user.app_metadata.provider !== "email") {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || null;
          fetch(`${apiUrl}/send-welcome-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email, display_name: displayName, user_id: user.id }),
          }).catch(() => {});
        }
      }

      // Show onboarding modal for new users, unless demo mode or shared portfolio
      const params2 = new URLSearchParams(window.location.search);
      if (!params2.get("portfolio") && params2.get("demo") !== "true") {
        setShowOnboarding(true);
      }
    })();
  }, []);

  const handleAnalyze = async () => {
    const valid = assets.filter(a => a.ticker && a.weight > 0);
    if (!valid.length) return;
    setLoading(true); setData(null); setErrorMsg(null); setAnalyzeComplete(false);
    if (errorDismissRef.current) clearTimeout(errorDismissRef.current);
    try {
      const pendingRef = referralCodeRef.current;
      const result = await fetchPortfolio(valid, period, benchmark, userId || "", pendingRef);
      // Clear pending referral after first successful analysis
      if (pendingRef) {
        referralCodeRef.current = "";
        localStorage.removeItem("corvo_pending_referral");
      }
      setData(result);
      setActiveTab("overview");
      setAnalyzeComplete(true);
      // Record the portfolio state that produced these results so we can detect drift
      lastAnalyzedAssetsRef.current = valid
        .map(a => `${a.ticker}:${a.weight.toFixed(4)}`)
        .sort().join(",");
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

  // Mark results stale whenever the portfolio changes after a successful analysis
  useEffect(() => {
    if (!data) return;
    const key = assets
      .filter(a => a.ticker && a.weight > 0)
      .map(a => `${a.ticker}:${a.weight.toFixed(4)}`)
      .sort().join(",");
    if (lastAnalyzedAssetsRef.current && key !== lastAnalyzedAssetsRef.current) {
      setPortfolioStale(true);
    }
  }, [assets, data]);

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
        const { data: dbPfs } = await supabase.from("portfolios").select("id,tickers,assets").eq("user_id", userId);
        const allPfs = [...(dbPfs || []).map((p: any) => ({ id: p.id, assets: p.assets || [] })), ...localPfs.map((p: any) => ({ id: p.id, assets: p.assets || [] }))];
        const uniqueIds = new Set<string>();
        for (const pf of allPfs) {
          if (!pf.id || uniqueIds.has(pf.id) || !pf.assets?.length) continue;
          uniqueIds.add(pf.id);
          const { data: hist } = await supabase.from("portfolio_snapshots").select("date").eq("portfolio_id", pf.id).eq("user_id", userId).gte("date", today).limit(1);
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
    if (!asked) setTimeout(() => setShowNotifPrompt(true), 3000);
  }, [userId]);

  const sharePortfolio = () => {
    if (!assets.length) return;
    const encoded = btoa(JSON.stringify(assets));
    const url = `${window.location.origin}/app?portfolio=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }).catch(() => {});
  };

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
      // Cmd+K / Ctrl+K or "/" → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(o => !o);
        return;
      }
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "/" && !isTyping && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      // "?" → keyboard shortcuts modal
      if (e.key === "?" && !isTyping) {
        e.preventDefault();
        setShowHelpModal(h => !h);
        return;
      }
      // Tab keyboard shortcuts (D, R, S, C, N, W, A) when not typing
      if (!isTyping && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key.toLowerCase() === "a") {
          e.preventDefault();
          setChatOpen(v => !v);
          sound.whoosh();
          return;
        }
        const navMap: Record<string, string> = {
          d: "overview", r: "risk", s: "simulate",
          c: "compare", n: "news", w: "watchlist",
        };
        if (navMap[e.key.toLowerCase()]) {
          e.preventDefault();
          setActiveTab(navMap[e.key.toLowerCase()]);
          sound.whoosh();
          return;
        }
      }
      // ESC → close any open modal/drawer
      if (e.key === "Escape") {
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
        if (showShareCard) { setShowShareCard(false); return; }
        return;
      }
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey) return;
      if (isTyping) return;
      handleAnalyzeRef.current();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen, stockTicker, whatIfOpen, showGoals, showProfile, showSettings, showAlerts, showEmailPrefs, showReferral, showShareCard, showHelpModal]);

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
      ["Annual Return (%)", (data.portfolio_return * 100).toFixed(2)],
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

  const Card = ({ children, style = {} }: any) => {
    const [hov, setHov] = useState(false);
    const cardStyle: React.CSSProperties = {
      ...S.card,
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
  };
  const CardHeader = ({ title }: { title: string }) => (
    <div style={S.cardHeader}><div style={S.cardAccent} /><span style={S.cardTitle}>{title}</span></div>
  );

  const SidebarInner = () => (
    <>
      {/* Logo → homepage */}
      <div style={{ ...S.sidebarTop, borderLeft: "3px solid var(--accent)", paddingLeft: 13 }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <img src="/corvo-logo.svg" width={26} height={26} alt="Corvo" style={{ flexShrink: 0, opacity: 0.9 }} />
          <div style={S.logo}>CORVO</div>
        </Link>
        <div style={S.logoSub}>Portfolio Intelligence</div>
      </div>

      {/* Builder */}
      <div id="tour-ticker-area" style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
        <PortfolioBuilder assets={assets} onAssetsChange={setAssets} onAnalyze={handleAnalyze} loading={loading} />
      </div>

      {/* Analyze button */}
      <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--border)" }}>
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
                id="tour-analyze-btn"
                onClick={canAnalyze ? handleAnalyze : undefined}
                disabled={!canAnalyze}
                animate={analyzeComplete ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                whileHover={canAnalyze ? { scale: 1.02 } : {}}
                whileTap={canAnalyze ? { scale: 0.97 } : {}}
                transition={{ duration: 0.35 }}
                style={{ width: "100%", padding: "11px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 2, textTransform: "uppercase" as const, background: loading ? "transparent" : canAnalyze ? "var(--bg)" : "var(--bg3)", color: loading || !canAnalyze ? "var(--text3)" : "var(--accent)", border: canAnalyze ? "1px solid rgba(201,168,76,0.55)" : "0.5px solid var(--border2)", borderRadius: 9, cursor: canAnalyze ? "pointer" : "not-allowed", transition: "background 0.2s, color 0.2s, border-color 0.2s", animation: loading ? "analyze-ring 1.2s ease-out infinite" : "none" }}>
                {loading ? "Analyzing..." : "Analyze"}
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
        <AnimatePresence>
          {benchOpen && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
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
        @media(max-width:768px){
          .c-sidebar{display:none!important}
          .c-topbar{display:none!important}
          .c-mob-bar{display:flex!important}
          .c-mob-tabs{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important}
          .c-metrics{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
          .c-bgrid{grid-template-columns:1fr!important}
          .c-risk-grid{grid-template-columns:1fr!important}
          .c-content{padding:12px 10px!important;padding-bottom:80px!important}
          .c-mob-analyze{display:flex!important}
          .c-ai-tab{height:calc(100dvh - 136px)!important}
          .c-mob-add{display:flex!important}
          .c-mob-bottom-nav{display:flex!important}
        }
        @media(min-width:769px){
          .c-mob-bar{display:none!important}
          .c-mob-tabs{display:none!important}
          .c-mob-drawer{display:none!important}
          .c-mob-analyze{display:none!important}
          .c-mob-add{display:none!important}
          .c-mob-bottom-nav{display:none!important}
        }
        .c-mob-tabs{scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
        .c-mob-tabs::-webkit-scrollbar{display:none}
        /* Analyze button pulse while loading */
        .c-mob-analyze[data-loading=true]{animation:analyze-ring 1.2s ease-out infinite}
      `}</style>

      {/* Desktop sidebar */}
      <div
        className="c-sidebar"
        style={{ width: 340, flexShrink: 0, borderRight: "0.5px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--bg2)", overflow: "hidden", position: "relative" }}>
        {SidebarInner()}
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />
            <motion.div initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="c-mob-drawer"
              style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 260, background: "var(--bg2)", borderRight: "0.5px solid var(--border)", zIndex: 201, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {SidebarInner()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div style={{ ...S.main, flexDirection: "row" as const }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, minWidth: 0, overflow: "hidden" }}>
        {/* Mobile top bar */}
        <div className="c-mob-bar" style={{ height: 48, borderBottom: "0.5px solid var(--border)", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "var(--bg)", flexShrink: 0 }}>
          <button aria-label="Open sidebar" onClick={() => setSidebarOpen(true)} style={{ width: 32, height: 32, background: "none", border: "0.5px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PanelLeftOpen size={15} />
          </button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "var(--text)" }}>CORVO</span>
          <DarkModeToggle dark={dark} toggle={toggleDark} />
        </div>

        {/* Mobile tabs */}
        <div className="c-mob-tabs" style={{ borderBottom: "0.5px solid var(--border)", padding: "0 8px", gap: 2, overflowX: "auto", flexShrink: 0, background: "var(--bg)" }}>
          {TABS.map(tab => {
            const TabIcon = tab.Icon;
            const isActive = activeTab === tab.id;
            const mobStyle: React.CSSProperties = { padding: "10px 10px", fontSize: 11, borderRadius: 6, border: "none", background: isActive ? "var(--bg3)" : "transparent", color: isActive ? "var(--text)" : "var(--text3)", cursor: "pointer", fontWeight: isActive ? 500 : 400, whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" };
            if (tab.href) return <Link key={tab.id} href={tab.href} style={mobStyle}><TabIcon size={11} /> {tab.label}</Link>;
            return <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={mobStyle}><TabIcon size={11} /> {tab.label}</button>;
          })}
        </div>

        {/* Desktop topbar */}
        <header className="c-topbar" style={S.topbar}>
          {/* Tabs with animated underline indicator */}
          <div style={{ display: "flex", gap: 0, flex: 1, overflowX: "auto", position: "relative" }}>
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
                      style={{ position: "absolute", bottom: 0, left: "10%", right: "10%", height: 2, borderRadius: 1, background: "var(--accent)", zIndex: 0 }}
                      transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    />
                  )}
                  <span style={{ position: "relative", zIndex: 1 }}>
                    {tab.label}
                  </span>
                </>
              );
              if (tab.href) return <Link key={tab.id} href={tab.href} style={tabStyle}>{content}</Link>;
              return <button key={tab.id} onClick={() => { sound.whoosh(); setActiveTab(tab.id); if (tab.id === "stocks") setStockTicker(null); }} style={tabStyle}>{content}</button>;
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {/* Alerts bell */}
            <button onClick={() => setShowAlerts(true)} title="Alerts" aria-label="Price alerts"
              style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text2)" }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {alertCount > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", border: "1.5px solid var(--bg)" }} />
              )}
            </button>
            <div id="tour-dark-mode-toggle"><DarkModeToggle dark={dark} toggle={toggleDark} /></div>
            {/* Export dropdown */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setOverflowOpen(o => !o)}
                title="Export"
                style={{ height: 32, padding: "0 10px", borderRadius: 8, border: `0.5px solid ${overflowOpen ? "rgba(184,134,11,0.4)" : "var(--border)"}`, background: overflowOpen ? "rgba(184,134,11,0.06)" : "transparent", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-mono)", color: overflowOpen ? "var(--accent)" : "var(--text3)", display: "flex", alignItems: "center", gap: 5, letterSpacing: 0.5, transition: "all 0.15s", whiteSpace: "nowrap" }}
                onMouseEnter={e => { if (!overflowOpen) { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}}
                onMouseLeave={e => { if (!overflowOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}}>
                Export ↓
              </button>
              {overflowOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setOverflowOpen(false)} />
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 10, overflow: "hidden", zIndex: 100, minWidth: 160, boxShadow: "var(--shadow-md)" }}>
                    {data && (
                      <button onClick={() => { exportCSV(); setOverflowOpen(false); }}
                        style={{ width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 12, color: "var(--text)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.12s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        ↓ Export CSV
                      </button>
                    )}
                    <ExportPDF data={data} assets={assets} menuItem onClose={() => setOverflowOpen(false)} />
                    {data && (
                      <button onClick={() => { setShowShareCard(true); setOverflowOpen(false); }}
                        style={{ width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 12, color: "var(--text)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.12s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        ↗ Share
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div id="tour-profile-btn">
              <UserMenu
                onEmailPrefs={() => setShowEmailPrefs(true)}
                onReferral={() => setShowReferral(true)}
                onSettings={() => setShowSettings(true)}
                onProfile={() => setShowProfile(true)}
                onReplayOnboarding={() => {
                  localStorage.removeItem("corvo_onboarding_skipped");
                  localStorage.removeItem("corvo_setup_banner_dismissed");
                  setShowSettings(false);
                  setShowOnboarding(true);
                }}
                onReplayTour={() => {
                  localStorage.removeItem("corvo_tour_completed");
                  setShowSettings(false);
                  setShowDashboardTour(true);
                }}
                avatarUrl={navProfile.avatarUrl}
                displayName={navProfile.displayName}
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main ref={contentRef} className="c-content page-fadein" style={S.content}>
          {/* Setup banner (shown when user skipped onboarding) */}
          <AnimatePresence>
            {showSetupBanner && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ border: "0.5px solid rgba(184,134,11,0.25)", borderRadius: 10, padding: "11px 16px", background: "rgba(184,134,11,0.05)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--accent)", fontSize: 13, flexShrink: 0 }}>◎</span>
                  <span style={{ fontSize: 13, color: "rgba(232,224,204,0.65)", lineHeight: 1.4 }}>
                    Complete your setup: add your portfolio to unlock AI insights and risk analysis.
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => { setShowSetupBanner(false); setShowOnboarding(true); }}
                    style={{ padding: "6px 14px", fontSize: 11, fontWeight: 600, borderRadius: 6, background: "var(--accent)", border: "none", color: "#0a0e14", cursor: "pointer", transition: "opacity 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    Complete Setup
                  </button>
                  <button onClick={() => { setShowSetupBanner(false); localStorage.setItem("corvo_setup_banner_dismissed", "true"); }}
                    style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "rgba(184,134,11,0.1)", color: "rgba(232,224,204,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error banner */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ border: "0.5px solid rgba(224,92,92,0.4)", borderRadius: 10, padding: "12px 16px", background: "rgba(224,92,92,0.07)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#e05c5c" }}>{errorMsg}</span>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
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
          <AnimatePresence mode="wait">
            {activeTab === "stocks" ? (
              <motion.div key="stocks" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                {compareMode ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <button onClick={() => setCompareMode(false)}
                        style={{ padding: "6px 12px", fontSize: 11, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text3)", cursor: "pointer" }}>
                        ← Back
                      </button>
                      <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Stock Comparison</span>
                    </div>
                    <StockCompare />
                  </>
                ) : stockTicker ? (
                  <StockDetail ticker={stockTicker} onBack={() => setStockTicker(null)} onSelectTicker={t => setStockTicker(t)} />
                ) : (
                  <StocksSearch onSelect={setStockTicker} onCompare={() => setCompareMode(true)} />
                )}
              </motion.div>
            ) : activeTab === "positions" ? (
              <motion.div key="positions" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
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
              </motion.div>
            ) : !data && !loading ? (
              <motion.div key="empty" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <Empty />
              </motion.div>
            ) : loading ? (
              <motion.div key="loading" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}><OverviewSkeleton /></motion.div>
            ) : activeTab === "overview" ? (
              <motion.div key="overview" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                {/* Stale-portfolio banner */}
                {portfolioStale && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    style={{ border: "0.5px solid rgba(184,134,11,0.35)", borderRadius: 10, padding: "10px 16px", background: "rgba(184,134,11,0.07)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "var(--text2)" }}>
                      Your portfolio has changed. Results below may not reflect your current holdings.
                    </span>
                    <button
                      onClick={handleAnalyze}
                      style={{ padding: "6px 14px", fontSize: 11, fontWeight: 600, borderRadius: 6, background: "var(--accent)", border: "none", color: "#0a0e14", cursor: "pointer", flexShrink: 0 }}>
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
                <motion.div
                  key="stats-row"
                  className="c-metrics"
                  style={S.metricsGrid}
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
                <motion.div key="perf-card" initial={false} whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} transition={{ duration: 0.15 }}>
                  <Card>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ ...S.cardHeader, marginBottom: 0 }}><div style={S.cardAccent} /><span style={S.cardTitle}>Performance</span></div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                      content: <HealthScore data={data} />,
                      sections: [
                        { label: "Plain English", text: "A composite score from 0–100 that grades your portfolio on returns, risk-adjusted performance, stability, and resilience." },
                        { label: "Example", text: "Score 78 = Good. Strong returns and Sharpe ratio, but some volatility keeping it from Excellent." },
                        { label: "What's Good", text: "75–100 is Excellent. 50–74 Good. 25–49 Fair. Below 25 needs attention. Aim for 60+ for a solid long-term portfolio." },
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
                <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                  <motion.div key="allocation-card" initial={false} style={{ flex: 3 }}>
                    <Card style={{ marginBottom: 0, height: "100%" }}><CardHeader title="Allocation" /><Breakdown assets={assets} portfolioValue={portfolioInputValue} /></Card>
                  </motion.div>
                  <motion.div key="sector-card" initial={false} style={{ flex: 2 }}>
                    <Card style={{ marginBottom: 0, height: "100%" }}><TooltipCardHeader title="Sector Exposure" sections={[
                      { label: "Plain English", text: "Shows how your portfolio weight is distributed across market sectors, aggregated from each holding's sector classification." },
                      { label: "Example", text: "If AAPL and MSFT together make up 70% of your portfolio, Technology will show 70% exposure." },
                      { label: "What's Good", text: "A diversified portfolio spreads across 4+ sectors. Heavy concentration in one sector amplifies both gains and losses." },
                    ]} /><SectorExposureChart assets={assets} /></Card>
                  </motion.div>
                </div>
                {data && !isPortfolioSaved && (
                  <motion.div initial={false}
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
              <motion.div key="risk" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <div style={{ marginBottom: 12 }}>
                  <Card style={{ marginBottom: 0 }}><TooltipCardHeader title="Dividend Income" sections={[{label:"Plain English",text:"Shows the estimated annual dividend income from your holdings based on current yields and a $10,000 portfolio value."},{label:"Example",text:"If JNJ has a 3% yield and makes up 30% of your $10k portfolio, you'd earn ~$90/year from it."},{label:"What's Good",text:"Tickers highlighted in amber have an ex-dividend date within 30 days. You must own the stock before that date to receive the dividend."}]} /><DividendTracker assets={assets} /></Card>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Card style={{ marginBottom: 0 }}><TooltipCardHeader title="Tax Loss Harvesting" sections={[{label:"Plain English",text:"Identifies holdings trading below your purchase price that could be sold to realize a tax loss, then replaced with a similar investment to maintain market exposure."},{label:"Example",text:"If you bought NVDA at $150 and it's now $120, you can sell it for a $30/share loss to offset capital gains, then buy a sector ETF like SOXX to stay exposed to semiconductors."},{label:"What's Good",text:"The IRS wash-sale rule disallows the loss if you repurchase the same (or substantially identical) security within 30 days. Suggested replacements are deliberately different securities in the same sector."},{label:"How to use",text:"Enter your purchase prices for each ticker in the sidebar. Only tickers with a purchase price and a current unrealized loss will appear here."}]} /><TaxLossHarvester assets={assets} portfolioValue={portfolioInputValue} /></Card>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
              <motion.div key="simulate" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <Card><TooltipCardHeader title="Monte Carlo Simulation" sections={[
                  { label: "What it shows", text: "Monte Carlo simulation runs 8,500 randomized scenarios based on your portfolio's historical returns and volatility. The bands show the range of possible outcomes, not guarantees." },
                ]} /><MonteCarloChart assets={assets} period={period} /></Card>
              </motion.div>
            ) : activeTab === "compare" ? (
              <motion.div key="compare" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <CompareTab assets={assets} period={period} benchmark={benchmark} benchmarkLabel={benchLabel} currentData={data} />
              </motion.div>
            ) : activeTab === "news" ? (
              <motion.div key="news" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <Card><TooltipCardHeader title="Market News" sections={[{ label: "How it works", text: "Live news fetched for every ticker in your portfolio. Sentiment badges (Positive / Negative / Neutral) are determined by headline analysis." }]} /><NewsFeed assets={assets} /></Card>
              </motion.div>
            ) : activeTab === "watchlist" ? (
              <motion.div key="watchlist" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <Watchlist />
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
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Floating AI Chat button */}
      <motion.button
        id="tour-ai-chat-fab"
        onClick={() => setChatOpen(v => !v)}
        title="AI Chat (A)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", damping: 20 }}
        style={{
          position: "fixed", bottom: 28, right: 24, zIndex: 250,
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
        <MessageSquare size={20} color={chatOpen ? "var(--text2)" : "#0a0e14"} />
      </motion.button>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={id => { setActiveTab(id); sound.whoosh(); }}
        onProfile={() => setShowProfile(true)}
        onAiChat={() => { setChatOpen(v => !v); sound.whoosh(); }}
      />

      {/* Mobile: Add Tickers button (bottom-left) */}
      <motion.button
        className="c-mob-add"
        onClick={() => setSidebarOpen(true)}
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, type: "spring", damping: 20 }}
        style={{ position: "fixed", bottom: 80, left: 16, zIndex: 149, padding: "12px 18px", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body)", background: "var(--card-bg)", color: "var(--text2)", border: "0.5px solid var(--border2)", borderRadius: 20, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.25)", display: "none", alignItems: "center", gap: 6 }}>
        <PanelLeftOpen size={13} /> Tickers
      </motion.button>

      {/* Mobile floating Analyze button */}
      <motion.button
        className="c-mob-analyze"
        onClick={handleAnalyze}
        disabled={loading || !assets.some(a => a.ticker && a.weight > 0 && a.ticker !== "")}
        animate={analyzeComplete ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.35 }}
        style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 150, padding: "13px 40px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 2, textTransform: "uppercase" as const, background: loading ? "var(--bg3)" : assets.some(a => a.ticker && a.weight > 0) ? "var(--text)" : "var(--bg3)", color: loading || !assets.some(a => a.ticker && a.weight > 0) ? "var(--text3)" : "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: 24, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 24px rgba(0,0,0,0.3)", transition: "background 0.2s, color 0.2s", animation: loading ? "analyze-ring 1.2s ease-out infinite" : "none", display: "none" }}>
        {loading ? "Analyzing..." : "Analyze"}
      </motion.button>

      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal
            onComplete={async (builtAssets) => {
              setShowOnboarding(false);
              localStorage.removeItem("corvo_onboarding_skipped");
              setShowSetupBanner(false);
              posthog.capture("onboarding_completed", { tickers_added: builtAssets.length });
              if (builtAssets.length > 0) {
                // builtAssets come from PortfolioBuilder which stores fractions (0–1).
                // Do NOT multiply by 100, that corrupts the weights.
                setAssets(builtAssets);
              }
              tourNeededRef.current = false;
              // Show guided tour after onboarding
              setShowDashboardTour(true);
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { data: xpRow } = await supabase.from("profiles").select("xp").eq("id", user.id).single();
                await supabase.from("profiles").upsert({
                  id: user.id,
                  onboarding_completed: true,
                  xp: (xpRow?.xp || 0) + 100,
                  updated_at: new Date().toISOString(),
                });
              }
            }}
            onSkip={() => {
              setShowOnboarding(false);
              localStorage.setItem("corvo_onboarding_skipped", "true");
              if (localStorage.getItem("corvo_setup_banner_dismissed") !== "true") {
                setShowSetupBanner(true);
              }
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showGoals && <GoalsModal onComplete={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowGoals(false); if (tourNeededRef.current) setShowTour(true); }} onSkip={() => { localStorage.setItem("corvo_goals", "skipped"); setShowGoals(false); if (tourNeededRef.current) setShowTour(true); }} />}
      </AnimatePresence>
      {showDashboardTour && (
        <DashboardTour onComplete={() => {
          setShowDashboardTour(false);
          localStorage.setItem("corvo_tour_completed", "true");
        }} />
      )}
      <AnimatePresence>
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
      <AnimatePresence>
        {showProfile && <ProfileEditor goals={goals} onSave={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowProfile(false); }} onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 280 }}
            style={{ position: "fixed", inset: 0, zIndex: 490, background: "var(--bg)", overflowY: "auto" }}>
            <SettingsPage
              onClose={() => setShowSettings(false)}
              onProfileSaved={(p) => setNavProfile({ displayName: p.displayName, avatarUrl: p.avatarUrl })}
              onReplayOnboarding={() => {
                localStorage.removeItem("corvo_onboarding_skipped");
                localStorage.removeItem("corvo_setup_banner_dismissed");
                setShowSettings(false);
                setShowOnboarding(true);
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
      <AnimatePresence>
        {showReferral && <ReferralModal onClose={() => setShowReferral(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showEmailPrefs && (
          <EmailPreferences
            autoDisableDigest={unsubscribeMode}
            onClose={() => { setShowEmailPrefs(false); setUnsubscribeMode(false); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
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

      {/* Share card modal */}
      <AnimatePresence>
        {showShareCard && data && (
          <ShareImageModal
            assets={assets}
            data={data}
            onClose={() => setShowShareCard(false)}
          />
        )}
      </AnimatePresence>

      {/* Share toast */}
      <AnimatePresence>
        {shareToast && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#5cb88a", color: "#0a0e14", padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600, zIndex: 999, pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
            ✓ Link copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>

      {/* Push notification prompt */}
      <AnimatePresence>
        {showNotifPrompt && <NotificationPrompt onDismiss={() => setShowNotifPrompt(false)} />}
      </AnimatePresence>

      {/* Feedback button */}
      <FeedbackButton />

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
