"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const BENCHMARK_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "Nasdaq",
  "^DJI": "Dow Jones",
  "^RUT": "Russell 2000",
  "SPY": "SPY ETF",
  "QQQ": "QQQ ETF",
  "GLD": "Gold",
};

export default function PerformanceChart({ data }: { data: any }) {
  const benchLabel = BENCHMARK_LABELS[data.benchmark_ticker] ?? data.benchmark_ticker ?? "Benchmark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-dim)",
        borderRadius: 12,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--green), transparent)", opacity: 0.4 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Performance vs {benchLabel}
        </p>
        <div style={{ display: "flex", gap: 16, fontSize: 10, color: "var(--text-muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 2, background: "var(--green)", display: "inline-block", borderRadius: 1 }} />
            Portfolio
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 2, background: "var(--cyan)", display: "inline-block", borderRadius: 1, opacity: 0.6 }} />
            {benchLabel}
          </span>
        </div>
      </div>

      <Plot
        data={[
          {
            x: data.dates,
            y: data.growth,
            type: "scatter",
            mode: "lines",
            name: "Portfolio",
            line: { color: "#00ffa0", width: 2 },
            fill: "tozeroy",
            fillcolor: "rgba(0,255,160,0.04)",
          },
          {
            x: data.dates,
            y: data.benchmark,
            type: "scatter",
            mode: "lines",
            name: benchLabel,
            line: { color: "#00d4ff", width: 1.5, dash: "dot" },
            fill: "tozeroy",
            fillcolor: "rgba(0,212,255,0.02)",
          },
        ]}
        layout={{
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "rgba(226,232,240,0.4)", family: "Space Grotesk", size: 10 },
          margin: { t: 0, b: 32, l: 48, r: 16 },
          xaxis: { gridcolor: "rgba(255,255,255,0.04)", linecolor: "rgba(255,255,255,0.08)", tickcolor: "transparent" },
          yaxis: { gridcolor: "rgba(255,255,255,0.04)", linecolor: "rgba(255,255,255,0.08)", tickcolor: "transparent", tickformat: ".0%" },
          showlegend: false,
          hovermode: "x unified",
          hoverlabel: { bgcolor: "#0a1020", bordercolor: "rgba(0,255,160,0.3)", font: { color: "#e2e8f0", family: "Space Grotesk", size: 11 } },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: 280 }}
      />
    </motion.div>
  );
}
