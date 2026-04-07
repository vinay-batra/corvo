"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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

const TABS = [
  { id: "overview",  label: "Overview",  icon: "◈" },
  { id: "risk",      label: "Risk",       icon: "◬" },
  { id: "simulate",  label: "Simulate",   icon: "◎" },
  { id: "compare",   label: "Compare",    icon: "⊞" },
  { id: "news",      label: "News",       icon: "◷" },
  { id: "ai",        label: "AI Chat",    icon: "✦" },
];

const PERIODS = ["6mo", "1y", "2y", "5y"];
const PERIOD_LABELS: Record<string, string> = { "6mo": "6M", "1y": "1Y", "2y": "2Y", "5y": "5Y" };

const BENCHMARKS = [
  { ticker: "^GSPC",  label: "S&P 500" },
  { ticker: "^IXIC",  label: "Nasdaq" },
  { ticker: "^DJI",   label: "Dow Jones" },
  { ticker: "^RUT",   label: "Russell 2K" },
  { ticker: "QQQ",    label: "QQQ ETF" },
  { ticker: "GLD",    label: "Gold" },
];

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("corvo_theme");
    if (stored === "dark") { setDark(true); document.documentElement.setAttribute("data-theme", "dark"); }
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
    sidebar:    { width: 244, flexShrink: 0, borderRight: "0.5px solid var(--border)", display: "flex", flexDirection: "column" as const, background: "var(--bg2)", overflow: "hidden" },
    sidebarTop: { padding: "14px 16px 12px", borderBottom: "0.5px solid var(--border)" },
    logo:       { fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "var(--text)" },
    logoSub:    { fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const },
    section:    { padding: "10px 14px", borderBottom: "0.5px solid var(--border)" },
    label:      { fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 8 },
    main:       { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden", background: "var(--bg)", minWidth: 0 },
    topbar:     { height: 48, flexShrink: 0, borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "var(--bg)", gap: 8 },
    content:    { flex: 1, overflowY: "auto" as const, padding: "20px 24px" },
    card:       { border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", marginBottom: 12 } as React.CSSProperties,
    cardHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
    cardAccent: { width: 2, height: 14, background: "var(--text)", borderRadius: 1 },
    cardTitle:  { fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const },
    metricsGrid:{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 },
    bottomGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  };
}

function LiveClock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text3)", letterSpacing: 1 }}>{t}</span>;
}

function DarkModeToggle({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button onClick={toggle} title={dark ? "Light mode" : "Dark mode"}
      style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, transition: "background 0.15s", flexShrink: 0 }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      {dark ? "☀️" : "🌙"}
    </button>
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
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 340, gap: 14, textAlign: "center" }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="1" y="1" width="38" height="38" rx="8" stroke="var(--text)" strokeWidth="1"/>
        <path d="M14 28 A8 8 0 1 1 26 28" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <circle cx="20" cy="20" r="2" fill="var(--text)"/>
      </svg>
      <div>
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>Build your portfolio</p>
        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7 }}>Add tickers on the left, then click Analyze</p>
      </div>
    </motion.div>
  );
}

// ── Portfolio Comparison ──────────────────────────────────────────────────────
function CompareTab({ assets, period, benchmark, benchmarkLabel, currentData }: { assets: { ticker: string; weight: number }[]; period: string; benchmark: string; benchmarkLabel: string; currentData: any }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [savedPortfolios, setSavedPortfolios] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

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
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>No saved portfolios yet</p>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>Analyze a portfolio, then use the Save button in the sidebar to save it. Come back here to compare multiple portfolios side by side.</p>
        </div>
      )}

      {active.length > 0 && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, background: "var(--card-bg)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 }} />
            <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Side-by-Side · {period.toUpperCase()} · vs {benchmarkLabel}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--border)" }}>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 10, letterSpacing: 1, color: "var(--text3)", fontWeight: 500 }}>Metric</th>
                  {active.map(p => (
                    <th key={p.id} style={{ padding: "12px 20px", textAlign: "right", fontSize: 12, color: "var(--text)", fontWeight: 500, minWidth: 120 }}>
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
                      {active.map(p => {
                        const val = p.result[m.key] ?? 0;
                        const isBest = val === best;
                        return (
                          <td key={p.id} style={{ padding: "13px 20px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: isBest ? 600 : 400, color: isBest ? "var(--text)" : "var(--text3)" }}>
                            {m.fmt(val)}{isBest && <span style={{ marginLeft: 5, fontSize: 9, color: "#c9a84c" }}>★</span>}
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
      )}
    </div>
  );
}

export default function AppPage() {
  const [assets, setAssets]           = useState([{ ticker: "AAPL", weight: 50 }, { ticker: "MSFT", weight: 50 }]);
  const [period, setPeriod]           = useState("1y");
  const [benchmark, setBenchmark]     = useState("^GSPC");
  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [activeTab, setActiveTab]     = useState("overview");
  const [goals, setGoals]             = useState<any>(null);
  const [showGoals, setShowGoals]     = useState(false);
  const [showTour, setShowTour]       = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [benchOpen, setBenchOpen]     = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark, toggle: toggleDark }  = useTheme();
  const S = useS();

  useEffect(() => {
    const g = localStorage.getItem("corvo_goals");
    if (g && g !== "skipped") { try { setGoals(JSON.parse(g)); } catch {} }
    else setShowGoals(true);
  }, []);

  const handleAnalyze = async () => {
    const valid = assets.filter(a => a.ticker && a.weight > 0);
    if (!valid.length) return;
    setLoading(true); setData(null);
    try {
      const result = await fetchPortfolio(valid, period, benchmark);
      setData(result);
      setActiveTab("overview");
    } catch (e) { console.error(e); }
    setLoading(false);
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
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
              <ellipse cx="9" cy="11" rx="4" ry="5" fill="var(--bg)" opacity="0.92"/>
              <circle cx="9" cy="5.5" r="3" fill="var(--bg)" opacity="0.92"/>
              <path d="M11 5.5 L13.5 6.2 L11 7" fill="var(--bg)" opacity="0.7"/>
              <circle cx="10.2" cy="5.2" r="0.8" fill="var(--text)"/>
            </svg>
          </div>
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

      {/* Builder */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
        <PortfolioBuilder assets={assets} onAssetsChange={setAssets} onAnalyze={handleAnalyze} loading={loading} />
      </div>

      {/* Analyze button */}
      <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--border)" }}>
        <button onClick={handleAnalyze} disabled={loading || !assets.some(a => a.ticker && a.weight > 0)}
          style={{ width: "100%", padding: "11px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 2, textTransform: "uppercase" as const, background: loading ? "transparent" : "var(--text)", color: loading ? "var(--text3)" : "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: 9, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
          {loading ? "Analyzing..." : "▶  Analyze"}
        </button>
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

      {/* Footer */}
      <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "0.5px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: loading ? "var(--text2)" : "var(--text)", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>{loading ? "Analyzing" : "Live"}</span>
        </div>
        <LiveClock />
      </div>
    </>
  );

  return (
    <div style={S.app}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @media(max-width:768px){
          .c-sidebar{display:none!important}
          .c-topbar{display:none!important}
          .c-mob-bar{display:flex!important}
          .c-mob-tabs{display:flex!important}
          .c-metrics{grid-template-columns:repeat(2,1fr)!important}
          .c-bgrid{grid-template-columns:1fr!important}
          .c-content{padding:12px!important}
        }
        @media(min-width:769px){
          .c-mob-bar{display:none!important}
          .c-mob-tabs{display:none!important}
          .c-mob-drawer{display:none!important}
        }
        .tab-btn:hover{background:var(--bg3)!important;color:var(--text)!important}
      `}</style>

      {/* Desktop sidebar */}
      <aside className="c-sidebar" style={S.sidebar}><SidebarInner /></aside>

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
              <SidebarInner />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div style={S.main}>
        {/* Mobile top bar */}
        <div className="c-mob-bar" style={{ height: 48, borderBottom: "0.5px solid var(--border)", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "var(--bg)", flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ width: 32, height: 32, background: "none", border: "0.5px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text)", fontSize: 16 }}>☰</button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "var(--text)" }}>CORVO</span>
          <DarkModeToggle dark={dark} toggle={toggleDark} />
        </div>

        {/* Mobile tabs */}
        <div className="c-mob-tabs" style={{ borderBottom: "0.5px solid var(--border)", padding: "0 8px", gap: 2, overflowX: "auto", flexShrink: 0, background: "var(--bg)" }}>
          {TABS.map(tab => (
            <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)}
              style={{ padding: "10px 10px", fontSize: 11, borderRadius: 6, border: "none", background: activeTab === tab.id ? "var(--bg3)" : "transparent", color: activeTab === tab.id ? "var(--text)" : "var(--text3)", cursor: "pointer", fontWeight: activeTab === tab.id ? 500 : 400, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Desktop topbar */}
        <header className="c-topbar" style={S.topbar}>
          <div style={{ display: "flex", gap: 2, flex: 1, overflowX: "auto" }}>
            {TABS.map(tab => (
              <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)} style={{
                padding: "7px 14px", fontSize: 13, borderRadius: 8, flexShrink: 0,
                border: activeTab === tab.id ? "0.5px solid var(--border2)" : "0.5px solid transparent",
                background: activeTab === tab.id ? "var(--bg3)" : "transparent",
                color: activeTab === tab.id ? "var(--text)" : "var(--text3)",
                cursor: "pointer", fontWeight: activeTab === tab.id ? 500 : 400, transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{tab.icon}</span>
                {tab.label}
                {tab.id === "ai" && <span style={{ marginLeft: 2, padding: "1px 5px", background: "var(--text)", color: "var(--bg)", borderRadius: 4, fontSize: 8, letterSpacing: 1 }}>AI</span>}
                {tab.id === "compare" && <span style={{ marginLeft: 2, padding: "1px 5px", background: "rgba(201,168,76,0.15)", color: "#c9a84c", borderRadius: 4, fontSize: 8 }}>NEW</span>}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <DarkModeToggle dark={dark} toggle={toggleDark} />
            <ExportPDF data={data} assets={assets} />
            <UserMenu />
          </div>
        </header>

        {/* Content */}
        <main className="c-content" style={S.content}>
          <AnimatePresence mode="wait">
            {!data && !loading ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Empty /></motion.div>
            ) : loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Spinner /></motion.div>
            ) : activeTab === "overview" ? (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="c-metrics" style={S.metricsGrid}><Metrics data={data} /></div>
                <Card><CardHeader title="Performance" /><PerformanceChart data={data} /></Card>
                <div className="c-bgrid" style={S.bottomGrid}>
                  <Card style={{ marginBottom: 0 }}><CardHeader title="Health Score" /><HealthScore data={data} /></Card>
                  <Card style={{ marginBottom: 0 }}><CardHeader title="AI Insights" /><AiInsights data={data} assets={assets} onAskAi={() => setActiveTab("ai")} /></Card>
                  <Card style={{ marginBottom: 0 }}><CardHeader title={`vs ${benchLabel}`} /><BenchmarkComparison data={data} /></Card>
                </div>
                <Card style={{ marginTop: 12 }}><CardHeader title="Allocation" /><Breakdown assets={assets} /></Card>
              </motion.div>
            ) : activeTab === "risk" ? (
              <motion.div key="risk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Card style={{ marginBottom: 0 }}><CardHeader title="Drawdown" /><DrawdownChart assets={assets} period={period} /></Card>
                  <Card style={{ marginBottom: 0 }}><CardHeader title="Correlation" /><CorrelationHeatmap assets={assets} period={period} /></Card>
                </div>
              </motion.div>
            ) : activeTab === "simulate" ? (
              <motion.div key="simulate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card><CardHeader title="Monte Carlo Simulation" /><MonteCarloChart assets={assets} period={period} /></Card>
              </motion.div>
            ) : activeTab === "compare" ? (
              <motion.div key="compare" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CompareTab assets={assets} period={period} benchmark={benchmark} benchmarkLabel={benchLabel} currentData={data} />
              </motion.div>
            ) : activeTab === "news" ? (
              <motion.div key="news" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card><CardHeader title="Market News" /><NewsFeed assets={assets} /></Card>
              </motion.div>
            ) : activeTab === "ai" ? (
              <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: "calc(100vh - 96px)", display: "flex", flexDirection: "column" }}>
                <AiChat data={data} assets={assets} goals={goals} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {showGoals && <GoalsModal onComplete={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowGoals(false); setShowTour(true); }} onSkip={() => { localStorage.setItem("corvo_goals", "skipped"); setShowGoals(false); setShowTour(true); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showProfile && <ProfileEditor goals={goals} onSave={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowProfile(false); }} onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
    </div>
  );
}
