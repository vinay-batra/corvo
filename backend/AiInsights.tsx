"use client";

import { motion } from "framer-motion";

interface AiInsightsProps {
  data: any;
  assets: { ticker: string; weight: number }[];
  onAskAi: () => void;
}

export default function AiInsights({ data, assets, onAskAi }: AiInsightsProps) {
  const sharpe = data.portfolio_volatility > 0 ? (data.portfolio_return - 0.04) / data.portfolio_volatility : 0;
  const tickers = assets.map(a => a.ticker);
  const topHolding = assets.reduce((a, b) => a.weight > b.weight ? a : b);
  const isConcentrated = topHolding.weight > 0.5;

  // Generate insights based on real data
  const insights: { icon: string; text: string; type: "good" | "warn" | "info" }[] = [];

  if (data.portfolio_return > 0.1) {
    insights.push({ icon: "↑", text: `Strong ${(data.portfolio_return * 100).toFixed(1)}% return this period — outperforming typical savings rates by ${((data.portfolio_return - 0.05) * 100).toFixed(1)}pp`, type: "good" });
  } else if (data.portfolio_return < 0) {
    insights.push({ icon: "↓", text: `Portfolio is down ${(Math.abs(data.portfolio_return) * 100).toFixed(1)}% — consider whether this aligns with your risk tolerance`, type: "warn" });
  } else {
    insights.push({ icon: "→", text: `Portfolio returned ${(data.portfolio_return * 100).toFixed(1)}% — modest gains with room for optimization`, type: "info" });
  }

  if (sharpe >= 1.5) {
    insights.push({ icon: "★", text: `Excellent Sharpe of ${sharpe.toFixed(2)} — you're getting strong returns relative to the risk you're taking`, type: "good" });
  } else if (sharpe < 0.5) {
    insights.push({ icon: "⚠", text: `Low Sharpe ratio of ${sharpe.toFixed(2)} — you may be taking on more risk than your returns justify`, type: "warn" });
  } else {
    insights.push({ icon: "◈", text: `Sharpe ratio of ${sharpe.toFixed(2)} is decent — diversifying further could improve your risk-adjusted returns`, type: "info" });
  }

  if (isConcentrated) {
    insights.push({ icon: "⚠", text: `${topHolding.ticker} makes up ${(topHolding.weight * 100).toFixed(0)}% of your portfolio — high concentration risk. Consider spreading across more assets`, type: "warn" });
  } else if (assets.length <= 2) {
    insights.push({ icon: "◎", text: `Only ${assets.length} holdings — adding ETFs like VOO or sector funds could reduce single-stock risk`, type: "info" });
  } else {
    insights.push({ icon: "✓", text: `${assets.length} holdings across your portfolio provides decent diversification`, type: "good" });
  }

  const typeColors = { good: "var(--green)", warn: "#f59e0b", info: "var(--cyan)" };
  const typeBg = { good: "rgba(0,255,160,0.06)", warn: "rgba(245,158,11,0.06)", info: "rgba(0,212,255,0.06)" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "22px 24px", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--cyan), transparent)", opacity: 0.4 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cyan)", display: "inline-block", animation: "pulse-dot 2s infinite" }} />
          <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase" }}>AI Insights</p>
        </div>
        <button onClick={onAskAi}
          style={{ fontSize: 9, letterSpacing: 2, color: "var(--cyan-dim)", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-display)", transition: "all 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.12)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(0,212,255,0.06)"}
        >ASK AI →</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            style={{ display: "flex", gap: 12, padding: "10px 14px", background: typeBg[insight.type], borderRadius: 10, borderLeft: `3px solid ${typeColors[insight.type]}` }}
          >
            <span style={{ fontSize: 14, color: typeColors[insight.type], flexShrink: 0, lineHeight: 1.4 }}>{insight.icon}</span>
            <p style={{ fontSize: 12, color: "rgba(226,232,240,0.75)", lineHeight: 1.6 }}>{insight.text}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
