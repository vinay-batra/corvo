"use client";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;
const BENCHMARK_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500", "^IXIC": "Nasdaq", "^DJI": "Dow Jones",
  "^RUT": "Russell 2000", "SPY": "SPY ETF", "QQQ": "QQQ ETF", "GLD": "Gold",
};
const C = { amber: "#c9a84c", cream3: "rgba(232,224,204,0.3)" };
export default function PerformanceChart({ data }: { data: any }) {
  const benchLabel = BENCHMARK_LABELS[data.benchmark_ticker] ?? data.benchmark_ticker ?? "Benchmark";
  const portfolioY = (data.portfolio_cumulative || data.growth || []);
  const benchmarkY = (data.benchmark_cumulative || data.benchmark || []);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 9, letterSpacing: 2.5, color: C.cream3, textTransform: "uppercase" }}>
          Performance vs {benchLabel}
        </p>
        <div style={{ display: "flex", gap: 16, fontSize: 10, color: C.cream3 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 2, background: C.amber, display: "inline-block", borderRadius: 1 }} />
            Portfolio
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 2, background: "rgba(232,224,204,0.35)", display: "inline-block", borderRadius: 1 }} />
            {benchLabel}
          </span>
        </div>
      </div>
      <Plot
        data={[
          {
            x: data.dates, y: portfolioY, type: "scatter", mode: "lines", name: "Portfolio",
            line: { color: "#c9a84c", width: 2 },
            fill: "tozeroy", fillcolor: "rgba(201,168,76,0.05)",
          },
          {
            x: data.dates, y: benchmarkY, type: "scatter", mode: "lines", name: benchLabel,
            line: { color: "rgba(232,224,204,0.3)", width: 1.5, dash: "dot" },
            fill: "tozeroy", fillcolor: "rgba(232,224,204,0.02)",
          },
        ]}
        layout={{
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "rgba(232,224,204,0.3)", family: "Inter", size: 10 },
          margin: { t: 0, b: 32, l: 48, r: 16 },
          xaxis: { gridcolor: "rgba(255,255,255,0.04)", linecolor: "rgba(255,255,255,0.06)", tickcolor: "transparent" },
          yaxis: { gridcolor: "rgba(255,255,255,0.04)", linecolor: "rgba(255,255,255,0.06)", tickcolor: "transparent", tickformat: ".0%" },
          showlegend: false,
          hovermode: "x unified",
          hoverlabel: { bgcolor: "#0d1117", bordercolor: "rgba(201,168,76,0.4)", font: { color: "#e8e0cc", family: "Inter", size: 11 } },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: 240 }}
      />
    </motion.div>
  );
}
