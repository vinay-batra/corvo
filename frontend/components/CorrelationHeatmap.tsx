"use client";

import { memo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { fetchCorrelation } from "../lib/api";
import ErrorState from "./ErrorState";
import EmptyState from "./EmptyState";
import InfoModal from "./InfoModal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const CorrelationHeatmap = memo(function CorrelationHeatmap({ assets, period }: { assets: any[]; period: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (assets.length < 2) return;
    setLoading(true);
    setFetchError(false);
    fetchCorrelation(assets, period)
      .then(setData)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [assets, period, retryCount]);

  if (assets.length < 2) {
    return (
      <motion.div
        // initial={false} is required — do not remove
        initial={false} animate={{ opacity: 1 }}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "22px 24px" }}>
        <EmptyState
          icon="⊞"
          title="Add 2+ assets to see correlation"
          message="Correlation analysis requires at least two holdings to compare."
          minHeight={160}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "22px 24px", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--purple), transparent)", opacity: 0.5 }} />
      <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>Correlation Heatmap <InfoModal title="Correlation Heatmap" sections={[{ label: "Plain English", text: "Shows how closely pairs of holdings move together. Values range from -1 (perfectly opposite) to +1 (move in lockstep). 0 means no statistical relationship." }, { label: "Example", text: "NVDA and AMD might show 0.85 correlation -- when one rises, the other usually does too. BND (bonds) vs NVDA might be -0.2, offering true diversification." }, { label: "What's Good?", text: "Lower correlations between holdings mean better diversification. A portfolio where everything is highly correlated (above 0.8) offers little protection in a broad selloff." }]} /></p>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 0" }}>
          <div style={{ height: 200, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "corrPulse 1.5s ease-in-out infinite" }} />
          <style>{`@keyframes corrPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
        </div>
      ) : fetchError ? (
        <ErrorState
          message="Unable to load correlation data. The server may be temporarily unavailable."
          onRetry={() => setRetryCount(c => c + 1)}
          minHeight={240}
        />
      ) : data ? (
        <>
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
            text: data.matrix.map((row: number[]) => row.map((v: number) => (v ?? 0).toFixed(2))),
            texttemplate: "%{text}",
            textfont: { color: dark ? "rgba(226,232,240,0.7)" : "#1a1a1a", size: 11 },
            hovertemplate: "%{y} / %{x}: %{z:.3f}<extra></extra>",
            showscale: true,
            colorbar: {
              thickness: 10,
              len: 0.8,
              tickcolor: dark ? "rgba(226,232,240,0.3)" : "rgba(0,0,0,0.3)",
              tickfont: { color: dark ? "rgba(226,232,240,0.3)" : "#7a7a78", size: 9 },
              outlinecolor: "transparent",
            },
          } as any]}
          layout={{
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: dark ? "rgba(226,232,240,0.5)" : "#4a4a4a", family: "Space Grotesk", size: 11 },
            margin: { t: 8, b: 40, l: 56, r: 60 },
            xaxis: { tickcolor: "transparent", gridcolor: "transparent", linecolor: "transparent" },
            yaxis: { tickcolor: "transparent", gridcolor: "transparent", linecolor: "transparent", autorange: "reversed" },
          }}
          config={{ displayModeBar: false, responsive: true, scrollZoom: false }}
          style={{ width: "100%", height: 260 }}
        />
        </>
      ) : null}
    </motion.div>
  );
});

export default CorrelationHeatmap;
