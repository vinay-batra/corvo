"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { fetchDividends } from "../lib/api";
import ErrorState from "./ErrorState";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const AMBER = "#b8860b";
const GREEN = "#4caf7d";

interface Holding {
  ticker: string;
  weight: number;
  dividend_yield: number | null;  // raw decimal e.g. 0.0082
  annual_income: number;
  ex_div_date: string | null;
  frequency: string | null;
}

interface DividendData {
  holdings: Holding[];
  total_annual_income: number;
  next_ex_div_date: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-");
  const target = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const DONUT_COLORS = [AMBER, "#b47ee0", "#5cb88a", "#e05c5c", "#5baee0", "#e0a85c", "#a0e05c", "#e05cb4"];

const DividendTracker = memo(function DividendTracker({ assets }: { assets: any[] }) {
  const [data, setData] = useState<DividendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [portfolioValue, setPortfolioValue] = useState(10000);
  const [inputValue, setInputValue] = useState("10000");
  const [showNonPayers, setShowNonPayers] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    setFetchError(false);
    fetchDividends(assets, portfolioValue)
      .then((res: DividendData) => setData(res ?? null))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [assets, portfolioValue, retryCount]);

  const payers = data ? data.holdings.filter(h => h.dividend_yield != null && h.dividend_yield > 0) : [];
  const nonPayers = data ? data.holdings.filter(h => !h.dividend_yield) : [];

  const sorted = [...payers].sort((a, b) => {
    if (!a.ex_div_date && !b.ex_div_date) return 0;
    if (!a.ex_div_date) return 1;
    if (!b.ex_div_date) return -1;
    return a.ex_div_date.localeCompare(b.ex_div_date);
  });

  // Weighted avg yield across portfolio
  const weightedYield = payers.length > 0
    ? payers.reduce((sum, h) => sum + (h.dividend_yield ?? 0) * h.weight, 0) /
      payers.reduce((sum, h) => sum + h.weight, 0)
    : 0;

  // Donut chart data
  const donutData = payers.filter(h => h.annual_income > 0);

  const handlePortfolioValueChange = (v: string) => {
    setInputValue(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0) setPortfolioValue(n);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden" }}
    >
      <style>{`@keyframes divPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)" }} />

      {/* Top: Annual Income + Portfolio Value Input */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 8, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 3 }}>Est. Annual Income</p>
          {data ? (
            <p style={{ fontFamily: "var(--font-display)", fontSize: 28, color: AMBER, margin: 0, lineHeight: 1.1, fontWeight: 700 }}>
              ${data.total_annual_income.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          ) : loading ? (
            <div style={{ height: 34, width: 120, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "divPulse 1.5s ease-in-out infinite" }} />
          ) : null}
          {data && weightedYield > 0 && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
              Portfolio yield: <span style={{ color: AMBER, fontWeight: 600 }}>{(weightedYield * 100).toFixed(2)}%</span>
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 1 }}>Portfolio Value</span>
            <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
              <span style={{ fontSize: 11, padding: "4px 6px", color: "var(--text-muted)" }}>$</span>
              <input
                type="number"
                value={inputValue}
                onChange={e => handlePortfolioValueChange(e.target.value)}
                style={{ width: 80, padding: "4px 6px 4px 2px", background: "transparent", border: "none", color: "var(--text1)", fontSize: 11, fontFamily: "Space Mono, monospace", outline: "none" }}
              />
            </div>
          </div>
          {data?.next_ex_div_date && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 8, letterSpacing: 2, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>Next Ex-Div</p>
              <p style={{ fontSize: 11, color: "rgba(201,168,76,0.9)", margin: 0 }}>{formatDate(data.next_ex_div_date)}</p>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[100, 85, 90, 75].map((w, i) => (
            <div key={i} style={{ height: 12, width: `${w}%`, borderRadius: 4, background: "rgba(255,255,255,0.06)", animation: "divPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      ) : fetchError ? (
        <ErrorState
          message="Unable to load dividend data. The server may be temporarily unavailable."
          onRetry={() => setRetryCount(c => c + 1)}
          minHeight={80}
        />
      ) : data ? (
        <div>
          {/* Donut + table side by side when enough data */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>

            {/* Donut chart */}
            {donutData.length > 1 && (
              <div style={{ flexShrink: 0, width: 180 }}>
                <Plot
                  data={[{
                    type: "pie",
                    labels: donutData.map(h => h.ticker),
                    values: donutData.map(h => h.annual_income),
                    hole: 0.55,
                    marker: { colors: DONUT_COLORS.slice(0, donutData.length), line: { color: "transparent", width: 1 } },
                    textinfo: "none",
                    hovertemplate: "%{label}: $%{value:.2f}/yr<extra></extra>",
                  }]}
                  layout={{
                    paper_bgcolor: "transparent", plot_bgcolor: "transparent",
                    margin: { t: 4, b: 4, l: 4, r: 4 },
                    showlegend: false,
                    annotations: [{
                      text: `$${data.total_annual_income.toFixed(0)}`,
                      x: 0.5, y: 0.5, xref: "paper", yref: "paper",
                      showarrow: false,
                      font: { size: 13, color: dark ? AMBER : "#b8860b", family: "Space Mono, monospace" },
                    }],
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: 180, height: 160 }}
                />
              </div>
            )}

            {/* Dividend payers table */}
            <div style={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
              {sorted.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr>
                      {["Ticker", "Yield %", "Annual $", "Ex-Div Date", "Frequency"].map(h => (
                        <th key={h} style={{ textAlign: h === "Ticker" ? "left" : "right", padding: "5px 8px", fontSize: 8, letterSpacing: 2, color: "var(--text-muted)", textTransform: "uppercase", borderBottom: "1px solid var(--border-dim)", fontWeight: 500, whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(h => {
                      const days = daysUntil(h.ex_div_date);
                      const soon = days !== null && days >= 0 && days <= 30;
                      const yieldPct = h.dividend_yield != null ? h.dividend_yield * 100 : null;
                      return (
                        <tr key={h.ticker} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: soon ? "rgba(201,168,76,0.06)" : "transparent" }}>
                          <td style={{ padding: "8px 8px", fontWeight: 600, color: "var(--text1)", textAlign: "left" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              {h.ticker}
                              {soon && (
                                <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: 1, color: AMBER, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 3, padding: "1px 4px", textTransform: "uppercase" }}>
                                  {days === 0 ? "Today" : `${days}d`}
                                </span>
                              )}
                            </span>
                          </td>
                          <td style={{ padding: "8px 8px", textAlign: "right", color: "rgba(201,168,76,0.9)", fontFamily: "Space Mono, monospace" }}>
                            {yieldPct != null ? `${yieldPct.toFixed(2)}%` : "-"}
                          </td>
                          <td style={{ padding: "8px 8px", textAlign: "right", color: "var(--text1)", fontFamily: "Space Mono, monospace" }}>
                            ${h.annual_income.toFixed(2)}
                          </td>
                          <td style={{ padding: "8px 8px", textAlign: "right", color: soon ? AMBER : "var(--text2)", whiteSpace: "nowrap" }}>
                            {h.ex_div_date ? formatDate(h.ex_div_date) : "-"}
                          </td>
                          <td style={{ padding: "8px 8px", textAlign: "right", color: "var(--text-muted)", fontSize: 10 }}>
                            {h.frequency ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No dividend-paying stocks in portfolio.</p>
              )}
            </div>
          </div>

          {/* Non-payers collapsed section */}
          {nonPayers.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setShowNonPayers(p => !p)}
                style={{ fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "4px 0", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ transform: showNonPayers ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>+</span>
                {nonPayers.length} non-dividend paying stock{nonPayers.length !== 1 ? "s" : ""}
              </button>
              {showNonPayers && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {nonPayers.map(h => (
                    <span key={h.ticker} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)", fontFamily: "Space Mono, monospace" }}>
                      {h.ticker}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
          No dividend data available
        </div>
      )}
    </motion.div>
  );
});

export default DividendTracker;
