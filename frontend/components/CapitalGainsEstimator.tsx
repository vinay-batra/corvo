"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchCapitalGains } from "../lib/api";

interface GainEntry {
  ticker: string;
  weight: number;
  cost_basis: number;
  current_price: number;
  purchase_date: string | null;
  holding_period_days: number | null;
  is_long_term: boolean | null;
  term_label: string;
  gain_loss_per_share: number;
  gain_loss_pct: number;
  allocated_value: number;
  estimated_gain_loss_dollars: number;
  tax_rate: number;
  estimated_tax: number;
  insight: string;
}

interface CGData {
  holdings: GainEntry[];
  total_unrealized_gain_loss: number;
  total_estimated_tax: number;
  ltcg_rate_used: number;
  stcg_rate_used: number;
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono, 'Space Mono', monospace)" };

const LTCG_BRACKETS = [
  { label: "0% (income < $47K)", value: 0 },
  { label: "15% (most filers)", value: 15 },
  { label: "20% (income > $519K)", value: 20 },
];

function fmt$(n: number) {
  const abs = Math.abs(n);
  const s = abs >= 1e6
    ? `$${(abs / 1e6).toFixed(2)}M`
    : abs >= 1e3
    ? `$${(abs / 1e3).toFixed(1)}K`
    : `$${abs.toFixed(2)}`;
  return n < 0 ? `-${s}` : s;
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

const CapitalGainsEstimator = memo(function CapitalGainsEstimator({
  assets = [],
  portfolioValue = 10000,
}: {
  assets?: any[];
  portfolioValue?: number;
}) {
  const [ltcgRate, setLtcgRate] = useState(15);
  const [data, setData] = useState<CGData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const hasCostBasis = assets.some(a => a.purchasePrice != null && a.purchasePrice > 0);

  useEffect(() => {
    if (!assets.length || !hasCostBasis) { setData(null); setError(false); return; }
    let cancelled = false;
    setError(false);
    setLoading(true);
    fetchCapitalGains(assets, portfolioValue, ltcgRate)
      .then(d => { if (!cancelled) setData(d ?? null); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [assets, portfolioValue, ltcgRate, retryCount, hasCostBasis]);

  const positive = (data?.total_unrealized_gain_loss ?? 0) >= 0;

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: "var(--card-bg)",
        border: "0.5px solid rgba(201,168,76,0.25)",
        borderRadius: 12,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
        }}
      />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          {data && (
            <div style={{ ...MONO, fontSize: 22, fontWeight: 700, color: positive ? "var(--text)" : "var(--red)", lineHeight: 1 }}>
              {positive ? "+" : ""}{fmt$(data.total_unrealized_gain_loss)}
              <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text3)", marginLeft: 6, fontFamily: "var(--font-body, sans-serif)" }}>
                unrealized gain/loss
              </span>
            </div>
          )}
          {data && (
            <div style={{ ...MONO, fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
              est. tax if sold:{" "}
              <span style={{ color: "var(--text2)" }}>
                {fmt$(data.total_estimated_tax)}
              </span>
            </div>
          )}
        </div>

        {/* LTCG bracket selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--text3)", fontWeight: 500 }}>
            Your LTCG bracket
          </span>
          <select
            value={ltcgRate}
            onChange={e => setLtcgRate(Number(e.target.value))}
            style={{
              fontSize: 11,
              color: "var(--text2)",
              background: "var(--bg2)",
              border: "0.5px solid var(--border)",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {LTCG_BRACKETS.map(b => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* States */}
      {!hasCostBasis && !loading && (
        <p style={{ textAlign: "center", color: "var(--text3)", fontSize: 12, padding: "10px 0", margin: 0 }}>
          Enter purchase prices in the sidebar to estimate capital gains tax.
        </p>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[85, 70, 90].map((w, i) => (
            <div key={i} style={{ height: 12, width: `${w}%`, borderRadius: 4, background: "rgba(255,255,255,0.06)", animation: "cgPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
          <style>{`@keyframes cgPulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style>
        </div>
      )}

      {error && !loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0", textAlign: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Unable to load capital gains data.</span>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "0.5px solid rgba(201,168,76,0.4)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      )}

      {data && !loading && data.holdings.length === 0 && hasCostBasis && (
        <p style={{ textAlign: "center", color: "var(--text3)", fontSize: 12, padding: "10px 0", margin: 0 }}>
          No holdings with cost basis data returned results.
        </p>
      )}

      {data && !loading && data.holdings.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Ticker", "Cost Basis", "Current", "Gain / Loss", "Holding Period", "Term", "Tax Rate", "Est. Tax"].map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === "Ticker" || h === "Term" || h === "Holding Period" ? "left" : "right",
                      padding: "6px 10px",
                      fontSize: 9,
                      letterSpacing: 1.5,
                      color: "var(--text3)",
                      textTransform: "uppercase",
                      borderBottom: "0.5px solid var(--border)",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.holdings.map(entry => {
                const gain = entry.estimated_gain_loss_dollars;
                const gainColor = gain > 0 ? "var(--green, #5cb88a)" : gain < 0 ? "var(--red, #e05c5c)" : "var(--text2)";
                return (
                  <tr key={entry.ticker} style={{ borderBottom: "0.5px solid var(--border)" }}>
                    <td style={{ padding: "10px 10px", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>
                      {entry.ticker}
                    </td>
                    <td style={{ ...MONO, padding: "10px 10px", textAlign: "right", color: "var(--text2)", whiteSpace: "nowrap" }}>
                      ${entry.cost_basis.toFixed(2)}
                    </td>
                    <td style={{ ...MONO, padding: "10px 10px", textAlign: "right", color: "var(--text2)", whiteSpace: "nowrap" }}>
                      ${entry.current_price.toFixed(2)}
                    </td>
                    <td style={{ ...MONO, padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <span style={{ color: gainColor, fontWeight: 600 }}>
                        {gain >= 0 ? "+" : ""}{fmt$(gain)}
                      </span>
                      <span style={{ display: "block", fontSize: 10, color: gainColor, opacity: 0.75 }}>
                        {fmtPct(entry.gain_loss_pct)}
                      </span>
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "left", color: "var(--text3)", whiteSpace: "nowrap" }}>
                      {entry.holding_period_days != null
                        ? entry.holding_period_days >= 365
                          ? `${Math.floor(entry.holding_period_days / 365)}y ${Math.floor((entry.holding_period_days % 365) / 30)}m`
                          : `${entry.holding_period_days}d`
                        : entry.purchase_date
                        ? "Calculating..."
                        : "Unknown"}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "left", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: entry.is_long_term === true
                            ? "rgba(92,184,138,0.1)"
                            : entry.is_long_term === false
                            ? "rgba(224,92,92,0.1)"
                            : "rgba(255,255,255,0.06)",
                          border: `0.5px solid ${entry.is_long_term === true ? "rgba(92,184,138,0.3)" : entry.is_long_term === false ? "rgba(224,92,92,0.3)" : "rgba(255,255,255,0.1)"}`,
                          color: entry.is_long_term === true
                            ? "var(--green, #5cb88a)"
                            : entry.is_long_term === false
                            ? "var(--red, #e05c5c)"
                            : "var(--text3)",
                        }}
                      >
                        {entry.is_long_term === true ? "LT" : entry.is_long_term === false ? "ST" : "?"}
                      </span>
                    </td>
                    <td style={{ ...MONO, padding: "10px 10px", textAlign: "right", color: "var(--text2)", whiteSpace: "nowrap" }}>
                      {entry.tax_rate}%
                    </td>
                    <td style={{ ...MONO, padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap", color: entry.estimated_tax > 0 ? "var(--text)" : "var(--text3)" }}>
                      {entry.estimated_tax > 0 ? fmt$(entry.estimated_tax) : "--"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Insight rows */}
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {data.holdings.map(entry => (
              <div
                key={`insight-${entry.ticker}`}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.02)",
                  border: "0.5px solid var(--border)",
                  fontSize: 11,
                  color: "var(--text3)",
                  lineHeight: 1.55,
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--text2)", flexShrink: 0, minWidth: 40 }}>{entry.ticker}</span>
                <span>{entry.insight}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 14, lineHeight: 1.6 }}>
            Estimates based on 2024 federal LTCG brackets. State taxes, wash-sale rules, and AMT not included. Consult a tax advisor before selling.
          </p>
        </div>
      )}
    </motion.div>
  );
});

export default CapitalGainsEstimator;
