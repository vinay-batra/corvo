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

function MetricCard({ label, value, tooltip }: { label: string; value: string; tooltip: string }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px 16px", background: "var(--card-bg)", position: "relative", cursor: "default" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div style={{ fontSize: 9, letterSpacing: 2, color: AMBER, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "Space Mono, monospace", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{value}</div>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 8,
          padding: "8px 12px", fontSize: 11, color: "var(--text2)", lineHeight: 1.5,
          whiteSpace: "normal", width: 220, zIndex: 100, pointerEvents: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

function AddlMetricRow({ label, value, tooltip, valueColor }: { label: string; value: string; tooltip: string; valueColor?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "0.5px solid var(--border)", position: "relative", cursor: "default" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ fontSize: 12, color: "var(--text3)" }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: "Space Mono, monospace", fontWeight: 600, color: valueColor || "var(--text)" }}>{value}</span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", right: 0,
          background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 8,
          padding: "8px 12px", fontSize: 11, color: "var(--text2)", lineHeight: 1.5,
          whiteSpace: "normal", width: 220, zIndex: 100, pointerEvents: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {tooltip}
        </div>
      )}
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
  // new fields
  earnings_date: string | null;
  revenue_growth: number | null;
  profit_margin: number | null;
  debt_to_equity: number | null;
  short_ratio: number | null;
  insider_ownership: number | null;
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
          <StatRow label="Dividend Yield" value={info.dividend_yield != null ? `${info.dividend_yield.toFixed(2)}%` : "—"} />
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

      {/* Valuation */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginBottom: 14 }}>
        <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 14 }}>Valuation</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <MetricCard
            label="P/E Ratio"
            value={info.pe_ratio != null ? info.pe_ratio.toFixed(2) : "—"}
            tooltip="Price divided by earnings per share. Lower = cheaper relative to earnings. S&P 500 average ~22."
          />
          <MetricCard
            label="Forward P/E"
            value={info.forward_pe != null ? info.forward_pe.toFixed(2) : "—"}
            tooltip="Based on estimated future earnings. Lower than trailing P/E suggests growth expected."
          />
          <MetricCard
            label="Price / Book"
            value={info.price_to_book != null ? info.price_to_book.toFixed(2) : "—"}
            tooltip="Price relative to book value. Under 1.0 means trading below asset value."
          />
          <MetricCard
            label="Dividend Yield"
            value={info.dividend_yield != null ? `${info.dividend_yield.toFixed(2)}%` : "0%"}
            tooltip="Annual dividend as % of stock price. 0% means no dividend paid."
          />
          <MetricCard
            label="Revenue Growth"
            value={info.revenue_growth != null ? `${info.revenue_growth.toFixed(1)}%` : "—"}
            tooltip="How fast the company is growing its top line year over year."
          />
          <MetricCard
            label="Profit Margin"
            value={info.profit_margin != null ? `${info.profit_margin.toFixed(1)}%` : "—"}
            tooltip="% of revenue that becomes profit. Higher is better."
          />
        </div>
      </div>

      {/* Additional Metrics */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginBottom: 14 }}>
        <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Additional Metrics</p>
        {(() => {
          const earningsColor = (() => {
            if (!info.earnings_date) return undefined;
            const days = Math.round((new Date(info.earnings_date).getTime() - Date.now()) / 86400000);
            return days >= 0 && days <= 14 ? "#c9a84c" : undefined;
          })();
          const earningsLabel = (() => {
            if (!info.earnings_date) return "—";
            const days = Math.round((new Date(info.earnings_date).getTime() - Date.now()) / 86400000);
            if (days < 0) return info.earnings_date.slice(0, 10);
            return `Earnings in ${days} day${days === 1 ? "" : "s"}`;
          })();
          return (
            <>
              <AddlMetricRow
                label="Next Earnings Date"
                value={earningsLabel}
                tooltip="Next scheduled earnings report date."
                valueColor={earningsColor}
              />
              <AddlMetricRow
                label="Debt / Equity"
                value={info.debt_to_equity != null ? info.debt_to_equity.toFixed(2) : "—"}
                tooltip="How much debt vs shareholder equity. Above 2.0 is considered high leverage."
              />
              <AddlMetricRow
                label="Short Interest Ratio"
                value={info.short_ratio != null ? info.short_ratio.toFixed(2) : "—"}
                tooltip="Days to cover short positions. Above 10 is heavily shorted."
              />
              <AddlMetricRow
                label="Insider Ownership"
                value={info.insider_ownership != null ? `${info.insider_ownership.toFixed(1)}%` : "—"}
                tooltip="% of shares held by insiders. High = management has skin in the game."
              />
            </>
          );
        })()}
      </div>

      {/* News */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginBottom: 14 }}>
        <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>News</p>
        <NewsFeed assets={[{ ticker: info.ticker, weight: 1 }]} />
      </div>
    </motion.div>
  );
}
