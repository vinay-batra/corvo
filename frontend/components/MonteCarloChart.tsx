"use client";

import { memo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { fetchMonteCarlo } from "../lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const C = {
  amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", amber3: "rgba(201,168,76,0.06)",
  border: "rgba(255,255,255,0.12)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.85)", cream3: "rgba(232,224,204,0.65)",
  red: "#e05c5c", green: "#5cb88a",
};

const MonteCarloChart = memo(function MonteCarloChart({ assets, period }: { assets: any[]; period: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    setFetchError(false);
    fetchMonteCarlo(assets, period).then(setData).catch(() => setFetchError(true)).finally(() => setLoading(false));
  }, [assets, period]);

  const days = data ? Array.from({ length: data.horizon }, (_, i) => i + 1) : [];
  const p5  = data ? (data.final_p5  * 100).toFixed(1) : null;
  const p50 = data ? (data.final_p50 * 100).toFixed(1) : null;
  const p95 = data ? (data.final_p95 * 100).toFixed(1) : null;

  // Calculate positive-return probability from sample paths
  const positiveProb = (() => {
    if (!data?.sample_paths?.length) return null;
    const positive = (data.sample_paths as number[][]).filter(path => path[path.length - 1] > 0).length;
    return Math.round((positive / data.sample_paths.length) * 100);
  })();

  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:768px){.js-plotly-plot .main-svg{max-width:100%!important}}
      `}</style>

      {/* Percentile stat cards */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "5th Pct — Worst Case", value: `${Number(p5) >= 0 ? "+" : ""}${p5}%`, color: Number(p5) >= 0 ? C.amber : C.red },
            { label: "Median — Most Likely",  value: `${Number(p50) >= 0 ? "+" : ""}${p50}%`, color: C.amber },
            { label: "95th Pct — Best Case",  value: `${Number(p95) >= 0 ? "+" : ""}${p95}%`, color: C.green },
          ].map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 8, letterSpacing: 2, color: C.cream3, textTransform: "uppercase", marginBottom: 8 }}>{card.label}</p>
              <p style={{ fontFamily: "Space Mono, monospace", fontSize: 24, fontWeight: 700, color: card.color, letterSpacing: -0.5 }}>{card.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Chart or loader */}
      {loading ? (
        <div style={{ height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 26, height: 26, border: "1.5px solid rgba(201,168,76,0.2)", borderTopColor: C.amber, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 10, letterSpacing: 2.5, color: C.cream3, textTransform: "uppercase" }}>Running 300 simulations...</p>
        </div>
      ) : fetchError ? (
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: C.cream3, fontSize: 12, textAlign: "center" }}>
          <p style={{ color: "rgba(224,92,92,0.8)" }}>Unable to run simulation — server may be temporarily unavailable.</p>
        </div>
      ) : data ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          {/* Legend */}
          <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
            {[
              { color: "#ef4444", label: "Worst/Best 5%", dashed: true },
              { color: "#c9a84c", label: "Middle 50%",    dashed: false },
              { color: "#ffffff", label: "Median",         dashed: false, thick: true },
              { color: "#2dd4bf", label: "SPY Benchmark",  dashed: true },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="18" height="10">
                  <line x1="0" y1="5" x2="18" y2="5"
                    stroke={l.color}
                    strokeWidth={l.thick ? 2.5 : 1.5}
                    strokeDasharray={l.dashed ? "4 2" : undefined} />
                </svg>
                <span style={{ fontSize: 10, color: C.cream3 }}>{l.label}</span>
              </div>
            ))}
          </div>

          <Plot
            data={[
              // Individual simulation paths
              ...(data.sample_paths || []).map((path: number[]) => ({
                x: days,
                y: path.map((v: number) => v * 100),
                type: "scatter" as const,
                mode: "lines" as const,
                line: { color: "rgba(255,255,255,0.15)", width: 0.5 },
                hoverinfo: "skip" as const,
                showlegend: false,
              })),
              // 5-95% outer band
              { x: days, y: data.bands.p5.map((v: number) => v * 100), type: "scatter", mode: "lines",
                line: { color: "#ef4444", width: 2, dash: "dash" }, showlegend: false, hoverinfo: "skip" } as any,
              { x: days, y: data.bands.p95.map((v: number) => v * 100), type: "scatter", mode: "lines",
                fill: "tonexty", fillcolor: "rgba(239,68,68,0.07)",
                line: { color: "#ef4444", width: 2, dash: "dash" }, showlegend: false, hoverinfo: "skip" } as any,
              // 25-75% inner band
              { x: days, y: data.p75, type: "scatter", mode: "lines",
                line: { color: "#c9a84c", width: 2 }, showlegend: false, hoverinfo: "skip" } as any,
              { x: days, y: data.p25, type: "scatter", mode: "lines",
                fill: "tonexty", fillcolor: "rgba(201,168,76,0.12)",
                line: { color: "#c9a84c", width: 2 }, showlegend: false, hoverinfo: "skip" } as any,
              // Median line
              { x: days, y: (data.bands.p50 || []).map((v: number) => v * 100), type: "scatter", mode: "lines",
                line: { color: "#ffffff", width: 3 }, showlegend: false,
                hovertemplate: "Median: %{y:.1f}%<extra></extra>" } as any,
              // SPY benchmark
              { x: days,
                y: days.map((d: number) => (Math.exp((0.10 - 0.5 * 0.15 * 0.15) / 252 * d) - 1) * 100),
                type: "scatter", mode: "lines",
                line: { color: "#2dd4bf", width: 2, dash: "dash" },
                hovertemplate: "SPY benchmark: %{y:.1f}%<extra></extra>", showlegend: false } as any,
            ]}
            layout={{
              paper_bgcolor: "transparent", plot_bgcolor: "transparent",
              font: { color: "rgba(232,224,204,0.75)", family: "Inter", size: 10 },
              margin: { t: 8, b: 40, l: 56, r: 16 },
              xaxis: {
                title: { text: "Trading Days", font: { color: "rgba(232,224,204,0.25)", size: 9 } },
                gridcolor: "rgba(255,255,255,0.06)", linecolor: "rgba(255,255,255,0.08)", tickcolor: "transparent",
              },
              yaxis: {
                gridcolor: "rgba(255,255,255,0.06)", linecolor: "rgba(255,255,255,0.08)",
                tickcolor: "transparent", tickformat: ".0f", ticksuffix: "%",
              },
              showlegend: false, hovermode: "x unified",
              hoverlabel: { bgcolor: "#0d1117", bordercolor: "rgba(201,168,76,0.4)", font: { color: C.cream, family: "Inter", size: 11 } },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: 300 }}
          />

          {/* AI insight box */}
          {positiveProb !== null && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ marginTop: 16, background: C.amber3, border: "1px solid rgba(201,168,76,0.15)", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: C.amber, fontSize: 14, flexShrink: 0, marginTop: 1 }}>◈</span>
              <p style={{ fontSize: 12, color: C.cream2, lineHeight: 1.75 }}>
                Based on these 300 simulations, your portfolio has a{" "}
                <strong style={{ color: C.amber }}>{positiveProb}% chance of positive returns</strong> over 1 year,
                with a median outcome of{" "}
                <strong style={{ color: Number(p50) >= 0 ? C.amber : C.red }}>
                  {Number(p50) >= 0 ? "+" : ""}{p50}%
                </strong>.{" "}
                {Number(p5) < -15
                  ? `Worst-case downside is ${p5}% — ensure you can absorb this before it occurs.`
                  : Number(p95) > 30
                  ? `Best-case upside reaches +${p95}%, though only 5% of paths achieve that outcome.`
                  : `The range from ${p5}% to +${p95}% reflects your portfolio's uncertainty over this period.`}
              </p>
            </motion.div>
          )}
        </motion.div>
      ) : null}
    </>
  );
});

export default MonteCarloChart;
