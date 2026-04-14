"use client";
import { motion } from "framer-motion";

const BENCHMARK_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500", "^IXIC": "Nasdaq", "^DJI": "Dow Jones",
  "^RUT": "Russell 2000", "QQQ": "QQQ ETF", "GLD": "Gold",
};

const C = { amber: "var(--accent)", amber2: "rgba(184,134,11,0.1)", red: "#e05c5c" };

export default function BenchmarkComparison({ data }: { data: any }) {
  const portfolioReturn = data.portfolio_return;
  const benchLabel = BENCHMARK_LABELS[data.benchmark_ticker] ?? data.benchmark_ticker ?? "Benchmark";
  const benchArr = data.benchmark || [];
  const benchReturn = benchArr.length >= 2 ? (benchArr[benchArr.length - 1] / benchArr[0]) - 1 : 0;
  const diff = portfolioReturn - benchReturn;
  const isBeating = diff > 0;
  const maxVal = Math.max(Math.abs(portfolioReturn), Math.abs(benchReturn), 0.01);
  const portWidth = Math.abs(portfolioReturn) / maxVal;
  const benchWidth = Math.abs(benchReturn) / maxVal;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 8, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase" }}>vs {benchLabel}</span>
        <span style={{ fontSize: 11, color: isBeating ? C.amber : C.red, background: isBeating ? C.amber2 : "rgba(224,92,92,0.1)", border: `1px solid ${isBeating ? "rgba(184,134,11,0.3)" : "rgba(224,92,92,0.25)"}`, padding: "2px 8px", borderRadius: 4, fontFamily: "Space Mono,monospace", fontWeight: 700 }}>
          {isBeating ? "+" : ""}{(diff * 100).toFixed(1)}pp
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text2)" }}>Your Portfolio</span>
            <span style={{ fontSize: 11, fontFamily: "Space Mono,monospace", color: portfolioReturn >= 0 ? C.amber : C.red }}>{portfolioReturn >= 0 ? "+" : ""}{(portfolioReturn * 100).toFixed(2)}%</span>
          </div>
          <div style={{ height: 6, background: "var(--track)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${portWidth * 100}%` }} transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
              style={{ height: "100%", background: C.amber, borderRadius: 3 }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text2)" }}>{benchLabel}</span>
            <span style={{ fontSize: 11, fontFamily: "Space Mono,monospace", color: "var(--text3)" }}>{benchReturn >= 0 ? "+" : ""}{(benchReturn * 100).toFixed(2)}%</span>
          </div>
          <div style={{ height: 6, background: "var(--track)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${benchWidth * 100}%` }} transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
              style={{ height: "100%", background: "var(--border2)", borderRadius: 3 }} />
          </div>
        </div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6, paddingTop: 10, borderTop: "0.5px solid var(--border)" }}>
          {isBeating
            ? `Portfolio beat ${benchLabel} by ${(diff * 100).toFixed(1)}pp this period.`
            : `Portfolio underperformed ${benchLabel} by ${(Math.abs(diff) * 100).toFixed(1)}pp this period.`}
        </motion.p>
      </div>
    </motion.div>
  );
}
