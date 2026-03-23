"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { fetchMonteCarlo } from "../lib/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const C = {
  amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", amber3: "rgba(201,168,76,0.06)",
  border: "rgba(255,255,255,0.06)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.6)", cream3: "rgba(232,224,204,0.25)",
  red: "#e05c5c", green: "#5cb88a",
};

function StatCard({ label, value, color, desc, delay }: { label: string; value: string; color: string; desc: string; delay: number }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)", border: `1px solid ${hov ? "rgba(201,168,76,0.2)" : C.border}`, borderRadius: 12, padding: "18px 20px", transition: "all 0.2s", cursor: "default" }}>
      <p style={{ fontSize: 8, letterSpacing: 2.5, color: C.cream3, textTransform: "uppercase", marginBottom: 10 }}>{label}</p>
      <p style={{ fontFamily: "Space Mono, monospace", fontSize: 28, fontWeight: 700, color, letterSpacing: -1, lineHeight: 1, marginBottom: 8 }}>{value}</p>
      <p style={{ fontSize: 11, color: C.cream3, lineHeight: 1.65 }}>{desc}</p>
    </motion.div>
  );
}

function ExplainerModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(10,14,20,0.88)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ width: 540, background: "#111620", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 18, padding: "36px 36px 32px", position: "relative", maxHeight: "85vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontSize: 12, color: C.cream3 }}>✕</button>
        <p style={{ fontSize: 8, letterSpacing: 2.5, color: C.amber, textTransform: "uppercase", marginBottom: 8 }}>Deep Dive</p>
        <h3 style={{ fontSize: 22, fontWeight: 500, color: C.cream, marginBottom: 24 }}>Monte Carlo Simulation</h3>
        {[
          { title: "What is it?", text: "Monte Carlo simulation runs your portfolio through hundreds of possible futures at once. Each simulation uses your historical returns and volatility to randomly generate a plausible path — like rolling dice 300 times to see all the ways the future could unfold." },
          { title: "How does it work?", text: "We take your portfolio's past return and volatility, then use Geometric Brownian Motion to simulate 300 different one-year trajectories. Each path is random but constrained by your actual historical behavior — so aggressive portfolios get wilder paths, stable ones get tighter bands." },
          { title: "What does the chart show?", text: "The faint lines are all 300 individual simulated paths. The inner darker band covers the 25th–75th percentile range (where the middle half of outcomes land). The outer band covers 5th–95th percentile (95% of all outcomes). The amber line is the median — your most expected outcome." },
          { title: "What is a percentile?", text: "The 5th percentile is your bad-case scenario — only 5% of simulations ended lower. The 95th is best-case — only 5% ended higher. The median (50th percentile) is where exactly half of simulations landed above and half below. Think of it as your 'expected' outcome." },
          { title: "How should I use this?", text: "Look at the 5th percentile first — can you stomach that loss? If it shows -30% and that would wreck your finances, you're taking too much risk. Use the median for realistic planning. The 95th percentile is your upside ceiling — don't build your retirement on it." },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
            <p style={{ fontSize: 8, letterSpacing: 2, color: C.amber, textTransform: "uppercase", marginBottom: 6 }}>{s.title}</p>
            <p style={{ fontSize: 13, color: C.cream2, lineHeight: 1.75 }}>{s.text}</p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

export default function MonteCarloChart({ assets, period }: { assets: any[]; period: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);

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
      <AnimatePresence>
        {showExplainer && <ExplainerModal onClose={() => setShowExplainer(false)} />}
      </AnimatePresence>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16 }}>
        <p style={{ fontSize: 13, color: C.cream3, lineHeight: 1.75, maxWidth: 560, fontWeight: 300 }}>
          300 simulated futures for your portfolio over the next 252 trading days (1 year). Each path is a statistically plausible outcome based on your portfolio's historical returns and volatility.
        </p>
        <button onClick={() => setShowExplainer(true)}
          style={{ flexShrink: 0, padding: "8px 16px", background: C.amber2, border: "1px solid rgba(201,168,76,0.25)", borderRadius: 8, color: C.amber, fontSize: 11, cursor: "pointer", letterSpacing: 0.5, whiteSpace: "nowrap", transition: "all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.2)"}
          onMouseLeave={e => e.currentTarget.style.background = C.amber2}>
          How does this work? →
        </button>
      </div>

      {/* Percentile stat cards */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
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
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 18, height: 2, background: l.color, borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: C.cream3 }}>{l.label}</span>
              </div>
            ))}
          </div>

          <Plot
            data={[
              ...data.sample_paths.map((path: number[]) => ({
                x: days, y: path, type: "scatter", mode: "lines",
                line: { color: "rgba(201,168,76,0.04)", width: 1 },
                hoverinfo: "skip", showlegend: false,
              })),
              { x: days, y: data.p95, type: "scatter", mode: "lines", line: { color: "rgba(0,0,0,0)", width: 0 }, showlegend: false, hoverinfo: "skip" } as any,
              { x: days, y: data.p5,  type: "scatter", mode: "lines", fill: "tonexty", fillcolor: "rgba(201,168,76,0.05)", line: { color: "rgba(201,168,76,0.15)", width: 1, dash: "dot" }, showlegend: false } as any,
              { x: days, y: data.p75, type: "scatter", mode: "lines", line: { color: "rgba(0,0,0,0)", width: 0 }, showlegend: false, hoverinfo: "skip" } as any,
              { x: days, y: data.p25, type: "scatter", mode: "lines", fill: "tonexty", fillcolor: "rgba(201,168,76,0.1)", line: { color: "rgba(201,168,76,0.25)", width: 1, dash: "dot" }, showlegend: false } as any,
              { x: days, y: data.p50, type: "scatter", mode: "lines", line: { color: C.amber, width: 2.5 }, showlegend: false } as any,
            ]}
            layout={{
              paper_bgcolor: "transparent", plot_bgcolor: "transparent",
              font: { color: "rgba(232,224,204,0.3)", family: "Inter", size: 10 },
              margin: { t: 8, b: 40, l: 56, r: 16 },
              xaxis: { title: { text: "Trading Days", font: { color: "rgba(232,224,204,0.25)", size: 9 } }, gridcolor: "rgba(255,255,255,0.03)", linecolor: "rgba(255,255,255,0.04)", tickcolor: "transparent" },
              yaxis: { gridcolor: "rgba(255,255,255,0.03)", linecolor: "rgba(255,255,255,0.04)", tickcolor: "transparent", tickformat: ".2f" },
              showlegend: false, hovermode: "x unified",
              hoverlabel: { bgcolor: "#0d1117", bordercolor: "rgba(201,168,76,0.4)", font: { color: C.cream, family: "Inter", size: 11 } },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: 300 }}
          />

          {/* Plain English explanation row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 16 }}>
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
