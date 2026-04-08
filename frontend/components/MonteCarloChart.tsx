"use client";

import { useEffect, useState } from "react";
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

function StatCard({ label, value, color, desc, delay }: { label: string; value: string; color: string; desc: string; delay: number }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${hov ? "rgba(201,168,76,0.2)" : C.border}`, borderRadius: 12, padding: "18px 20px", transition: "all 0.2s", cursor: "default" }}>
      <p style={{ fontSize: 8, letterSpacing: 2.5, color: C.cream3, textTransform: "uppercase", marginBottom: 10 }}>{label}</p>
      <p style={{ fontFamily: "Space Mono, monospace", fontSize: 28, fontWeight: 700, color, letterSpacing: -1, lineHeight: 1, marginBottom: 8 }}>{value}</p>
      <p style={{ fontSize: 11, color: C.cream3, lineHeight: 1.65 }}>{desc}</p>
    </motion.div>
  );
}

function MonteCarloTooltip() {
  const [show, setShow] = useState(false);
  return (
    <div className="tooltip-root" style={{ display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: C.cream3, display: "flex", alignItems: "center", padding: 2 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
      </button>
      {show && (
        <div className="tooltip-box" style={{ minWidth: 240 }}>
          Simulates thousands of possible future portfolio paths using your historical return and volatility. The amber band is the median; outer bands show the 5th–95th percentile range.
        </div>
      )}
    </div>
  );
}

export default function MonteCarloChart({ assets, period }: { assets: any[]; period: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    fetchMonteCarlo(assets, period).then(setData).finally(() => setLoading(false));
  }, [assets, period]);

  const days = data ? Array.from({ length: data.horizon }, (_, i) => i + 1) : [];
  const p5  = data ? ((data.final_p5  * 100)).toFixed(1) : null;
  const p50 = data ? ((data.final_p50 * 100)).toFixed(1) : null;
  const p95 = data ? ((data.final_p95 * 100)).toFixed(1) : null;

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16 }}>
        <p style={{ fontSize: 13, color: C.cream3, lineHeight: 1.75, maxWidth: 560, fontWeight: 300 }}>
          300 simulated futures for your portfolio over the next 252 trading days (1 year).
        </p>
        <MonteCarloTooltip />
      </div>

      {/* Percentile stat cards */}
      {data && (
        <div className="mc-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
          <StatCard
            label="5th Percentile — Worst Case"
            value={`${Number(p5) >= 0 ? "+" : ""}${p5}%`}
            color={Number(p5) >= 0 ? C.amber : C.red}
            desc="95% of simulations ended better than this. Your realistic downside floor over 1 year."
            delay={0.1}
          />
          <StatCard
            label="Median — Most Likely"
            value={`${Number(p50) >= 0 ? "+" : ""}${p50}%`}
            color={C.amber}
            desc="Half of all 300 simulations landed above this, half below. Your most expected outcome."
            delay={0.2}
          />
          <StatCard
            label="95th Percentile — Best Case"
            value={`${Number(p95) >= 0 ? "+" : ""}${p95}%`}
            color={C.green}
            desc="Only 5% of simulations beat this. Your optimistic upside ceiling over 1 year."
            delay={0.3}
          />
        </div>
      )}

      {/* Insight callout */}
      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ background: C.amber3, border: "1px solid rgba(201,168,76,0.12)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ color: C.amber, fontSize: 14, flexShrink: 0, marginTop: 1 }}>◈</span>
          <p style={{ fontSize: 12, color: C.cream2, lineHeight: 1.7 }}>
            {Number(p5) < -20
              ? `Your worst-case scenario shows a ${p5}% loss — this portfolio carries significant downside risk. Make sure you can absorb that before it happens.`
              : Number(p50) > 15
              ? `Your median outcome of +${p50}% is strong. Simulations suggest a favorable risk-reward profile over this period.`
              : `Median outcome is ${Number(p50) >= 0 ? "+" : ""}${p50}%. The spread from worst case (${p5}%) to best case (+${p95}%) reflects your portfolio's uncertainty.`
            }
          </p>
        </motion.div>
      )}

      {/* Chart or loader */}
      {loading ? (
        <div style={{ height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 26, height: 26, border: "1.5px solid rgba(201,168,76,0.2)", borderTopColor: C.amber, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 10, letterSpacing: 2.5, color: C.cream3, textTransform: "uppercase" }}>Running 300 simulations...</p>
        </div>
      ) : data ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          {/* Chart legend */}
          <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
            {[
              { color: "rgba(201,168,76,0.1)", label: "5–95% range" },
              { color: "rgba(201,168,76,0.25)", label: "25–75% range" },
              { color: C.amber, label: "Median" },
              { color: "rgba(201,168,76,0.15)", label: "300 simulations" },
              { color: "rgba(201,168,76,0.55)", label: "SPY benchmark", dashed: true },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 18, height: 2, background: l.color, borderRadius: 1, borderTop: (l as any).dashed ? `2px dashed ${l.color}` : undefined, borderBottom: "none", borderLeft: "none", borderRight: "none" }} />
                <span style={{ fontSize: 10, color: C.cream3 }}>{l.label}</span>
              </div>
            ))}
          </div>

          <Plot
            data={[
              ...(data.sample_paths || []).map((path: number[]) => ({
                x: days,
                y: path.map((v: number) => v * 100),
                type: "scatter" as const,
                mode: "lines" as const,
                line: { color: "rgba(201,168,76,0.08)", width: 1 },
                hoverinfo: "skip" as const,
                showlegend: false,
              })),
              { x: days, y: data.bands.p5.map((v: number) => v * 100), type: "scatter", mode: "lines", line: { color: "rgba(201,168,76,0.2)", width: 1, dash: "dot" }, showlegend: false, hoverinfo: "skip" } as any,
              { x: days, y: data.bands.p95.map((v: number) => v * 100), type: "scatter", mode: "lines", fill: "tonexty", fillcolor: "rgba(201,168,76,0.08)", line: { color: "rgba(201,168,76,0.2)", width: 1, dash: "dot" }, showlegend: false } as any,
              { x: days, y: data.p75, type: "scatter", mode: "lines", line: { color: "rgba(0,0,0,0)", width: 0 }, showlegend: false, hoverinfo: "skip" } as any,
              { x: days, y: data.p25, type: "scatter", mode: "lines", fill: "tonexty", fillcolor: "rgba(201,168,76,0.1)", line: { color: "rgba(201,168,76,0.25)", width: 1, dash: "dot" }, showlegend: false } as any,
              // SPY benchmark: deterministic median path, 10% annual return, 15% vol
              {
                x: days,
                y: days.map((d: number) => (Math.exp((0.10 - 0.5 * 0.15 * 0.15) / 252 * d) - 1) * 100),
                type: "scatter", mode: "lines",
                name: "SPY benchmark",
                line: { color: "rgba(201,168,76,0.55)", width: 1.5, dash: "dash" },
                hovertemplate: "SPY benchmark: %{y:.1f}%<extra></extra>",
              } as any,
            ]}
            layout={{
              paper_bgcolor: "transparent", plot_bgcolor: "transparent",
              font: { color: "rgba(232,224,204,0.75)", family: "Inter", size: 10 },
              margin: { t: 8, b: 40, l: 56, r: 16 },
              xaxis: { title: { text: "Trading Days", font: { color: "rgba(232,224,204,0.25)", size: 9 } }, gridcolor: "rgba(255,255,255,0.07)", linecolor: "rgba(255,255,255,0.08)", tickcolor: "transparent" },
              yaxis: { gridcolor: "rgba(255,255,255,0.07)", linecolor: "rgba(255,255,255,0.08)", tickcolor: "transparent", tickformat: ".0f", ticksuffix: "%" },
              showlegend: false, hovermode: "x unified",
              hoverlabel: { bgcolor: "#0d1117", bordercolor: "rgba(201,168,76,0.4)", font: { color: C.cream, family: "Inter", size: 11 } },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: 280 }}
          />

          {/* Plain English explanation row */}
          <div className="mc-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 16 }}>
            {[
              { term: "5th Percentile", plain: "Your bad day. In 19 out of 20 simulations you did better than this. It's your downside floor — the loss you should be prepared to take." },
              { term: "Median (50th Pct)", plain: "The middle outcome. Half of all 300 simulations ended above this, half below. This is your most realistic baseline expectation." },
              { term: "95th Percentile", plain: "Your best-case ceiling. Only 1 in 20 simulations beat this. Great to know, but don't count on it for financial planning." },
            ].map((e, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ fontSize: 8, letterSpacing: 2, color: C.amber, textTransform: "uppercase", marginBottom: 6 }}>{e.term}</p>
                <p style={{ fontSize: 11, color: C.cream3, lineHeight: 1.7 }}>{e.plain}</p>
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}
    </>
  );
}
