"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import NewsFeed from "./NewsFeed";
import { Eye, EyeOff } from "lucide-react";

const STORAGE_KEY = "corvo_watchlist";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AMBER = "#c9a84c";
const GREEN = "#4caf7d";
const RED   = "#e05c5c";

const PERIODS = ["1D","1W","1M","3M","1Y","5Y"] as const;
type Period = typeof PERIODS[number];

const RATING_COLOR: Record<string, string> = {
  "Strong Buy": GREEN,
  "Buy": "#6bcf97",
  "Hold": AMBER,
  "Sell": RED,
  "Strong Sell": "#b33",
  "N/A": "var(--text3)",
};

function fmt(n: number | null | undefined, prefix = "", suffix = "", decimals = 2): string {
  if (n === null || n === undefined || isNaN(n as number)) return "—";
  if (Math.abs(n) >= 1e12) return `${prefix}${(n / 1e12).toFixed(1)}T${suffix}`;
  if (Math.abs(n) >= 1e9)  return `${prefix}${(n / 1e9).toFixed(1)}B${suffix}`;
  if (Math.abs(n) >= 1e6)  return `${prefix}${(n / 1e6).toFixed(1)}M${suffix}`;
  return `${prefix}${n.toFixed(decimals)}${suffix}`;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "0.5px solid var(--border)" }}>
      <span style={{ fontSize: 12, color: "var(--text3)" }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: "Space Mono, monospace", fontWeight: 600, color: "var(--text)" }}>{value}</span>
    </div>
  );
}

interface StockInfo {
  ticker: string; name: string;
  current_price: number; change: number; change_pct: number;
  market_cap: number; pe_ratio: number | null; forward_pe: number | null;
  eps: number | null; dividend_yield: number | null;
  week52_high: number | null; week52_low: number | null;
  volume: number; avg_volume: number; beta: number | null;
  price_to_book: number | null; revenue: number | null; net_income: number | null;
  analyst_rating: string; sector: string; industry: string;
  chart_1d: { t: string; p: number }[];
}

export default function StockDetail({ ticker, onBack }: { ticker: string; onBack: () => void }) {
  const [info, setInfo]         = useState<StockInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [period, setPeriod]     = useState<Period>("1Y");
  const [histDates, setHistDates] = useState<string[]>([]);
  const [histPrices, setHistPrices] = useState<number[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items: { ticker: string }[] = raw ? JSON.parse(raw) : [];
      setInWatchlist(items.some(i => i.ticker === ticker));
    } catch {}
  }, [ticker]);

  const toggleWatchlist = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items: { ticker: string; addedAt: string }[] = raw ? JSON.parse(raw) : [];
      let next;
      if (inWatchlist) {
        next = items.filter(i => i.ticker !== ticker);
      } else {
        next = [...items, { ticker, addedAt: new Date().toISOString() }];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setInWatchlist(!inWatchlist);
    } catch {}
  };

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`${API_URL}/stock/${ticker}`)
      .then(r => r.json())
      .then(d => { if (d.detail) throw new Error(d.detail); setInfo(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  const loadHistory = useCallback(async (p: Period) => {
    setHistLoading(true);
    try {
      const r = await fetch(`${API_URL}/stock/${ticker}/history?period=${p}`);
      const d = await r.json();
      setHistDates(d.dates || []);
      setHistPrices(d.prices || []);
    } catch {}
    setHistLoading(false);
  }, [ticker]);

  useEffect(() => { loadHistory(period); }, [period, loadHistory]);

  const positive = (info?.change_pct ?? 0) >= 0;

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 14 }}>
      <div style={{ width: 24, height: 24, border: "1.5px solid var(--border2)", borderTopColor: AMBER, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ fontSize: 11, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Loading {ticker}...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p style={{ color: RED, fontSize: 13, marginBottom: 12 }}>Failed to load {ticker}: {error}</p>
      <button onClick={onBack} style={{ padding: "8px 20px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>← Back</button>
    </div>
  );

  if (!info) return null;

  const ratingColor = RATING_COLOR[info.analyst_rating] || "var(--text3)";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {/* Back + header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={onBack} style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text3)", cursor: "pointer" }}>← Back</button>
          <button onClick={toggleWatchlist}
            style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, border: `0.5px solid ${inWatchlist ? "#c9a84c55" : "var(--border)"}`, background: inWatchlist ? "rgba(201,168,76,0.1)" : "transparent", color: inWatchlist ? "#c9a84c" : "var(--text3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
            {inWatchlist ? <EyeOff size={12} /> : <Eye size={12} />}
            {inWatchlist ? "Watching" : "Watch"}
          </button>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5 }}>{info.ticker}</h1>
            <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, background: `${ratingColor}22`, color: ratingColor, border: `0.5px solid ${ratingColor}55`, fontWeight: 600 }}>{info.analyst_rating}</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{info.name}</p>
          {info.sector && <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{info.sector} · {info.industry}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "Space Mono, monospace", fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: -1 }}>
            ${info.current_price.toFixed(2)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: positive ? GREEN : RED }}>
            {positive ? "+" : ""}{info.change.toFixed(2)} ({positive ? "+" : ""}{info.change_pct.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding: "5px 12px", fontSize: 11, fontFamily: "Space Mono, monospace", borderRadius: 6, border: "0.5px solid var(--border)", background: period === p ? "var(--text)" : "transparent", color: period === p ? "var(--bg)" : "var(--text3)", cursor: "pointer", transition: "all 0.15s" }}>
            {p}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "14px 16px", background: "var(--card-bg)", marginBottom: 14, backdropFilter: "blur(12px)" }}>
        {histLoading ? (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 20, height: 20, border: "1.5px solid var(--border2)", borderTopColor: AMBER, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : histPrices.length > 0 ? (
          <Plot
            data={[{
              x: histDates,
              y: histPrices,
              type: "scatter",
              mode: "lines",
              line: { color: positive ? AMBER : RED, width: 2 },
              fill: "tozeroy",
              fillcolor: positive ? "rgba(201,168,76,0.07)" : "rgba(224,92,92,0.07)",
              hovertemplate: "$%{y:.2f}<extra></extra>",
            }]}
            layout={{
              paper_bgcolor: "transparent", plot_bgcolor: "transparent",
              margin: { t: 4, b: 36, l: 52, r: 8 },
              font: { color: "var(--text3)", family: "Inter", size: 10 },
              xaxis: { gridcolor: "rgba(255,255,255,0.04)", linecolor: "transparent", tickcolor: "transparent" },
              yaxis: { gridcolor: "rgba(255,255,255,0.04)", linecolor: "transparent", tickcolor: "transparent", tickprefix: "$" },
              showlegend: false, hovermode: "x unified",
              hoverlabel: { bgcolor: "var(--bg2)", bordercolor: AMBER, font: { color: "var(--text)", family: "Inter", size: 11 } },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: 200 }}
          />
        ) : (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 12, color: "var(--text3)" }}>No chart data available</p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)" }}>
          <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Key Stats</p>
          <StatRow label="Market Cap"    value={fmt(info.market_cap, "$")} />
          <StatRow label="P/E Ratio"     value={fmt(info.pe_ratio, "", "", 1)} />
          <StatRow label="EPS"           value={fmt(info.eps, "$")} />
          <StatRow label="Dividend Yield" value={info.dividend_yield ? `${(info.dividend_yield * 100).toFixed(2)}%` : "—"} />
          <StatRow label="52W High"      value={fmt(info.week52_high, "$")} />
          <StatRow label="52W Low"       value={fmt(info.week52_low, "$")} />
        </div>
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)" }}>
          <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Financials</p>
          <StatRow label="Volume"        value={fmt(info.volume, "", "", 0)} />
          <StatRow label="Avg Volume"    value={fmt(info.avg_volume, "", "", 0)} />
          <StatRow label="Beta"          value={fmt(info.beta, "", "", 2)} />
          <StatRow label="Forward P/E"   value={fmt(info.forward_pe, "", "", 1)} />
          <StatRow label="Price/Book"    value={fmt(info.price_to_book, "", "", 2)} />
          <StatRow label="Revenue"       value={fmt(info.revenue, "$")} />
        </div>
      </div>

      {/* News */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginBottom: 14 }}>
        <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>News</p>
        <NewsFeed assets={[{ ticker: info.ticker, weight: 1 }]} />
      </div>
    </motion.div>
  );
}
