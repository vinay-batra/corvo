"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  { id: "overview",  label: "Overview" },
  { id: "risk",      label: "Risk" },
  { id: "simulate",  label: "Simulate" },
  { id: "news",      label: "News" },
  { id: "ai",        label: "AI Chat" },
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

// ── Theme hook ──────────────────────────────────────────────────────────────
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

// ── Theme-aware styles ───────────────────────────────────────────────────────
function useS() {
  return {
    app:       { display: "flex", height: "100vh", background: "var(--bg)", fontFamily: "var(--font-body)" } as React.CSSProperties,
    sidebar:   { width: 240, flexShrink: 0, borderRight: "0.5px solid var(--border)", display: "flex", flexDirection: "column" as const, background: "var(--bg2)", overflow: "hidden" },
    sidebarTop:{ padding: "18px 16px 14px", borderBottom: "0.5px solid var(--border)" },
    logo:      { fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, letterSpacing: 4, color: "var(--text)" },
    logoSub:   { fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const },
    section:   { padding: "12px 16px", borderBottom: "0.5px solid var(--border)" },
    label:     { fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 8 },
    main:      { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden", background: "var(--bg)" },
    topbar:    { height: 44, flexShrink: 0, borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "var(--bg)" },
    content:   { flex: 1, overflowY: "auto" as const, padding: "20px 24px" },
    card:      { border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", marginBottom: 12 } as React.CSSProperties,
    cardHeader:{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
    cardAccent:{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 },
    cardTitle: { fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const },
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
    <button
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 30, height: 30, borderRadius: 8, border: "0.5px solid var(--border)",
        background: "transparent", cursor: "pointer", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 14, transition: "background 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
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
        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7 }}>Add tickers on the left and click Analyze</p>
      </div>
    </motion.div>
  );
}

export default function AppPage() {
  const [assets, setAssets]         = useState([{ ticker: "AAPL", weight: 50 }, { ticker: "MSFT", weight: 50 }]);
  const [period, setPeriod]         = useState("1y");
  const [benchmark, setBenchmark]   = useState("^GSPC");
  const [data, setData]             = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [activeTab, setActiveTab]   = useState("overview");
  const [goals, setGoals]           = useState<any>(null);
  const [showGoals, setShowGoals]   = useState(false);
  const [showTour, setShowTour]     = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [benchOpen, setBenchOpen]   = useState(false);
  const { dark, toggle: toggleDark } = useTheme();
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
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const benchLabel = BENCHMARKS.find(b => b.ticker === benchmark)?.label ?? benchmark;
  const normalWeights = (arr: typeof assets) => {
    const total = arr.reduce((s, a) => s + a.weight, 0);
    return arr.map(a => a.weight / total);
  };

  const Card = ({ children, style = {} }: any) => (
    <div style={{ ...S.card, ...style }}>{children}</div>
  );
  const CardHeader = ({ title }: { title: string }) => (
    <div style={S.cardHeader}>
      <div style={S.cardAccent} />
      <span style={S.cardTitle}>{title}</span>
    </div>
  );

  return (
    <div style={S.app}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* ── SIDEBAR ── */}
      <aside style={S.sidebar}>
        {/* Logo */}
        <div style={S.sidebarTop}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            {/* Mini raven */}
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                <ellipse cx="9" cy="11" rx="4" ry="5" fill="var(--bg)" opacity="0.92"/>
                <circle cx="9" cy="5.5" r="3" fill="var(--bg)" opacity="0.92"/>
                <path d="M11 5.5 L13.5 6.2 L11 7" fill="var(--bg)" opacity="0.7"/>
                <circle cx="10.2" cy="5.2" r="0.8" fill="var(--text)"/>
              </svg>
            </div>
            <div style={S.logo}>CORVO</div>
          </div>
          <div style={S.logoSub}>Portfolio Intelligence</div>
        </div>

        {/* Profile button */}
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

        {/* Portfolio builder */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          <PortfolioBuilder
            assets={assets}
            onAssetsChange={setAssets}
            onAnalyze={handleAnalyze}
            loading={loading}
          />
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
            <span>{benchLabel}</span>
            <span style={{ color: "var(--text3)", fontSize: 9 }}>▾</span>
          </button>
          <AnimatePresence>
            {benchOpen && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", bottom: "100%", left: 16, right: 16, background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 10, overflow: "hidden", zIndex: 50, marginBottom: 4, boxShadow: "var(--shadow)" }}>
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
        <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "0.5px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: loading ? "var(--text2)" : "var(--text)", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>{loading ? "Analyzing" : "Live"}</span>
          </div>
          <LiveClock />
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={S.main}>
        {/* Topbar */}
        <header style={S.topbar}>
          <div style={{ display: "flex", gap: 2 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "6px 12px", fontSize: 12, borderRadius: 8,
                border: activeTab === tab.id ? "0.5px solid var(--border2)" : "0.5px solid transparent",
                background: activeTab === tab.id ? "var(--bg3)" : "transparent",
                color: activeTab === tab.id ? "var(--text)" : "var(--text3)",
                cursor: "pointer", fontWeight: activeTab === tab.id ? 500 : 400, transition: "all 0.15s",
              }}>
                {tab.label}
                {tab.id === "ai" && (
                  <span style={{ marginLeft: 4, padding: "1px 5px", background: "var(--text)", color: "var(--bg)", borderRadius: 4, fontSize: 8, letterSpacing: 1 }}>AI</span>
                )}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <DarkModeToggle dark={dark} toggle={toggleDark} />
            <ExportPDF data={data} assets={assets} />
            <UserMenu />
          </div>
        </header>

        {/* Content */}
        <main style={S.content}>
          <AnimatePresence mode="wait">
            {!data && !loading ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Empty />
              </motion.div>
            ) : loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Spinner />
              </motion.div>
            ) : activeTab === "overview" ? (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={S.metricsGrid}>
                  <Metrics data={data} />
                </div>
                <Card>
                  <CardHeader title="Performance" />
                  <PerformanceChart
                    tickers={assets.map(a => a.ticker)}
                    weights={normalWeights(assets)}
                    period={period}
                    benchmark={benchmark}
                    benchmarkLabel={benchLabel}
                  />
                </Card>
                <div style={S.bottomGrid}>
                  <Card style={{ marginBottom: 0 }}>
                    <CardHeader title="Health Score" />
                    <HealthScore data={data} />
                  </Card>
                  <Card style={{ marginBottom: 0 }}>
                    <CardHeader title="AI Insights" />
                    <AiInsights data={data} assets={assets} onAskAi={() => setActiveTab("ai")} />
                  </Card>
                  <Card style={{ marginBottom: 0 }}>
                    <CardHeader title={`vs ${benchLabel}`} />
                    <BenchmarkComparison data={data} benchmarkLabel={benchLabel} />
                  </Card>
                </div>
                <Card style={{ marginTop: 12 }}>
                  <CardHeader title="Allocation" />
                  <Breakdown assets={assets} />
                </Card>
              </motion.div>

            ) : activeTab === "risk" ? (
              <motion.div key="risk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Card style={{ marginBottom: 0 }}>
                    <CardHeader title="Drawdown" />
                    <DrawdownChart tickers={assets.map(a => a.ticker)} weights={normalWeights(assets)} period={period} />
                  </Card>
                  <Card style={{ marginBottom: 0 }}>
                    <CardHeader title="Correlation" />
                    <CorrelationHeatmap assets={assets} period={period} />
                  </Card>
                </div>
              </motion.div>

            ) : activeTab === "simulate" ? (
              <motion.div key="simulate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card>
                  <CardHeader title="Monte Carlo Simulation" />
                  <MonteCarloChart tickers={assets.map(a => a.ticker)} weights={normalWeights(assets)} period={period} />
                </Card>
              </motion.div>

            ) : activeTab === "news" ? (
              <motion.div key="news" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card>
                  <CardHeader title="Market News" />
                  {/* Pass assets (full objects) so NewsFeed can show per-ticker tabs */}
                  <NewsFeed assets={assets} />
                </Card>
              </motion.div>

            ) : activeTab === "ai" ? (
              <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: "calc(100vh - 44px - 48px)", display: "flex", flexDirection: "column" }}>
                {/* Pass data, assets AND goals so AI actually uses onboarding profile */}
                <AiChat data={data} assets={assets} goals={goals} />
              </motion.div>

            ) : null}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showGoals && (
          <GoalsModal
            onComplete={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowGoals(false); setShowTour(true); }}
            onSkip={() => { localStorage.setItem("corvo_goals", "skipped"); setShowGoals(false); setShowTour(true); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showProfile && (
          <ProfileEditor
            goals={goals}
            onSave={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowProfile(false); }}
            onClose={() => setShowProfile(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
