"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

export default function FrontierChart({ data }: { data: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-dim)",
        borderRadius: 12,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, var(--cyan), transparent)",
        opacity: 0.4,
      }} />

      <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>
        Efficient Frontier
      </p>

      <Plot
        data={[
          {
            x: data.efficient_frontier.map((p: any) => p.volatility),
            y: data.efficient_frontier.map((p: any) => p.return),
            mode: "markers",
            type: "scatter",
            name: "Portfolios",
            marker: {
              size: 4,
              color: data.efficient_frontier.map((p: any) => p.return / (p.volatility || 1)),
              colorscale: [
                [0, "rgba(0,212,255,0.3)"],
                [0.5, "rgba(0,212,255,0.6)"],
                [1, "#00ffa0"],
              ],
              showscale: false,
            },
          },
          {
            x: [data.portfolio_volatility],
            y: [data.portfolio_return],
            mode: "markers",
            type: "scatter",
            name: "Your Portfolio",
            marker: {
              size: 12,
              color: "#00ffa0",
              symbol: "circle",
              line: { color: "rgba(0,255,160,0.4)", width: 6 },
            },
          },
        ]}
        layout={{
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "rgba(226,232,240,0.4)", family: "Space Grotesk", size: 10 },
          margin: { t: 0, b: 32, l: 48, r: 16 },
          xaxis: {
            title: { text: "Volatility", font: { size: 9, color: "rgba(226,232,240,0.25)" } },
            gridcolor: "rgba(255,255,255,0.04)",
            linecolor: "rgba(255,255,255,0.08)",
            tickcolor: "transparent",
            tickformat: ".0%",
          },
          yaxis: {
            title: { text: "Return", font: { size: 9, color: "rgba(226,232,240,0.25)" } },
            gridcolor: "rgba(255,255,255,0.04)",
            linecolor: "rgba(255,255,255,0.08)",
            tickcolor: "transparent",
            tickformat: ".0%",
          },
          showlegend: false,
          hoverlabel: {
            bgcolor: "#0a1020",
            bordercolor: "rgba(0,255,160,0.3)",
            font: { color: "#e2e8f0", family: "Space Grotesk", size: 11 },
          },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: 220 }}
      />
    </motion.div>
  );
}
