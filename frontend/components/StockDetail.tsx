"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Eye, EyeOff, TrendingUp, CandlestickChart as CandleIcon } from "lucide-react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const STORAGE_KEY = "corvo_watchlist";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AMBER = "#c9a84c";
const GREEN = "#4caf7d";
const RED   = "#e05c5c";

const PERIODS = ["1D", "1W", "1M", "3M", "1Y", "5Y"] as const;
type Period = typeof PERIODS[number];
type ChartType = "line" | "candlestick";

const RATING_COLOR: Record<string, string> = {
  "Strong Buy": GREEN, "Buy": "#6bcf97", "Hold": AMBER,
  "Sell": RED, "Strong Sell": "#b33", "N/A": "var(--text3)",
};

function fmt(n: number | null | undefined, prefix = "", suffix = "", decimals = 2): string {
  if (n === null || n === undefined || isNaN(n as number)) return "-";
  if (Math.abs(n) >= 1e12) return `${prefix}${(n / 1e12).toFixed(1)}T${suffix}`;
  if (Math.abs(n) >= 1e9)  return `${prefix}${(n / 1e9).toFixed(1)}B${suffix}`;
  if (Math.abs(n) >= 1e6)  return `${prefix}${(n / 1e6).toFixed(1)}M${suffix}`;
  return `${prefix}${n.toFixed(decimals)}${suffix}`;
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid var(--border)" }}>
      <span style={{ fontSize: 11, color: "var(--text3)" }}>{label}</span>
      <span style={{ fontSize: 11, fontFamily: "Space Mono, monospace", fontWeight: 600, color: color || "var(--text)" }}>{value}</span>
    </div>
  );
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px 16px", background: "var(--card-bg)", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 2, height: 12, background: AMBER, borderRadius: 1, flexShrink: 0 }} />
        <p style={{ fontSize: 8, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase", margin: 0 }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function Skel({ h, w = "100%" }: { h: number; w?: string | number }) {
  return <div style={{ height: h, width: w, borderRadius: 6, background: "var(--bg3)", animation: "sdPulse 1.5s ease-in-out infinite" }} />;
}

interface StockInfo {
  ticker: string; name: string;
  current_price: number; change: number; change_pct: number;
  bid: number | null; ask: number | null;
  market_cap: number; pe_ratio: number | null; forward_pe: number | null;
  eps: number | null; eps_forward: number | null; dividend_yield: number | null;
  week52_high: number | null; week52_low: number | null;
  volume: number; avg_volume: number; beta: number | null;
  price_to_book: number | null; revenue: number | null; net_income: number | null;
  analyst_rating: string;
  analyst_buy: number | null; analyst_hold: number | null; analyst_sell: number | null;
  num_analysts: number | null;
  target_mean: number | null; target_high: number | null; target_low: number | null;
  sector: string; industry: string;
  chart_1d: { t: string; p: number }[];
  earnings_date: string | null;
  revenue_growth: number | null; profit_margin: number | null;
  gross_margin: number | null; operating_margin: number | null;
  debt_to_equity: number | null; current_ratio: number | null;
  free_cashflow: number | null;
  short_ratio: number | null; insider_ownership: number | null;
  similar_stocks: { ticker: string; price: number; change_pct: number }[];
}

export default function StockDetail({ ticker, onBack, onSelectTicker }: {
  ticker: string;
  onBack: () => void;
  onSelectTicker?: (t: string) => void;
}) {
  const [info, setInfo]           = useState<StockInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [period, setPeriod]       = useState<Period>("1Y");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [histDates, setHistDates]     = useState<string[]>([]);
  const [histPrices, setHistPrices]   = useState<number[]>([]);
  const [histOpens, setHistOpens]     = useState<number[]>([]);
  const [histHighs, setHistHighs]     = useState<number[]>([]);
  const [histLows, setHistLows]       = useState<number[]>([]);
  const [histVolumes, setHistVolumes] = useState<number[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [livePrice, setLivePrice]     = useState<number | null>(null);
  const [priceFlash, setPriceFlash]   = useState<"up" | "down" | null>(null);
  const prevPriceRef  = useRef<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Watchlist ───────────────────────────────────────────────────────────────
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
      const next = inWatchlist
        ? items.filter(i => i.ticker !== ticker)
        : [...items, { ticker, addedAt: new Date().toISOString() }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setInWatchlist(v => !v);
    } catch {}
  };

  // ── Initial stock info load ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true); setError(null); setInfo(null); setLivePrice(null);
    fetch(`${API_URL}/stock/${ticker}`)
      .then(r => r.json())
      .then(d => {
        if (d.detail) throw new Error(d.detail);
        setInfo(d);
        prevPriceRef.current = d.current_price;
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  // ── Live price poll every 10 s ──────────────────────────────────────────────
  useEffect(() => {
    if (!info) return;
    const poll = async () => {
      try {
        const resp = await fetch(`${API_URL}/prices?tickers=${info.ticker}`);
        const data = await resp.json();
        const p: number = data[info.ticker]?.price;
        if (p && p > 0) {
          const prev = prevPriceRef.current;
          if (prev !== null && Math.abs(p - prev) > 0.001) {
            const dir: "up" | "down" = p > prev ? "up" : "down";
            setPriceFlash(dir);
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
            flashTimerRef.current = setTimeout(() => setPriceFlash(null), 1400);
          }
          prevPriceRef.current = p;
          setLivePrice(p);
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => {
      clearInterval(id);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [info?.ticker]);

  // ── Chart history ───────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (p: Period) => {
    setHistLoading(true);
    try {
      const r = await fetch(`${API_URL}/stock/${ticker}/history?period=${p}`);
      const d = await r.json();
      setHistDates(d.dates || []);
      setHistPrices(d.prices || []);
      setHistOpens(d.opens || []);
      setHistHighs(d.highs || []);
      setHistLows(d.lows || []);
      setHistVolumes(d.volumes || []);
    } catch {}
    setHistLoading(false);
  }, [ticker]);

  useEffect(() => { loadHistory(period); }, [period, loadHistory]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const currentPrice = livePrice ?? info?.current_price ?? 0;
  const positive     = (info?.change_pct ?? 0) >= 0;
  const lineColor    = positive ? AMBER : RED;
  const fillColor    = positive ? "rgba(201,168,76,0.07)" : "rgba(224,92,92,0.07)";
  const hasOHLC      = histOpens.length > 0 && histHighs.length > 0 && histLows.length > 0;
  const priceColor   = priceFlash === "up" ? GREEN : priceFlash === "down" ? RED : "var(--text)";

  // Volume bars shared by both chart types
  const hasVol = histVolumes.length > 0;
  const volBars = hasVol ? [{
    x: histDates, y: histVolumes,
    type: "bar",
    marker: {
      color: histPrices.map((p, i) =>
        i === 0 ? "rgba(201,168,76,0.3)"
          : p >= (histPrices[i - 1] ?? p) ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"
      ),
    },
    xaxis: "x", yaxis: "y2", name: "Volume", showlegend: false,
    hovertemplate: "%{y:,.0f}<extra>Vol</extra>",
  }] : [];

  const chartTraces = histPrices.length === 0 ? [] :
    chartType === "candlestick" && hasOHLC ? [
      {
        type: "candlestick",
        x: histDates,
        open: histOpens, high: histHighs, low: histLows, close: histPrices,
        increasing: { line: { color: GREEN, width: 1 }, fillcolor: GREEN },
        decreasing: { line: { color: RED, width: 1 }, fillcolor: RED },
        xaxis: "x", yaxis: "y", name: ticker, showlegend: false,
        hovertemplate: "O: $%{open:.2f}  H: $%{high:.2f}  L: $%{low:.2f}  C: $%{close:.2f}<extra></extra>",
        whiskerwidth: 0.2,
      },
      ...volBars,
    ] : [
      {
        x: histDates, y: histPrices,
        type: "scatter", mode: "lines",
        line: { color: lineColor, width: 1.8 },
        fill: "tozeroy", fillcolor: fillColor,
        hovertemplate: hasOHLC
          ? "O: $%{customdata[0]:.2f}  H: $%{customdata[1]:.2f}  L: $%{customdata[2]:.2f}  C: $%{y:.2f}<extra></extra>"
          : "$%{y:.2f}<extra></extra>",
        customdata: hasOHLC
          ? histDates.map((_, i) => [histOpens[i] ?? 0, histHighs[i] ?? 0, histLows[i] ?? 0])
          : undefined,
        xaxis: "x", yaxis: "y", name: "Price", showlegend: false,
      },
      ...volBars,
    ];

  const tickfmt = period === "1D" ? "%H:%M"
    : (period === "1W" || period === "1M") ? "%b %d"
    : "%b '%y";

  const layout: any = {
    paper_bgcolor: "transparent", plot_bgcolor: "transparent",
    margin: { t: 8, b: 36, l: 56, r: 8 },
    font: { color: "var(--text3)", family: "Inter", size: 10 },
    ...(hasVol ? { grid: { rows: 2, columns: 1, pattern: "independent", roworder: "top to bottom" } } : {}),
    xaxis: {
      gridcolor: "rgba(255,255,255,0.03)", linecolor: "transparent", tickcolor: "transparent",
      type: "date", tickformat: tickfmt,
      showspikes: true, spikecolor: AMBER + "88", spikemode: "across",
      spikesnap: "cursor", spikedash: "solid", spikethickness: 1,
      rangeslider: { visible: false },
    },
    yaxis: {
      gridcolor: "rgba(255,255,255,0.05)", linecolor: "transparent", tickcolor: "transparent",
      tickprefix: "$", domain: hasVol ? [0.28, 1] : [0, 1],
      showspikes: true, spikecolor: "rgba(201,168,76,0.3)", spikemode: "across", spikethickness: 1,
    },
    ...(hasVol ? {
      yaxis2: {
        gridcolor: "transparent", linecolor: "transparent", tickcolor: "transparent",
        domain: [0, 0.22], showticklabels: false,
      },
    } : {}),
    showlegend: false,
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: "#0d1117", bordercolor: AMBER + "66",
      font: { color: "#e8e0cc", family: "Space Mono", size: 11 },
    },
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <style>{`@keyframes sdPulse{0%,100%{opacity:0.4}50%{opacity:0.9}}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <Skel h={16} w={70} /><Skel h={24} w={150} /><Skel h={13} w={200} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "flex-end" }}>
          <Skel h={32} w={110} /><Skel h={16} w={90} />
        </div>
      </div>
      <Skel h={52} />
      <Skel h={34} />
      <Skel h={260} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Skel h={190} /><Skel h={190} />
      </div>
      <Skel h={110} /><Skel h={96} /><Skel h={160} />
    </div>
  );

  if (error) return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p style={{ color: RED, fontSize: 13, marginBottom: 12 }}>Failed to load {ticker}: {error}</p>
      <button onClick={onBack} style={{ padding: "8px 20px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>Back</button>
    </div>
  );

  if (!info) return null;

  const ratingColor = RATING_COLOR[info.analyst_rating] || "var(--text3)";
  const totalAnalystVotes = (info.analyst_buy ?? 0) + (info.analyst_hold ?? 0) + (info.analyst_sell ?? 0);

  const earningsDays = info.earnings_date
    ? Math.round((new Date(info.earnings_date).getTime() - Date.now()) / 86400000)
    : null;
  const earningsLabel = earningsDays == null ? "-"
    : earningsDays < 0 ? info.earnings_date!.slice(0, 10)
    : earningsDays === 0 ? "Today"
    : `In ${earningsDays}d`;

  const w52Low  = info.week52_low  ?? 0;
  const w52High = info.week52_high ?? 0;
  const w52Pct  = w52High > w52Low
    ? Math.max(0, Math.min((currentPrice - w52Low) / (w52High - w52Low), 1))
    : 0.5;
  const spread = info.bid != null && info.ask != null ? info.ask - info.bid : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes sdPulse { 0%,100% { opacity: 0.4 } 50% { opacity: 0.9 } }
        @keyframes livePulse {
          0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(201,168,76,0.5) }
          60%      { opacity: 0.6; box-shadow: 0 0 0 5px rgba(201,168,76,0) }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        {/* Left: nav + name */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onBack}
              style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text3)", cursor: "pointer" }}>
              ← Back
            </button>
            <button onClick={toggleWatchlist}
              style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, border: `0.5px solid ${inWatchlist ? AMBER + "55" : "var(--border)"}`, background: inWatchlist ? "rgba(201,168,76,0.1)" : "transparent", color: inWatchlist ? AMBER : "var(--text3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s" }}>
              {inWatchlist ? <EyeOff size={11} /> : <Eye size={11} />}
              {inWatchlist ? "Watching" : "Watch"}
            </button>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "Space Mono, monospace", fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, margin: 0 }}>{info.ticker}</h1>
              <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, background: `${ratingColor}22`, color: ratingColor, border: `0.5px solid ${ratingColor}55`, fontWeight: 600 }}>{info.analyst_rating}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 3, marginBottom: 0 }}>{info.name}</p>
            {info.sector && <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 2, marginBottom: 0 }}>{info.sector}{info.industry ? ` · ${info.industry}` : ""}</p>}
          </div>
        </div>

        {/* Right: live price */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* LIVE badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 4, background: "rgba(201,168,76,0.1)", border: "0.5px solid rgba(201,168,76,0.3)" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: AMBER, animation: "livePulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 8, letterSpacing: 1.5, color: AMBER, textTransform: "uppercase", fontWeight: 700 }}>LIVE</span>
            </div>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 28, fontWeight: 700, letterSpacing: -1, lineHeight: 1, color: priceColor, transition: "color 0.5s ease" }}>
              ${currentPrice.toFixed(2)}
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: positive ? GREEN : RED }}>
            {positive ? "+" : ""}{info.change.toFixed(2)} ({positive ? "+" : ""}{info.change_pct.toFixed(2)}%)
          </div>
          {info.bid != null && info.ask != null && (
            <div style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--text3)" }}>
              <span>Bid <span style={{ color: "var(--text2)", fontFamily: "Space Mono, monospace" }}>${info.bid.toFixed(2)}</span></span>
              <span>Ask <span style={{ color: "var(--text2)", fontFamily: "Space Mono, monospace" }}>${info.ask.toFixed(2)}</span></span>
              {spread != null && spread > 0 && (
                <span>Spread <span style={{ fontFamily: "Space Mono, monospace" }}>${spread.toFixed(3)}</span></span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 52-Week Range Bar ───────────────────────────────────────────────── */}
      {info.week52_low != null && info.week52_high != null && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 16px", background: "var(--card-bg)", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 2, height: 12, background: AMBER, borderRadius: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 8, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase", margin: 0 }}>52-Week Range</p>
            <span style={{ marginLeft: "auto", fontFamily: "Space Mono, monospace", fontSize: 10, color: AMBER }}>
              {(w52Pct * 100).toFixed(0)}% of range
            </span>
          </div>
          <div style={{ position: "relative", height: 6, background: "var(--bg3)", borderRadius: 3 }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${w52Pct * 100}%`, background: `linear-gradient(90deg, rgba(201,168,76,0.2), ${AMBER})`, borderRadius: 3, transition: "width 0.7s ease" }} />
            <div style={{ position: "absolute", top: "50%", transform: "translate(-50%, -50%)", left: `${Math.max(3, Math.min(w52Pct * 100, 97))}%`, width: 12, height: 12, borderRadius: "50%", background: AMBER, border: "2px solid var(--bg)", boxShadow: `0 0 8px ${AMBER}77`, transition: "left 0.7s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10 }}>
            <span style={{ fontFamily: "Space Mono, monospace" }}>
              <span style={{ color: RED }}>↓</span> <span style={{ color: "var(--text2)" }}>${info.week52_low.toFixed(2)}</span>
              <span style={{ color: "var(--text3)" }}> 52W Low</span>
            </span>
            <span style={{ fontFamily: "Space Mono, monospace" }}>
              <span style={{ color: "var(--text3)" }}>52W High </span>
              <span style={{ color: "var(--text2)" }}>${info.week52_high.toFixed(2)}</span>
              <span style={{ color: GREEN }}> ↑</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Chart controls ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 3 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: "4px 10px", fontSize: 11, fontFamily: "Space Mono, monospace", borderRadius: 5, border: "0.5px solid var(--border)", background: period === p ? "var(--text)" : "transparent", color: period === p ? "var(--bg)" : "var(--text3)", cursor: "pointer", transition: "all 0.15s" }}>
              {p}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", border: "0.5px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
          <button onClick={() => setChartType("line")}
            style={{ padding: "5px 11px", background: chartType === "line" ? "var(--bg3)" : "transparent", border: "none", cursor: "pointer", color: chartType === "line" ? AMBER : "var(--text3)", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 500, transition: "all 0.15s" }}>
            <TrendingUp size={11} /> Line
          </button>
          <button onClick={() => setChartType("candlestick")}
            style={{ padding: "5px 11px", background: chartType === "candlestick" ? "var(--bg3)" : "transparent", border: "none", borderLeft: "0.5px solid var(--border)", cursor: "pointer", color: chartType === "candlestick" ? AMBER : "var(--text3)", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 500, transition: "all 0.15s" }}>
            <CandleIcon size={11} /> Candle
          </button>
        </div>
      </div>

      {/* ── Price chart ─────────────────────────────────────────────────────── */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "8px 12px 4px", background: "var(--card-bg)", marginBottom: 10, minHeight: 272 }}>
        {histLoading ? (
          <div style={{ height: 248, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 18, height: 18, border: "1.5px solid var(--border2)", borderTopColor: AMBER, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : histPrices.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${chartType}-${period}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Plot
                data={chartTraces}
                layout={layout}
                config={{ displayModeBar: false, responsive: true, scrollZoom: true }}
                style={{ width: "100%", height: 248 }}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div style={{ height: 248, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 12, color: "var(--text3)" }}>No chart data available</p>
          </div>
        )}
      </div>

      {/* ── Key Stats + Trading ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <Card title="Key Stats">
          <Row label="Market Cap"   value={fmt(info.market_cap, "$")} />
          <Row label="P/E (TTM)"    value={fmt(info.pe_ratio, "", "", 1)} />
          <Row label="Forward P/E"  value={fmt(info.forward_pe, "", "", 1)} />
          <Row label="EPS (TTM)"    value={fmt(info.eps, "$")} />
          <Row label="Div Yield"    value={info.dividend_yield != null ? `${info.dividend_yield.toFixed(2)}%` : "-"} />
        </Card>
        <Card title="Trading">
          <Row label="Volume"       value={fmt(info.volume, "", "", 0)} />
          <Row label="Avg Volume"   value={fmt(info.avg_volume, "", "", 0)} />
          <Row label="Beta"         value={fmt(info.beta, "", "", 2)} />
          <Row label="Price/Book"   value={fmt(info.price_to_book, "", "", 2)} />
          <Row label="Short Ratio"  value={fmt(info.short_ratio, "", "", 2)} />
        </Card>
      </div>

      {/* ── Analyst Ratings ─────────────────────────────────────────────────── */}
      <Card title="Analyst Ratings" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            {totalAnalystVotes > 0 ? (
              <>
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1, marginBottom: 8 }}>
                  <div style={{ flex: info.analyst_buy ?? 0, background: GREEN, minWidth: 0 }} />
                  <div style={{ flex: info.analyst_hold ?? 0, background: AMBER, minWidth: 0 }} />
                  <div style={{ flex: info.analyst_sell ?? 0, background: RED, minWidth: 0 }} />
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
                  <span style={{ color: GREEN }}>Buy {info.analyst_buy ?? 0}</span>
                  <span style={{ color: AMBER }}>Hold {info.analyst_hold ?? 0}</span>
                  <span style={{ color: RED }}>Sell {info.analyst_sell ?? 0}</span>
                </div>
              </>
            ) : <p style={{ fontSize: 11, color: "var(--text3)" }}>No breakdown available</p>}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {info.target_mean != null && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>Mean Target</div>
                <div style={{ fontFamily: "Space Mono, monospace", fontSize: 15, fontWeight: 700, color: AMBER }}>${info.target_mean.toFixed(2)}</div>
                {info.target_mean > currentPrice && currentPrice > 0 && (
                  <div style={{ fontSize: 9, color: GREEN, marginTop: 2 }}>+{((info.target_mean / currentPrice - 1) * 100).toFixed(1)}% upside</div>
                )}
              </div>
            )}
            {info.target_high != null && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>High</div>
                <div style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 600, color: GREEN }}>${info.target_high.toFixed(2)}</div>
              </div>
            )}
            {info.target_low != null && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>Low</div>
                <div style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 600, color: RED }}>${info.target_low.toFixed(2)}</div>
              </div>
            )}
            {info.num_analysts != null && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>Analysts</div>
                <div style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{info.num_analysts}</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Earnings Calendar ───────────────────────────────────────────────── */}
      <Card title="Earnings Calendar" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>Next Earnings</div>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 15, fontWeight: 600, color: earningsDays !== null && earningsDays >= 0 && earningsDays <= 14 ? AMBER : "var(--text)" }}>{earningsLabel}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>EPS (TTM)</div>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{fmt(info.eps, "$")}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>Forward EPS</div>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{fmt(info.eps_forward, "$")}</div>
          </div>
          {info.eps != null && info.eps_forward != null && info.eps !== 0 && (
            <div>
              <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>EPS Growth Est.</div>
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 15, fontWeight: 600, color: info.eps_forward > info.eps ? GREEN : RED }}>
                {`${((info.eps_forward - info.eps) / Math.abs(info.eps) * 100).toFixed(1)}%`}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Financial Metrics ───────────────────────────────────────────────── */}
      <Card title="Financial Metrics" style={{ marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          <div>
            <Row label="Gross Margin"     value={info.gross_margin != null ? `${info.gross_margin.toFixed(1)}%` : "-"} />
            <Row label="Op. Margin"       value={info.operating_margin != null ? `${info.operating_margin.toFixed(1)}%` : "-"} />
            <Row label="Profit Margin"    value={info.profit_margin != null ? `${info.profit_margin.toFixed(1)}%` : "-"} />
            <Row label="Revenue Growth"   value={info.revenue_growth != null ? `${info.revenue_growth.toFixed(1)}%` : "-"} color={info.revenue_growth != null ? (info.revenue_growth >= 0 ? GREEN : RED) : undefined} />
          </div>
          <div>
            <Row label="Debt/Equity"      value={fmt(info.debt_to_equity, "", "", 2)} />
            <Row label="Current Ratio"    value={fmt(info.current_ratio, "", "", 2)} />
            <Row label="Free Cash Flow"   value={fmt(info.free_cashflow, "$")} />
            <Row label="Revenue"          value={fmt(info.revenue, "$")} />
            <Row label="Net Income"       value={fmt(info.net_income, "$")} />
            <Row label="Insider Own."     value={info.insider_ownership != null ? `${info.insider_ownership.toFixed(1)}%` : "-"} />
          </div>
        </div>
      </Card>

      {/* ── Similar Stocks ──────────────────────────────────────────────────── */}
      {info.similar_stocks && info.similar_stocks.length > 0 && (
        <Card title={`Similar · ${info.sector}`} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {info.similar_stocks.map(s => {
              const pos = s.change_pct >= 0;
              return (
                <div key={s.ticker}
                  onClick={() => onSelectTicker?.(s.ticker)}
                  style={{ flex: "1 1 88px", minWidth: 80, border: "0.5px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "rgba(255,255,255,0.02)", cursor: onSelectTicker ? "pointer" : "default", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (onSelectTicker) { e.currentTarget.style.background = "rgba(201,168,76,0.06)"; (e.currentTarget.style as any).borderColor = AMBER + "44"; } }}
                  onMouseLeave={e => { if (onSelectTicker) { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = ""; } }}>
                  <div style={{ fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: 700, color: AMBER }}>{s.ticker}</div>
                  <div style={{ fontFamily: "Space Mono, monospace", fontSize: 12, color: "var(--text)", marginTop: 4 }}>${s.price.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: pos ? GREEN : RED, marginTop: 2 }}>{pos ? "+" : ""}{s.change_pct.toFixed(2)}%</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Recent News ─────────────────────────────────────────────────────── */}
      <Card title="Recent News">
        <NewsSection ticker={info.ticker} />
      </Card>
    </motion.div>
  );
}

// ── Inline news component ─────────────────────────────────────────────────────
function NewsSection({ ticker }: { ticker: string }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/news?tickers=${ticker}`)
      .then(r => r.json())
      .then(d => { setArticles((d.articles || d.sections?.[ticker] || []).slice(0, 5)); })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ padding: "10px 0", borderBottom: "0.5px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ height: 13, width: "88%", borderRadius: 4, background: "var(--bg3)", animation: "sdPulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: 10, width: "38%", borderRadius: 4, background: "var(--bg3)", animation: "sdPulse 1.5s ease-in-out infinite" }} />
        </div>
      ))}
    </div>
  );

  if (!articles.length) return <p style={{ fontSize: 12, color: "var(--text3)" }}>No recent news.</p>;

  return (
    <div>
      {articles.map((a, i) => (
        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
          style={{ display: "block", padding: "10px 0", borderBottom: i < articles.length - 1 ? "0.5px solid var(--border)" : "none", textDecoration: "none", transition: "opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.45, marginBottom: 4 }}>{a.title}</div>
          <div style={{ display: "flex", gap: 8, fontSize: 10, color: "var(--text3)" }}>
            <span>{a.publisher || a.source}</span>
            {a.published && <span>{new Date(a.published).toLocaleDateString()}</span>}
          </div>
        </a>
      ))}
    </div>
  );
}
