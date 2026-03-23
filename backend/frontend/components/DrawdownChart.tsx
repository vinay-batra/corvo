"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { fetchDrawdown } from "../lib/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function DrawdownChart({ assets, period }: { assets: any[]; period: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    fetchDrawdown(assets, period)
      .then(setData)
      .finally(() => setLoading(false));
  }, [assets, period]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-dim)",
        borderRadius: 14,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--red), transparent)", opacity: 0.5 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase" }}>Drawdown Chart</p>
        {data && (
          <span style={{ fontFamily: "var(--font-display)", fontSize: 11, color: "var(--red)", letterSpacing: 1 }}>
            Max: {(Math.min(...data.drawdown) * 100).toFixed(2)}%
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 28, height: 28, border: "2px solid var(--border-mid)", borderTopColor: "var(--red)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : data ? (
        <Plot
          data={[{
            x: data.dates,
            y: data.drawdown,
            type: "scatter",
            mode: "lines",
            name: "Drawdown",
            line: { color: "#ff4060", width: 1.5 },
            fill: "tozeroy",
            fillcolor: "rgba(255,64,96,0.1)",
          }]}
          layout={{
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "rgba(226,232,240,0.4)", family: "Space Grotesk", size: 10 },
            margin: { t: 0, b: 32, l: 52, r: 16 },
            xaxis: { gridcolor: "rgba(255,255,255,0.04)", linecolor: "rgba(255,255,255,0.08)", tickcolor: "transparent" },
            yaxis: { gridcolor: "rgba(255,255,255,0.04)", linecolor: "rgba(255,255,255,0.08)", tickcolor: "transparent", tickformat: ".1%" },
            showlegend: false,
            hovermode: "x unified",
            hoverlabel: { bgcolor: "#0a1020", bordercolor: "rgba(255,64,96,0.3)", font: { color: "#e2e8f0", family: "Space Grotesk", size: 11 } },
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: 220 }}
        />
      ) : null}
    </motion.div>
  );
}
