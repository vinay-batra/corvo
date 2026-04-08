"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PALETTE = ["#c9a84c", "#5b9cf6", "#5cb88a", "#e05c5c"];
const MAX = 4;

interface StockInfo {
  ticker: string;
  name: string;
  price: number;
  change_pct: number;
  market_cap: number | null;
  pe_ratio: number | null;
  eps: number | null;
  beta: number | null;
  week52_high: number | null;
  week52_low: number | null;
  history: { t: string; p: number }[];
  color: string;
}

function fmt(v: number | null, prefix = "", suffix = "", decimals = 2): string {
  if (v == null || isNaN(v)) return "—";
  if (prefix === "$" && Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (prefix === "$" && Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `${prefix}${v.toFixed(decimals)}${suffix}`;
}

export default function StockCompare() {
  const [tickers, setTickers]   = useState<string[]>([]);
  const [input, setInput]       = useState("");
  const [stocks, setStocks]     = useState<Record<string, StockInfo>>({});
  const [loading, setLoading]   = useState<Record<string, boolean>>({});
  const [error, setError]       = useState("");

  const fetchStock = async (ticker: string, color: string) => {
    if (stocks[ticker] || loading[ticker]) return;
    setLoading(p => ({ ...p, [ticker]: true }));
    try {
      const [infoRes, histRes] = await Promise.all([
        fetch(`${API_URL}/stock/${encodeURIComponent(ticker)}`),
        fetch(`${API_URL}/stock/${encodeURIComponent(ticker)}/history?period=1y`),
      ]);
      const info = await infoRes.json();
      const hist = await histRes.json();
      setStocks(p => ({
        ...p,
        [ticker]: {
          ticker,
          name: info.name || ticker,
          price: info.price ?? info.current_price ?? 0,
          change_pct: info.change_pct ?? 0,
          market_cap: info.market_cap ?? null,
          pe_ratio: info.pe_ratio ?? null,
          eps: info.eps ?? null,
          beta: info.beta ?? null,
          week52_high: info.week52_high ?? null,
          week52_low: info.week52_low ?? null,
          history: hist.history || [],
          color,
        },
      }));
    } catch {}
    setLoading(p => ({ ...p, [ticker]: false }));
  };

  const add = () => {
    const t = input.trim().toUpperCase();
    if (!t) return;
    if (tickers.includes(t)) { setError(`${t} already added`); return; }
    if (tickers.length >= MAX) { setError(`Max ${MAX} tickers`); return; }
    setError("");
    const color = PALETTE[tickers.length];
    setTickers(prev => [...prev, t]);
    setInput("");
    fetchStock(t, color);
  };

  const remove = (t: string) => {
    setTickers(prev => {
      const next = prev.filter(x => x !== t);
      // Re-assign colors
      next.forEach((ticker, i) => {
        setStocks(p => p[ticker] ? { ...p, [ticker]: { ...p[ticker], color: PALETTE[i] } } : p);
      });
      return next;
    });
  };

  // Build normalized chart data (base 100)
  const chartData = tickers
    .map(t => stocks[t])
    .filter(Boolean)
    .map(s => {
      const hist = s.history;
      if (!hist.length) return null;
      const base = hist[0].p;
      return {
        x: hist.map((h: any) => h.t),
        y: hist.map((h: any) => ((h.p - base) / base) * 100),
        type: "scatter" as const,
        mode: "lines" as const,
        name: s.ticker,
        line: { color: s.color, width: 1.5 },
        hovertemplate: `${s.ticker}: %{y:.1f}%<extra></extra>`,
      };
    })
    .filter(Boolean);

  // Correlation matrix
  const corrMatrix = tickers.map(t1 =>
    tickers.map(t2 => {
      const h1 = stocks[t1]?.history?.map((h: any) => h.p) ?? [];
      const h2 = stocks[t2]?.history?.map((h: any) => h.p) ?? [];
      const len = Math.min(h1.length, h2.length);
      if (len < 10) return null;
      const r1 = h1.slice(-len), r2 = h2.slice(-len);
      const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
      const m1 = mean(r1), m2 = mean(r2);
      const num = r1.reduce((s, v, i) => s + (v - m1) * (r2[i] - m2), 0);
      const d1 = Math.sqrt(r1.reduce((s, v) => s + (v - m1) ** 2, 0));
      const d2 = Math.sqrt(r2.reduce((s, v) => s + (v - m2) ** 2, 0));
      return d1 && d2 ? num / (d1 * d2) : null;
    })
  );

  const statsRows = [
    { label: "Price",      fn: (s: StockInfo) => fmt(s.price, "$") },
    { label: "Mkt Cap",    fn: (s: StockInfo) => fmt(s.market_cap, "$") },
    { label: "P/E",        fn: (s: StockInfo) => fmt(s.pe_ratio, "", "×") },
    { label: "EPS",        fn: (s: StockInfo) => fmt(s.eps, "$") },
    { label: "Beta",       fn: (s: StockInfo) => fmt(s.beta) },
    { label: "52W High",   fn: (s: StockInfo) => fmt(s.week52_high, "$") },
    { label: "52W Low",    fn: (s: StockInfo) => fmt(s.week52_low, "$") },
    { label: "Change",     fn: (s: StockInfo) => fmt(s.change_pct, "", "%") },
  ];

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Add ticker bar */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "14px 16px", background: "var(--card-bg)", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
            {tickers.map((t, i) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: PALETTE[i] + "18", border: `0.5px solid ${PALETTE[i]}55`, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, color: PALETTE[i] }}>
                {t}
                <button onClick={() => remove(t)} style={{ background: "none", border: "none", cursor: "pointer", color: PALETTE[i], fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
              </span>
            ))}
          </div>
          {tickers.length < MAX && (
            <div style={{ display: "flex", gap: 6 }}>
              <input value={input} onChange={e => { setInput(e.target.value.toUpperCase()); setError(""); }}
                onKeyDown={e => e.key === "Enter" && add()}
                placeholder="Add ticker…"
                style={{ width: 110, padding: "7px 10px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 12, fontFamily: "var(--font-mono)", outline: "none" }}
              />
              <button onClick={add}
                style={{ padding: "7px 14px", background: "var(--text)", border: "none", borderRadius: 8, color: "var(--bg)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Add
              </button>
            </div>
          )}
          {Object.values(loading).some(Boolean) && (
            <div style={{ width: 14, height: 14, border: "1.5px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          )}
        </div>
        {error && <p style={{ fontSize: 11, color: "#e05c5c", marginTop: 8 }}>{error}</p>}
        {tickers.length === 0 && <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>Add up to 4 tickers to compare their performance, stats, and correlation.</p>}
      </div>

      {tickers.length >= 2 && chartData.length >= 2 && (
        <>
          {/* Normalized chart */}
          <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginBottom: 14 }}>
            <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Normalized Performance (Base 100, 1Y)</p>
            <Plot
              data={chartData}
              layout={{
                paper_bgcolor: "transparent", plot_bgcolor: "transparent",
                font: { color: "rgba(232,224,204,0.75)", family: "Inter", size: 10 },
                margin: { t: 8, b: 36, l: 50, r: 12 },
                xaxis: { gridcolor: "rgba(255,255,255,0.06)", linecolor: "rgba(255,255,255,0.07)", tickcolor: "transparent" },
                yaxis: { gridcolor: "rgba(255,255,255,0.06)", linecolor: "rgba(255,255,255,0.07)", tickcolor: "transparent", ticksuffix: "%" },
                legend: { orientation: "h", y: -0.15, font: { size: 11 }, bgcolor: "transparent" },
                hovermode: "x unified",
                hoverlabel: { bgcolor: "#0d1117", bordercolor: "rgba(201,168,76,0.4)", font: { color: "#e8e0cc", size: 11 } },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: 260 }}
            />
          </div>

          {/* Stats table */}
          <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, background: "var(--card-bg)", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)" }}>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Side-by-Side Stats</p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid var(--border)" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, color: "var(--text3)", fontWeight: 400 }}>Metric</th>
                    {tickers.map((t, i) => (
                      <th key={t} style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, fontWeight: 600, color: PALETTE[i] }}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statsRows.map((row, ri) => (
                    <tr key={row.label} style={{ borderBottom: ri < statsRows.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--text3)" }}>{row.label}</td>
                      {tickers.map((t, i) => {
                        const s = stocks[t];
                        return (
                          <td key={t} style={{ padding: "10px 16px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: PALETTE[i] }}>
                            {loading[t] ? "…" : s ? row.fn(s) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Correlation heatmap */}
          {tickers.length >= 2 && corrMatrix[0][0] !== null && (
            <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)" }}>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Correlation (1Y Daily Returns)</p>
              <Plot
                data={[{
                  z: corrMatrix,
                  x: tickers, y: tickers,
                  type: "heatmap",
                  colorscale: [
                    [0, "rgba(224,92,92,0.8)"],
                    [0.5, "rgba(30,30,40,0.9)"],
                    [1, "rgba(201,168,76,0.9)"],
                  ],
                  zmin: -1, zmax: 1,
                  text: corrMatrix.map(row => row.map(v => v != null ? v.toFixed(2) : "—")),
                  texttemplate: "%{text}",
                  hovertemplate: "%{x} × %{y}: %{z:.2f}<extra></extra>",
                  showscale: true,
                } as any]}
                layout={{
                  paper_bgcolor: "transparent", plot_bgcolor: "transparent",
                  font: { color: "rgba(232,224,204,0.75)", family: "Inter", size: 11 },
                  margin: { t: 8, b: 36, l: 56, r: 8 },
                  xaxis: { linecolor: "transparent", tickcolor: "transparent" },
                  yaxis: { linecolor: "transparent", tickcolor: "transparent" },
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: "100%", height: 220 }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
