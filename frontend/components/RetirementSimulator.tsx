"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function fmtDollar(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + Math.round(n).toLocaleString("en-US");
  return "$" + Math.round(n).toLocaleString("en-US");
}

function fmtPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return sign + (n * 100).toFixed(0) + "%";
}

function fmtLabel(n: number) {
  if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + Math.round(n);
}

interface SimResult {
  worst: number;
  median: number;
  best: number;
  worst_pct: number;
  median_pct: number;
  best_pct: number;
  ci_low: number;
  ci_high: number;
  confidence_level: number;
  positive_prob: number;
  years: number;
  current_value: number;
  simulations: number;
  histogram: { counts: number[]; edges: number[] };
  summary: string;
  action: string;
  contribution: number;
  inflation_rate: number;
  inflation_adjusted: boolean;
}

interface HistogramProps {
  counts: number[];
  edges: number[];
  ciLow: number;
  ciHigh: number;
  median: number;
  startingValue: number;
  confidenceLevel: number;
  dark: boolean;
}

function HistogramChart({ counts, edges, ciLow, ciHigh, median, startingValue, confidenceLevel, dark }: HistogramProps) {
  if (!counts.length || edges.length < 2) return null;

  const maxCount = Math.max(...counts, 1);
  const chartW = 400;
  const chartH = 90;
  const padT = 4;
  const padB = 20;
  const totalH = chartH + padT + padB;

  const minVal = edges[0];
  const maxVal = edges[edges.length - 1];
  const valRange = maxVal - minVal || 1;

  const toX = (v: number) => Math.max(0, Math.min(chartW, ((v - minVal) / valRange) * chartW));
  const barW = chartW / counts.length;
  const amber = dark ? "#c9a84c" : "#b8860b";
  const amberFill = dark ? "rgba(201,168,76,0.5)" : "rgba(184,134,11,0.5)";
  const redFill = "rgba(224,92,92,0.65)";
  const ciRegion = dark ? "rgba(201,168,76,0.1)" : "rgba(184,134,11,0.1)";
  const ciLowX = toX(ciLow);
  const ciHighX = toX(ciHigh);
  const medianX = toX(median);
  const startX = toX(startingValue);

  return (
    <div>
      <svg
        viewBox={`0 0 ${chartW} ${totalH}`}
        style={{ width: "100%", height: totalH * 1.5, maxHeight: 160, display: "block" }}
        preserveAspectRatio="none"
      >
        {/* CI shaded region */}
        <rect
          x={ciLowX} y={padT}
          width={Math.max(0, ciHighX - ciLowX)} height={chartH}
          fill={ciRegion}
        />

        {/* Bars */}
        {counts.map((count, i) => {
          const centerVal = (edges[i] + edges[i + 1]) / 2;
          const barH = count === 0 ? 0 : Math.max(1.5, (count / maxCount) * chartH);
          const x = i * barW;
          const y = padT + chartH - barH;
          const isCenterBar = Math.abs(centerVal - median) < (valRange / counts.length) * 0.8;
          const isBelowStart = centerVal < startingValue;
          const fill = isCenterBar ? amber : isBelowStart ? redFill : amberFill;
          return (
            <rect key={i} x={x + 0.4} y={y} width={Math.max(0.8, barW - 0.8)} height={barH} fill={fill} />
          );
        })}

        {/* Starting value line (blue dashed) */}
        {startX >= 0 && startX <= chartW && (
          <line
            x1={startX} y1={padT} x2={startX} y2={padT + chartH}
            stroke="rgba(59,130,246,0.65)" strokeWidth="1.5" strokeDasharray="4 3"
          />
        )}

        {/* Median line */}
        <line
          x1={medianX} y1={padT} x2={medianX} y2={padT + chartH}
          stroke={amber} strokeWidth="2"
        />

        {/* Baseline */}
        <line
          x1={0} y1={padT + chartH} x2={chartW} y2={padT + chartH}
          stroke={dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} strokeWidth="0.5"
        />

        {/* X-axis edge labels */}
        <text x={2} y={totalH - 2} fontSize="8" fill={dark ? "rgba(232,224,204,0.4)" : "#9a9a98"} textAnchor="start">
          {fmtLabel(minVal)}
        </text>
        <text x={chartW - 2} y={totalH - 2} fontSize="8" fill={dark ? "rgba(232,224,204,0.4)" : "#9a9a98"} textAnchor="end">
          {fmtLabel(maxVal)}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
        {[
          { type: "rect" as const, color: ciRegion, border: `1px solid ${dark ? "rgba(201,168,76,0.3)" : "rgba(184,134,11,0.3)"}`, label: `${confidenceLevel}% confidence range` },
          { type: "rect" as const, color: amberFill, border: "none", label: "Above starting value" },
          { type: "rect" as const, color: redFill, border: "none", label: "Below starting value" },
          { type: "line" as const, color: amber, label: "Median", dashed: false },
          { type: "line" as const, color: "rgba(59,130,246,0.65)", label: "Starting value", dashed: true },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {item.type === "rect" ? (
              <div style={{ width: 10, height: 8, borderRadius: 1, background: item.color, border: item.border, flexShrink: 0 }} />
            ) : (
              <svg width="14" height="8">
                <line x1="0" y1="4" x2="14" y2="4" stroke={item.color} strokeWidth="1.5" strokeDasharray={item.dashed ? "4 2" : undefined} />
              </svg>
            )}
            <span style={{ fontSize: 9, color: "var(--text3)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AdvancedField {
  id: string;
  label: string;
  value: string;
  setValue: (v: string) => void;
  prefix?: string;
  suffix?: string;
  tooltip: string;
}

// Module-level cache persists the last result across tab switches without causing
// parent re-renders (which were snapping scroll position back to top)
let _retirementResultCache: SimResult | null = null;

export default function RetirementSimulator({
  assets,
  portfolioValue,
}: {
  assets: { ticker: string; weight: number }[];
  portfolioValue?: number;
}) {
  const [result, setResult] = useState<SimResult | null>(_retirementResultCache);
  const [years, setYears] = useState(20);
  const [value, setValue] = useState<string>(portfolioValue ? String(Math.round(portfolioValue)) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [dark, setDark] = useState(true);

  // Advanced settings
  const [contribution, setContribution] = useState("0");
  const [inflationRate, setInflationRate] = useState("2.5");
  const [feeRate, setFeeRate] = useState("0.05");
  const [taxDrag, setTaxDrag] = useState("0");
  const [confidenceLevel, setConfidenceLevel] = useState(90);

  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (portfolioValue && !value) setValue(String(Math.round(portfolioValue)));
  }, [portfolioValue]);

  const validAssets = assets.filter(a => a.ticker && a.weight > 0);
  const amberColor = dark ? "#c9a84c" : "#b8860b";

  const startProgress = () => {
    setProgress(0);
    const start = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = 95 * (1 - Math.exp(-elapsed / 5000));
      setProgress(Math.min(p, 95));
    }, 120);
  };

  const stopProgress = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setProgress(100);
    setTimeout(() => setProgress(0), 500);
  };

  const run = async () => {
    const v = parseFloat(value.replace(/,/g, ""));
    if (!validAssets.length) { setError("Add portfolio holdings first."); return; }
    if (isNaN(v) || v <= 0) { setError("Enter a valid portfolio value."); return; }
    setError(null);
    setLoading(true);
    _retirementResultCache = null;
    setResult(null);
    startProgress();
    try {
      const res = await fetch(`${API_URL}/portfolio/retirement-simulation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers: validAssets.map(a => a.ticker),
          weights: validAssets.map(a => a.weight),
          current_value: v,
          years_to_retirement: years,
          contribution: parseFloat(contribution.replace(/,/g, "")) || 0,
          inflation_rate: parseFloat(inflationRate) || 2.5,
          fee_rate: parseFloat(feeRate) || 0.05,
          tax_drag: parseFloat(taxDrag) || 0,
          confidence_level: confidenceLevel,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `Error ${res.status}`);
      }
      const r = await res.json();
      _retirementResultCache = r;
      setResult(r);
    } catch (e: any) {
      setError(e.message || "Simulation failed. Try again.");
    } finally {
      setLoading(false);
      stopProgress();
    }
  };

  const advancedFields: AdvancedField[] = [
    {
      id: "contribution",
      label: "Annual Contribution",
      value: contribution,
      setValue: setContribution,
      prefix: "$",
      tooltip: "Extra money you plan to add to the portfolio each year. This compounds over time and can significantly improve long-term outcomes.",
    },
    {
      id: "inflation",
      label: "Inflation Rate",
      value: inflationRate,
      setValue: setInflationRate,
      suffix: "%",
      tooltip: "Expected average annual inflation. Results are shown in today's dollars so you understand real purchasing power, not just nominal growth.",
    },
    {
      id: "fee",
      label: "Annual Fee / Expense Ratio",
      value: feeRate,
      setValue: setFeeRate,
      suffix: "%",
      tooltip: "The annual cost of your funds or advisory fees as a percentage. Even small fees compound over decades and meaningfully reduce final wealth.",
    },
    {
      id: "tax",
      label: "Tax Drag on Returns",
      value: taxDrag,
      setValue: setTaxDrag,
      suffix: "%",
      tooltip: "Annual reduction in returns due to taxes on dividends and capital gains. Use 0% for tax-advantaged accounts like a 401k or IRA.",
    },
  ];

  return (
    <div style={{ padding: "20px 0 4px" }}>
      {/* Input row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
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
                fontFamily: "Space Mono, monospace", background: "var(--bg3)",
                border: "0.5px solid var(--border)", borderRadius: 8,
                color: "var(--text)", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ flex: "1 1 200px", minWidth: 160 }}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>
            Years to Retirement:{" "}
            <span style={{ fontFamily: "Space Mono, monospace", color: amberColor }}>{years}</span>
          </label>
          <input
            type="range"
            min={1}
            max={60}
            value={years}
            onChange={e => setYears(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
          />
        </div>

        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: "8px 20px", fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
            textTransform: "uppercase", fontFamily: "Space Mono, monospace",
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

      {/* Advanced Settings */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setAdvancedOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 11,
            color: "var(--text3)", background: "none", border: "none", cursor: "pointer", padding: 0,
          }}
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: advancedOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          Advanced Settings
        </button>

        <AnimatePresence>
          {advancedOpen && (
            <motion.div
              // initial={false} required — do not remove
              initial={false}
              animate={{ opacity: 1, height: "auto", marginTop: 10 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 12, padding: "14px 16px",
                background: "var(--bg3)", borderRadius: 10, border: "0.5px solid var(--border)",
              }}>
                {advancedFields.map(field => (
                  <div key={field.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                      <label style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--text3)", textTransform: "uppercase" }}>
                        {field.label}
                      </label>
                      <span title={field.tooltip} style={{ cursor: "help", lineHeight: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </span>
                    </div>
                    <div style={{ position: "relative" }}>
                      {field.prefix && (
                        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text3)", pointerEvents: "none" }}>
                          {field.prefix}
                        </span>
                      )}
                      <input
                        type="text"
                        inputMode="decimal"
                        value={field.value}
                        onChange={e => field.setValue(e.target.value.replace(/[^0-9.]/g, ""))}
                        style={{
                          width: "100%",
                          padding: field.prefix ? "7px 24px 7px 18px" : field.suffix ? "7px 24px 7px 8px" : "7px 8px",
                          fontSize: 12, fontFamily: "Space Mono, monospace",
                          background: "var(--bg)", border: "0.5px solid var(--border)",
                          borderRadius: 6, color: "var(--text)", outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      {field.suffix && (
                        <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text3)", pointerEvents: "none" }}>
                          {field.suffix}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Confidence Level */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                    <label style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--text3)", textTransform: "uppercase" }}>
                      Confidence Level
                    </label>
                    <span title="Controls the width of the outcome range shown. 90% means 9 out of 10 simulated paths fell between the low and high values. Higher confidence = wider range." style={{ cursor: "help", lineHeight: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[90, 95, 99].map(cl => (
                      <button
                        key={cl}
                        onClick={() => setConfidenceLevel(cl)}
                        style={{
                          flex: 1, padding: "6px 4px", fontSize: 11,
                          fontFamily: "Space Mono, monospace",
                          background: confidenceLevel === cl ? "var(--accent)" : "var(--bg)",
                          color: confidenceLevel === cl ? "#0a0e14" : "var(--text3)",
                          border: "0.5px solid var(--border)", borderRadius: 6, cursor: "pointer",
                          fontWeight: confidenceLevel === cl ? 700 : 400,
                        }}
                      >{cl}%</button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: "var(--red, #e05c5c)", marginBottom: 12 }}>{error}</p>
      )}

      {/* Progress bar */}
      <AnimatePresence>
        {loading && (
          <motion.div
            // initial={false} required — do not remove
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginBottom: 16 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>
                Running 8,500 scenarios over {years} years...
              </span>
              <span style={{ fontSize: 11, fontFamily: "Space Mono, monospace", color: amberColor }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.12 }}
                style={{ height: "100%", background: "var(--accent)", borderRadius: 2 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result card */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            // initial={false} required — do not remove
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{ border: "0.5px solid var(--border2)", borderRadius: 12, background: "var(--card-bg)", overflow: "hidden" }}
          >
            {/* Confidence interval statement */}
            <div style={{
              padding: "16px 18px",
              borderBottom: "0.5px solid var(--border)",
              background: dark ? "rgba(201,168,76,0.04)" : "rgba(184,134,11,0.04)",
            }}>
              <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, margin: 0 }}>
                There is a{" "}
                <strong style={{ color: amberColor, fontFamily: "Space Mono, monospace" }}>
                  {result.confidence_level}%
                </strong>{" "}
                chance your portfolio will be between{" "}
                <strong style={{ color: "var(--text)", fontFamily: "Space Mono, monospace" }}>
                  {fmtDollar(result.ci_low)}
                </strong>{" "}
                and{" "}
                <strong style={{ color: amberColor, fontFamily: "Space Mono, monospace" }}>
                  {fmtDollar(result.ci_high)}
                </strong>{" "}
                in{" "}
                <strong style={{ fontFamily: "Space Mono, monospace" }}>
                  {result.years} year{result.years !== 1 ? "s" : ""}
                </strong>
                {result.inflation_adjusted ? " (in today's dollars)" : ""}.
              </p>
            </div>

            {/* Histogram */}
            {result.histogram?.counts?.length > 0 && (
              <div style={{ padding: "16px 18px", borderBottom: "0.5px solid var(--border)" }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 10 }}>
                  Distribution of Outcomes
                </div>
                <HistogramChart
                  counts={result.histogram.counts}
                  edges={result.histogram.edges}
                  ciLow={result.ci_low}
                  ciHigh={result.ci_high}
                  median={result.median}
                  startingValue={result.current_value}
                  confidenceLevel={result.confidence_level}
                  dark={dark}
                />
              </div>
            )}

            {/* Outcome columns */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "0.5px solid var(--border)" }}>
              {[
                { label: "Low End", sublabel: `${(100 - result.confidence_level) / 2}th pct`, value: result.worst, pctVal: result.worst_pct, color: "var(--red, #e05c5c)" },
                { label: "Median", sublabel: "50th pct", value: result.median, pctVal: result.median_pct, color: amberColor },
                { label: "High End", sublabel: `${100 - (100 - result.confidence_level) / 2}th pct`, value: result.best, pctVal: result.best_pct, color: "var(--green, #5cb88a)" },
              ].map((col, i) => (
                <div key={col.label} style={{ padding: "18px 16px", borderRight: i < 2 ? "0.5px solid var(--border)" : "none", textAlign: "center" }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>{col.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Space Mono, monospace", color: col.color, marginBottom: 3, letterSpacing: "-0.5px" }}>
                    {fmtDollar(col.value)}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "Space Mono, monospace", color: col.color, opacity: 0.75 }}>
                    {fmtPct(col.pctVal)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{col.sublabel}</div>
                </div>
              ))}
            </div>

            {/* Meta row */}
            <div style={{ display: "flex", gap: 20, padding: "10px 18px", borderBottom: "0.5px solid var(--border)", flexWrap: "wrap" }}>
              {[
                { label: "Starting value", val: fmtDollar(result.current_value) },
                { label: "Horizon", val: `${result.years} yr${result.years !== 1 ? "s" : ""}` },
                { label: "Scenarios above start", val: `${(result.positive_prob * 100).toFixed(0)}%` },
                { label: "Simulations", val: result.simulations.toLocaleString() },
                ...(result.contribution > 0 ? [{ label: "Annual contribution", val: fmtDollar(result.contribution) }] : []),
                ...(result.inflation_adjusted ? [{ label: "Inflation adj.", val: `${result.inflation_rate}%/yr` }] : []),
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontFamily: "Space Mono, monospace", fontWeight: 600, color: "var(--text2)" }}>{m.val}</div>
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
                <div style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  padding: "12px 14px",
                  background: "rgba(var(--accent-rgb, 201,168,76), 0.06)",
                  border: "0.5px solid rgba(var(--accent-rgb, 201,168,76), 0.25)",
                  borderRadius: 9,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
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
