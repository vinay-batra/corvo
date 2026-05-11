"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchDailySignal, type DailySignal as DailySignalType } from "../lib/api";

// ── Category config ────────────────────────────────────────────────────────────

type Category = DailySignalType["category"];

const CAT: Record<Category, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  "Risk Alert": {
    color: "#e05c5c",
    bg: "rgba(224,92,92,0.07)",
    border: "rgba(224,92,92,0.22)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  "Rebalance": {
    color: "var(--accent)",
    bg: "rgba(201,168,76,0.07)",
    border: "rgba(201,168,76,0.22)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
      </svg>
    ),
  },
  "Tax Opportunity": {
    color: "#4caf7d",
    bg: "rgba(76,175,125,0.07)",
    border: "rgba(76,175,125,0.22)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  },
  "Earnings Watch": {
    color: "#5b9cf6",
    bg: "rgba(91,156,246,0.07)",
    border: "rgba(91,156,246,0.22)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  "Benchmark Lag": {
    color: "#fb923c",
    bg: "rgba(251,146,60,0.07)",
    border: "rgba(251,146,60,0.22)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
      </svg>
    ),
  },
  "Protect Gains": {
    color: "#4caf7d",
    bg: "rgba(76,175,125,0.07)",
    border: "rgba(76,175,125,0.22)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  "Diversify": {
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.07)",
    border: "rgba(167,139,250,0.22)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  "Strong Hold": {
    color: "var(--text3)",
    bg: "transparent",
    border: "var(--border)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
};

const URGENCY_COLORS: Record<string, string> = {
  "Today": "#e05c5c",
  "This Week": "var(--accent)",
  "This Month": "var(--text3)",
};

const CONFIDENCE_ICONS: Record<string, React.ReactNode> = {
  High: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Medium: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Low: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

// ── Local health score for the request ─────────────────────────────────────────

function localHealthScore(data: any): number {
  const ret = data?.annualized_return ?? data?.portfolio_return ?? 0;
  const vol = data?.portfolio_volatility ?? 0;
  const sharpe = data?.sharpe_ratio ?? (vol > 0 ? (ret - 0.04) / vol : 0);
  const dd = data?.max_drawdown ?? 0;
  const rS = Math.min(Math.max(((ret + 0.3) / 0.6) * 100, 0), 100);
  const shS = Math.min(Math.max((sharpe / 3) * 100, 0), 100);
  const vS = Math.min(Math.max((1 - vol / 0.6) * 100, 0), 100);
  const dS = Math.min(Math.max((1 + dd / 0.5) * 100, 0), 100);
  return Math.round(rS * 0.3 + shS * 0.3 + vS * 0.25 + dS * 0.15);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: "0.5px", background: "var(--border)", opacity: 0.6, margin: "18px 0" }} />;
}

function ImpactChip({ text, idx }: { text: string; idx: number }) {
  const colors = ["var(--accent)", "var(--text2)", "var(--text3)"];
  const bgs = ["rgba(201,168,76,0.08)", "var(--bg3)", "transparent"];
  const borders = ["rgba(201,168,76,0.2)", "var(--border)", "var(--border)"];
  return (
    <div style={{
      padding: "7px 12px", borderRadius: 8,
      background: bgs[idx] || bgs[2],
      border: `0.5px solid ${borders[idx] || borders[2]}`,
      flex: "1 1 0",
    }}>
      <p style={{ fontSize: 11.5, color: colors[idx] || colors[2], margin: 0, lineHeight: 1.4, fontWeight: idx === 0 ? 600 : 400 }}>{text}</p>
    </div>
  );
}

function ActionStep({ step, num }: { step: string; num: number }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
        background: "var(--bg3)", border: "0.5px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
        color: "var(--accent)", marginTop: 1,
      }}>
        {num}
      </div>
      <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>{step}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{
      borderRadius: 14, border: "0.5px solid var(--border)",
      borderLeft: "3px solid var(--bg3)",
      background: "var(--card-bg)", padding: "22px 24px", marginBottom: 20,
    }}>
      <style>{`@keyframes ds-pulse{0%,100%{opacity:0.35}50%{opacity:0.75}}`}</style>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 120, height: 10, borderRadius: 4, background: "var(--bg3)", animation: "ds-pulse 1.5s ease-in-out infinite" }} />
        <div style={{ width: 80, height: 22, borderRadius: 6, background: "var(--bg3)", animation: "ds-pulse 1.5s ease-in-out infinite" }} />
      </div>
      {/* Headline */}
      <div style={{ width: "70%", height: 22, borderRadius: 4, background: "var(--bg3)", marginBottom: 12, animation: "ds-pulse 1.5s ease-in-out infinite" }} />
      {/* Rationale */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
        {[90, 75, 60].map((w, i) => (
          <div key={i} style={{ width: `${w}%`, height: 13, borderRadius: 3, background: "var(--bg3)", animation: "ds-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      {/* Impact chips */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: 46, borderRadius: 8, background: "var(--bg3)", animation: "ds-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[85, 70, 55].map((w, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--bg3)", flexShrink: 0, animation: "ds-pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: `${w}%`, height: 13, borderRadius: 3, background: "var(--bg3)", animation: "ds-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  data: any;
  assets: { ticker: string; weight: number }[];
  portfolioValue?: number;
  userId?: string | null;
  onAskAi: (message?: string) => void;
}

export default function DailySignal({ data, assets, portfolioValue, userId, onAskAi }: Props) {
  const [signal, setSignal] = useState<DailySignalType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showConfidenceTooltip, setShowConfidenceTooltip] = useState(false);

  const todayKey = new Date().toISOString().slice(0, 10);
  const dismissKey = `corvo_signal_dismissed_${todayKey}`;

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(dismissKey) === "1") {
      setDismissed(true);
    }
  }, [dismissKey]);

  useEffect(() => {
    if (!data || !assets.length) { setLoading(false); return; }

    const validAssets = assets.filter(a => a.ticker && a.weight > 0);
    if (!validAssets.length) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    fetchDailySignal({
      tickers: validAssets.map(a => a.ticker),
      weights: validAssets.map(a => a.weight),
      portfolio_value: portfolioValue || 10000,
      annualized_return: data.annualized_return ?? data.portfolio_return ?? 0,
      portfolio_volatility: data.portfolio_volatility ?? 0,
      sharpe_ratio: data.sharpe_ratio ?? 0,
      max_drawdown: data.max_drawdown ?? 0,
      health_score: localHealthScore(data),
      period: "1y",
      user_id: userId || "",
    })
      .then(s => { setSignal(s); setLoading(false); })
      .catch(e => { setError(e.message || "Could not generate signal."); setLoading(false); });
  }, [data, assets, portfolioValue, userId]);

  const handleDismiss = () => {
    try { localStorage.setItem(dismissKey, "1"); } catch {}
    setDismissed(true);
  };

  const handleAskAi = () => {
    if (!signal) return;
    const msg = `I want to talk through today's Corvo signal: "${signal.headline}". ${signal.rationale} What's the best way to execute this, and are there any risks I should know about?`;
    onAskAi(msg);
  };

  if (!data || !assets.filter(a => a.ticker && a.weight > 0).length) return null;
  if (loading) return <LoadingSkeleton />;
  if (error) return null; // Fail silently - don't break dashboard

  const cat = signal?.category ?? "Rebalance";
  const cfg = CAT[cat] ?? CAT["Rebalance"];

  // Dismissed: show a slim restore strip
  if (dismissed) {
    return (
      <motion.div
        initial={false} animate={{ opacity: 1 }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", marginBottom: 16,
          borderRadius: 10, border: `0.5px solid ${cfg.border}`,
          background: cfg.bg,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: cfg.color, display: "flex", alignItems: "center" }}>{cfg.icon}</span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>Today's signal dismissed</span>
          {signal && (
            <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}> -  {signal.headline}</span>
          )}
        </div>
        <button
          onClick={() => setDismissed(false)}
          style={{ fontSize: 11, color: cfg.color, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "2px 4px" }}
        >
          View →
        </button>
      </motion.div>
    );
  }

  if (!signal) return null;

  const impactItems = [
    signal.impact.primary,
    signal.impact.secondary,
    ...(signal.impact.freed_capital ? [`${signal.impact.freed_capital} freed`] : []),
  ].filter(Boolean);

  const dateLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      style={{ marginBottom: 20 }}
    >
      <div style={{
        borderRadius: 14,
        border: `0.5px solid ${cfg.border}`,
        borderLeft: `3px solid ${cfg.color}`,
        background: "var(--card-bg)",
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Subtle category tint in top-right corner */}
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: 160, height: 160,
          background: `radial-gradient(circle at top right, ${cfg.bg.replace("0.07", "0.12")} 0%, transparent 70%)`,
          pointerEvents: "none",
          borderRadius: "0 14px 0 0",
        }} />

        {/* ── Header row ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <span style={{ fontSize: 8, letterSpacing: 2.5, textTransform: "uppercase", color: "var(--text3)", fontWeight: 600 }}>
              Corvo · Today's Signal
            </span>
            <div style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border2)" }} />
            <span style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 0.2 }}>{dateLabel}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Urgency badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 20,
              background: `${URGENCY_COLORS[signal.urgency]}18`,
              border: `0.5px solid ${URGENCY_COLORS[signal.urgency]}44`,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: URGENCY_COLORS[signal.urgency], flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: URGENCY_COLORS[signal.urgency], letterSpacing: 0.5 }}>{signal.urgency}</span>
            </div>

            {/* Category badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 6,
              background: cfg.bg,
              border: `0.5px solid ${cfg.border}`,
              color: cfg.color,
            }}>
              {cfg.icon}
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>{cat}</span>
            </div>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              title="Dismiss for today"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: "2px 4px", display: "flex", alignItems: "center", transition: "color 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Headline ───────────────────────────────────────────────────── */}
        <h2 style={{
          fontSize: 22, fontWeight: 700, color: "var(--text)",
          margin: "0 0 12px", letterSpacing: -0.4, lineHeight: 1.2,
        }}>
          {signal.headline}
        </h2>

        {/* ── Rationale ──────────────────────────────────────────────────── */}
        <p style={{
          fontSize: 13.5, color: "var(--text2)", lineHeight: 1.75,
          margin: 0, fontWeight: 300, maxWidth: 680,
        }}>
          {signal.rationale}
        </p>

        <Divider />

        {/* ── Impact row ─────────────────────────────────────────────────── */}
        <div>
          <span style={{ fontSize: 8, letterSpacing: 2.2, textTransform: "uppercase", color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 10 }}>
            Expected Impact
          </span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {impactItems.map((item, i) => (
              <ImpactChip key={i} text={item} idx={i} />
            ))}
          </div>
        </div>

        <Divider />

        {/* ── Action steps ───────────────────────────────────────────────── */}
        <div>
          <span style={{ fontSize: 8, letterSpacing: 2.2, textTransform: "uppercase", color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 14 }}>
            How to Execute
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {signal.action_steps.map((step, i) => (
              <ActionStep key={i} step={step} num={i + 1} />
            ))}
          </div>
        </div>

        <Divider />

        {/* ── Footer: confidence + CTA ────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          {/* Confidence */}
          <div style={{ position: "relative" }}>
            <button
              onMouseEnter={() => setShowConfidenceTooltip(true)}
              onMouseLeave={() => setShowConfidenceTooltip(false)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 20,
                background: signal.confidence === "High"
                  ? "rgba(76,175,125,0.08)" : signal.confidence === "Medium"
                  ? "rgba(201,168,76,0.08)" : "rgba(224,92,92,0.08)",
                border: `0.5px solid ${signal.confidence === "High" ? "rgba(76,175,125,0.25)" : signal.confidence === "Medium" ? "rgba(201,168,76,0.25)" : "rgba(224,92,92,0.25)"}`,
                color: signal.confidence === "High" ? "#4caf7d" : signal.confidence === "Medium" ? "var(--accent)" : "#e05c5c",
                cursor: "default",
              }}
            >
              <span style={{
                color: signal.confidence === "High" ? "#4caf7d" : signal.confidence === "Medium" ? "var(--accent)" : "#e05c5c",
                display: "flex", alignItems: "center",
              }}>
                {CONFIDENCE_ICONS[signal.confidence]}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
                {signal.confidence} Confidence
              </span>
            </button>
            <AnimatePresence initial={false}>
              {showConfidenceTooltip && (
                <motion.div
                  initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: 0,
                    background: "var(--card-bg)", border: "0.5px solid var(--border2)",
                    borderRadius: 8, padding: "8px 12px", minWidth: 200, maxWidth: 280,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 10, pointerEvents: "none",
                  }}
                >
                  <p style={{ fontSize: 11, color: "var(--text2)", margin: 0, lineHeight: 1.5 }}>{signal.confidence_reason}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Talk to AI CTA */}
          <button
            onClick={handleAskAi}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 9,
              background: "var(--accent)", border: "none",
              color: "var(--bg)", fontSize: 12, fontWeight: 700,
              cursor: "pointer", letterSpacing: 0.3,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Talk to Corvo AI about this
          </button>
        </div>
      </div>
    </motion.div>
  );
}
