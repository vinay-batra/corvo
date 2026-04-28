"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { fetchPortfolio } from "../lib/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const COMPARE_PALETTE = ["#b8860b", "#5cb88a", "#5b9cf6", "#e05c5c", "#a78bfa", "#fb923c"];
const PERIODS = [
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
  { label: "5Y", value: "5y" },
];

interface SavedPortfolio {
  id: string;
  name: string;
  assets: { ticker: string; weight: number }[];
}

interface PortfolioResult {
  id: string;
  name: string;
  color: string;
  dates: string[];
  cumulative: number[];
  annualized_return: number | null;
  sharpe_ratio: number | null;
  portfolio_volatility: number | null;
  max_drawdown: number | null;
}

function fmtPct(v: number | null, digits = 1): string {
  if (v == null || isNaN(v)) return "N/A";
  return `${(v * 100).toFixed(digits)}%`;
}

function fmtNum(v: number | null, digits = 2): string {
  if (v == null || isNaN(v)) return "N/A";
  return v.toFixed(digits);
}

// Inline MessageContent renderer (no asterisks/em-dashes in AI text is enforced server-side)
function AiText({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>
      {text.split(/\n/).filter(l => l.trim()).map((line, i) => (
        <p key={i} style={{ marginBottom: 8 }}>{line}</p>
      ))}
    </div>
  );
}

interface Props {
  userId: string | null;
  period: string;
}

export default function PortfolioCompareTab({ userId, period }: Props) {
  const [savedPortfolios, setSavedPortfolios] = useState<SavedPortfolio[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, PortfolioResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [chartPeriod, setChartPeriod] = useState("1y");
  const [dark, setDark] = useState(false);

  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Load saved portfolios from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("corvo_saved_portfolios");
      if (raw) {
        const parsed = JSON.parse(raw);
        const portfolios: SavedPortfolio[] = (Array.isArray(parsed) ? parsed : [])
          .filter((p: any) => p.assets && p.assets.length > 0)
          .map((p: any, i: number) => ({
            id: p.id || p.name || `p-${i}`,
            name: p.name || `Portfolio ${i + 1}`,
            assets: (p.assets || []).filter((a: any) => a.ticker && a.weight > 0),
          }))
          .filter((p: SavedPortfolio) => p.assets.length > 0);
        setSavedPortfolios(portfolios);
      }
    } catch {}
  }, []);

  // Re-fetch when chart period changes
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const toRefetch = selectedIds.filter(id => results[id]);
    if (toRefetch.length === 0) return;
    setResults({});
    toRefetch.forEach(id => {
      const p = savedPortfolios.find(x => x.id === id);
      if (p) fetchAndStore(p, COMPARE_PALETTE[selectedIds.indexOf(id) % COMPARE_PALETTE.length]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartPeriod]);

  const fetchAndStore = async (p: SavedPortfolio, color: string) => {
    setLoading(prev => ({ ...prev, [p.id]: true }));
    try {
      const res: any = await fetchPortfolio(p.assets, chartPeriod);
      setResults(prev => ({
        ...prev,
        [p.id]: {
          id: p.id,
          name: p.name,
          color,
          dates: res.dates || [],
          cumulative: res.portfolio_cumulative || [],
          annualized_return: res.annualized_return ?? null,
          sharpe_ratio: res.sharpe_ratio ?? null,
          portfolio_volatility: res.portfolio_volatility ?? null,
          max_drawdown: res.max_drawdown ?? null,
        },
      }));
    } catch {}
    setLoading(prev => ({ ...prev, [p.id]: false }));
  };

  const toggleSelect = (p: SavedPortfolio) => {
    if (selectedIds.includes(p.id)) {
      setSelectedIds(prev => prev.filter(x => x !== p.id));
      setAiText("");
      return;
    }
    if (selectedIds.length >= 6) return;
    const colorIdx = selectedIds.length % COMPARE_PALETTE.length;
    const color = COMPARE_PALETTE[colorIdx];
    setSelectedIds(prev => [...prev, p.id]);
    setAiText("");
    if (!results[p.id]) {
      fetchAndStore(p, color);
    }
  };

  const selected = selectedIds.map(id => results[id]).filter(Boolean);
  const anyLoading = Object.values(loading).some(Boolean);

  const chartTraces = selected.map(r => {
    const base = r.cumulative[0] ?? 0;
    return {
      x: r.dates,
      y: r.cumulative.map(v => (base ? ((v - base) / base) * 100 : 0)),
      type: "scatter" as const,
      mode: "lines" as const,
      name: r.name,
      line: { color: r.color, width: 1.5 },
      hovertemplate: `${r.name}: %{y:.1f}%<extra></extra>`,
    };
  });

  const METRIC_ROWS = [
    { label: "Ann. Return", fn: (r: PortfolioResult) => fmtPct(r.annualized_return) },
    { label: "Sharpe",      fn: (r: PortfolioResult) => fmtNum(r.sharpe_ratio) },
    { label: "Volatility",  fn: (r: PortfolioResult) => fmtPct(r.portfolio_volatility) },
    { label: "Max Drawdown", fn: (r: PortfolioResult) => fmtPct(r.max_drawdown) },
  ];

  const runAiInsight = async () => {
    if (selected.length < 2) return;
    if (aiAbortRef.current) aiAbortRef.current.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;
    setAiText("");
    setAiLoading(true);
    setAiError(null);

    const summaryLines = selected.map(r =>
      `${r.name}: CAGR ${r.annualized_return != null ? (r.annualized_return * 100).toFixed(1) : "N/A"}%, Sharpe ${r.sharpe_ratio != null ? r.sharpe_ratio.toFixed(2) : "N/A"}, Volatility ${r.portfolio_volatility != null ? (r.portfolio_volatility * 100).toFixed(1) : "N/A"}%, Max Drawdown ${r.max_drawdown != null ? (r.max_drawdown * 100).toFixed(1) : "N/A"}%`
    ).join("\n");

    const message = `Compare these ${selected.length} portfolios. For each: explain what the numbers mean, what stands out, and what the tradeoffs are. End with a direct recommendation on which to prioritize and why.\n\n${summaryLines}`;

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: [],
          portfolio_context: {},
          user_id: userId || "",
          page_context: "portfolio comparison tab",
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        setAiError("Could not load insight. Try again.");
        setAiLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.chunk) {
              accumulated += d.chunk;
              setAiText(accumulated);
            }
          } catch {}
        }
      }
      if (!accumulated) setAiError("No response received.");
    } catch (e: any) {
      if (e?.name !== "AbortError") setAiError("Could not load insight. Try again.");
    }
    setAiLoading(false);
  };

  const hasEnoughForChart = selected.filter(r => r.dates.length > 0 && r.cumulative.length > 0).length >= 2;

  return (
    <div>
      {/* Portfolio selector */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 1 }} />
          <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Select Portfolios</span>
          <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: "auto" }}>{selectedIds.length}/6 selected</span>
        </div>

        {savedPortfolios.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text3)" }}>No saved portfolios found. Save a portfolio from the Dashboard to compare here.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
            {savedPortfolios.map((p, i) => {
              const isSelected = selectedIds.includes(p.id);
              const colorIdx = selectedIds.indexOf(p.id);
              const color = colorIdx >= 0 ? COMPARE_PALETTE[colorIdx % COMPARE_PALETTE.length] : "var(--accent)";
              const isLoading = !!loading[p.id];
              return (
                <motion.div
                  key={p.id}
                  // initial={false} is required — do not remove
                  initial={false}
                  animate={{ opacity: 1 }}
                  onClick={() => toggleSelect(p)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: `0.5px solid ${isSelected ? color + "66" : "var(--border)"}`,
                    background: isSelected ? color + "12" : "var(--bg2)",
                    cursor: selectedIds.length >= 6 && !isSelected ? "not-allowed" : "pointer",
                    opacity: selectedIds.length >= 6 && !isSelected ? 0.45 : 1,
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                  whileHover={selectedIds.length < 6 || isSelected ? { scale: 1.02 } : {}}
                >
                  {isSelected && (
                    <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: color }} />
                  )}
                  <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? color : "var(--text)", marginBottom: 3, paddingRight: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>{p.assets.length} holding{p.assets.length !== 1 ? "s" : ""}</div>
                  {isLoading && (
                    <div style={{ marginTop: 4, width: 10, height: 10, border: "1.5px solid var(--border2)", borderTopColor: color, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Performance chart */}
      {selectedIds.length >= 2 && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 1 }} />
            <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Performance Comparison</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setChartPeriod(p.value)}
                  style={{
                    padding: "3px 9px", fontSize: 10,
                    background: chartPeriod === p.value ? "rgba(184,134,11,0.15)" : "transparent",
                    border: `0.5px solid ${chartPeriod === p.value ? "rgba(184,134,11,0.4)" : "var(--border)"}`,
                    borderRadius: 5,
                    color: chartPeriod === p.value ? "var(--accent)" : "var(--text3)",
                    cursor: "pointer", fontFamily: "Space Mono, monospace", transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {anyLoading && !hasEnoughForChart ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 20, height: 20, border: "2px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            </div>
          ) : hasEnoughForChart ? (
            <Plot
              data={chartTraces}
              layout={{
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: { color: dark ? "rgba(232,224,204,0.75)" : "#4a4a4a", family: "Inter", size: 10 },
                margin: { t: 8, b: 36, l: 54, r: 12 },
                xaxis: {
                  gridcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
                  linecolor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)",
                  tickcolor: "transparent",
                },
                yaxis: {
                  gridcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
                  linecolor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)",
                  tickcolor: "transparent",
                  ticksuffix: "%",
                },
                legend: {
                  orientation: "h", y: -0.18,
                  font: { size: 11, color: dark ? "rgba(232,224,204,0.75)" : "#4a4a4a" },
                  bgcolor: "transparent",
                },
                hovermode: "x unified",
                hoverlabel: { bgcolor: dark ? "#0d1117" : "#fff", bordercolor: "rgba(201,168,76,0.4)", font: { color: dark ? "#e8e0cc" : "#333", size: 11 } },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: 240 }}
            />
          ) : (
            <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "40px 0" }}>Select at least 2 portfolios and wait for data to load.</p>
          )}
        </div>
      )}

      {/* Metrics table */}
      {selected.length >= 2 && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, background: "var(--card-bg)", overflow: "hidden", marginBottom: 14 }}>
          <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 1 }} />
              <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Key Metrics</span>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--border)" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, color: "var(--text3)", fontWeight: 400 }}>Metric</th>
                  {selected.map(r => (
                    <th key={r.id} style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, fontWeight: 600, color: r.color }}>{r.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRIC_ROWS.map((row, ri) => (
                  <tr key={row.label} style={{ borderBottom: ri < METRIC_ROWS.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--text3)" }}>{row.label}</td>
                    {selected.map(r => (
                      <td key={r.id} style={{ padding: "10px 16px", textAlign: "right", fontFamily: "Space Mono, monospace", fontSize: 12, color: loading[r.id] ? "var(--text3)" : r.color }}>
                        {loading[r.id] ? "..." : row.fn(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI insight card */}
      {selected.length >= 2 && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 1 }} />
            <span style={{ fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>AI Comparison</span>
            {!aiLoading && (
              <button
                onClick={runAiInsight}
                style={{
                  marginLeft: "auto", padding: "5px 14px", fontSize: 11, fontWeight: 600,
                  borderRadius: 7, background: "var(--accent)", border: "none",
                  color: "var(--bg)", cursor: "pointer",
                }}
              >
                {aiText ? "Re-analyze" : "Compare Portfolios"}
              </button>
            )}
            {aiLoading && (
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text3)" }}>
                <div style={{ width: 12, height: 12, border: "1.5px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Analyzing...
              </div>
            )}
          </div>

          <AnimatePresence initial={false}>
            {aiError && (
              <motion.p
                // initial={false} is required — do not remove
                initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontSize: 12, color: "#e05c5c", marginBottom: 8 }}
              >
                {aiError}
              </motion.p>
            )}
          </AnimatePresence>

          {aiText ? (
            <AiText text={aiText} />
          ) : !aiLoading && (
            <p style={{ fontSize: 12, color: "var(--text3)" }}>
              Click "Compare Portfolios" to get an AI-powered analysis of the selected portfolios.
            </p>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
