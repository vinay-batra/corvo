"use client";

import { memo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { fetchCorrelation } from "../lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const CorrelationHeatmap = memo(function CorrelationHeatmap({ assets, period }: { assets: any[]; period: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (assets.length < 2) return;
    setLoading(true);
    setFetchError(false);
    fetchCorrelation(assets, period)
      .then(setData)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [assets, period]);

  if (assets.length < 2) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "22px 24px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2, textTransform: "uppercase" }}>Add 2+ assets to see correlation</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "22px 24px", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--purple), transparent)", opacity: 0.5 }} />
      <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>Correlation Heatmap</p>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 0" }}>
          <div style={{ height: 200, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "corrPulse 1.5s ease-in-out infinite" }} />
          <style>{`@keyframes corrPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
        </div>
      ) : fetchError ? (
        <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
          <p style={{ color: "rgba(224,92,92,0.8)" }}>Unable to load correlation data — server may be temporarily unavailable.</p>
        </div>
      ) : data ? (
        <Plot
          data={[{
            z: data.matrix,
            x: data.tickers,
            y: data.tickers,
            type: "heatmap",
            colorscale: [
              [0, "#ff4060"],
              [0.5, "#0a1020"],
              [1, "#00ffa0"],
            ],
            zmin: -1,
            zmax: 1,
            text: data.matrix.map((row: number[]) => row.map((v: number) => v.toFixed(2))),
            texttemplate: "%{text}",
            textfont: { color: "rgba(226,232,240,0.7)", size: 11 },
            hovertemplate: "%{y} / %{x}: %{z:.3f}<extra></extra>",
            showscale: true,
            colorbar: {
              thickness: 10,
              len: 0.8,
              tickcolor: "rgba(226,232,240,0.3)",
              tickfont: { color: "rgba(226,232,240,0.3)", size: 9 },
              outlinecolor: "transparent",
            },
          } as any]}
          layout={{
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "rgba(226,232,240,0.5)", family: "Space Grotesk", size: 11 },
            margin: { t: 8, b: 40, l: 56, r: 60 },
            xaxis: { tickcolor: "transparent", gridcolor: "transparent", linecolor: "transparent" },
            yaxis: { tickcolor: "transparent", gridcolor: "transparent", linecolor: "transparent", autorange: "reversed" },
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: 260 }}
        />
      ) : null}
    </motion.div>
  );
});

export default CorrelationHeatmap;
