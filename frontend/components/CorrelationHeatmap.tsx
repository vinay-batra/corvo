"use client";

import { memo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchCorrelation } from "../lib/api";
import ErrorState from "./ErrorState";
import EmptyState from "./EmptyState";
import { cssVar } from "../lib/theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const CorrelationHeatmap = memo(function CorrelationHeatmap({ assets, period }: { assets: any[]; period: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [dark, setDark] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
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
  useEffect(() => {
    if (!loading) { setShowSpinner(false); return; }
    const t = setTimeout(() => setShowSpinner(true), 1000);
    return () => clearTimeout(t);
  }, [loading]);

  // Rendered bare: the parent <Card><TooltipCardHeader/></Card> on the
  // Simulations tab already provides card chrome, title, and tooltip. We
  // used to render our own card-in-card chrome plus a duplicate header,
  // which made the section look broken.
  if (assets.length < 2) {
    return (
      <EmptyState
        icon="⊞"
        title="Add 2+ assets to see correlation"
        message="Correlation analysis requires at least two holdings to compare."
        minHeight={160}
      />
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {showSpinner && data && <div style={{ position: "absolute", top: -2, right: 0, width: 12, height: 12, border: "1.5px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", zIndex: 2 }} />}
      <style>{`@keyframes corrPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
      {loading && !data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 0" }}>
          <div style={{ height: 220, borderRadius: 6, background: "var(--bg3)", animation: "corrPulse 1.5s ease-in-out infinite" }} />
        </div>
      ) : fetchError ? (
        <ErrorState
          message="Unable to load correlation data. The server may be temporarily unavailable."
          onRetry={() => setRetryCount(c => c + 1)}
          minHeight={240}
        />
      ) : data ? (
        <Plot
          data={[{
            z: data.matrix,
            x: data.tickers,
            y: data.tickers,
            type: "heatmap",
            colorscale: [
              [0, dark ? "#e05c5c" : "#c0392b"],
              [0.5, dark ? "#0d1525" : "#f5f5f0"],
              [1, dark ? "#5cb88a" : "#2d7a52"],
            ],
            zmin: -1,
            zmax: 1,
            text: data.matrix.map((row: number[]) => row.map((v: number) => (v ?? 0).toFixed(2))),
            texttemplate: "%{text}",
            textfont: { color: cssVar("--text2"), size: 11 },
            hovertemplate: "%{y} / %{x}: %{z:.3f}<extra></extra>",
            showscale: true,
            colorbar: {
              thickness: 10,
              len: 0.8,
              tickcolor: dark ? "rgba(232,224,204,0.4)" : "rgba(0,0,0,0.4)",
              tickfont: { color: dark ? "rgba(232,224,204,0.6)" : "#4a4a4a", size: 9 },
              outlinecolor: "transparent",
            },
          } as any]}
          layout={{
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: dark ? "rgba(232,224,204,0.7)" : "#4a4a4a", family: "Inter", size: 11 },
            margin: { t: 8, b: 40, l: 64, r: 60 },
            xaxis: { tickcolor: "transparent", gridcolor: "transparent", linecolor: "transparent" },
            yaxis: { tickcolor: "transparent", gridcolor: "transparent", linecolor: "transparent", autorange: "reversed" },
          }}
          config={{ displayModeBar: false, responsive: true, scrollZoom: false }}
          style={{ width: "100%", height: isMobile ? 260 : 300 }}
        />
      ) : null}
    </div>
  );
});

export default CorrelationHeatmap;
