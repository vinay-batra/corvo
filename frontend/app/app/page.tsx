"use client";

import { useState, useEffect, useRef } from "react";
import { posthog } from "@/lib/posthog";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  LayoutDashboard, ShieldAlert, FlaskConical, Newspaper,
  MessageSquare, Eye, PanelLeftClose, PanelLeftOpen,
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
import DrawdownChart from "../../components/DrawdownChart";
import CorrelationHeatmap from "../../components/CorrelationHeatmap";
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
import LivePriceStrip from "../../components/LivePriceStrip";
import WhatIfDrawer from "../../components/WhatIfDrawer";
import StockCompare from "../../components/StockCompare";
import Watchlist from "../../components/Watchlist";
import PortfolioHistory from "../../components/PortfolioHistory";
import MarketBrief from "../../components/MarketBrief";
import EmailPreferences from "../../components/EmailPreferences";
import ReferralModal from "../../components/ReferralModal";
import SettingsPage from "../settings/page";

const TABS = [
  { id: "overview",  label: "Dashboard",  Icon: LayoutDashboard,  href: null },
  { id: "stocks",    label: "Stocks",     Icon: CandlestickChart, href: null },
  { id: "risk",      label: "Risk",       Icon: ShieldAlert,      href: null },
  { id: "simulate",  label: "Simulations",Icon: FlaskConical,     href: null },
  { id: "compare",   label: "Compare",    Icon: Eye,              href: null },
  { id: "news",      label: "News",       Icon: Newspaper,        href: null },
  { id: "watchlist", label: "Watchlist",  Icon: Eye,              href: null },
  { id: "learn",     label: "Learn",      Icon: BookOpen,         href: "/learn" },
  { id: "ai",        label: "AI Chat",    Icon: MessageSquare,    href: null },
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
    logoSub:    { fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const },
    section:    { padding: "10px 14px", borderBottom: "0.5px solid var(--border)" },
    label:      { fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 8 },
    main:       { flex: 1, display: "flex", flexDirection: "column" as const, background: "var(--bg)", minWidth: 0, overflow: "hidden" },
    topbar:     { height: 48, flexShrink: 0, borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "var(--bg)", gap: 8 },
    content:    { flex: 1, overflowY: "auto" as const, overflowX: "hidden" as const, padding: "20px 24px" },
    card:       { border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", marginBottom: 12, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px var(--border)" } as React.CSSProperties,
    cardHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
    cardAccent: { width: 2, height: 14, background: "var(--text)", borderRadius: 1 },
    cardTitle:  { fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const },
    metricsGrid:{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 },
    bottomGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  };
}

function TooltipCardHeader({ title, sections }: { title: string; sections: { label: string; text: string }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 }} />
      <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>{title}</span>
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

function Empty({ onPreset }: { onPreset?: (a: { ticker: string; weight: number }[]) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 24, textAlign: "center", padding: "40px 0" }}>
      <motion.img
        src="/corvo-logo.svg"
        alt="Corvo"
        width={52}
        height={52}
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        style={{ opacity: 0.7 }}
      />
      <div>
        <p style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", color: "var(--text)", marginBottom: 8 }}>Analyze your first portfolio</p>
        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7 }}>Add tickers on the left, or start with a preset below</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, maxWidth: 520, width: "100%" }}>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => onPreset?.(p.assets)}
            style={{ padding: "16px 18px", background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)"; e.currentTarget.style.background = "var(--bg3)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card-bg)"; }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{p.label}</p>
            <p style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.6 }}>
              {p.assets.map(a => `${a.ticker} ${Math.round(a.weight * 100)}%`).join(" · ")}
            </p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

const COMPARE_COLORS = ["#c9a84c", "#b47ee0", "#5cb88a", "#e05c5c"];
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("corvo_saved_portfolios");
      if (raw) setSavedPortfolios(JSON.parse(raw));
    } catch {}
  }, []);

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
    setAiLoading(true); setAiInsight("");
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
    } catch {}
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
            <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 }} />
            <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Portfolio Comparison</span>
            <InfoModal title="Portfolio Comparison" sections={[{ label: "How it works", text: "Add multiple saved portfolios to compare their risk, return, and Sharpe ratio side by side. Save a portfolio first from the Dashboard." }]} />
            {active.length > 0 && <span style={{ fontSize: 9, color: "var(--text3)" }}>· {active.length} portfolio{active.length !== 1 ? "s" : ""} · {period.toUpperCase()} · vs {benchmarkLabel}</span>}
          </div>
          {active.length >= 2 && (
            <button onClick={generateAiInsight} disabled={aiLoading}
              style={{ padding: "5px 12px", fontSize: 10, borderRadius: 6, border: "0.5px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.06)", color: "#c9a84c", cursor: aiLoading ? "default" : "pointer", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 5 }}>
              {aiLoading ? "Analyzing…" : <><Sparkles size={10} /> AI Insight</>}
            </button>
          )}
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
              { n: "3", title: "Save it", desc: "Use the Save button in the sidebar — it works without an account." },
              { n: "4", title: "Compare side by side", desc: "Return here to select saved portfolios and compare key metrics." },
            ].map(step => (
              <div key={step.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", border: "0.5px solid rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#c9a84c", flexShrink: 0, fontFamily: "var(--font-mono)" }}>{step.n}</div>
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
                    <div style={{ fontSize: 9, color: "var(--text3)" }}>{p.tickers.slice(0, 4).join(" · ")}{p.tickers.length > 4 ? ` +${p.tickers.length - 4}` : ""}</div>
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
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: isBest ? 700 : 400, color: isBest ? color : "var(--text2)" }}>
                          {m.fmt(val)}{isBest && <span style={{ marginLeft: 4, fontSize: 8 }}>★</span>}
                        </span>
                      </div>
                    );
                  })}
                  <div style={{ padding: "10px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 5, letterSpacing: 1 }}>SHARPE SCORE</div>
                    <div style={{ height: 3, background: "var(--bg3)", borderRadius: 2, marginBottom: 4 }}>
                      <div style={{ width: `${Math.min(100, Math.max(0, ((p.result.sharpe_ratio || 0) / 3) * 100))}%`, height: "100%", background: color, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color, fontWeight: 600 }}>{(p.result.sharpe_ratio || 0).toFixed(2)}</span>
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
                  <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 }} />
                  <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Radar Comparison</span>
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
                  <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 }} />
                  <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Holding Overlap</span>
                </div>
                {overlapData.map((ov, i) => (
                  <div key={i} style={{ marginBottom: i < overlapData.length - 1 ? 16 : 0 }}>
                    <p style={{ fontSize: 11, color: "var(--text2)", marginBottom: 8 }}>{ov.a} vs {ov.b}</p>
                    {ov.shared.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <p style={{ fontSize: 9, letterSpacing: 1, color: "var(--text3)", marginBottom: 5 }}>SHARED ({ov.shared.length})</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {ov.shared.map(t => <span key={t} style={{ padding: "2px 8px", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600, borderRadius: 4, background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "0.5px solid rgba(201,168,76,0.2)" }}>{t}</span>)}
                        </div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[{ label: ov.a, tickers: ov.unique_a, ci: 0 }, { label: ov.b, tickers: ov.unique_b, ci: 1 }].map(col => (
                        <div key={col.label}>
                          <p style={{ fontSize: 9, letterSpacing: 1, color: COMPARE_COLORS[col.ci], marginBottom: 5 }}>ONLY {col.label.toUpperCase()}</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {col.tickers.length > 0 ? col.tickers.map(t => <span key={t} style={{ padding: "2px 6px", fontSize: 9, fontFamily: "var(--font-mono)", borderRadius: 4, background: "var(--bg3)", color: "var(--text2)" }}>{t}</span>) : <span style={{ fontSize: 10, color: "var(--text3)" }}>—</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {ov.shared.length === 0 && <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>No holdings in common — highly independent portfolios.</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI insight */}
          {(aiInsight || aiLoading) && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ border: "0.5px solid rgba(201,168,76,0.2)", borderRadius: 12, padding: "16px 18px", background: "rgba(201,168,76,0.04)", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Sparkles size={14} color="#c9a84c" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 9, letterSpacing: 2, color: "#c9a84c", textTransform: "uppercase", marginBottom: 6 }}>AI Comparison Insight</p>
                {aiLoading ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 10, height: 10, border: "1.5px solid rgba(201,168,76,0.2)", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>Comparing portfolios…</span>
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
    } catch (e) {
      console.error("Push subscription failed:", e);
    }
    setLoading(false);
    onDismiss();
  };

  const dismiss = () => { localStorage.setItem(NOTIF_ASKED_KEY, "later"); onDismiss(); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 800, width: "min(380px, calc(100vw - 32px)", background: "var(--card-bg)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 14, padding: "16px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", display: "flex", gap: 14, alignItems: "flex-start" }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>🔔</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Enable price alerts</p>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.55, marginBottom: 12 }}>
          Get notified when your stocks move. Enable browser notifications to stay on top of your alerts.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={enable} disabled={loading}
            style={{ flex: 1, padding: "8px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", background: "#c9a84c", color: "#0a0e14", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
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
  const AMBER = "#c9a84c";
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
            <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1, flexShrink: 0 }} />
            <Calendar size={11} style={{ color: "var(--text3)", flexShrink: 0 }} />
            <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Portfolio Performance</span>
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
                style={{ padding: "3px 9px", fontSize: 10, borderRadius: 5, border: `0.5px solid ${range === r ? AMBER : "var(--border)"}`, background: range === r ? `${AMBER}18` : "transparent", color: range === r ? AMBER : "var(--text3)", cursor: "pointer", transition: "all 0.15s" }}>
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
            <span style={{ fontSize: 10, color: "var(--text3)" }}>Day 1</span>
          </div>
          <div style={{ height: 3, background: "var(--bg3)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ width: "14%", height: "100%", background: AMBER, borderRadius: 2 }} />
          </div>
          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
            First snapshot saved. Trend chart appears tomorrow with a second data point — snapshots are collected automatically each day.
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
          <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 6 }}>
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

export default function AppPage() {
  const [assets, setAssets]               = useState<{ ticker: string; weight: number; purchasePrice?: number }[]>([]);
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
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("corvo_sidebar_collapsed") === "true";
  });
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
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [userId, setUserId]         = useState<string | null>(null);
  const [navProfile, setNavProfile] = useState<{ displayName: string; avatarUrl: string | null }>({ displayName: "", avatarUrl: null });
  const referralCodeRef             = useRef<string>("");
  const [shareToast, setShareToast] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [savedPortfolioId, setSavedPortfolioId] = useState<string | null>(null);
  const [savedPortfolioName, setSavedPortfolioName] = useState<string>("");
  const [perfHistory, setPerfHistory] = useState<PerfSnapshot[]>([]);
  const [perfRange, setPerfRange] = useState<PerfRange>("ALL");
  const [perfLoading, setPerfLoading] = useState(false);
  const autoSnapshotAttemptedRef = useRef<string | null>(null);
  const { dark, toggle: toggleDark }  = useTheme();
  const { currency, rate, setCurrency } = useCurrency();
  const S = useS();

  useEffect(() => {
    const g = localStorage.getItem("corvo_goals");
    if (g && g !== "skipped") { try { setGoals(JSON.parse(g)); } catch {} }
    // showGoals is controlled by the onboarding Supabase check below — not localStorage

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
        { ticker: "SPY", weight: 40 },
        { ticker: "QQQ", weight: 30 },
        { ticker: "GLD", weight: 15 },
        { ticker: "BND", weight: 15 },
      ];
      setAssets(demoAssets);
      setShowGoals(false);
      setLoading(true);
      setData(null);
      fetchPortfolio(demoAssets, "1y", "^GSPC")
        .then((result: any) => { setData(result); setActiveTab("overview"); })
        .catch(() => { setErrorMsg("Demo failed to load — please try again."); })
        .finally(() => setLoading(false));
    }

    // Check onboarding status — Supabase is the source of truth; localStorage is a fallback
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

      // New user — create profile row and send welcome email for OAuth signups
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
    } catch (e) {
      console.error(e);
      setErrorMsg("Analysis failed — server may be temporarily unavailable.");
      errorDismissRef.current = setTimeout(() => setErrorMsg(null), 10000);
    }
    setLoading(false);
  };

  const handleAnalyzeRef = useRef(handleAnalyze);
  useEffect(() => { handleAnalyzeRef.current = handleAnalyze; });

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
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(o => !o);
        return;
      }
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey) return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      handleAnalyzeRef.current();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Unlock Web Audio API on first user interaction
  useEffect(() => {
    const unlock = () => { unlockAudio(); window.removeEventListener("click", unlock, true); };
    window.addEventListener("click", unlock, true);
    return () => window.removeEventListener("click", unlock, true);
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

  const Card = ({ children, style = {} }: any) => <div style={{ ...S.card, ...style }}>{children}</div>;
  const CardHeader = ({ title }: { title: string }) => (
    <div style={S.cardHeader}><div style={S.cardAccent} /><span style={S.cardTitle}>{title}</span></div>
  );

  const SidebarInner = () => (
    <>
      {/* Logo → homepage */}
      <div style={S.sidebarTop}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <img src="/corvo-logo.svg" width={28} height={28} alt="Corvo" style={{ flexShrink: 0 }} />
          <div style={S.logo}>CORVO</div>
        </Link>
        <div style={S.logoSub}>Portfolio Intelligence</div>
      </div>

      {/* Profile */}
      <div style={S.section}>
        <button onClick={() => setShowProfile(true)} style={{ width: "100%", padding: "7px 10px", background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 9, color: "var(--bg)" }}>✦</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text)" }}>
              {goals?.age ? `Age ${goals.age} · ${goals.riskTolerance?.replace("_time", "")}` : "Edit Profile"}
            </div>
            <div style={{ fontSize: 9, color: "var(--text3)" }}>Goals & preferences</div>
          </div>
        </button>
      </div>

      {/* Preset portfolios */}
      <div style={{ padding: "8px 14px", borderBottom: "0.5px solid var(--border)" }}>
        <div style={S.label}>Presets</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => setAssets(p.assets)}
              style={{ padding: "5px 8px", fontSize: 10, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer", textAlign: "left" as const, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Builder */}
      <div id="tour-ticker-area" style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
        <PortfolioBuilder assets={assets} onAssetsChange={setAssets} onAnalyze={handleAnalyze} loading={loading} />
      </div>

      {/* Analyze button */}
      <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--border)" }}>
        <motion.button
          id="tour-analyze-btn"
          onClick={handleAnalyze}
          disabled={loading || !assets.some(a => a.ticker && a.weight > 0)}
          animate={analyzeComplete ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          whileHover={!loading && assets.some(a => a.ticker && a.weight > 0) ? { scale: 1.02 } : {}}
          whileTap={!loading && assets.some(a => a.ticker && a.weight > 0) ? { scale: 0.97 } : {}}
          transition={{ duration: 0.35 }}
          style={{ width: "100%", padding: "11px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 2, textTransform: "uppercase" as const, background: loading ? "transparent" : assets.some(a => a.ticker && a.weight > 0) ? "var(--text)" : "var(--bg3)", color: loading || !assets.some(a => a.ticker && a.weight > 0) ? "var(--text3)" : "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: 9, cursor: loading || !assets.some(a => a.ticker && a.weight > 0) ? "not-allowed" : "pointer", transition: "background 0.2s, color 0.2s", animation: loading ? "analyze-ring 1.2s ease-out infinite" : "none" }}>
          {loading ? "Analyzing..." : "Analyze"}
        </motion.button>
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

      {/* Live price strip — isolated component; ticks never re-render AppPage */}
      <LivePriceStrip assets={assets} active={!!data} />

    </>
  );

  // ── Stocks search mini-component ─────────────────────────────────────────────
  function StocksSearch({ onSelect }: { onSelect: (t: string) => void }) {
    const [q, setQ] = useState("");
    const [results, setResults] = useState<{ticker:string;name:string}[]>([]);
    const [busy, setBusy] = useState(false);
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

    const POPULAR = ["AAPL","MSFT","NVDA","GOOGL","AMZN","TSLA","META","BRK-B","SPY","QQQ"];
    return (
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 14 }}>Stock Lookup</p>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <input
            className="accent-input"
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search any ticker or company…"
            style={{ width: "100%", padding: "10px 14px", fontSize: 14, border: "0.5px solid var(--border2)", borderRadius: 10, background: "var(--input-bg)", color: "var(--text)", outline: "none" }}
          />
          {busy && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, border: "1.5px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
        </div>
        {results.length > 0 ? (
          <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
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
          <div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>Popular tickers</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {POPULAR.map(t => (
                <button key={t} onClick={() => onSelect(t)}
                  style={{ padding: "6px 14px", fontSize: 12, fontFamily: "Space Mono, monospace", fontWeight: 700, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("corvo_sidebar_collapsed", String(next));
  };

  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 300);
    return () => clearTimeout(t);
  }, [sidebarCollapsed]);

  return (
    <div style={S.app}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes analyze-ring{0%{box-shadow:0 0 0 0 rgba(201,168,76,0.5)}70%{box-shadow:0 0 0 8px rgba(201,168,76,0)}100%{box-shadow:0 0 0 0 rgba(201,168,76,0)}}
        @media(max-width:768px){
          .c-sidebar{display:none!important}
          .c-topbar{display:none!important}
          .c-mob-bar{display:flex!important}
          .c-mob-tabs{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important}
          .c-metrics{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
          .c-bgrid{grid-template-columns:1fr!important}
          .c-risk-grid{grid-template-columns:1fr!important}
          .c-content{padding:12px 10px!important}
          .c-mob-analyze{display:flex!important}
          .c-ai-tab{height:calc(100dvh - 136px)!important}
          .c-mob-add{display:flex!important}
        }
        @media(min-width:769px){
          .c-mob-bar{display:none!important}
          .c-mob-tabs{display:none!important}
          .c-mob-drawer{display:none!important}
          .c-mob-analyze{display:none!important}
          .c-mob-add{display:none!important}
        }
        .c-mob-tabs{scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
        .c-mob-tabs::-webkit-scrollbar{display:none}
        /* Analyze button pulse while loading */
        .c-mob-analyze[data-loading=true]{animation:analyze-ring 1.2s ease-out infinite}
      `}</style>

      {/* Desktop sidebar — collapsible */}
      <motion.aside
        className="c-sidebar"
        animate={{ width: sidebarCollapsed ? 0 : 300 }}
        transition={{ type: "spring", damping: 30, stiffness: 260 }}
        style={{ flexShrink: 0, borderRight: sidebarCollapsed ? "none" : "0.5px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--bg2)", overflow: "hidden" }}>
        {SidebarInner()}
      </motion.aside>

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

      <div style={S.main}>
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
          {/* Sidebar collapse toggle */}
          <IconBtn onClick={toggleSidebar} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </IconBtn>

          {/* Tabs with animated pill indicator */}
          <div style={{ display: "flex", gap: 2, flex: 1, overflowX: "auto", position: "relative" }}>
            {TABS.map(tab => {
              const TabIcon = tab.Icon;
              const isActive = activeTab === tab.id;
              const tabStyle: React.CSSProperties = {
                position: "relative",
                padding: "7px 12px", fontSize: 12, borderRadius: 8, flexShrink: 0,
                border: "none", background: "transparent",
                color: isActive ? "var(--text)" : "var(--text3)",
                cursor: "pointer", fontWeight: isActive ? 500 : 400,
                display: "flex", alignItems: "center", gap: 5, textDecoration: "none",
                transition: "color 0.15s",
              };
              const content = (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tab-indicator"
                      style={{ position: "absolute", inset: 0, borderRadius: 8, background: "var(--bg3)", border: "0.5px solid var(--border2)", zIndex: 0 }}
                      transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    />
                  )}
                  <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 5 }}>
                    <TabIcon size={12} />
                    {tab.label}
                    {tab.id === "ai" && <span style={{ padding: "1px 5px", background: "var(--text)", color: "var(--bg)", borderRadius: 4, fontSize: 8, letterSpacing: 1 }}>AI</span>}
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
                <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "#c9a84c", border: "1.5px solid var(--bg)" }} />
              )}
            </button>
            <DarkModeToggle dark={dark} toggle={toggleDark} />
            {data && (
              <button onClick={exportCSV} title="Export CSV"
                style={{ height: 32, padding: "0 10px", borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--text2)", display: "flex", alignItems: "center", gap: 5, transition: "background 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                ↓ CSV
              </button>
            )}
            <ExportPDF data={data} assets={assets} />
            {data && (
              <button onClick={() => setShowShareCard(true)} title="Share portfolio"
                style={{ height: 32, padding: "0 10px", borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--text2)", display: "flex", alignItems: "center", gap: 5, transition: "background 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                ↗ Share
              </button>
            )}
            <UserMenu onEmailPrefs={() => setShowEmailPrefs(true)} onReferral={() => setShowReferral(true)} onSettings={() => setShowSettings(true)} avatarUrl={navProfile.avatarUrl} displayName={navProfile.displayName} />
          </div>
        </header>

        {/* Content */}
        <main className="c-content" style={S.content}>
          {/* Setup banner (shown when user skipped onboarding) */}
          <AnimatePresence>
            {showSetupBanner && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ border: "0.5px solid rgba(201,168,76,0.25)", borderRadius: 10, padding: "11px 16px", background: "rgba(201,168,76,0.05)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#c9a84c", fontSize: 13, flexShrink: 0 }}>◎</span>
                  <span style={{ fontSize: 13, color: "rgba(232,224,204,0.65)", lineHeight: 1.4 }}>
                    Complete your setup — add your portfolio to unlock AI insights and risk analysis.
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => { setShowSetupBanner(false); setShowOnboarding(true); }}
                    style={{ padding: "6px 14px", fontSize: 11, fontWeight: 600, borderRadius: 6, background: "#c9a84c", border: "none", color: "#0a0e14", cursor: "pointer", transition: "opacity 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    Complete Setup
                  </button>
                  <button onClick={() => { setShowSetupBanner(false); localStorage.setItem("corvo_setup_banner_dismissed", "true"); }}
                    style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "rgba(201,168,76,0.1)", color: "rgba(232,224,204,0.4)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ✕
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
                    style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "rgba(224,92,92,0.12)", color: "#e05c5c", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ✕
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
                      <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Stock Comparison</span>
                    </div>
                    <StockCompare />
                  </>
                ) : stockTicker ? (
                  <StockDetail ticker={stockTicker} onBack={() => setStockTicker(null)} />
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                      <button onClick={() => setCompareMode(true)}
                        style={{ padding: "7px 14px", fontSize: 11, borderRadius: 8, border: "0.5px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", letterSpacing: 0.5, transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}>
                        ⇄ Compare Stocks
                      </button>
                    </div>
                    <StocksSearch onSelect={setStockTicker} />
                  </>
                )}
              </motion.div>
            ) : !data && !loading ? (
              <motion.div key="empty" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <Empty onPreset={(a) => setAssets(a.map(x => ({ ...x, weight: Math.round(x.weight * 100) })))} />
              </motion.div>
            ) : loading ? (
              <motion.div key="loading" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}><OverviewSkeleton /></motion.div>
            ) : activeTab === "overview" ? (
              <motion.div key="overview" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} style={{ marginBottom: 12 }}>
                  <Card><CardHeader title="Today's Market Brief" /><MarketBrief /></Card>
                </motion.div>
                <motion.div
                  className="c-metrics"
                  style={S.metricsGrid}
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
                  <Metrics data={data} currency={currency} rate={rate} />
                </motion.div>
                <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} transition={{ duration: 0.15 }}>
                  <Card>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{ ...S.cardHeader, marginBottom: 0 }}><div style={S.cardAccent} /><span style={S.cardTitle}>Performance</span></div>
                      <button onClick={() => setWhatIfOpen(true)}
                        style={{ padding: "4px 10px", fontSize: 10, borderRadius: 6, border: "0.5px solid var(--border2)", background: "transparent", color: "var(--text3)", cursor: "pointer", letterSpacing: 0.5, transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}>
                        What-If →
                      </button>
                    </div>
                    <PerformanceChart data={data} />
                  </Card>
                </motion.div>
                <motion.div
                  className="c-bgrid"
                  style={{ ...S.bottomGrid }}
                  initial="hidden"
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
                      content: <AiInsights data={data} assets={assets} onAskAi={() => setActiveTab("ai")} />,
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
                    <motion.div key={title} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} transition={{ duration: 0.15 }} style={{ display: "flex", flexDirection: "column" }}>
                      <Card style={{ marginBottom: 0, flex: 1 }}><TooltipCardHeader title={title} sections={sections} />{content}</Card>
                    </motion.div>
                  ))}
                </motion.div>
                <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} style={{ marginTop: 12 }} whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} transition={{ duration: 0.15 }}>
                  <Card><CardHeader title="Allocation" /><Breakdown assets={assets} /></Card>
                </motion.div>
                {data && !isPortfolioSaved && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0" }}>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>Want to compare this later?</span>
                    <button
                      onClick={() => {
                        const el = document.querySelector("[data-save-trigger]") as HTMLElement | null;
                        if (el) el.click();
                      }}
                      style={{ fontSize: 12, color: "#c9a84c", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                      Save this portfolio →
                    </button>
                  </motion.div>
                )}
                <PortfolioHistory />
                {savedPortfolioId && (
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.2 }}>
                    <PortfolioPerformanceTrend
                      history={perfHistory}
                      range={perfRange}
                      setRange={setPerfRange}
                      loading={perfLoading}
                      portfolioName={savedPortfolioName}
                    />
                  </motion.div>
                )}
              </motion.div>
            ) : activeTab === "risk" ? (
              <motion.div key="risk" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <div className="c-risk-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Card style={{ marginBottom: 0 }}><TooltipCardHeader title="Drawdown" sections={[{label:"Plain English",text:"Shows the biggest loss from a peak to a trough in your portfolio over the selected period."},{label:"Example",text:"A -20% drawdown means your portfolio fell from $100K to $80K before recovering."},{label:"What's Good",text:"Drawdowns under 15% are generally considered manageable for long-term investors. Deeper troughs signal higher risk."}]} /><DrawdownChart assets={assets} period={period} /></Card>
                  <Card style={{ marginBottom: 0 }}><TooltipCardHeader title="Correlation" sections={[{label:"Plain English",text:"Shows how your assets move in relation to each other. A value of 1.0 means they move in perfect lockstep."},{label:"Example",text:"AAPL and MSFT often have correlation near 0.8 — when one drops, the other usually does too."},{label:"What's Good",text:"Aim for correlations below 0.5 between your major holdings. Low correlation = real diversification."}]} /><CorrelationHeatmap assets={assets} period={period} /></Card>
                  <Card style={{ marginBottom: 0 }}><TooltipCardHeader title="Sector Exposure" sections={[{label:"Plain English",text:"Shows how your portfolio weight is distributed across market sectors, aggregated from each holding's sector classification."},{label:"Example",text:"If AAPL and MSFT together make up 70% of your portfolio, Technology will show 70% exposure."},{label:"What's Good",text:"A diversified portfolio spreads across 4+ sectors. Heavy concentration in one sector amplifies both gains and losses."}]} /><SectorExposureChart assets={assets} /></Card>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Card style={{ marginBottom: 0 }}><TooltipCardHeader title="Dividend Income" sections={[{label:"Plain English",text:"Shows the estimated annual dividend income from your holdings based on current yields and a $10,000 portfolio value."},{label:"Example",text:"If JNJ has a 3% yield and makes up 30% of your $10k portfolio, you'd earn ~$90/year from it."},{label:"What's Good",text:"Tickers highlighted in amber have an ex-dividend date within 30 days — you must own the stock before that date to receive the dividend."}]} /><DividendTracker assets={assets} /></Card>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Card style={{ marginBottom: 0 }}><TooltipCardHeader title="Tax Loss Harvesting" sections={[{label:"Plain English",text:"Identifies holdings trading below your purchase price that could be sold to realize a tax loss, then replaced with a similar investment to maintain market exposure."},{label:"Example",text:"If you bought NVDA at $150 and it's now $120, you can sell it for a $30/share loss to offset capital gains, then buy a sector ETF like SOXX to stay exposed to semiconductors."},{label:"What's Good",text:"The IRS wash-sale rule disallows the loss if you repurchase the same (or substantially identical) security within 30 days. Suggested replacements are deliberately different securities in the same sector."},{label:"How to use",text:"Enter your purchase prices for each ticker in the sidebar. Only tickers with a purchase price and a current unrealized loss will appear here."}]} /><TaxLossHarvester assets={assets} /></Card>
                </div>
              </motion.div>
            ) : activeTab === "simulate" ? (
              <motion.div key="simulate" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <Card><TooltipCardHeader title="Monte Carlo Simulation" sections={[
                  { label: "What it shows", text: "Monte Carlo simulation runs 300 randomized scenarios based on your portfolio's historical returns and volatility. The bands show the range of possible outcomes — not guarantees." },
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
            ) : activeTab === "ai" ? (
              <motion.div key="ai" className="c-ai-tab" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
                style={{ height: "calc(100vh - 96px)", display: "flex", flexDirection: "column" }}>
                <AiChat data={data} assets={assets} goals={goals} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>

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
        disabled={loading || !assets.some(a => a.ticker && a.weight > 0)}
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
              localStorage.setItem("corvo_tour_completed", "true");
              localStorage.removeItem("corvo_onboarding_skipped");
              setShowSetupBanner(false);
              posthog.capture("onboarding_completed", { tickers_added: builtAssets.length });
              if (builtAssets.length > 0) {
                setAssets(builtAssets.map(a => ({ ...a, weight: Math.round(a.weight * 100) > 0 ? Math.round(a.weight * 100) : a.weight })));
              }
              tourNeededRef.current = false;
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
            <SettingsPage onClose={() => setShowSettings(false)} onProfileSaved={(p) => setNavProfile({ displayName: p.displayName, avatarUrl: p.avatarUrl })} />
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowShareCard(false)}
            style={{ position: "fixed", inset: 0, zIndex: 510, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }} transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "#0a0e14", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 16, padding: "28px 32px", maxWidth: 400, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <img src="/corvo-logo.svg" width={28} height={28} alt="Corvo" />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "#c9a84c", fontWeight: 700 }}>CORVO</span>
              </div>
              <p style={{ fontSize: 11, letterSpacing: 2, color: "rgba(232,224,204,0.35)", textTransform: "uppercase", marginBottom: 16 }}>Portfolio Snapshot</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Return", value: data.portfolio_return != null ? `${(data.portfolio_return * 100).toFixed(1)}%` : "—" },
                  { label: "Sharpe", value: data.sharpe_ratio != null ? data.sharpe_ratio.toFixed(2) : "—" },
                  { label: "Volatility", value: data.portfolio_volatility != null ? `${(data.portfolio_volatility * 100).toFixed(1)}%` : "—" },
                  { label: "Max Drawdown", value: data.max_drawdown != null ? `${(data.max_drawdown * 100).toFixed(1)}%` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "12px 14px" }}>
                    <p style={{ fontSize: 9, letterSpacing: 1.5, color: "rgba(232,224,204,0.35)", textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#e8e0cc" }}>{value}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "rgba(232,224,204,0.4)", marginBottom: 16 }}>
                {assets.slice(0, 3).map(a => `${a.ticker} ${Math.round(a.weight)}%`).join("  ·  ")}
                {assets.length > 3 ? `  +${assets.length - 3} more` : ""}
              </p>
              <button onClick={sharePortfolio}
                style={{ width: "100%", padding: "11px", background: "#c9a84c", border: "none", borderRadius: 8, color: "#0a0e14", fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                Copy shareable link
              </button>
            </motion.div>
          </motion.div>
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

    </div>
  );
}
