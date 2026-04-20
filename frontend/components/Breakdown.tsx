"use client";
import { motion } from "framer-motion";

// Distinct color palette: visible against dark background
const COLORS = [
  "#b8860b",  // amber
  "#5b9bd5",  // blue
  "#e05c5c",  // red
  "#5cb88a",  // green
  "#b87fd4",  // purple
  "#e0965c",  // orange
  "#5cd4d4",  // teal
  "#d45cb8",  // pink
  "#8abd5b",  // lime
  "#d4c45c",  // yellow
];

interface Asset { ticker: string; weight: number; }

function formatDollar(v: number): string {
  if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
  return "$" + Math.round(v).toLocaleString();
}

export default function Breakdown({ assets, portfolioValue }: { assets: Asset[]; portfolioValue?: number }) {
  const total = assets.reduce((s, a) => s + a.weight, 0);
  const normalized = assets.map((a, i) => ({
    ...a,
    pct: total > 0 ? a.weight / total : 0,
    color: COLORS[i % COLORS.length],
  }));
  const maxPct = Math.max(...normalized.map(a => a.pct), 0.001);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
      {/* Stacked bar */}
      <div style={{ display: "flex", height: 14, borderRadius: 6, overflow: "hidden", marginBottom: 16, gap: 2 }}>
        {normalized.map((a, i) => (
          <motion.div key={a.ticker}
            initial={{ flex: 0, opacity: 0 }}
            animate={{ flex: a.pct, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 + i * 0.08, ease: "easeOut" }}
            title={`${a.ticker}: ${(a.pct * 100).toFixed(1)}%`}
            style={{ background: a.color, borderRadius: 3, minWidth: a.pct > 0.02 ? 4 : 0 }} />
        ))}
      </div>

      {/* Table-style legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {normalized.map((a, i) => (
          <motion.div
            key={a.ticker}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.07 }}
            style={{
              display: "grid",
              gridTemplateColumns: portfolioValue
                ? "16px 52px 44px 1fr 60px"
                : "16px 52px 44px 1fr",
              alignItems: "center",
              gap: "0 10px",
              height: 32,
              padding: "0 6px",
              borderRadius: 6,
              cursor: "default",
              transition: "background 0.15s",
            }}
            whileHover={{ backgroundColor: "rgba(232,224,204,0.06)" }}
          >
            {/* Color dot */}
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, flexShrink: 0 }} />

            {/* Ticker */}
            <span style={{ fontSize: 11, fontFamily: "Space Mono,monospace", color: a.color, letterSpacing: 0.5 }}>
              {a.ticker}
            </span>

            {/* Percentage */}
            <span style={{ fontSize: 11, fontFamily: "Space Mono,monospace", color: "rgba(232,224,204,0.75)", textAlign: "right" }}>
              {(a.pct * 100).toFixed(1)}%
            </span>

            {/* Mini bar */}
            <div style={{ height: 4, borderRadius: 2, background: "rgba(232,224,204,0.1)", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(a.pct / maxPct) * 100}%` }}
                transition={{ duration: 0.9, delay: 0.4 + i * 0.08, ease: "easeOut" }}
                style={{ height: "100%", background: a.color, borderRadius: 2 }}
              />
            </div>

            {/* Dollar value */}
            {portfolioValue && (
              <span style={{ fontSize: 11, fontFamily: "Space Mono,monospace", color: "rgba(232,224,204,0.55)", textAlign: "right" }}>
                {formatDollar(a.pct * portfolioValue)}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
