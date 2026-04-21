"use client";

import { memo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { fetchMonteCarlo } from "../lib/api";
import ErrorState from "./ErrorState";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const C = {
  amber: "var(--accent)", amber2: "rgba(184,134,11,0.1)", amber3: "rgba(201,168,76,0.06)",
  border: "rgba(255,255,255,0.12)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.85)", cream3: "rgba(232,224,204,0.65)",
  red: "#e05c5c", green: "#5cb88a",
};

const MonteCarloChart = memo(function MonteCarloChart({ assets, period, portfolioValue }: { assets: any[]; period: string; portfolioValue?: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!assets.length) return;
    setLoading(true);
    setFetchError(false);
    setInsight(null);
    fetchMonteCarlo(assets, period)
      .then((result) => setData(result))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [assets, period, retryCount]);

  // Fetch Claude insight after simulation data loads
  useEffect(() => {
    if (!data || data.positive_prob == null) return;
    const positiveProb = Math.round(data.positive_prob * 100);

    setInsightLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    fetch(`${API_URL}/montecarlo/insight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positive_prob: positiveProb,
        p5: data.final_p5,
        p50: data.final_p50,
        p95: data.final_p95,
        ruin_probability: data.ruin_probability ?? 0,
        expected_shortfall: data.expected_shortfall ?? data.final_p5,
        simulations: data.simulations ?? 8500,
      }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(r => {
        if (r.detail === "Rate limit exceeded. Try again in an hour.") {
          setInsight("Insight unavailable — rate limit reached. Try again shortly.");
        } else {
          setInsight(r.insight ?? null);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          setInsight("Insight generation timed out.");
        } else {
          setInsight(null);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setInsightLoading(false);
      });
  }, [data]);

  // Derived display values - all bands are fractional gain/loss (0.0 = breakeven)
  const days = data ? Array.from({ length: data.horizon }, (_, i) => i + 1) : [];
  const toDisplayPct = (v: number | null | undefined) =>
    v == null ? null : (v * 100).toFixed(1);

  const p5  = toDisplayPct(data?.final_p5);
  const p25 = toDisplayPct(data?.final_p25);
  const p50 = toDisplayPct(data?.final_p50);
  const p75 = toDisplayPct(data?.final_p75);
  const p95 = toDisplayPct(data?.final_p95);

  // Positive probability from actual simulation output (never hardcoded)
  const positiveProb = data?.positive_prob != null
    ? Math.round(data.positive_prob * 100)
    : null;

  // Simulation count — always from server response
  const simCount: string = data?.simulations != null
    ? Number(data.simulations).toLocaleString()
    : "8,500";

  const probRows = data ? [
    {
      scenario: "Bear case",
      range: "< 5th pct",
      prob: "5%",
      ret: `${Number(p5) >= 0 ? "+" : ""}${p5}%`,
      meaning: "Severe downturn - portfolio underperforms nearly all historical scenarios",
      color: C.red,
      bg: "rgba(224,92,92,0.06)",
    },
    {
      scenario: "Below average",
      range: "5th – 25th pct",
      prob: "20%",
      ret: `${((+p5! + +p25!) / 2) >= 0 ? "+" : ""}${((+p5! + +p25!) / 2).toFixed(1)}%`,
      meaning: "Portfolio trails expectations but avoids a severe loss",
      color: dark ? "#c9a84c" : "#b8860b",
      bg: dark ? "rgba(201,168,76,0.04)" : "rgba(184,134,11,0.04)",
    },
    {
      scenario: "Average",
      range: "25th – 75th pct",
      prob: "50%",
      ret: `${Number(p50) >= 0 ? "+" : ""}${p50}%`,
      meaning: "Most likely outcome - returns in line with historical volatility",
      color: "var(--text2)",
      bg: "transparent",
    },
    {
      scenario: "Above average",
      range: "75th – 95th pct",
      prob: "20%",
      ret: `${((+p75! + +p95!) / 2) >= 0 ? "+" : ""}${((+p75! + +p95!) / 2).toFixed(1)}%`,
      meaning: "Solid outperformance - favorable macro and company conditions",
      color: "#7dc98f",
      bg: "rgba(92,184,138,0.04)",
    },
    {
      scenario: "Bull case",
      range: "> 95th pct",
      prob: "5%",
      ret: `${Number(p95) >= 0 ? "+" : ""}${p95}%`,
      meaning: "Exceptional run - portfolio outperforms nearly all historical scenarios",
      color: C.green,
      bg: "rgba(92,184,138,0.08)",
    },
  ] : [];

  const varPct  = data ? Math.abs((data.final_p5 ?? 0) * 100).toFixed(1) : null;
  const esPct   = data ? Math.abs((data.expected_shortfall ?? data.final_p5 ?? 0) * 100).toFixed(1) : null;
  const ruinPct = data
    ? data.ruin_probability != null
      ? (data.ruin_probability * 100).toFixed(1)
      : "0.0"
    : null;

  const mcAmber  = dark ? C.amber : "#b8860b";
  const mcFc     = dark ? "rgba(232,224,204,0.75)" : "#4a4a4a";
  const mcGc     = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
  const mcLc     = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";

  // Amber shades for fan chart bands
  const amberOuter     = dark ? "rgba(201,168,76,0.08)" : "rgba(184,134,11,0.07)";
  const amberOuterLine = dark ? "rgba(201,168,76,0.35)" : "rgba(184,134,11,0.35)";
  const amberInner     = dark ? "rgba(201,168,76,0.22)" : "rgba(184,134,11,0.18)";
  const amberBright    = dark ? "#c9a84c" : "#b8860b";

  // Band arrays already in fractional form — multiply by 100 for % display
  const band = (key: string): number[] =>
    (data?.bands?.[key] ?? []).map((v: number) => v * 100);

  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:768px){.js-plotly-plot .main-svg{max-width:100%!important}}
        .mc-table th,.mc-table td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--border)}
        .mc-table th{font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:var(--text3);font-weight:500}
        .mc-table td{font-size:11px;color:var(--text2)}
        .mc-table tr:last-child td{border-bottom:none}
      `}</style>

      {/* ── Chart or loader ── */}
      {loading ? (
        <div style={{ height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 26, height: 26, border: "1.5px solid rgba(201,168,76,0.2)", borderTopColor: dark ? C.amber : "#b8860b", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase" }}>Running {simCount} simulations...</p>
        </div>
      ) : fetchError ? (
        <ErrorState
          message="Unable to run simulation. The server may be temporarily unavailable."
          onRetry={() => setRetryCount(c => c + 1)}
          minHeight={300}
        />
      ) : data ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>

          {/* Legend */}
          <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
            {[
              { label: "5th – 95th pct",  fill: true,  linec: amberOuterLine, bg: amberOuter },
              { label: "25th – 75th pct", fill: true,  linec: amberOuterLine, bg: amberInner },
              { label: "Median",          fill: false, color: amberBright, thick: true },
              { label: "Breakeven",       fill: false, color: "rgba(59,130,246,0.6)", dashed: true },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {l.fill ? (
                  <div style={{ width: 18, height: 8, borderRadius: 2, background: l.bg, border: `1px solid ${l.linec}` }} />
                ) : (
                  <svg width="18" height="10">
                    <line x1="0" y1="5" x2="18" y2="5"
                      stroke={l.color}
                      strokeWidth={l.thick ? 2.5 : 1.5}
                      strokeDasharray={l.dashed ? "4 2" : undefined} />
                  </svg>
                )}
                <span style={{ fontSize: 10, color: "var(--text3)" }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/*
            Fan chart: filled areas between percentile bands.
            Order matters for Plotly "tonexty":
              [0] p5  — outer bottom boundary (no fill)
              [1] p95 — outer top boundary (fill="tonexty" → fills p5→p95, very transparent amber)
              [2] p25 — inner bottom boundary (no fill)
              [3] p75 — inner top boundary (fill="tonexty" → fills p25→p75, more opaque amber)
              [4] p50 — median line (bright amber, no fill)
              [5] breakeven at y=0 (blue dashed)
          */}
          <Plot
            data={[
              // Outer bottom: p5 (amber boundary)
              {
                x: days, y: band("p5"),
                type: "scatter", mode: "lines",
                line: { color: amberOuterLine, width: 1, dash: "dot" },
                hoverinfo: "skip", showlegend: false,
              } as any,
              // Outer top: p95 — fills outer band (very transparent amber)
              {
                x: days, y: band("p95"),
                type: "scatter", mode: "lines",
                fill: "tonexty",
                fillcolor: amberOuter,
                line: { color: amberOuterLine, width: 1, dash: "dot" },
                hoverinfo: "skip", showlegend: false,
              } as any,
              // Inner bottom: p25
              {
                x: days, y: band("p25"),
                type: "scatter", mode: "lines",
                line: { color: "transparent", width: 0 },
                hoverinfo: "skip", showlegend: false,
              } as any,
              // Inner top: p75 — fills middle 50% band (more opaque amber)
              {
                x: days, y: band("p75"),
                type: "scatter", mode: "lines",
                fill: "tonexty",
                fillcolor: amberInner,
                line: { color: "transparent", width: 0 },
                hoverinfo: "skip", showlegend: false,
              } as any,
              // Median line (bright amber)
              {
                x: days, y: band("p50"),
                type: "scatter", mode: "lines",
                line: { color: amberBright, width: 2.5 },
                hovertemplate: "Median: %{y:.1f}%<extra></extra>",
                showlegend: false,
              } as any,
              // Breakeven reference at y=0 (blue dashed)
              {
                x: [1, data.horizon],
                y: [0, 0],
                type: "scatter", mode: "lines",
                line: { color: "rgba(59,130,246,0.55)", width: 1.5, dash: "dash" },
                hoverinfo: "skip", showlegend: false,
              } as any,
            ]}
            layout={{
              paper_bgcolor: "transparent", plot_bgcolor: "transparent",
              font: { color: mcFc, family: "Inter", size: 10 },
              margin: { t: 8, b: 40, l: 56, r: 16 },
              xaxis: {
                title: { text: "Trading Days", font: { color: dark ? "rgba(232,224,204,0.25)" : "#7a7a78", size: 9 } },
                gridcolor: mcGc, linecolor: mcLc, tickcolor: "transparent",
                range: [1, 252],
              },
              yaxis: {
                title: { text: "Gain / Loss", font: { color: dark ? "rgba(232,224,204,0.25)" : "#7a7a78", size: 9 } },
                gridcolor: mcGc, linecolor: mcLc,
                tickcolor: "transparent", tickformat: ".0f", ticksuffix: "%",
              },
              showlegend: false,
              hovermode: "x unified",
              hoverlabel: {
                bgcolor: "#0d1117",
                bordercolor: "rgba(201,168,76,0.4)",
                font: { color: "#e8e0cc", family: "Inter", size: 11 },
              },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: 300 }}
          />
          <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "right", margin: "2px 0 0" }}>Double-click chart to reset zoom</p>

          {/* ── AI insight summary box ── */}
          {positiveProb !== null && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ marginTop: 16, background: dark ? C.amber3 : "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.15)", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: mcAmber, fontSize: 14, flexShrink: 0, marginTop: 1 }}>◈</span>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.75 }}>
                Based on {simCount} simulations, your portfolio has a{" "}
                <strong style={{ color: mcAmber }}>{positiveProb}% chance of positive returns</strong> over 1 year,
                with a median outcome of{" "}
                <strong style={{ color: Number(p50) >= 0 ? mcAmber : C.red }}>
                  {Number(p50) >= 0 ? "+" : ""}{p50}%
                </strong>.{" "}
                {Number(p5!) < -15
                  ? `Worst-case downside is ${p5}%. Ensure you can absorb this before it occurs.`
                  : Number(p95!) > 30
                  ? `Best-case upside reaches +${p95}%, though only 5% of paths achieve that outcome.`
                  : `The range from ${p5}% to +${p95}% reflects your portfolio's uncertainty over this period.`}
              </p>
            </motion.div>
          )}

          {/* ── What Would Your Money Become? ── */}
          {data && portfolioValue != null && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              style={{ marginTop: 20, background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px 8px", borderBottom: "0.5px solid var(--border)" }}>
                <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>What Would Your Money Become?</p>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="mc-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>Scenario</th>
                      <th>Probability</th>
                      <th>Starting Value</th>
                      <th>Ending Value</th>
                      <th>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const pv = portfolioValue;
                      const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
                      const midRet = (a: number, b: number) => (a + b) / 2;
                      const scenarios = [
                        { name: "Bear Case",      prob: "5%",  mult: data.final_p5 ?? 0, color: C.red, bg: "rgba(224,92,92,0.06)" },
                        { name: "Below Average",  prob: "20%", mult: midRet(data.final_p5 ?? 0, data.final_p25 ?? 0), color: dark ? "#c9a84c" : "#b8860b", bg: dark ? "rgba(201,168,76,0.04)" : "rgba(184,134,11,0.04)" },
                        { name: "Average",        prob: "50%", mult: data.final_p50 ?? 0, color: "var(--text2)", bg: "transparent" },
                        { name: "Above Average",  prob: "20%", mult: midRet(data.final_p75 ?? 0, data.final_p95 ?? 0), color: "#7dc98f", bg: "rgba(92,184,138,0.04)" },
                        { name: "Bull Case",      prob: "5%",  mult: data.final_p95 ?? 0, color: C.green, bg: "rgba(92,184,138,0.08)" },
                      ];
                      return scenarios.map((s, i) => {
                        const ending = pv * (1 + s.mult);
                        const change = ending - pv;
                        const positive = change >= 0;
                        const valColor = positive ? C.green : C.red;
                        return (
                          <tr key={i} style={{ background: s.bg }}>
                            <td>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                                <span style={{ color: s.color, fontWeight: 600 }}>{s.name}</span>
                              </span>
                            </td>
                            <td style={{ fontFamily: "Space Mono, monospace", fontWeight: 700, color: s.color }}>{s.prob}</td>
                            <td style={{ fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>{fmt(pv)}</td>
                            <td style={{ fontFamily: "Space Mono, monospace", fontWeight: 700, color: valColor }}>{fmt(ending)}</td>
                            <td style={{ fontFamily: "Space Mono, monospace", fontWeight: 700, color: valColor }}>{positive ? "+$" : "-$"}{Math.round(Math.abs(change)).toLocaleString()}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── Risk Metrics Panel ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              {
                label: "Value at Risk (VaR 95%)",
                value: `-${varPct}%`,
                subtext: "Max expected loss over 1 year with 95% confidence",
                color: C.red,
              },
              {
                label: "Expected Shortfall",
                value: `-${esPct}%`,
                subtext: "Average loss across the worst 5% of scenarios",
                color: "#e07a5f",
              },
              {
                label: "Probability of Ruin",
                value: ruinPct === "0.0" ? "< 0.1%" : `${ruinPct}%`,
                subtext: "Chance of losing more than 50% of portfolio",
                color: Number(ruinPct) > 5 ? C.red : Number(ruinPct) > 1 ? mcAmber : "var(--text3)",
              },
            ].map((card, i) => (
              <div key={i} style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ fontSize: 8, letterSpacing: 1.8, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8 }}>{card.label}</p>
                <p style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: card.color, letterSpacing: -0.5, marginBottom: 6 }}>{card.value}</p>
                <p style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.5 }}>{card.subtext}</p>
              </div>
            ))}
          </motion.div>

          {/* ── What this means for you (Claude insight) ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            style={{ marginTop: 12, borderLeft: `3px solid ${mcAmber}`, background: dark ? "rgba(201,168,76,0.05)" : "rgba(184,134,11,0.06)", borderRadius: "0 10px 10px 0", padding: "14px 16px" }}>
            <p style={{ fontSize: 9, letterSpacing: 2, color: mcAmber, textTransform: "uppercase", marginBottom: 10 }}>What this means for you</p>
            {insightLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 14, height: 14, border: "1.5px solid rgba(201,168,76,0.2)", borderTopColor: mcAmber, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: "var(--text3)" }}>Generating personalized insight...</p>
              </div>
            ) : insight ? (
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.8 }}>{insight}</p>
            ) : (
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.8 }}>
                Based on {data.simulations?.toLocaleString() ?? "8,500"} simulations, there is a{" "}
                <strong style={{ color: mcAmber }}>{positiveProb}% chance of positive returns</strong>.{" "}
                In the worst case scenario, the portfolio could decline by{" "}
                <strong style={{ color: C.red }}>{varPct}%</strong> over one year.
              </p>
            )}
          </motion.div>

          {/* ── Simulation Assumptions Footer ── */}
          <p style={{ marginTop: 16, fontSize: 10, color: "var(--text3)", lineHeight: 1.6, textAlign: "center" }}>
            Based on {simCount} Monte Carlo simulations using historical volatility and returns. Past performance does not guarantee future results.
          </p>
        </motion.div>
      ) : null}
    </>
  );
});

export default MonteCarloChart;
