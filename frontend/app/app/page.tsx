"use client";

import { useState, useEffect } from "react";
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
import { fetchPortfolio } from "../../lib/api";
import GoalsModal from "../../components/GoalsModal";
import ProfileEditor from "../../components/ProfileEditor";
import OnboardingTour from "../../components/OnboardingTour";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "risk",     label: "Risk" },
  { id: "simulate", label: "Simulate" },
  { id: "news",     label: "News" },
  { id: "ai",       label: "AI Chat" },
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
  return <span style={{ fontFamily: "var(--font-display)", fontSize: 11, color: "rgba(240,244,248,0.55)", letterSpacing: 2 }}>{time}</span>;
}

function PulsingDot({ color = "var(--green)" }: { color?: string }) {
  return <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: color, animation: "pulse-dot 2s infinite" }} />;
}

function GlassCard({ children, accent, title, style = {} }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "24px 28px", position: "relative", overflow: "hidden", ...style }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.5 }} />
      {title && <p style={{ fontSize: 9, letterSpacing: 3, color: "rgba(240,244,248,0.55)", textTransform: "uppercase", marginBottom: 16 }}>{title}</p>}
      {children}
    </motion.div>
  );
}

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 360, gap: 16 }}>
      {loading ? (
        <>
          <div style={{ width: 40, height: 40, border: "2px solid var(--border-mid)", borderTopColor: "var(--green)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: 12, letterSpacing: 2, color: "rgba(240,244,248,0.55)", textTransform: "uppercase" }}>Crunching the numbers...</p>
        </>
      ) : (
        <>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--border-mid)" }}>◈</div>
          <p style={{ fontSize: 12, letterSpacing: 2, color: "rgba(240,244,248,0.55)", textTransform: "uppercase" }}>Add assets to begin analysis</p>
        </>
      )}
    </div>
  );
}

export default function AppPage() {
  const [assets, setAssets] = useState([
    { ticker: "AAPL", weight: 0.5 },
    { ticker: "MSFT", weight: 0.5 },
  ]);
  const [data, setData]           = useState<any>(null);
  const [period, setPeriod]       = useState("1y");
  const [benchmark, setBenchmark] = useState("^GSPC");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [tab, setTab]             = useState("overview");
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [showGoals, setShowGoals] = useState(() => {
    if (typeof window !== "undefined") return !localStorage.getItem("alphai_goals");
    return false;
  });
  const [showTour, setShowTour] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [goals, setGoals] = useState<any>(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (assets.some(a => !a.ticker.trim())) return;
      setLoading(true); setError(null);
      try {
        const res = await fetchPortfolio(assets, period, benchmark);
        setData(res);
      } catch {
        setError("Backend offline — start your FastAPI server.");
      }
      setLoading(false);
    }, 600);
    return () => clearTimeout(timeout);
  }, [assets, period, benchmark]);

  const portfolioContext = data ? { ...data, period } : {};
  const benchLabel = BENCHMARKS.find(b => b.ticker === benchmark)?.label ?? benchmark;

  const loadPortfolio = (savedAssets: { ticker: string; weight: number }[], savedPeriod: string) => {
    setAssets(savedAssets);
    setPeriod(savedPeriod);
  };

  return (
    <div style={{ display: "flex", height: "100vh", position: "relative", zIndex: 1 }}>

      {/* SIDEBAR */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5 }}
        style={{ width: 300, flexShrink: 0, borderRight: "1px solid var(--border-dim)", background: "rgba(2,4,8,0.9)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", overflowY: "auto" }}
      >
        <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid var(--border-dim)" }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 900, letterSpacing: 5, color: "var(--green)", textShadow: "0 0 24px rgba(0,255,160,0.4)" }}>
              CORVO
            </div>
          </a>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "rgba(240,244,248,0.55)", marginTop: 3, textTransform: "uppercase" }}>Portfolio Intelligence</div>
          <button onClick={() => setShowProfile(true)}
            style={{ marginTop: 10, fontSize: 9, letterSpacing: 2, color: "rgba(0,255,160,0.5)", background: "rgba(0,255,160,0.05)", border: "1px solid rgba(0,255,160,0.15)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-display)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,160,0.1)"; e.currentTarget.style.color = "var(--green)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,255,160,0.05)"; e.currentTarget.style.color = "rgba(0,255,160,0.5)"; }}
          >◈ EDIT PROFILE</button>
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          <PortfolioBuilder assets={assets} setAssets={setAssets} />
        </div>

        <div style={{ padding: "12px 16px 0" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "rgba(240,244,248,0.55)", textTransform: "uppercase", marginBottom: 10 }}>Period</p>
            <div style={{ display: "flex", gap: 5 }}>
              {PERIODS.map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 10, fontWeight: 600, letterSpacing: 1, cursor: "pointer",
                  border: `1px solid ${period === p ? "rgba(0,255,160,0.4)" : "var(--border-dim)"}`,
                  background: period === p ? "rgba(0,255,160,0.08)" : "transparent",
                  color: period === p ? "var(--green)" : "var(--text-muted)",
                  fontFamily: "var(--font-display)", transition: "all 0.2s",
                }}>{PERIOD_LABELS[p]}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "8px 16px 0" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 12, padding: "14px 16px" }}>
            <button onClick={() => setShowBenchmarks(v => !v)}
              style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <p style={{ fontSize: 9, letterSpacing: 3, color: "rgba(240,244,248,0.55)", textTransform: "uppercase" }}>Benchmark</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, fontFamily: "var(--font-display)", letterSpacing: 1, color: "var(--cyan)", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", padding: "2px 7px", borderRadius: 4 }}>{benchLabel}</span>
                <span style={{ color: "rgba(240,244,248,0.55)", fontSize: 10 }}>{showBenchmarks ? "▲" : "▼"}</span>
              </div>
            </button>
            <AnimatePresence>
              {showBenchmarks && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                    {BENCHMARKS.map(b => (
                      <button key={b.ticker} onClick={() => { setBenchmark(b.ticker); setShowBenchmarks(false); }} style={{
                        padding: "7px 10px", borderRadius: 7, fontSize: 10, letterSpacing: 1, cursor: "pointer",
                        border: `1px solid ${benchmark === b.ticker ? "rgba(0,212,255,0.35)" : "var(--border-dim)"}`,
                        background: benchmark === b.ticker ? "rgba(0,212,255,0.07)" : "transparent",
                        color: benchmark === b.ticker ? "var(--cyan)" : "var(--text-muted)",
                        fontFamily: "var(--font-display)", transition: "all 0.15s",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <span>{b.ticker}</span>
                        <span style={{ fontSize: 9, opacity: 0.6 }}>{b.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div style={{ paddingTop: 8 }}>
          <SavedPortfolios currentAssets={assets} currentPeriod={period} onLoad={loadPortfolio} />
        </div>

        {data && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ margin: "0 16px 16px", padding: "12px 14px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 12, position: "relative", overflow: "hidden" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--cyan), transparent)", opacity: 0.5 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <PulsingDot color="var(--cyan)" />
              <span style={{ fontSize: 9, letterSpacing: 3, color: "var(--cyan-dim)", textTransform: "uppercase" }}>AI Analyst</span>
            </div>
            <p style={{ fontSize: 11, color: "rgba(240,244,248,0.75)", lineHeight: 1.65 }}>
              {(() => {
                const ret = data.portfolio_return;
                const vol = data.portfolio_volatility;
                const sharpe = (ret - 0.04) / vol;
                const tickers = assets.map(a => a.ticker).join(", ");
                if (sharpe > 1.5) return `Strong risk-adjusted return on ${tickers}. Sharpe of ${sharpe.toFixed(2)} is excellent.`;
                if (ret < 0) return `${tickers} is down ${(ret * 100).toFixed(1)}% this period. Consider rebalancing.`;
                return `${tickers} returned ${(ret * 100).toFixed(1)}% with ${(vol * 100).toFixed(1)}% vol. ${sharpe > 1 ? "Solid risk-adjusted performance." : "Consider diversifying to improve Sharpe ratio."}`;
              })()}
            </p>
            <button onClick={() => setTab("ai")} style={{ marginTop: 8, fontSize: 9, letterSpacing: 2, color: "var(--cyan-dim)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-display)", padding: 0, textTransform: "uppercase" }}>
              Ask AI →
            </button>
          </motion.div>
        )}

        <div style={{ marginTop: "auto", padding: "10px 20px", borderTop: "1px solid var(--border-dim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: loading ? "var(--cyan-dim)" : error ? "var(--red)" : "var(--green-dim)" }}>
            <PulsingDot color={loading ? "var(--cyan)" : error ? "var(--red)" : "var(--green)"} />
            {loading ? "ANALYZING" : error ? "OFFLINE" : "LIVE"}
          </div>
          <LiveClock />
        </div>
      </motion.aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <motion.div initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}
          style={{ padding: "12px 24px", borderBottom: "1px solid var(--border-dim)", background: "rgba(2,4,8,0.7)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}
        >
          <div style={{ display: "flex", gap: 3 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, cursor: "pointer",
                border: `1px solid ${tab === t.id ? (t.id === "ai" ? "rgba(0,212,255,0.3)" : "rgba(0,255,160,0.3)") : "transparent"}`,
                background: tab === t.id ? (t.id === "ai" ? "rgba(0,212,255,0.07)" : "rgba(0,255,160,0.07)") : "transparent",
                color: tab === t.id ? (t.id === "ai" ? "var(--cyan)" : "var(--green)") : "var(--text-muted)",
                fontFamily: "var(--font-display)", transition: "all 0.2s",
              }}>
                {t.label}
                {t.id === "ai" && <span style={{ marginLeft: 5, fontSize: 7, background: "rgba(0,212,255,0.2)", color: "var(--cyan)", padding: "2px 4px", borderRadius: 3 }}>AI</span>}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {loading && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 10, color: "var(--cyan-dim)", letterSpacing: 2, textTransform: "uppercase" }}>⟳ Analyzing...</motion.span>}
            {error && <span style={{ fontSize: 10, color: "var(--red)", letterSpacing: 1 }}>{error}</span>}
            {data && <ExportPDF data={data} assets={assets} period={period} />}
            <UserMenu />
          </div>
        </motion.div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <AnimatePresence mode="wait">

            {tab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {data ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                      <Metrics data={data} />
                    </div>
                    <PerformanceChart data={data} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <HealthScore data={data} />
                      <AiInsights data={data} assets={assets} onAskAi={() => setTab("ai")} />
                      <BenchmarkComparison data={data} />
                    </div>
                    <Breakdown assets={assets} />
                  </div>
                ) : <EmptyState loading={loading} />}
              </motion.div>
            )}

            {tab === "risk" && (
              <motion.div key="risk" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {data ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <GlassCard accent="var(--red)" title="Max Drawdown">
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "var(--red)", letterSpacing: -2 }}>{(data.max_drawdown * 100).toFixed(2)}%</div>
                        <p style={{ fontSize: 12, color: "rgba(240,244,248,0.75)", marginTop: 8 }}>Worst peak-to-trough decline in the selected period.</p>
                      </GlassCard>
                      <GlassCard accent="var(--cyan)" title="Annualized Volatility">
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "var(--cyan)", letterSpacing: -2 }}>{(data.portfolio_volatility * 100).toFixed(2)}%</div>
                        <p style={{ fontSize: 12, color: "rgba(240,244,248,0.75)", marginTop: 8 }}>Standard deviation of daily returns × √252.</p>
                      </GlassCard>
                      <GlassCard accent="var(--green)" title="Sharpe Ratio">
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "var(--green)", letterSpacing: -2 }}>{((data.portfolio_return - 0.04) / data.portfolio_volatility).toFixed(2)}</div>
                        <p style={{ fontSize: 12, color: "rgba(240,244,248,0.75)", marginTop: 8 }}>Risk-adjusted return above 4% risk-free rate.</p>
                      </GlassCard>
                    </div>
                    <DrawdownChart assets={assets} period={period} />
                    <CorrelationHeatmap assets={assets} period={period} />
                  </div>
                ) : <EmptyState loading={loading} />}
              </motion.div>
            )}

            {tab === "simulate" && (
              <motion.div key="simulate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {data ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    <MonteCarloChart assets={assets} period={period} />
                    <GlassCard accent="var(--purple)" title="About This Simulation">
                      <p style={{ fontSize: 12, color: "rgba(240,244,248,0.75)", lineHeight: 1.7 }}>
                        Monte Carlo simulation projects 300 possible portfolio trajectories over the next 252 trading days, based on the historical mean and volatility of your current portfolio.
                      </p>
                      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                          { label: "Simulations", value: "300", color: "var(--green)" },
                          { label: "Horizon", value: "1 Year (252 days)", color: "var(--cyan)" },
                          { label: "Model", value: "GBM (Log-Normal)", color: "var(--purple)" },
                          { label: "Inputs", value: "Historical μ, σ", color: "rgba(240,244,248,0.75)" },
                        ].map(r => (
                          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-dim)", paddingBottom: 10 }}>
                            <span style={{ fontSize: 11, color: "rgba(240,244,248,0.55)", letterSpacing: 1 }}>{r.label}</span>
                            <span style={{ fontSize: 11, fontFamily: "var(--font-display)", color: r.color, letterSpacing: 1 }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ marginTop: 16, fontSize: 10, color: "rgba(240,244,248,0.55)", lineHeight: 1.6 }}>
                        Past performance does not guarantee future results. This simulation is for illustrative purposes only.
                      </p>
                    </GlassCard>
                  </div>
                ) : <EmptyState loading={loading} />}
              </motion.div>
            )}

            {tab === "news" && (
              <motion.div key="news" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <NewsFeed assets={assets} />
              </motion.div>
            )}

            {tab === "ai" && (
              <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <AiChat portfolioContext={portfolioContext} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Profile Editor */}
      <AnimatePresence>
        {showProfile && <ProfileEditor onClose={() => setShowProfile(false)} />}
      </AnimatePresence>

      {/* Goals Modal */}
      <AnimatePresence>
        {showGoals && (
          <GoalsModal
            onComplete={(g) => {
              setGoals(g);
              localStorage.setItem("alphai_goals", JSON.stringify(g));
              setShowGoals(false);
              setShowTour(true);
            }}
            onSkip={() => {
              localStorage.setItem("alphai_goals", "skipped");
              setShowGoals(false);
              setShowTour(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Onboarding Tour */}
      <AnimatePresence>
        {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
      </AnimatePresence>

    </div>
  );
}
