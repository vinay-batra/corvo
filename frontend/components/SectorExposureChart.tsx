"use client";

import { memo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchSectors } from "../lib/api";
import ErrorState from "./ErrorState";
import EmptyState from "./EmptyState";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const SECTOR_COLORS = [
  "#5b9bd5",
  "#4caf7d",
  "#b8860b",
  "#e05c5c",
  "#b47ee0",
  "#e0965c",
  "#5cd4d4",
];

const SectorExposureChart = memo(function SectorExposureChart({
  assets,
}: {
  assets: any[];
}) {
  const [data, setData] = useState<Record<string, number> | null>(null);
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

  const assetsKey = assets.map(a => `${a.ticker}:${a.weight}`).join(",");
  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    setFetchError(false);
    fetchSectors(assets)
      .then((res) => setData(res?.sectors ?? null))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetsKey, retryCount]);

  const labels = data ? Object.keys(data) : [];
  const values = data ? Object.values(data) : [];

  return (
    <>
      {/* Amber top-line accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)",
          opacity: 0.6,
        }}
      />

      {data && (
        <div style={{ textAlign: "right", marginBottom: 16 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              color: "rgba(201,168,76,0.7)",
              letterSpacing: 1,
            }}
          >
            {labels.length} sector{labels.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 0" }}>
          <div style={{ height: 160, borderRadius: 8, background: "rgba(255,255,255,0.06)", animation: "secPulse 1.5s ease-in-out infinite" }} />
          <div style={{ display: "flex", gap: 8 }}>
            {[60, 45, 70, 50].map((w, i) => (
              <div key={i} style={{ height: 10, width: `${w}px`, borderRadius: 4, background: "rgba(255,255,255,0.06)", animation: "secPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <style>{`@keyframes secPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
        </div>
      ) : fetchError ? (
        <ErrorState
          message="Unable to load sector data. The server may be temporarily unavailable."
          onRetry={() => setRetryCount(c => c + 1)}
          minHeight={260}
        />
      ) : data && labels.length ? (
        <>
        <Plot
          data={[
            {
              type: "pie",
              hole: 0.52,
              labels,
              values,
              domain: { x: [0, 1], y: [0, 1] },
              textinfo: "none",
              hovertemplate: "<b>%{label}</b><br>%{percent}<extra></extra>",
              marker: {
                colors: SECTOR_COLORS.slice(0, labels.length),
                line: { color: "var(--text)", width: 2 },
              },
            },
          ]}
          layout={{
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: {
              color: dark ? "rgba(226,232,240,0.5)" : "#4a4a4a",
              family: "Space Grotesk, Inter, sans-serif",
              size: 10,
            },
            margin: { t: 8, b: 8, l: 8, r: 8 },
            showlegend: true,
            legend: {
              orientation: "v",
              x: 1,
              y: 0.5,
              xanchor: "left",
              yanchor: "middle",
              font: {
                family: "Space Grotesk, Inter, sans-serif",
                size: 10,
                color: dark ? "rgba(226,232,240,0.6)" : "#4a4a4a",
              },
              bgcolor: "transparent",
              itemclick: false,
              itemdoubleclick: false,
            },
            annotations: [
              {
                text: `${labels.length}<br><span style="font-size:9px">sectors</span>`,
                x: 0.5,
                y: 0.5,
                xref: "paper",
                yref: "paper",
                showarrow: false,
                font: {
                  size: 18,
                  color: "var(--accent)",
                  family: "Space Grotesk, Inter, sans-serif",
                },
                align: "center",
              },
            ],
            hoverlabel: {
              bgcolor: "#0a1020",
              bordercolor: "rgba(201,168,76,0.3)",
              font: {
                color: "#e2e8f0",
                family: "Space Grotesk, Inter, sans-serif",
                size: 11,
              },
            },
          }}
          config={{ displayModeBar: false, responsive: true, scrollZoom: false }}
          style={{ width: "100%", height: 260 }}
        />
        </>
      ) : !loading ? (
        <EmptyState
          icon="◯"
          title="No sector data available"
          message="Sector classifications could not be loaded for the current holdings."
          minHeight={260}
        />
      ) : null}
    </>
  );
});

export default SectorExposureChart;
