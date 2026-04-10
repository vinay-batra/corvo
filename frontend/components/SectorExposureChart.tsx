"use client";

import { memo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { fetchSectors } from "../lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

// Amber-anchored palette that stays readable on dark backgrounds
const SECTOR_COLORS = [
  "#c9a84c",
  "#a86e2e",
  "#e8c97a",
  "#7a6235",
  "#d4a855",
  "#8c5e20",
  "#f0d898",
  "#6b5030",
  "#b8943c",
  "#5a4020",
];

const SectorExposureChart = memo(function SectorExposureChart({
  assets,
}: {
  assets: any[];
}) {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    setFetchError(false);
    fetchSectors(assets)
      .then((res) => setData(res?.sectors ?? null))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [assets]);

  const labels = data ? Object.keys(data) : [];
  const values = data ? Object.values(data) : [];

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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Sector Exposure
        </p>
        {data && (
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
        )}
      </div>

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
        <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
          <p style={{ color: "rgba(224,92,92,0.8)" }}>Unable to load sector data — server may be temporarily unavailable.</p>
        </div>
      ) : data && labels.length ? (
        <Plot
          data={[
            {
              type: "pie",
              hole: 0.52,
              labels,
              values,
              textinfo: "none",
              hovertemplate: "<b>%{label}</b><br>%{percent}<extra></extra>",
              marker: {
                colors: SECTOR_COLORS.slice(0, labels.length),
                line: { color: "#0d0d0c", width: 2 },
              },
            },
          ]}
          layout={{
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: {
              color: "rgba(226,232,240,0.5)",
              family: "Space Grotesk, Inter, sans-serif",
              size: 10,
            },
            margin: { t: 8, b: 8, l: 8, r: 8 },
            showlegend: true,
            legend: {
              orientation: "v",
              x: 1.02,
              y: 0.5,
              xanchor: "left",
              yanchor: "middle",
              font: {
                family: "Space Grotesk, Inter, sans-serif",
                size: 10,
                color: "rgba(226,232,240,0.6)",
              },
              bgcolor: "transparent",
              itemclick: false,
              itemdoubleclick: false,
            },
            annotations: [
              {
                text: `${labels.length}<br><span style="font-size:9px">sectors</span>`,
                x: 0.38,
                y: 0.5,
                xref: "paper",
                yref: "paper",
                showarrow: false,
                font: {
                  size: 18,
                  color: "#c9a84c",
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
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: 260 }}
        />
      ) : !loading ? (
        <div
          style={{
            height: 260,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          No sector data available
        </div>
      ) : null}
    </motion.div>
  );
});

export default SectorExposureChart;
