"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface AiInsightsProps {
  data: any;
  assets: { ticker: string; weight: number }[];
  onAskAi: () => void;
}

export default function AiInsights({ data, assets, onAskAi }: AiInsightsProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const sharpe = data.portfolio_volatility > 0 ? (data.portfolio_return - 0.04) / data.portfolio_volatility : 0;
  const topHolding = assets.reduce((a, b) => a.weight > b.weight ? a : b);
  const isConcentrated = topHolding.weight > 0.5;

  const insights: { icon: string; text: string; type: "good" | "warn" | "info" }[] = [];

  if (data.portfolio_return > 0.1) {
    insights.push({ icon: "↑", text: `Strong ${(data.portfolio_return * 100).toFixed(1)}% return — outperforming typical savings rates by ${((data.portfolio_return - 0.05) * 100).toFixed(1)}pp`, type: "good" });
  } else if (data.portfolio_return < 0) {
    insights.push({ icon: "↓", text: `Portfolio is down ${(Math.abs(data.portfolio_return) * 100).toFixed(1)}% — consider whether this aligns with your risk tolerance`, type: "warn" });
  } else {
    insights.push({ icon: "→", text: `Portfolio returned ${(data.portfolio_return * 100).toFixed(1)}% — modest gains with room for optimization`, type: "info" });
  }

  if (sharpe >= 1.5) {
    insights.push({ icon: "✦", text: `Excellent Sharpe of ${sharpe.toFixed(2)} — strong returns relative to the risk you're taking`, type: "good" });
  } else if (sharpe < 0.5) {
    insights.push({ icon: "⚠", text: `Low Sharpe of ${sharpe.toFixed(2)} — taking on more risk than your returns justify`, type: "warn" });
  } else {
    insights.push({ icon: "◈", text: `Sharpe of ${sharpe.toFixed(2)} is decent — diversifying further could improve risk-adjusted returns`, type: "info" });
  }

  if (isConcentrated) {
    insights.push({ icon: "⚠", text: `${topHolding.ticker} is ${(topHolding.weight * 100).toFixed(0)}% of your portfolio — high concentration risk`, type: "warn" });
  } else if (assets.length <= 2) {
    insights.push({ icon: "◎", text: `Only ${assets.length} holdings — adding ETFs like VOO could reduce single-stock risk`, type: "info" });
  } else {
    insights.push({ icon: "✓", text: `${assets.length} holdings provides decent diversification`, type: "good" });
  }

  const typeColors = { good: "var(--green)", warn: "var(--amber)", info: "var(--cyan)" };
  const typeBg     = { good: "rgba(0,255,179,0.06)", warn: "rgba(251,191,36,0.06)", info: "rgba(56,189,248,0.06)" };
  const typeBorder = { good: "rgba(0,255,179,0.15)", warn: "rgba(251,191,36,0.15)", info: "rgba(56,189,248,0.15)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {insights.map((insight, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => setHoveredIdx(null)}
          style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            padding: "10px 12px",
            background: hoveredIdx === i ? typeBg[insight.type] : "rgba(255,255,255,0.02)",
            border: `1px solid ${hoveredIdx === i ? typeBorder[insight.type] : "rgba(255,255,255,0.04)"}`,
            borderRadius: 10, cursor: "default", transition: "all 0.2s",
          }}
        >
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: typeBg[insight.type], border: `1px solid ${typeBorder[insight.type]}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
            <span style={{ fontSize: 9, color: typeColors[insight.type] }}>{insight.icon}</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.65, flex: 1 }}>{insight.text}</p>
        </motion.div>
      ))}

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onAskAi}
        style={{ marginTop: 4, padding: "8px 14px", background: "rgba(0,255,179,0.06)", border: "1px solid rgba(0,255,179,0.15)", borderRadius: 10, color: "var(--green)", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-body)", letterSpacing: 0.5, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,179,0.12)"; e.currentTarget.style.borderColor = "rgba(0,255,179,0.3)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,255,179,0.06)"; e.currentTarget.style.borderColor = "rgba(0,255,179,0.15)"; }}
      >
        <span style={{ fontSize: 10 }}>✦</span>
        Ask AI for deeper analysis →
      </motion.button>
    </div>
  );
}
