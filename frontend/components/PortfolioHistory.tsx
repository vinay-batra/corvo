"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { loadHistory } from "./SavedPortfolios";

const LS_KEY = "corvo_saved_portfolios";

interface Snapshot {
  date: string;
  return: number;
  volatility: number;
  sharpe: number;
  health: number;
}

interface Portfolio {
  id: string;
  name: string;
  assets: { ticker: string; weight: number }[];
}

function Sparkline({ points, color = "#c9a84c", height = 40 }: { points: number[]; color?: string; height?: number }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 120;
  const pad = 4;
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
  const ys = points.map(v => height - pad - ((v - min) / range) * (height - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const fill = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ")
    + ` L${xs[xs.length - 1].toFixed(1)},${height} L${xs[0].toFixed(1)},${height} Z`;
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ overflow: "visible" }}>
      <path d={fill} fill={`${color}18`} />
      <path d={path} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={3} fill={color} />
    </svg>
  );
}

export default function PortfolioHistory() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [histories, setHistories] = useState<Record<string, Snapshot[]>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const saved: Portfolio[] = raw ? JSON.parse(raw) : [];
      setPortfolios(saved);
      const h: Record<string, Snapshot[]> = {};
      for (const p of saved) {
        const snaps = loadHistory(p.id);
        if (snaps.length > 0) h[p.id] = snaps;
      }
      setHistories(h);
    } catch {}
  }, []);

  const withHistory = portfolios.filter(p => (histories[p.id]?.length ?? 0) >= 2);
  if (withHistory.length === 0) return null;

  return (
    <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 }} />
        <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Portfolio Health History</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {withHistory.map(p => {
          const snaps = histories[p.id];
          const latest = snaps[snaps.length - 1];
          const prev = snaps[snaps.length - 2];
          const delta = latest.health - prev.health;
          const healthColor = latest.health >= 75 ? "#5cb88a" : latest.health >= 50 ? "#c9a84c" : "#e05c5c";
          const trendColor = delta > 0 ? "#5cb88a" : delta < 0 ? "#e05c5c" : "var(--text3)";

          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 14px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                <p style={{ fontSize: 10, color: "var(--text3)" }}>{p.assets.map(a => a.ticker).join(", ")}</p>
              </div>
              <div style={{ flexShrink: 0 }}>
                <Sparkline points={snaps.map(s => s.health)} color={healthColor} />
              </div>
              <div style={{ flexShrink: 0, textAlign: "right", minWidth: 52 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: healthColor, letterSpacing: -1 }}>{latest.health}</p>
                <p style={{ fontSize: 10, color: trendColor }}>
                  {delta > 0 ? "+" : ""}{delta !== 0 ? delta.toFixed(0) : "—"}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
      <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 10 }}>
        Health score tracked each time you analyze a saved portfolio · {Object.values(histories).flat().length} data point{Object.values(histories).flat().length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
