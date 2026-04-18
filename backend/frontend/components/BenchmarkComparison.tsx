"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const BENCHMARK_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500", "^IXIC": "Nasdaq", "^DJI": "Dow Jones",
  "^RUT": "Russell 2000", "QQQ": "QQQ ETF", "GLD": "Gold",
};

export default function BenchmarkComparison({ data }: { data: any }) {
  const [showModal, setShowModal] = useState(false);

  const portfolioReturn = data.portfolio_return;
  const benchLabel = BENCHMARK_LABELS[data.benchmark_ticker] ?? data.benchmark_ticker ?? "Benchmark";

  // Estimate benchmark return from the growth array
  const benchArr = data.benchmark || [];
  const benchReturn = benchArr.length >= 2
    ? (benchArr[benchArr.length - 1] / benchArr[0]) - 1
    : 0;

  const diff = portfolioReturn - benchReturn;
  const isBeating = diff > 0;

  const maxVal = Math.max(Math.abs(portfolioReturn), Math.abs(benchReturn), 0.01);
  const portWidth = Math.abs(portfolioReturn) / maxVal;
  const benchWidth = Math.abs(benchReturn) / maxVal;

  const portColor = portfolioReturn >= 0 ? "var(--green)" : "var(--red)";
  const benchColor = "var(--cyan)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "22px 24px", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--purple), transparent)", opacity: 0.4 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>vs {benchLabel}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: "var(--font-display)", color: isBeating ? "var(--green)" : "var(--red)", background: isBeating ? "rgba(0,255,160,0.1)" : "rgba(255,77,109,0.1)", border: `1px solid ${isBeating ? "rgba(0,255,160,0.3)" : "rgba(255,77,109,0.3)"}`, padding: "2px 8px", borderRadius: 4 }}>
            {isBeating ? "+" : ""}{(diff * 100).toFixed(1)}pp
          </span>
          <button onClick={() => setShowModal(true)}
            style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(226,232,240,0.4)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--purple)"; e.currentTarget.style.color = "var(--purple)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(226,232,240,0.4)"; }}
          >?</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Portfolio bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(226,232,240,0.5)" }}>Your Portfolio</span>
            <span style={{ fontSize: 11, fontFamily: "var(--font-display)", color: portColor }}>{portfolioReturn >= 0 ? "+" : ""}{(portfolioReturn * 100).toFixed(2)}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${portWidth * 100}%` }}
              transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
              style={{ height: "100%", background: portColor, borderRadius: 4, boxShadow: `0 0 8px ${portColor}60` }}
            />
          </div>
        </div>

        {/* Benchmark bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(226,232,240,0.5)" }}>{benchLabel}</span>
            <span style={{ fontSize: 11, fontFamily: "var(--font-display)", color: benchColor }}>{benchReturn >= 0 ? "+" : ""}{(benchReturn * 100).toFixed(2)}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${benchWidth * 100}%` }}
              transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
              style={{ height: "100%", background: benchColor, borderRadius: 4, opacity: 0.7 }}
            />
          </div>
        </div>

        {/* Verdict */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          style={{ fontSize: 12, color: "rgba(226,232,240,0.5)", lineHeight: 1.5, paddingTop: 4, borderTop: "1px solid var(--border-dim)" }}
        >
          {isBeating
            ? `Your portfolio beat the ${benchLabel} by ${(diff * 100).toFixed(1)} percentage points this period.`
            : `Your portfolio underperformed the ${benchLabel} by ${(Math.abs(diff) * 100).toFixed(1)} percentage points this period.`
          }
        </motion.p>
      </div>

      {showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}
            style={{ background: "#0a1222", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 16, padding: "28px 32px", maxWidth: 400, width: "100%", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--purple), transparent)", borderRadius: "16px 16px 0 0" }} />
            <button onClick={() => setShowModal(false)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "rgba(226,232,240,0.3)", fontSize: 18, cursor: "pointer" }}>✕</button>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "rgba(226,232,240,0.3)", textTransform: "uppercase", marginBottom: 8 }}>What is</p>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--purple)", letterSpacing: 2, marginBottom: 16 }}>Benchmark Comparison?</h3>
            <p style={{ fontSize: 13, color: "rgba(226,232,240,0.7)", lineHeight: 1.7, marginBottom: 12 }}>
              A benchmark is a standard portfolio (like the S&P 500) used to measure your performance. If the S&P 500 returned 12% and your portfolio returned 15%, you "beat the market" by 3 percentage points.
            </p>
            <p style={{ fontSize: 13, color: "rgba(226,232,240,0.7)", lineHeight: 1.7 }}>
              Most professional fund managers struggle to consistently beat the S&P 500 , so if you're doing it, that's impressive!
            </p>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
