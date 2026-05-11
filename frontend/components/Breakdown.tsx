"use client";
import { motion } from "framer-motion";
import { useState, useCallback } from "react";
import { RESOLVED_API_URL } from "../lib/api";

const API_URL = RESOLVED_API_URL;

// Broad funds that shouldn't be mapped to stock sectors
const FUND_LABELS: Record<string, string> = {
  VTI: "US Total Market", VXUS: "International", BND: "US Bonds", BNDX: "Intl Bonds",
  VT: "Global Market", ITOT: "US Total Market", AGG: "US Bonds", SCHB: "US Total Market",
  SCHF: "International", SCHI: "Intl Bonds", IEMG: "Emerging Markets", EFA: "International",
  EEM: "Emerging Markets", IVV: "US Large Cap", VOO: "US Large Cap", SPY: "US Large Cap",
  QQQ: "US Tech", DIA: "US Large Cap", IWM: "US Small Cap", GLD: "Gold", SLV: "Silver",
  TLT: "Long-Term Bonds", LQD: "Corp Bonds",
};
function getFundLabel(ticker: string): string | null {
  if (FUND_LABELS[ticker]) return FUND_LABELS[ticker];
  // 5-letter tickers ending in X are mutual funds
  if (ticker.length === 5 && ticker.endsWith("X")) return "Mutual Fund";
  return null;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const w = 64, h = 24;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const positive = data[data.length - 1] >= data[0];
  const lineColor = positive ? "#5cb88a" : "#e05c5c";
  return (
    <svg width={w} height={h} style={{ overflow: "visible", flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HoldingRow({ a, i, normalized, maxPct, equalWeight, portfolioValue }: any) {
  const [sparkline, setSparkline] = useState<number[] | null>(null);
  const [hovered, setHovered] = useState(false);

  const fetchSparkline = useCallback(async () => {
    if (sparkline !== null) return;
    try {
      const r = await fetch(`${API_URL}/watchlist-data?tickers=${a.ticker}`);
      if (!r.ok) return;
      const d = await r.json();
      const s = d?.results?.[0]?.sparkline;
      if (s?.length) setSparkline(s);
    } catch {}
  }, [a.ticker, sparkline]);

  return (
    <motion.div
      key={a.ticker}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + i * 0.07 }}
      onHoverStart={() => { setHovered(true); fetchSparkline(); }}
      onHoverEnd={() => setHovered(false)}
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
        borderBottom: i < normalized.length - 1 ? "0.5px solid var(--border-dim)" : undefined,
        position: "relative",
      }}
      whileHover={{ backgroundColor: "var(--bg3)" }}
    >
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontFamily: "Space Mono,monospace", color: a.color, letterSpacing: 0.5 }}>{a.ticker}</span>
      <span style={{ fontSize: 11, fontFamily: "Space Mono,monospace", color: "var(--text3)", textAlign: "right" }}>{(a.pct * 100).toFixed(1)}%</span>

      {/* Bar OR sparkline depending on hover */}
      <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
        <div style={{ height: 4, borderRadius: 2, background: "var(--track)", overflow: "hidden", width: "100%",
          opacity: hovered && sparkline ? 0 : 1, transition: "opacity 0.2s" }}>
          <motion.div
            // initial={false} is required - do not remove
            initial={false}
            animate={{ width: equalWeight ? `${a.pct * 100}%` : `${(a.pct / maxPct) * 100}%` }}
            transition={{ duration: 0.9, delay: 0.4 + i * 0.08, ease: "easeOut" }}
            style={{ height: "100%", background: a.color, borderRadius: 2 }}
          />
        </div>
        {hovered && sparkline && (
          <div style={{ position: "absolute", right: 0, opacity: 1, transition: "opacity 0.2s" }}>
            <MiniSparkline data={sparkline} color={a.color} />
          </div>
        )}
      </div>

      {portfolioValue && (
        <span style={{ fontSize: 11, fontFamily: "Space Mono,monospace", color: "var(--text2)", textAlign: "right" }}>
          {formatDollar(portfolioValue * a.pct)}
        </span>
      )}
    </motion.div>
  );
}

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
  const minPct = Math.min(...normalized.map(a => a.pct));
  const equalWeight = maxPct === minPct;

  return (
    <motion.div
      // initial={false} is required - do not remove
      initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
      {/* Stacked bar */}
      <div style={{ display: "flex", height: 14, borderRadius: 6, overflow: "hidden", marginBottom: 16, gap: 2 }}>
        {normalized.map((a, i) => (
          <motion.div key={a.ticker}
            initial={false}
            animate={{ flex: a.pct, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 + i * 0.08, ease: "easeOut" }}
            title={`${a.ticker}: ${(a.pct * 100).toFixed(1)}%`}
            style={{ background: a.color, borderRadius: 3, minWidth: a.pct > 0.02 ? 4 : 0 }} />
        ))}
      </div>

      {/* Table-style legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {normalized.map((a, i) => (
          <HoldingRow key={a.ticker} a={a} i={i} normalized={normalized} maxPct={maxPct} equalWeight={equalWeight} portfolioValue={portfolioValue} />
        ))}
      </div>
    </motion.div>
  );
}
