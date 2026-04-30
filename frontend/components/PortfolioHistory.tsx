"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PALETTE = [
  "#b8860b", "#5cb88a", "#5b9cf6", "#e05c5c",
  "#a78bfa", "#fb923c", "#38bdf8", "#f472b6",
];

type Timeframe = "1W" | "1M" | "3M" | "6M" | "1Y" | "All";
const TIMEFRAMES: Timeframe[] = ["1W", "1M", "3M", "6M", "1Y", "All"];

interface PortfolioLine {
  id: string;
  name: string;
  color: string;
  dates: string[];    // ISO date strings
  returns: number[];  // cumulative return fractions (0.12 = +12%)
}

function fromDb(row: any) {
  const tickers: string[] = row.tickers ?? [];
  const weights: number[] = row.weights ?? [];
  return {
    id: row.id as string,
    name: row.name as string,
    assets: tickers.map((t: string, i: number) => ({ ticker: t, weight: weights[i] ?? 0 })),
  };
}

function applyTimeframe(
  dates: string[],
  returns: number[],
  tf: Timeframe
): { dates: string[]; returns: number[] } {
  if (tf === "All") return { dates, returns };
  const cutoff = new Date();
  if (tf === "1W") cutoff.setDate(cutoff.getDate() - 7);
  else if (tf === "1M") cutoff.setMonth(cutoff.getMonth() - 1);
  else if (tf === "3M") cutoff.setMonth(cutoff.getMonth() - 3);
  else if (tf === "6M") cutoff.setMonth(cutoff.getMonth() - 6);
  else if (tf === "1Y") cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const fd: string[] = [];
  const fr: number[] = [];
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] >= cutoffStr) { fd.push(dates[i]); fr.push(returns[i]); }
  }
  if (fr.length === 0) return { dates: [], returns: [] };
  const base = fr[0];
  return { dates: fd, returns: fr.map(r => r - base) };
}

export default function PortfolioHistory() {
  const [lines, setLines] = useState<PortfolioLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [noPortfolios, setNoPortfolios] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("1Y");
  const [selected, setSelected] = useState<string>("all");
  const cssVar = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Retry if lines came back empty after load completed (e.g. first render timing)
  useEffect(() => {
    if (!loading && !noPortfolios && lines.length === 0) {
      const timer = setTimeout(() => loadData(), 2000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length, loading, noPortfolios]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;

      let portfolios: { id: string; name: string; assets: { ticker: string; weight: number }[] }[] = [];

      if (user) {
        const { data: remote } = await supabase
          .from("portfolios")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (remote && remote.length > 0) portfolios = remote.map(fromDb);
      }

      if (portfolios.length === 0) {
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("corvo_saved_portfolios") : null;
          const parsed = raw ? JSON.parse(raw) : [];
          portfolios = parsed;
        } catch {}
      }

      if (portfolios.length === 0) {
        setNoPortfolios(true);
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        portfolios.map(async (p, idx) => {
          const color = PALETTE[idx % PALETTE.length];
          let dates: string[] = [];
          let returns: number[] = [];

          if (user) {
            try {
              const resp = await fetch(
                `${API_URL}/portfolio/history?portfolio_id=${encodeURIComponent(p.id)}&user_id=${encodeURIComponent(user.id)}`
              );
              if (resp.ok) {
                const json = await resp.json();
                if (json.snapshots && json.snapshots.length >= 2) {
                  dates = json.snapshots.map((s: any) => s.date as string);
                  returns = json.snapshots.map((s: any) => s.cumulative_return as number);
                }
              }
            } catch {}
          }

          if (dates.length < 2 && p.assets.length > 0) {
            try {
              const tickers = p.assets.map(a => a.ticker).join(",");
              const weights = p.assets.map(a => a.weight).join(",");
              const resp = await fetch(
                `${API_URL}/portfolio/calc-history?tickers=${encodeURIComponent(tickers)}&weights=${encodeURIComponent(weights)}&period=max`
              );
              if (resp.ok) {
                const json = await resp.json();
                if (json.dates && json.dates.length >= 2) {
                  dates = json.dates;
                  returns = json.cumulative_returns;
                }
              }
            } catch {}
          }

          if (dates.length < 2) return null;
          return { id: p.id, name: p.name, color, dates, returns } as PortfolioLine;
        })
      );

      const validLines = results.filter((l): l is PortfolioLine => l !== null);

      // Clip all series to the intersection of shared dates so every line starts/ends together
      if (validLines.length > 1) {
        const maxStart = validLines.reduce((max, l) => (l.dates[0] > max ? l.dates[0] : max), "");
        const minEnd = validLines.reduce((min, l) => {
          const last = l.dates[l.dates.length - 1];
          return min === "" || last < min ? last : min;
        }, "");
        for (const line of validLines) {
          const startIdx = line.dates.findIndex(d => d >= maxStart);
          let endIdx = line.dates.length - 1;
          while (endIdx >= 0 && line.dates[endIdx] > minEnd) endIdx--;
          if (startIdx !== -1 && endIdx >= startIdx) {
            line.dates = line.dates.slice(startIdx, endIdx + 1);
            line.returns = line.returns.slice(startIdx, endIdx + 1);
          }
        }
      }

      setLines(validLines);
    } catch {}
    setLoading(false);
  }

  const visibleLines = selected === "all" ? lines : lines.filter(l => l.id === selected);

  const chartLines = visibleLines.map(l => {
    const { dates, returns } = applyTimeframe(l.dates, l.returns, timeframe);
    return { ...l, dates, returns };
  }).filter(l => l.dates.length >= 2);

  // Clip all series to their shared date intersection after timeframe filtering
  if (chartLines.length > 1) {
    const minStart = chartLines.reduce((max, l) => l.dates[0] > max ? l.dates[0] : max, chartLines[0]?.dates[0] || "");
    const maxEnd = chartLines.reduce((min, l) => l.dates[l.dates.length-1] < min ? l.dates[l.dates.length-1] : min, chartLines[0]?.dates[chartLines[0]?.dates.length-1] || "");
    chartLines.forEach(l => {
      let start = 0;
      while (start < l.dates.length && l.dates[start] < minStart) start++;
      let end = l.dates.length - 1;
      while (end >= 0 && l.dates[end] > maxEnd) end--;
      l.dates = l.dates.slice(start, end + 1);
      l.returns = l.returns.slice(start, end + 1);
    });
  }

  const hasData = chartLines.length > 0;

  return (
    <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", marginTop: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 }} />
          <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>
            Portfolio Performance History
          </span>
        </div>
        {hasData && (
          <div style={{ display: "flex", gap: 4 }}>
            {TIMEFRAMES.map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                style={{ padding: "3px 8px", fontSize: 10, borderRadius: 5, border: `0.5px solid ${timeframe === tf ? "var(--accent)" : "var(--border)"}`, background: timeframe === tf ? "rgba(201,168,76,0.12)" : "transparent", color: timeframe === tf ? "var(--accent)" : "var(--text3)", cursor: "pointer", transition: "all 0.15s" }}>
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {lines.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            style={{ padding: "5px 10px", fontSize: 11, background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 7, color: "var(--text2)", cursor: "pointer", outline: "none" }}>
            <option value="all">All Portfolios</option>
            {lines.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ height: 180, borderRadius: 6, background: "var(--bg3)", animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: 11, width: "40%", borderRadius: 4, background: "var(--bg3)", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      ) : noPortfolios ? (
        <div style={{ textAlign: "center", padding: "28px 16px 16px" }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.3px" }}>
            Building your history
          </p>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
            Save a portfolio to start tracking its performance over time. Historical data will load automatically.
          </p>
        </div>
      ) : !hasData ? (
        <div style={{ textAlign: "center", padding: "24px 16px 12px" }}>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7 }}>
            No data for this timeframe. Try a longer range or check your tickers.
          </p>
        </div>
      ) : (
        <>
          <Plot
            data={chartLines.map(l => ({
              type: "scatter",
              mode: "lines",
              name: l.name,
              x: l.dates,
              y: l.returns.map(r => +((r) * 100).toFixed(3)),
              line: { color: l.color, width: 2 },
              hovertemplate: `<b>${l.name}</b><br>%{x}<br>Return: <b>%{y:.2f}%</b><extra></extra>`,
            }))}
            layout={{
              height: 200,
              margin: { t: 4, r: 4, b: 32, l: 44 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              showlegend: false,
              xaxis: {
                showgrid: false,
                zeroline: false,
                tickfont: { size: 9, color: cssVar('--text3') },
                type: "date",
              },
              yaxis: {
                showgrid: true,
                gridcolor: cssVar('--border'),
                zeroline: true,
                zerolinecolor: cssVar('--border'),
                tickfont: { size: 9, color: cssVar('--text3') },
                tickformat: ".1f",
                ticksuffix: "%",
              },
              hovermode: "x unified",
            }}
            config={{ displayModeBar: false, responsive: true, scrollZoom: false }}
            style={{ width: "100%" }}
          />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {chartLines.map(l => {
              const totalReturn = l.returns.length > 0 ? l.returns[l.returns.length - 1] * 100 : 0;
              const pos = totalReturn >= 0;
              return (
                <motion.div key={l.id} initial={false} animate={{ opacity: 1 }}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 20, height: 2, background: l.color, borderRadius: 1 }} />
                  <span style={{ fontSize: 11, color: "var(--text2)" }}>{l.name}</span>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: pos ? "#5cb88a" : "var(--red)" }}>
                    {pos ? "+" : ""}{totalReturn.toFixed(1)}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
