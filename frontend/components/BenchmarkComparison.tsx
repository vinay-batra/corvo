"use client";
import { motion } from "framer-motion";

const BENCHMARK_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500", "^IXIC": "Nasdaq", "^DJI": "Dow Jones",
  "^RUT": "Russell 2000", "QQQ": "QQQ ETF", "GLD": "Gold",
};

const C = { amber: "var(--accent)", amber2: "rgba(184,134,11,0.1)", red: "#e05c5c", green: "#4caf7d" };

function BenchmarkSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ height: 36, borderRadius: 8, background: "var(--bg3)", animation: "pulse 1.4s ease-in-out infinite" }} />
      {[0, 1].map(i => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ height: 12, width: 110, borderRadius: 4, background: "var(--bg3)", animation: "pulse 1.4s ease-in-out infinite" }} />
            <div style={{ height: 12, width: 54, borderRadius: 4, background: "var(--bg3)", animation: "pulse 1.4s ease-in-out infinite" }} />
          </div>
          <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, animation: "pulse 1.4s ease-in-out infinite" }} />
        </div>
      ))}
    </div>
  );
}

export default function BenchmarkComparison({ data }: { data: any }) {
  const portfolioReturn = data?.portfolio_return ?? null;
  const benchLabel = BENCHMARK_LABELS[data?.benchmark_ticker] ?? data?.benchmark_ticker ?? "Benchmark";
  if (!data || portfolioReturn == null) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80 }}>
        <span style={{ fontSize: 12, color: "var(--text3)" }}>Run an analysis to see benchmark comparison</span>
      </div>
    );
  }

  // Use pre-computed benchmark_return if available, fall back to deriving from array
  const benchArr = data?.benchmark_cumulative || [];
  const benchReturnFromArr = benchArr.length > 0 ? benchArr[benchArr.length - 1] : 0;
  const benchReturn = data?.benchmark_return ?? benchReturnFromArr;

  if (benchReturn === null) {
    return <BenchmarkSkeleton />;
  }

  const diff = portfolioReturn - benchReturn;
  const isBeating = diff > 0;
  const maxVal = Math.max(Math.abs(portfolioReturn), Math.abs(benchReturn), 0.01);
  const portWidth = Math.abs(portfolioReturn) / maxVal;
  const benchWidth = Math.abs(benchReturn) / maxVal;

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
      {/* Outperformance headline */}
      <div style={{ marginBottom: 14, padding: "8px 12px", background: isBeating ? "rgba(76,175,125,0.06)" : "rgba(224,92,92,0.06)", border: `0.5px solid ${isBeating ? "rgba(76,175,125,0.25)" : "rgba(224,92,92,0.25)"}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "var(--text2)" }}>
          {isBeating ? `Beat ${benchLabel} by` : `Behind ${benchLabel} by`}
        </span>
        <span style={{ fontSize: 18, fontFamily: "Space Mono,monospace", fontWeight: 700, color: isBeating ? C.green : C.red }}>
          {isBeating ? "+" : "-"}{(Math.abs(diff) * 100).toFixed(1)}%
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 500 }}>Portfolio Return</span>
            <span style={{ fontSize: 14, fontFamily: "Space Mono,monospace", color: portfolioReturn >= 0 ? C.green : C.red, fontWeight: 700 }}>{portfolioReturn >= 0 ? "+" : ""}{(portfolioReturn * 100).toFixed(2)}%</span>
          </div>
          <div style={{ height: 6, background: "var(--track)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ width: `${portWidth * 100}%` }} transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
              style={{ height: "100%", background: portfolioReturn >= 0 ? C.green : C.red, borderRadius: 3, boxShadow: `0 0 6px ${portfolioReturn >= 0 ? C.green : C.red}80` }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text2)" }}>{benchLabel} Return</span>
            <span style={{ fontSize: 14, fontFamily: "Space Mono,monospace", color: "#5b9bd5" }}>{benchReturn >= 0 ? "+" : ""}{(benchReturn * 100).toFixed(2)}%</span>
          </div>
          <div style={{ height: 6, background: "var(--track)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ width: `${benchWidth * 100}%` }} transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
              style={{ height: "100%", background: "#5b9bd5", borderRadius: 3 }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
