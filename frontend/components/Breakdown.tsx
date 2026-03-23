"use client";
import { motion } from "framer-motion";

// Amber-family palette — distinct but cohesive
const COLORS = [
  "#c9a84c",  // amber
  "#e8c87a",  // light amber
  "#a07830",  // dark amber
  "#d4956a",  // amber-coral
  "#b8a060",  // muted amber
  "#f0d090",  // pale gold
  "#8a6020",  // deep gold
  "#e0b050",  // bright amber
  "#c0906a",  // amber-rose
  "#d8c080",  // warm cream
];

interface Asset { ticker: string; weight: number; }

export default function Breakdown({ assets }: { assets: Asset[] }) {
  const total = assets.reduce((s, a) => s + a.weight, 0);
  const normalized = assets.map((a, i) => ({ ...a, pct: total > 0 ? a.weight / total : 0, color: COLORS[i % COLORS.length] }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
      {/* Stacked bar */}
      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 14, gap: 2 }}>
        {normalized.map((a, i) => (
          <motion.div key={a.ticker}
            initial={{ flex: 0, opacity: 0 }}
            animate={{ flex: a.pct, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 + i * 0.08, ease: "easeOut" }}
            title={`${a.ticker}: ${(a.pct * 100).toFixed(1)}%`}
            style={{ background: a.color, borderRadius: 3, minWidth: a.pct > 0.02 ? 4 : 0 }} />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
        {normalized.map((a, i) => (
          <motion.div key={a.ticker}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.07 }}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontFamily: "Space Mono,monospace", color: a.color, letterSpacing: 0.5 }}>{a.ticker}</span>
            <span style={{ fontSize: 10, color: "rgba(232,224,204,0.3)" }}>{(a.pct * 100).toFixed(1)}%</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
