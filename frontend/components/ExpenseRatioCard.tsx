"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchExpenseRatio } from "../lib/api";
import InfoModal from "./InfoModal";

interface ExpenseHolding {
  ticker: string;
  weight: number;
  expense_ratio: number | null;
  annual_cost: number;
}

interface ExpenseData {
  holdings: ExpenseHolding[];
  weighted_expense_ratio: number;
  annual_cost: number;
  fund_weight: number;
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono, 'Space Mono', monospace)" };

function fmt$(n: number) {
  const abs = Math.abs(n);
  const s = abs >= 1e6
    ? `$${(abs / 1e6).toFixed(2)}M`
    : abs >= 1e3
    ? `$${(abs / 1e3).toFixed(1)}K`
    : `$${abs.toFixed(2)}`;
  return n < 0 ? `-${s}` : s;
}

function costTier(pct: number): { label: string; color: string } {
  if (pct <= 0.1) return { label: "Low cost", color: "var(--green, #5cb88a)" };
  if (pct <= 0.4) return { label: "Moderate", color: "var(--accent)" };
  return { label: "High cost", color: "var(--red, #e05c5c)" };
}

const ExpenseRatioCard = memo(function ExpenseRatioCard({
  assets = [],
  portfolioValue = 10000,
}: {
  assets?: any[];
  portfolioValue?: number;
}) {
  const [data, setData] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!assets.length) { setData(null); setError(false); return; }
    let cancelled = false;
    setError(false);
    setLoading(true);
    fetchExpenseRatio(assets, portfolioValue)
      .then(d => { if (!cancelled) setData(d ?? null); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.map(a => `${a.ticker}:${a.weight}`).join(","), portfolioValue, retryCount]);

  const fundHoldings = data?.holdings.filter(h => h.expense_ratio != null) ?? [];
  const tier = data ? costTier(data.weighted_expense_ratio) : null;

  return (
    <motion.div
      // initial={false} is required - do not remove
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
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ ...MONO, fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
                {data.weighted_expense_ratio.toFixed(3)}%
                <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text3)", marginLeft: 6, fontFamily: "var(--font-body, sans-serif)" }}>
                  weighted expense ratio
                </span>
              </div>
              <InfoModal
                title="Expense Ratio"
                sections={[
                  { label: "Plain English", text: "The annual fee charged by a fund as a percentage of assets. Deducted automatically from returns, not billed separately. Individual stocks have no expense ratio since there's no fund wrapper." },
                  { label: "Example", text: "A 0.03% expense ratio on a $10,000 investment costs $3 per year. This card weights each holding's ratio by its portfolio share, so a fund you barely hold matters less than one that's most of your portfolio." },
                  { label: "What's Good?", text: "Lower is better. Broad index ETFs typically charge 0.03-0.20%. Anything above 0.50% warrants scrutiny, especially if a cheaper fund tracks the same thing." },
                ]}
              />
            </div>
          )}
          {data && (
            <div style={{ ...MONO, fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
              est. cost per year:{" "}
              <span style={{ color: "var(--text2)" }}>{fmt$(data.annual_cost)}</span>
            </div>
          )}
        </div>

        {data && tier && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
              border: `0.5px solid ${tier.color}55`,
              color: tier.color,
              textTransform: "uppercase",
            }}
          >
            {tier.label}
          </span>
        )}
      </div>

      {/* States */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[85, 70, 90].map((w, i) => (
            <div key={i} style={{ height: 12, width: `${w}%`, borderRadius: 4, background: "rgba(255,255,255,0.06)", animation: "erPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
          <style>{`@keyframes erPulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style>
        </div>
      )}

      {error && !loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0", textAlign: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Unable to load expense ratio data.</span>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "0.5px solid rgba(201,168,76,0.4)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      )}

      {data && !loading && !error && fundHoldings.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--text3)", fontSize: 12, padding: "10px 0", margin: 0 }}>
          No fund expense ratios found. Your holdings are individual stocks, which carry no annual fund fee.
        </p>
      )}

      {data && !loading && !error && fundHoldings.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Ticker", "Weight", "Expense Ratio", "Est. Annual Cost"].map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === "Ticker" ? "left" : "right",
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
              {fundHoldings
                .slice()
                .sort((a, b) => b.annual_cost - a.annual_cost)
                .map(h => (
                  <tr key={h.ticker} style={{ borderBottom: "0.5px solid var(--border)" }}>
                    <td style={{ padding: "10px 10px", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>
                      {h.ticker}
                    </td>
                    <td style={{ ...MONO, padding: "10px 10px", textAlign: "right", color: "var(--text2)", whiteSpace: "nowrap" }}>
                      {(h.weight * 100).toFixed(1)}%
                    </td>
                    <td style={{ ...MONO, padding: "10px 10px", textAlign: "right", color: "var(--text2)", whiteSpace: "nowrap" }}>
                      {h.expense_ratio!.toFixed(3)}%
                    </td>
                    <td style={{ ...MONO, padding: "10px 10px", textAlign: "right", color: "var(--text)", whiteSpace: "nowrap" }}>
                      {fmt$(h.annual_cost)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 14, lineHeight: 1.6 }}>
            {(data.fund_weight * 100).toFixed(0)}% of your portfolio is held in fee-bearing funds; the rest is individual stocks with no fund fee. Expense ratios are deducted automatically from fund returns, not billed separately. Broad index ETFs typically run 0.03-0.20%; anything above 0.50% is worth scrutinizing.
          </p>
        </div>
      )}
    </motion.div>
  );
});

export default ExpenseRatioCard;
