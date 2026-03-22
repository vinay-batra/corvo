"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

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
import { fetchPortfolio } from "../../lib/api";
import GoalsModal from "../../components/GoalsModal";
import ProfileEditor from "../../components/ProfileEditor";
import OnboardingTour from "../../components/OnboardingTour";

const TABS = [
  { id: "overview", label: "Overview",  icon: "◈" },
  { id: "risk",     label: "Risk",      icon: "◬" },
  { id: "simulate", label: "Simulate",  icon: "◎" },
  { id: "news",     label: "News",      icon: "◷" },
  { id: "ai",       label: "AI Chat",   icon: "✦" },
];

const PERIODS = ["6mo", "1y", "2y", "5y"];
const PERIOD_LABELS: Record<string, string> = { "6mo": "6M", "1y": "1Y", "2y": "2Y", "5y": "5Y" };

const BENCHMARKS = [
  { ticker: "^GSPC", label: "S&P 500" },
  { ticker: "^IXIC", label: "Nasdaq" },
  { ticker: "^DJI",  label: "Dow Jones" },
  { ticker: "^RUT",  label: "Russell 2K" },
  { ticker: "QQQ",   label: "QQQ ETF" },
  { ticker: "GLD",   label: "Gold" },
];

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 10,
      color: "var(--text-muted)", letterSpacing: 2
    }}>{time}</span>
  );
}

function PulsingDot({ color = "var(--green)" }: { color?: string }) {
  return (
    <span style={{
      display: "inline-block", width: 5, height: 5, borderRadius: "50%",
      background: color, animation: "pulse-dot 2s infinite",
      boxShadow: `0 0 6px ${color}`
    }} />
  );
}

function SectionHeader({ title, accent = "var(--green)" }: { title: string; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <div style={{ width: 2, height: 16, background: accent, borderRadius: 1, boxShadow: `0 0 8px ${accent}` }} />
      <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: 4, color: "var(--text-muted)", textTransform: "uppercase" }}>{title}</span>
    </div>
  );
}

function Card({ children, accent = "var(--green)", style = {}, delay = 0, className = "" }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid var(--border-dim)",
        borderRadius: 20,
        padding: "24px",
        position: "relative",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        ...style
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${accent}60 50%, transparent 100%)`
      }} />
      {children}
    </motion.div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20 }}>
      <div style={{ position: "relative", width: 48, height: 48 }}>
        <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(0,255,179,0.1)", borderTopColor: "var(--green)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <div style={{ position: "absolute", inset: 6, border: "1px solid rgba(56,189,248,0.1)", borderTopColor: "var(--cyan)", borderRadius: "50%", animation: "spin 0.7s linear infinite reverse" }} />
        <div style={{ position: "absolute", inset: 14, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 4, height: 4, background: "var(--green)", borderRadius: "50%", boxShadow: "0 0 8px var(--green)" }} />
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--green)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>Crunching Numbers</p>
        <p style={{ fontSize: 11, color: "var(--text-faint)" }}>Fetching market data...</p>
      </div>
    </div>
  );
}

function EmptyState({ loading }: { loading: boolean }) {
  const [showGoals, setShowGoals] = useState(false);
  const [goals, setGoals] = useState<any>(null);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const g = localStorage.getItem("corvo_goals");
    if (g) setGoals(JSON.parse(g));
    else setShowGoals(true);
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, gap: 20 }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, gap: 24, textAlign: "center", padding: "0 32px" }}
      >
        {/* Animated logo mark */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "relative" }}
        >
          <svg width="64" height="64" viewBox="0 0 40 40" fill="none">
            <motion.polygon points="20,2 35,11 35,29 20,38 5,29 5,11"
              stroke="rgba(0,255,179,0.3)" strokeWidth="1" fill="none"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} />
            <motion.polygon points="20,2 35,11 35,29 20,38 5,29 5,11"
              stroke="var(--green)" strokeWidth="1.5" fill="none"
              strokeDasharray="100"
              initial={{ strokeDashoffset: 100 }} animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              style={{ filter: "drop-shadow(0 0 6px rgba(0,255,179,0.6))" }} />
            <motion.path d="M26 14 A8 8 0 1 0 26 26" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" fill="none"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.5 }}
              style={{ filter: "drop-shadow(0 0 4px rgba(0,255,179,0.8))" }} />
            <motion.circle cx="20" cy="20" r="2" fill="var(--green)"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 1.5, type: "spring" }}
              style={{ filter: "drop-shadow(0 0 6px var(--green))" }} />
          </svg>
          <div style={{ position: "absolute", inset: -12, background: "radial-gradient(circle, rgba(0,255,179,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        </motion.div>

        <div>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, letterSpacing: -0.5 }}
          >
            Build your portfolio
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 300 }}
          >
            Add assets on the left and hit <span style={{ color: "var(--green)", fontFamily: "var(--font-mono)", fontSize: 12 }}>ANALYZE</span> to get institutional-grade insights instantly.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{ display: "flex", gap: 8 }}
        >
          {["VOO", "AAPL", "MSFT", "BTC-USD"].map((t, i) => (
            <motion.div key={t}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              style={{ padding: "6px 12px", background: "rgba(0,255,179,0.06)", border: "1px solid rgba(0,255,179,0.15)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)", letterSpacing: 1 }}
            >{t}</motion.div>
          ))}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showGoals && (
          <GoalsModal
            onComplete={(g: any) => { setGoals(g); setShowGoals(false); setShowTour(true); }}
            onSkip={() => { setShowGoals(false); setShowTour(true); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
      </AnimatePresence>
    </>
  );
}

export default function AppPage() {
  const [assets, setAssets] = useState([
    { ticker: "AAPL", weight: 50 },
    { ticker: "MSFT", weight: 50 },
  ]);
  const [period, setPeriod] = useState("1y");
  const [benchmark, setBenchmark] = useState("^GSPC");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [goals, setGoals] = useState<any>(null);
  const [showGoals, setShowGoals] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [benchmarkOpen, setBenchmarkOpen] = useState(false);

  useEffect(() => {
    const g = localStorage.getItem("corvo_goals");
    if (g) setGoals(JSON.parse(g));
    else setShowGoals(true);
  }, []);

  const handleAnalyze = async () => {
    const validAssets = assets.filter(a => a.ticker && a.weight > 0);
    if (validAssets.length === 0) return;
    setLoading(true);
    setData(null);
    try {
      const totalWeight = validAssets.reduce((s, a) => s + a.weight, 0);
      const normalizedWeights = validAssets.map(a => a.weight / totalWeight);
      const result = await fetchPortfolio(
        validAssets.map(a => a.ticker),
        normalizedWeights,
        period,
        benchmark
      );
      setData(result);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const benchmarkLabel = BENCHMARKS.find(b => b.ticker === benchmark)?.label ?? benchmark;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-void)", position: "relative", overflow: "hidden" }}>

      {/* Ambient glow orbs */}
      <div style={{ position: "fixed", top: "5%", left: "15%", width: 600, height: 600, background: "radial-gradient(circle, rgba(0,255,179,0.04) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "10%", right: "10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ─── LEFT SIDEBAR ─── */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ width: 264, flexShrink: 0, background: "rgba(6,10,28,0.97)", borderRight: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 10, backdropFilter: "blur(20px)" }}
      >
        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <polygon points="20,2 35,11 35,29 20,38 5,29 5,11" stroke="var(--green)" strokeWidth="1.5" fill="none" style={{ filter: "drop-shadow(0 0 4px rgba(0,255,179,0.5))" }} />
              <path d="M26 14 A8 8 0 1 0 26 26" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="20" cy="20" r="2" fill="var(--green)" style={{ filter: "drop-shadow(0 0 4px var(--green))" }} />
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, letterSpacing: 5, color: "var(--green)", textShadow: "0 0 20px rgba(0,255,179,0.3)" }}>CORVO</span>
          </div>
          <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-faint)", textTransform: "uppercase", paddingLeft: 2 }}>Portfolio Intelligence</p>
        </div>

        {/* Profile button */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={() => setShowProfile(true)}
            style={{ width: "100%", padding: "8px 12px", background: "rgba(0,255,179,0.04)", border: "1px solid rgba(0,255,179,0.1)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,179,0.08)"; e.currentTarget.style.borderColor = "rgba(0,255,179,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,255,179,0.04)"; e.currentTarget.style.borderColor = "rgba(0,255,179,0.1)"; }}
          >
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(0,255,179,0.12)", border: "1px solid rgba(0,255,179,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--green)" }}>✦</div>
            <div style={{ textAlign: "left", flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Edit Profile</p>
              <p style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 0.5 }}>Goals & preferences</p>
            </div>
          </button>
        </div>

        {/* Portfolio builder */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
          <PortfolioBuilder
            assets={assets}
            onAssetsChange={setAssets}
            onAnalyze={handleAnalyze}
            loading={loading}
          />
        </div>

        {/* Period selector */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <p style={{ fontSize: 8, letterSpacing: 3, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>Period</p>
          <div style={{ display: "flex", gap: 4 }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)",
                background: period === p ? "rgba(0,255,179,0.12)" : "transparent",
                border: period === p ? "1px solid rgba(0,255,179,0.35)" : "1px solid transparent",
                color: period === p ? "var(--green)" : "rgba(200,215,245,0.6)",
                cursor: "pointer", transition: "all 0.2s", letterSpacing: 0.5,
              }}>{PERIOD_LABELS[p]}</button>
            ))}
          </div>
        </div>

        {/* Benchmark */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", position: "relative" }}>
          <p style={{ fontSize: 8, letterSpacing: 3, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>Benchmark</p>
          <button
            onClick={() => setBenchmarkOpen(o => !o)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-dim)", borderRadius: 8, cursor: "pointer", color: "var(--cyan)", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 1 }}
          >
            <span>{benchmarkLabel}</span>
            <span style={{ color: "var(--text-faint)", fontSize: 8 }}>▾</span>
          </button>
          <AnimatePresence>
            {benchmarkOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scaleY: 0.9 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -4, scaleY: 0.9 }}
                style={{ position: "absolute", bottom: "100%", left: 16, right: 16, background: "rgba(4,8,24,0.98)", border: "1px solid var(--border-mid)", borderRadius: 12, overflow: "hidden", zIndex: 100, backdropFilter: "blur(16px)", marginBottom: 4 }}
              >
                {BENCHMARKS.map(b => (
                  <button key={b.ticker} onClick={() => { setBenchmark(b.ticker); setBenchmarkOpen(false); }}
                    style={{ width: "100%", textAlign: "left", padding: "9px 14px", background: b.ticker === benchmark ? "rgba(0,255,179,0.08)" : "transparent", border: "none", color: b.ticker === benchmark ? "var(--green)" : "var(--text-secondary)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.15s", letterSpacing: 0.3 }}
                    onMouseEnter={e => { if (b.ticker !== benchmark) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { if (b.ticker !== benchmark) e.currentTarget.style.background = "transparent"; }}
                  >{b.label}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Saved portfolios */}
        <div style={{ padding: "12px 16px 8px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <SavedPortfolios assets={assets} data={data} onLoad={(a: any) => setAssets(a)} />
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <PulsingDot />
            <span style={{ fontSize: 9, color: "var(--text-faint)", letterSpacing: 1 }}>LIVE</span>
          </div>
          <LiveClock />
        </div>
      </motion.aside>

      {/* ─── MAIN CONTENT ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* Top bar */}
        <motion.header
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: 56, background: "rgba(6,10,28,0.92)", borderBottom: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {TABS.map((tab, i) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                  background: activeTab === tab.id ? "rgba(0,255,179,0.08)" : "transparent",
                  border: activeTab === tab.id ? "1px solid rgba(0,255,179,0.2)" : "1px solid transparent",
                  color: activeTab === tab.id ? "var(--green)" : "rgba(200,215,245,0.65)",
                  fontSize: 12, fontFamily: "var(--font-body)", fontWeight: 500,
                  transition: "all 0.2s", letterSpacing: 0.3,
                }}
                onMouseEnter={e => { if (activeTab !== tab.id) { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; } }}
                onMouseLeave={e => { if (activeTab !== tab.id) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; } }}
              >
                <span style={{ fontSize: 10, opacity: 0.8 }}>{tab.icon}</span>
                {tab.label}
                {tab.id === "ai" && (
                  <span style={{ padding: "1px 6px", background: "rgba(0,255,179,0.15)", border: "1px solid rgba(0,255,179,0.3)", borderRadius: 4, fontSize: 8, letterSpacing: 1, color: "var(--green)" }}>AI</span>
                )}
              </motion.button>
            ))}
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {data && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(0,255,179,0.05)", border: "1px solid rgba(0,255,179,0.12)", borderRadius: 8 }}>
                <PulsingDot />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: 1 }}>
                  {assets.filter(a => a.ticker).length} ASSETS
                </span>
              </motion.div>
            )}
            <ExportPDF data={data} assets={assets} />
            <UserMenu />
          </div>
        </motion.header>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
          <AnimatePresence mode="wait">
            {!data && !loading ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState loading={false} />
              </motion.div>
            ) : loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LoadingSpinner />
              </motion.div>
            ) : activeTab === "overview" ? (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -8 }}>
                {/* Metric cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                  <Metrics data={data} />
                </div>

                {/* Performance chart */}
                <Card accent="var(--green)" style={{ marginBottom: 16 }} delay={0.1}>
                  <SectionHeader title="Performance" accent="var(--green)" />
                  <PerformanceChart
                    tickers={assets.map(a => a.ticker)}
                    weights={assets.map(a => a.weight / assets.reduce((s, x) => s + x.weight, 0))}
                    period={period}
                    benchmark={benchmark}
                    benchmarkLabel={benchmarkLabel}
                  />
                </Card>

                {/* Bottom row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Card accent="var(--amber)" delay={0.2}>
                    <SectionHeader title="Health Score" accent="var(--amber)" />
                    <HealthScore data={data} />
                  </Card>
                  <Card accent="var(--cyan)" delay={0.25}>
                    <SectionHeader title="AI Insights" accent="var(--cyan)" />
                    <AiInsights data={data} assets={assets} onAskAi={() => setActiveTab("ai")} />
                  </Card>
                  <Card accent="var(--violet)" delay={0.3}>
                    <SectionHeader title={`vs ${benchmarkLabel}`} accent="var(--violet)" />
                    <BenchmarkComparison data={data} benchmarkLabel={benchmarkLabel} />
                  </Card>
                </div>

                {/* Allocation breakdown */}
                <Card accent="var(--green)" style={{ marginTop: 12 }} delay={0.35}>
                  <SectionHeader title="Allocation" accent="var(--green)" />
                  <Breakdown assets={assets} />
                </Card>
              </motion.div>
            ) : activeTab === "risk" ? (
              <motion.div key="risk" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <Card accent="var(--red)">
                    <SectionHeader title="Drawdown" accent="var(--red)" />
                    <DrawdownChart
                      tickers={assets.map(a => a.ticker)}
                      weights={assets.map(a => a.weight / assets.reduce((s, x) => s + x.weight, 0))}
                      period={period}
                    />
                  </Card>
                  <Card accent="var(--violet)">
                    <SectionHeader title="Correlation Matrix" accent="var(--violet)" />
                    <CorrelationHeatmap assets={assets} period={period} />
                  </Card>
                </div>
              </motion.div>
            ) : activeTab === "simulate" ? (
              <motion.div key="simulate" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                <Card accent="var(--cyan)">
                  <SectionHeader title="Monte Carlo Simulation" accent="var(--cyan)" />
                  <MonteCarloChart
                    tickers={assets.map(a => a.ticker)}
                    weights={assets.map(a => a.weight / assets.reduce((s, x) => s + x.weight, 0))}
                    period={period}
                  />
                </Card>
              </motion.div>
            ) : activeTab === "news" ? (
              <motion.div key="news" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                <Card accent="var(--amber)">
                  <SectionHeader title="Market News" accent="var(--amber)" />
                  <NewsFeed tickers={assets.map(a => a.ticker)} />
                </Card>
              </motion.div>
            ) : activeTab === "ai" ? (
              <motion.div key="ai" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                style={{ height: "calc(100vh - 56px - 48px)" }}>
                <AiChat data={data} assets={assets} goals={goals} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showGoals && (
          <GoalsModal
            onComplete={(g: any) => { setGoals(g); localStorage.setItem("corvo_goals", JSON.stringify(g)); setShowGoals(false); setShowTour(true); }}
            onSkip={() => { setShowGoals(false); setShowTour(true); }}
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
