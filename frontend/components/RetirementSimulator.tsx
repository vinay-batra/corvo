"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function pct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return sign + (n * 100).toFixed(0) + "%";
}

interface SimResult {
  worst: number;
  median: number;
  best: number;
  worst_pct: number;
  median_pct: number;
  best_pct: number;
  positive_prob: number;
  years: number;
  current_value: number;
  simulations: number;
  summary: string;
  action: string;
}

export default function RetirementSimulator({
  assets,
  portfolioValue,
}: {
  assets: { ticker: string; weight: number }[];
  portfolioValue?: number;
}) {
  const [years, setYears] = useState(20);
  const [value, setValue] = useState<string>(portfolioValue ? String(Math.round(portfolioValue)) : "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validAssets = assets.filter(a => a.ticker && a.weight > 0);

  const run = async () => {
    const v = parseFloat(value.replace(/,/g, ""));
    if (!validAssets.length) { setError("Add portfolio holdings first."); return; }
    if (isNaN(v) || v <= 0) { setError("Enter a valid portfolio value."); return; }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/portfolio/retirement-simulation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers: validAssets.map(a => a.ticker),
          weights: validAssets.map(a => a.weight),
          current_value: v,
          years_to_retirement: years,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `Error ${res.status}`);
      }
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message || "Simulation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px 0 4px" }}>
      {/* Input row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
        <div style={{ flex: "1 1 160px", minWidth: 140 }}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>
            Portfolio Value
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text3)", pointerEvents: "none" }}>$</span>
            <input
              type="text"
              inputMode="numeric"
              value={value}
              onChange={e => setValue(e.target.value.replace(/[^0-9.,]/g, ""))}
              placeholder="50,000"
              style={{
                width: "100%", padding: "8px 10px 8px 22px", fontSize: 13,
                fontFamily: "var(--font-mono)", background: "var(--bg3)",
                border: "0.5px solid var(--border)", borderRadius: 8,
                color: "var(--text)", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ flex: "1 1 160px", minWidth: 140 }}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>
            Years to Retirement
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="range"
              min={1}
              max={50}
              value={years}
              onChange={e => setYears(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent)", minWidth: 28, textAlign: "right" }}>
              {years}
            </span>
          </div>
        </div>

        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: "8px 20px", fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
            textTransform: "uppercase", fontFamily: "var(--font-mono)",
            background: loading ? "var(--border2)" : "var(--accent)",
            color: loading ? "var(--text3)" : "#0a0e14",
            border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0,
            alignSelf: "flex-end",
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          {loading ? "Simulating..." : "Run Simulation"}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: "var(--red, #e05c5c)", marginBottom: 12 }}>{error}</p>
      )}

      {/* Spinner */}
      <AnimatePresence>
        {loading && (
          <motion.div
            // initial={false} required — do not remove
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0" }}
          >
            <div style={{ width: 16, height: 16, border: "1.5px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "rs-spin 0.75s linear infinite" }} />
            <span style={{ fontSize: 12, color: "var(--text3)" }}>Running {(5000).toLocaleString()} scenarios over {years} years...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result card */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            // initial={false} required — do not remove
            initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{
              border: "0.5px solid var(--border2)", borderRadius: 12,
              background: "var(--card-bg)", overflow: "hidden",
            }}
          >
            {/* Outcome row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "0.5px solid var(--border)" }}>
              {[
                { label: "Worst Case", sublabel: "10th percentile", value: result.worst, pctVal: result.worst_pct, color: "var(--red, #e05c5c)" },
                { label: "Median", sublabel: "50th percentile", value: result.median, pctVal: result.median_pct, color: "var(--accent)" },
                { label: "Best Case", sublabel: "90th percentile", value: result.best, pctVal: result.best_pct, color: "var(--green, #5cb88a)" },
              ].map((col, i) => (
                <div
                  key={col.label}
                  style={{
                    padding: "18px 16px",
                    borderRight: i < 2 ? "0.5px solid var(--border)" : "none",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>{col.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: col.color, marginBottom: 3, letterSpacing: "-0.5px" }}>
                    {fmt(col.value)}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: col.color, opacity: 0.75 }}>
                    {pct(col.pctVal)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{col.sublabel}</div>
                </div>
              ))}
            </div>

            {/* Meta row */}
            <div style={{ display: "flex", gap: 24, padding: "10px 18px", borderBottom: "0.5px solid var(--border)", flexWrap: "wrap" }}>
              {[
                { label: "Starting value", val: fmt(result.current_value) },
                { label: "Horizon", val: `${result.years} yr${result.years !== 1 ? "s" : ""}` },
                { label: "Scenarios positive", val: `${(result.positive_prob * 100).toFixed(0)}%` },
                { label: "Simulations run", val: result.simulations.toLocaleString() },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text2)" }}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* AI summary + action */}
            <div style={{ padding: "16px 18px" }}>
              {result.summary && (
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, margin: "0 0 12px" }}>
                  {result.summary}
                </p>
              )}
              {result.action && (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", background: "rgba(var(--accent-rgb, 201,168,76), 0.06)", border: "0.5px solid rgba(var(--accent-rgb, 201,168,76), 0.25)", borderRadius: 9 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--accent)", textTransform: "uppercase", marginBottom: 4 }}>Suggested action</div>
                    <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.6, margin: 0 }}>{result.action}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes rs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
