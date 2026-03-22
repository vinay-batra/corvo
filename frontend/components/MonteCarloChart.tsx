"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { fetchMonteCarlo } from "../lib/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function MonteCarloChart({ assets, period }: { assets: any[]; period: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    fetchMonteCarlo(assets, period)
      .then(setData)
      .finally(() => setLoading(false));
  }, [assets, period]);

  const days = data ? Array.from({ length: data.horizon }, (_, i) => i + 1) : [];

  const sampleTraces = data
    ? data.sample_paths.map((path: number[]) => ({
        x: days,
        y: path,
        type: "scatter",
        mode: "lines",
        line: { color: "rgba(0,255,160,0.06)", width: 1 },
        hoverinfo: "skip",
        showlegend: false,
      }))
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "22px 24px", position: "relative", overflow: "hidden", gridColumn: "span 2" }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--green), transparent)", opacity: 0.4 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase" }}>Monte Carlo Simulation</p>
          {data && <p style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4 }}>300 simulations · 1-year horizon (252 trading days)</p>}
        </div>
        {data && (
          <div style={{ display: "flex", gap: 20, fontSize: 10 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--red)", fontWeight: 700 }}>{(data.final_p5 * 100 - 100).toFixed(1)}%</div>
              <div style={{ color: "var(--text-muted)", letterSpacing: 1, marginTop: 2 }}>5th pct</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--cyan)", fontWeight: 700 }}>{(data.final_p50 * 100 - 100).toFixed(1)}%</div>
              <div style={{ color: "var(--text-muted)", letterSpacing: 1, marginTop: 2 }}>Median</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--green)", fontWeight: 700 }}>{(data.final_p95 * 100 - 100).toFixed(1)}%</div>
              <div style={{ color: "var(--text-muted)", letterSpacing: 1, marginTop: 2 }}>95th pct</div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, border: "2px solid var(--border-mid)", borderTopColor: "var(--green)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2, textTransform: "uppercase" }}>Running 300 simulations...</span>
        </div>
      ) : data ? (
        <Plot
          data={[
            ...sampleTraces,
            {
              x: days, y: data.p95,
              type: "scatter", mode: "lines",
              line: { color: "rgba(0,255,160,0.0)", width: 0 },
              showlegend: false, hoverinfo: "skip",
            } as any,
            {
              x: days, y: data.p5,
              type: "scatter", mode: "lines", name: "5–95% Range",
              fill: "tonexty",
              fillcolor: "rgba(0,255,160,0.06)",
              line: { color: "rgba(0,255,160,0.15)", width: 1, dash: "dot" },
              showlegend: true,
            } as any,
            {
              x: days, y: data.p25,
              type: "scatter", mode: "lines",
              line: { color: "rgba(0,255,160,0.0)", width: 0 },
              showlegend: false, hoverinfo: "skip",
            } as any,
            {
              x: days, y: data.p75,
              type: "scatter", mode: "lines", name: "25–75% IQR",
              fill: "tonexty",
              fillcolor: "rgba(0,255,160,0.10)",
              line: { color: "rgba(0,255,160,0.2)", width: 1, dash: "dot" },
              showlegend: true,
            } as any,
            {
              x: days, y: data.p50,
              type: "scatter", mode: "lines", name: "Median",
              line: { color: "#00ffa0", width: 2.5 },
              showlegend: true,
            } as any,
          ]}
          layout={{
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "rgba(226,232,240,0.4)", family: "Space Grotesk", size: 10 },
            margin: { t: 8, b: 36, l: 56, r: 16 },
            xaxis: {
              title: { text: "Trading Days", font: { color: "rgba(226,232,240,0.3)", size: 9 } },
              gridcolor: "rgba(255,255,255,0.04)", linecolor: "rgba(255,255,255,0.08)", tickcolor: "transparent",
            },
            yaxis: {
              gridcolor: "rgba(255,255,255,0.04)", linecolor: "rgba(255,255,255,0.08)", tickcolor: "transparent",
              tickformat: ".2f",
            },
            legend: { x: 0.01, y: 0.98, bgcolor: "rgba(0,0,0,0)", font: { color: "rgba(226,232,240,0.5)", size: 10 } },
            hovermode: "x unified",
            hoverlabel: { bgcolor: "#0a1020", bordercolor: "rgba(0,255,160,0.3)", font: { color: "#e2e8f0", family: "Space Grotesk", size: 11 } },
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: 280 }}
        />
      ) : null}
    </motion.div>
  );
}
