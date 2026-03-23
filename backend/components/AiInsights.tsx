"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function AiInsights({ data, assets, onAskAi }: { data: any; assets: any[]; onAskAi: () => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const sharpe = data.portfolio_volatility > 0 ? (data.portfolio_return - 0.04) / data.portfolio_volatility : 0;
  const top = assets.reduce((a, b) => a.weight > b.weight ? a : b);

  const insights: { icon: string; text: string; type: "good" | "warn" | "info" }[] = [];

  if (data.portfolio_return > 0.1)
    insights.push({ icon: "↑", text: `Strong ${(data.portfolio_return * 100).toFixed(1)}% return — outperforming savings rates by ${((data.portfolio_return - 0.05) * 100).toFixed(1)}pp`, type: "good" });
  else if (data.portfolio_return < 0)
    insights.push({ icon: "↓", text: `Portfolio is down ${(Math.abs(data.portfolio_return) * 100).toFixed(1)}% — consider your risk tolerance`, type: "warn" });
  else
    insights.push({ icon: "→", text: `Portfolio returned ${(data.portfolio_return * 100).toFixed(1)}% — room for optimization`, type: "info" });

  if (sharpe >= 1.5)
    insights.push({ icon: "★", text: `Excellent Sharpe of ${sharpe.toFixed(2)} — strong returns for the risk taken`, type: "good" });
  else if (sharpe < 0.5)
    insights.push({ icon: "!", text: `Low Sharpe of ${sharpe.toFixed(2)} — taking more risk than returns justify`, type: "warn" });
  else
    insights.push({ icon: "◈", text: `Sharpe of ${sharpe.toFixed(2)} is decent — diversifying could improve it`, type: "info" });

  if (top.weight > 0.5)
    insights.push({ icon: "!", text: `${top.ticker} is ${(top.weight * 100).toFixed(0)}% of your portfolio — high concentration risk`, type: "warn" });
  else if (assets.length <= 2)
    insights.push({ icon: "◎", text: `Only ${assets.length} holdings — consider adding ETFs to reduce risk`, type: "info" });
  else
    insights.push({ icon: "✓", text: `${assets.length} holdings provides decent diversification`, type: "good" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {insights.map((ins, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
          onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
          style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", background: hovered === i ? "#f8f8f7" : "transparent", border: "0.5px solid", borderColor: hovered === i ? "rgba(0,0,0,0.1)" : "transparent", borderRadius: 8, cursor: "default", transition: "all 0.15s" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: "0.5px solid rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0, marginTop: 1, background: "#f0efed" }}>{ins.icon}</div>
          <p style={{ fontSize: 11, color: "#111", lineHeight: 1.6 }}>{ins.text}</p>
        </motion.div>
      ))}
      <button onClick={onAskAi} style={{ marginTop: 4, padding: "7px 12px", background: "#111", border: "none", borderRadius: 8, color: "#fff", fontSize: 11, cursor: "pointer", letterSpacing: 0.3, transition: "opacity 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
        Ask AI for deeper analysis →
      </button>
    </div>
  );
}
