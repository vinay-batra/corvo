"use client";

import { motion } from "framer-motion";

const COLORS = ["var(--green)", "var(--cyan)", "var(--purple)", "#f59e0b", "#f472b6", "#34d399", "#60a5fa", "#a78bfa", "#fb7185", "#fbbf24"];

interface Asset { ticker: string; weight: number; }

export default function Breakdown({ assets }: { assets: Asset[] }) {
  const total = assets.reduce((s, a) => s + a.weight, 0);
  const normalized = assets.map((a, i) => ({ ...a, pct: total > 0 ? a.weight / total : 0, color: COLORS[i % COLORS.length] }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "20px 24px", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--green), transparent)", opacity: 0.3 }} />
      <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>Allocation</p>

      {/* Stacked bar */}
      <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 16, gap: 2 }}>
        {normalized.map((a, i) => (
          <motion.div
            key={a.ticker}
            initial={{ flex: 0 }}
            animate={{ flex: a.pct }}
            transition={{ duration: 1, delay: 0.4 + i * 0.06, ease: "easeOut" }}
            title={`${a.ticker}: ${(a.pct * 100).toFixed(1)}%`}
            style={{ background: a.color, borderRadius: 3, minWidth: a.pct > 0.02 ? 4 : 0, boxShadow: `0 0 8px ${a.color}60` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
        {normalized.map((a, i) => (
          <motion.div
            key={a.ticker}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.06 }}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontFamily: "var(--font-display)", color: a.color, letterSpacing: 1 }}>{a.ticker}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{(a.pct * 100).toFixed(1)}%</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
