"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  LayoutDashboard, ShieldAlert, FlaskConical, Newspaper,
  MessageSquare, Eye, PanelLeftClose, PanelLeftOpen,
  Sun, Moon, CandlestickChart, Sparkles,
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
import MonteCarloChart from "../../components/MonteCarloChart";
import NewsFeed from "../../components/NewsFeed";
import ExportPDF from "../../components/ExportPDF";
import GoalsModal from "../../components/GoalsModal";
import ProfileEditor from "../../components/ProfileEditor";
import OnboardingTour from "../../components/OnboardingTour";
import { fetchPortfolio } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import AlertsPanel from "../../components/AlertsPanel";
import WhatIfDrawer from "../../components/WhatIfDrawer";
import StockCompare from "../../components/StockCompare";
import Watchlist from "../../components/Watchlist";
import PortfolioHistory from "../../components/PortfolioHistory";
import EmailPreferences from "../../components/EmailPreferences";
import ReferralModal from "../../components/ReferralModal";

const TABS = [
  { id: "overview",  label: "Dashboard",  Icon: LayoutDashboard,  href: null },
  { id: "stocks",    label: "Stocks",     Icon: CandlestickChart, href: null },
  { id: "risk",      label: "Risk",       Icon: ShieldAlert,      href: null },
  { id: "simulate",  label: "Simulations",Icon: FlaskConical,     href: null },
  { id: "compare",   label: "Compare",    Icon: Eye,              href: null },
  { id: "news",      label: "News",       Icon: Newspaper,        href: null },
  { id: "watchlist", label: "Watchlist",  Icon: Eye,              href: null },
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

function Empty() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, gap: 20, textAlign: "center" }}>
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
        <p style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", color: "var(--text)", marginBottom: 8 }}>Enter your portfolio to get started</p>
        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7 }}>Add tickers on the left, then click Analyze</p>
      </div>
    </motion.div>
  );
}

const COMPARE_COLORS = ["#c9a84c", "#b47ee0", "#5cb88a", "#e05c5c"];

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

  return (
    <div>
      {savedPortfolios.length > 0 ? (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginBottom: 12 }}>
          <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Add saved portfolios to compare</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {savedPortfolios.map(p => (
              <button key={p.id} onClick={() => toggleSelect(p.id, p)}
                style={{ padding: "6px 14px", fontSize: 12, borderRadius: 8, cursor: "pointer", transition: "all 0.15s", background: selected.includes(p.id) ? "var(--text)" : "transparent", border: "0.5px solid var(--border2)", color: selected.includes(p.id) ? "var(--bg)" : "var(--text2)" }}>
                {loading[p.id] ? "..." : p.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "24px 26px", background: "var(--card-bg)", marginBottom: 12 }}>
          <p style={{ fontSize: 9, letterSpacing: 2, color: "#c9a84c", textTransform: "uppercase", marginBottom: 10 }}>How to compare portfolios</p>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 20 }}>No saved portfolios yet</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
        </div>
      )}

      {active.length > 0 && (
        <>
          <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, background: "var(--card-bg)", overflow: "hidden", marginBottom: 12 }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 }} />
                <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Side-by-Side · {period.toUpperCase()} · vs {benchmarkLabel}</span>
              </div>
              {active.length >= 2 && (
                <button onClick={generateAiInsight} disabled={aiLoading}
                  style={{ padding: "5px 12px", fontSize: 10, borderRadius: 6, border: "0.5px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.06)", color: "#c9a84c", cursor: aiLoading ? "default" : "pointer", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 5 }}>
                  {aiLoading ? "Analyzing…" : <><Sparkles size={10} /> AI Insight</>}
                </button>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid var(--border)" }}>
                    <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 10, letterSpacing: 1, color: "var(--text3)", fontWeight: 500 }}>Metric</th>
                    {active.map((p, pi) => (
                      <th key={p.id} style={{ padding: "12px 20px", textAlign: "right", fontSize: 12, color: COMPARE_COLORS[pi % COMPARE_COLORS.length], fontWeight: 600, minWidth: 120 }}>
                        {p.name}
                        <div style={{ fontSize: 9, color: "var(--text3)", fontWeight: 400, marginTop: 2 }}>{p.tickers.slice(0, 3).join(", ")}{p.tickers.length > 3 ? "…" : ""}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, mi) => {
                    const vals = active.map(p => p.result[m.key] ?? 0);
                    const best = m.positive ? Math.max(...vals) : Math.min(...vals);
                    return (
                      <tr key={m.key} style={{ borderBottom: mi < metrics.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                        <td style={{ padding: "13px 20px", fontSize: 12, color: "var(--text2)" }}>{m.label}</td>
                        {active.map((p, pi) => {
                          const val = p.result[m.key] ?? 0;
                          const isBest = val === best;
                          return (
                            <td key={p.id} style={{ padding: "13px 20px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: isBest ? 600 : 400, color: isBest ? COMPARE_COLORS[pi % COMPARE_COLORS.length] : "var(--text3)" }}>
                              {m.fmt(val)}{isBest && <span style={{ marginLeft: 5, fontSize: 9 }}>★</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI insight panel */}
          {aiInsight && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ border: "0.5px solid rgba(201,168,76,0.2)", borderRadius: 12, padding: "16px 18px", background: "rgba(201,168,76,0.04)", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Sparkles size={14} color="#c9a84c" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 9, letterSpacing: 2, color: "#c9a84c", textTransform: "uppercase", marginBottom: 6 }}>AI Comparison Insight</p>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>{aiInsight}</p>
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

export default function AppPage() {
  const [assets, setAssets]               = useState<{ ticker: string; weight: number }[]>([]);
  const [period, setPeriod]               = useState("1y");
  const [benchmark, setBenchmark]         = useState("^GSPC");
  const [data, setData]                   = useState<any>(null);
  const [loading, setLoading]             = useState(false);
  const [analyzeComplete, setAnalyzeComplete] = useState(false);
  const [activeTab, setActiveTab]         = useState("overview");
  const [goals, setGoals]                 = useState<any>(null);
  const [showGoals, setShowGoals]         = useState(false);
  const [showTour, setShowTour]           = useState(false);
  const [showProfile, setShowProfile]     = useState(false);
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
  const [sidePrices, setSidePrices] = useState<Record<string, { price: number; change_pct: number }>>({});
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
        .catch((e: any) => console.error(e))
        .finally(() => setLoading(false));
    }

    // Check onboarding status — Supabase is the source of truth; localStorage is a fallback
    (async () => {
      // Belt-and-suspenders: skip entirely if tour was already completed this browser session
      if (localStorage.getItem("corvo_tour_completed") === "true") return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      // Always show goals modal first, unless demo mode or shared portfolio
      const params2 = new URLSearchParams(window.location.search);
      if (!params2.get("portfolio") && params2.get("demo") !== "true") {
        setShowGoals(true);
      }
    })();
  }, []);

  const handleAnalyze = async () => {
    const valid = assets.filter(a => a.ticker && a.weight > 0);
    if (!valid.length) return;
    setLoading(true); setData(null); setErrorMsg(null); setAnalyzeComplete(false);
    if (errorDismissRef.current) clearTimeout(errorDismissRef.current);
    try {
      const result = await fetchPortfolio(valid, period, benchmark);
      setData(result);
      setActiveTab("overview");
      setAnalyzeComplete(true);
      sound.success();
      setTimeout(() => setAnalyzeComplete(false), 600);
      // Fetch live prices for the sidebar strip
      const API_URL_PRICES = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      fetch(`${API_URL_PRICES}/watchlist-data?tickers=${valid.map(a => a.ticker).join(",")}`)
        .then(r => r.json())
        .then(d => {
          const map: Record<string, { price: number; change_pct: number }> = {};
          (d.results || []).forEach((s: any) => { if (s?.ticker && s.price) map[s.ticker] = { price: s.price, change_pct: s.change_pct ?? 0 }; });
          setSidePrices(map);
        })
        .catch(() => {});
    } catch (e) {
      console.error(e);
      setErrorMsg("Analysis failed — server may be temporarily unavailable.");
      errorDismissRef.current = setTimeout(() => setErrorMsg(null), 10000);
    }
    setLoading(false);
  };

  const handleAnalyzeRef = useRef(handleAnalyze);
  useEffect(() => { handleAnalyzeRef.current = handleAnalyze; });
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
      <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
        <PortfolioBuilder assets={assets} onAssetsChange={setAssets} onAnalyze={handleAnalyze} loading={loading} />
      </div>

      {/* Analyze button */}
      <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--border)" }}>
        <motion.button
          onClick={handleAnalyze}
          disabled={loading || !assets.some(a => a.ticker && a.weight > 0)}
          animate={analyzeComplete ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ duration: 0.35 }}
          style={{ width: "100%", padding: "11px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 2, textTransform: "uppercase" as const, background: loading ? "transparent" : "var(--text)", color: loading ? "var(--text3)" : "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: 9, cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s, color 0.2s", animation: loading ? "analyze-ring 1.2s ease-out infinite" : "none" }}>
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

      {/* Live price strip */}
      {Object.keys(sidePrices).length > 0 && (
        <div style={{ padding: "8px 14px", borderTop: "0.5px solid var(--border)" }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 5 }}>Live Prices</div>
          {assets.filter(a => a.ticker && sidePrices[a.ticker]).map(a => {
            const s = sidePrices[a.ticker];
            const pos = (s?.change_pct ?? 0) >= 0;
            return (
              <div key={a.ticker} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--text2)" }}>{a.ticker}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: pos ? "#5cb88a" : "#e05c5c" }}>
                  ${s.price.toFixed(2)} <span style={{ fontSize: 9 }}>{pos ? "+" : ""}{s.change_pct.toFixed(2)}%</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

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
          .c-mob-tabs{display:flex!important}
          .c-metrics{grid-template-columns:repeat(2,1fr)!important}
          .c-bgrid{grid-template-columns:1fr!important}
          .c-risk-grid{grid-template-columns:1fr!important}
          .c-content{padding:12px!important}
          .c-mob-analyze{display:flex!important}
          .c-ai-tab{height:calc(100dvh - 140px)!important}
        }
        @media(min-width:769px){
          .c-mob-bar{display:none!important}
          .c-mob-tabs{display:none!important}
          .c-mob-drawer{display:none!important}
          .c-mob-analyze{display:none!important}
        }
        .c-mob-tabs{scrollbar-width:none;-webkit-overflow-scrolling:touch}
        .c-mob-tabs::-webkit-scrollbar{display:none}
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
          <button onClick={() => setSidebarOpen(true)} style={{ width: 32, height: 32, background: "none", border: "0.5px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
            <button onClick={() => setShowAlerts(true)} title="Alerts"
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
            <UserMenu onEmailPrefs={() => setShowEmailPrefs(true)} onReferral={() => setShowReferral(true)} />
          </div>
        </header>

        {/* Content */}
        <main className="c-content" style={S.content}>
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
              <motion.div key="stocks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
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
              <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}><Empty /></motion.div>
            ) : loading ? (
              <motion.div key="loading" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}><OverviewSkeleton /></motion.div>
            ) : activeTab === "overview" ? (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
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
                <PortfolioHistory />
              </motion.div>
            ) : activeTab === "risk" ? (
              <motion.div key="risk" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="c-risk-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Card style={{ marginBottom: 0 }}><TooltipCardHeader title="Drawdown" sections={[{label:"Plain English",text:"Shows the biggest loss from a peak to a trough in your portfolio over the selected period."},{label:"Example",text:"A -20% drawdown means your portfolio fell from $100K to $80K before recovering."},{label:"What's Good",text:"Drawdowns under 15% are generally considered manageable for long-term investors. Deeper troughs signal higher risk."}]} /><DrawdownChart assets={assets} period={period} /></Card>
                  <Card style={{ marginBottom: 0 }}><TooltipCardHeader title="Correlation" sections={[{label:"Plain English",text:"Shows how your assets move in relation to each other. A value of 1.0 means they move in perfect lockstep."},{label:"Example",text:"AAPL and MSFT often have correlation near 0.8 — when one drops, the other usually does too."},{label:"What's Good",text:"Aim for correlations below 0.5 between your major holdings. Low correlation = real diversification."}]} /><CorrelationHeatmap assets={assets} period={period} /></Card>
                </div>
              </motion.div>
            ) : activeTab === "simulate" ? (
              <motion.div key="simulate" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <Card><TooltipCardHeader title="Monte Carlo Simulation" sections={[
                  { label: "Plain English", text: "Runs thousands of random future scenarios based on your portfolio's historical returns and volatility to estimate a range of outcomes." },
                  { label: "Example", text: "With 1,000 simulations, 90% of paths might end between $8,000 and $28,000 from a $10,000 start over 10 years." },
                  { label: "What's Good", text: "A wide band means high uncertainty. A tight upward band is ideal. The median (50th percentile) path is a realistic central estimate." },
                ]} /><MonteCarloChart assets={assets} period={period} /></Card>
              </motion.div>
            ) : activeTab === "compare" ? (
              <motion.div key="compare" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <CompareTab assets={assets} period={period} benchmark={benchmark} benchmarkLabel={benchLabel} currentData={data} />
              </motion.div>
            ) : activeTab === "news" ? (
              <motion.div key="news" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <Card><CardHeader title="Market News" /><NewsFeed assets={assets} /></Card>
              </motion.div>
            ) : activeTab === "watchlist" ? (
              <motion.div key="watchlist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <Watchlist />
              </motion.div>
            ) : activeTab === "ai" ? (
              <motion.div key="ai" className="c-ai-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                style={{ height: "calc(100vh - 96px)", display: "flex", flexDirection: "column" }}>
                <AiChat data={data} assets={assets} goals={goals} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile floating Analyze button */}
      <motion.button
        className="c-mob-analyze"
        onClick={handleAnalyze}
        disabled={loading || !assets.some(a => a.ticker && a.weight > 0)}
        animate={analyzeComplete ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.35 }}
        style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 150, padding: "13px 40px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 2, textTransform: "uppercase" as const, background: loading ? "var(--bg3)" : "var(--text)", color: loading ? "var(--text3)" : "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: 24, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 24px rgba(0,0,0,0.3)", transition: "background 0.2s, color 0.2s", animation: loading ? "analyze-ring 1.2s ease-out infinite" : "none" }}>
        {loading ? "Analyzing..." : "Analyze"}
      </motion.button>

      <AnimatePresence>
        {showGoals && <GoalsModal onComplete={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowGoals(false); if (tourNeededRef.current) setShowTour(true); }} onSkip={() => { localStorage.setItem("corvo_goals", "skipped"); setShowGoals(false); if (tourNeededRef.current) setShowTour(true); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {showTour && <OnboardingTour onComplete={async () => {
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

    </div>
  );
}
