"use client";

import { memo, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { fetchMonteCarlo } from "../lib/api";
import ErrorState from "./ErrorState";
import InfoModal from "./InfoModal";
import { RESOLVED_API_URL } from "../lib/api";
import { plotlyHoverlabel } from "../lib/theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const API_URL = RESOLVED_API_URL;

// Module-level cache: keyed by simulation params string so results survive tab switches
// and component remounts without re-firing the expensive backend request.
const _mcDataCache = new Map<string, any>();
const _mcInsightCache = new Map<string, string>();

const YEARS_OPTIONS = [1, 2, 3, 5, 10, 20, 30];

const C = {
  amber: "var(--accent)", amber2: "rgba(184,134,11,0.1)", amber3: "rgba(201,168,76,0.06)",
  red: "var(--red)", green: "#5cb88a",
};

const MonteCarloChart = memo(function MonteCarloChart({ assets, period, portfolioValue }: { assets: any[]; period: string; portfolioValue?: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [simYears, setSimYears] = useState(5);
  // Track the last key we actually ran for - prevents re-runs from stable-but-recreated prop refs
  const simKeyRef = useRef<string>("");
  // User-gated run: Monte Carlo no longer auto-fires on mount or on horizon
  // change. The user clicks "Run Simulation" (or "Re-run") to trigger it.
  // Lets the user pick a horizon first without burning a backend call,
  // and prevents simulations stacking up when the user navigates between
  // tabs. Increments any time a run is requested; the fetch effect keys
  // off this counter alongside (assets, period, simYears) so changing the
  // horizon doesn't re-fetch until the user clicks Run again.
  const [runRequested, setRunRequested] = useState(0);

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

  // Cache-restore effect: when assets/period/years change, restore from
  // cache if there's a hit (so tab switches re-show the prior result), but
  // don't ever AUTO-FETCH. The user must click Run.
  useEffect(() => {
    if (!assets.length) return;
    const newKey =
      assets.map(a => `${a.ticker}:${Number(a.weight).toFixed(4)}`).sort().join(",") +
      "|" + period +
      "|" + simYears;
    if (newKey === simKeyRef.current && data) return;

    const cached = _mcDataCache.get(newKey);
    if (cached) {
      simKeyRef.current = newKey;
      setData(cached);
      const cachedInsight = _mcInsightCache.get(newKey);
      if (cachedInsight) setInsight(cachedInsight);
      return;
    }
    // No cache hit AND no run requested -> show the Run button (data stays null).
    if (newKey !== simKeyRef.current) {
      setData(null);
      setInsight(null);
    }
  }, [assets, period, simYears, data]);

  // Run effect: fires when the user clicks Run / Re-run (runRequested bumps)
  // or hits retry (retryCount bumps). Skips when assets are empty.
  useEffect(() => {
    if (runRequested === 0 && retryCount === 0) return;
    if (!assets.length) return;
    const newKey =
      assets.map(a => `${a.ticker}:${Number(a.weight).toFixed(4)}`).sort().join(",") +
      "|" + period +
      "|" + simYears;
    simKeyRef.current = newKey;
    setLoading(true);
    setFetchError(false);
    setInsight(null);
    fetchMonteCarlo(assets, period, simYears)
      .then((result) => {
        _mcDataCache.set(newKey, result);
        setData(result);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runRequested, retryCount]);

  // Fetch Claude insight after simulation data loads (skip if already cached)
  useEffect(() => {
    if (!data || data.positive_prob == null) return;
    // insight may have already been restored from cache in the data effect
    if (insight !== null) return;

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
        simulations: data.simulations ?? 10000,
        loss_probability: data.loss_probability ?? Math.max(0, 1 - (data.positive_prob ?? 1)),
        years: data.years ?? simYears,
      }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(r => {
        let text: string | null = null;
        if (r.detail === "Rate limit exceeded. Try again in an hour.") {
          text = "Insight unavailable - rate limit reached. Try again shortly.";
        } else {
          text = r.insight ?? null;
        }
        if (text) _mcInsightCache.set(simKeyRef.current, text);
        setInsight(text);
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

  const stepsPerYear: number = data?.steps_per_year ?? 12;
  const horizonYears: number = data?.years ?? simYears;
  // x values as fractional years (0.08, 0.17, ... up to horizonYears)
  const xLabels = data
    ? Array.from({ length: data.horizon }, (_, i) => (i + 1) / stepsPerYear)
    : [];

  const toDisplayPct = (v: number | null | undefined) =>
    v == null ? null : (v * 100).toFixed(1);

  const p5  = toDisplayPct(data?.final_p5);
  const p25 = toDisplayPct(data?.final_p25);
  const p50 = toDisplayPct(data?.final_p50);
  const p75 = toDisplayPct(data?.final_p75);
  const p95 = toDisplayPct(data?.final_p95);

  const positiveProb = data?.positive_prob != null
    ? Math.round(data.positive_prob * 100)
    : null;

  const simCount: string = data?.simulations != null
    ? Number(data.simulations).toLocaleString()
    : "10,000";

  const horizonLabel = horizonYears === 1 ? "1 year" : `${horizonYears} years`;

  const fmtMidPct = (a: string | null, b: string | null): string => {
    if (a == null || b == null) return "--";
    const mid = (+a + +b) / 2;
    return `${mid >= 0 ? "+" : ""}${mid.toFixed(1)}%`;
  };

  const probRows = data ? [
    {
      scenario: "Bear case",
      range: "< 5th pct",
      prob: "5%",
      ret: p5 != null ? `${Number(p5) >= 0 ? "+" : ""}${p5}%` : "--",
      meaning: `Severe downturn - portfolio underperforms nearly all scenarios over ${horizonLabel}`,
      color: C.red,
      bg: "rgba(224,92,92,0.06)",
    },
    {
      scenario: "Below average",
      range: "5th - 25th pct",
      prob: "20%",
      ret: fmtMidPct(p5, p25),
      meaning: `Portfolio trails expectations but avoids a severe loss`,
      color: dark ? "#c9a84c" : "#b8860b",
      bg: dark ? "rgba(201,168,76,0.04)" : "rgba(184,134,11,0.04)",
    },
    {
      scenario: "Average",
      range: "25th - 75th pct",
      prob: "50%",
      ret: p50 != null ? `${Number(p50) >= 0 ? "+" : ""}${p50}%` : "--",
      meaning: `Most likely outcome - returns in line with historical volatility`,
      color: "var(--text2)",
      bg: "transparent",
    },
    {
      scenario: "Above average",
      range: "75th - 95th pct",
      prob: "20%",
      ret: fmtMidPct(p75, p95),
      meaning: `Solid outperformance - favorable macro and company conditions`,
      color: "#7dc98f",
      bg: "rgba(92,184,138,0.04)",
    },
    {
      scenario: "Bull case",
      range: "> 95th pct",
      prob: "5%",
      ret: p95 != null ? `${Number(p95) >= 0 ? "+" : ""}${p95}%` : "--",
      meaning: `Exceptional run - portfolio outperforms nearly all scenarios`,
      color: C.green,
      bg: "rgba(92,184,138,0.08)",
    },
  ] : [];

  // The "worst-5%" raw value (signed). When negative this is a loss; when
  // positive it means even the worst-5% scenarios still gained, and we should
  // surface that honestly instead of pretending it's a loss.
  const p5Raw = data ? (data.final_p5 ?? 0) * 100 : 0;
  const esRaw = data ? (data.expected_shortfall ?? data.final_p5 ?? 0) * 100 : 0;
  const varHasLoss = p5Raw < 0;
  const esHasLoss = esRaw < 0;
  const varPct = data ? Math.abs(p5Raw).toFixed(1) : null;
  const esPct = data ? Math.abs(esRaw).toFixed(1) : null;
  const ruinPct = data
    ? data.ruin_probability != null
      ? (data.ruin_probability * 100).toFixed(1)
      : "0.0"
    : null;
  const lossProbPct = data
    ? Math.round(((data.loss_probability ?? Math.max(0, 1 - (data.positive_prob ?? 1))) * 100))
    : 0;

  const mcAmber  = dark ? C.amber : "#b8860b";
  const mcFc     = dark ? "rgba(232,224,204,0.75)" : "#4a4a4a";
  const mcGc     = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
  const mcLc     = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";

  const amberOuter     = dark ? "rgba(201,168,76,0.08)" : "rgba(184,134,11,0.07)";
  const amberOuterLine = dark ? "rgba(201,168,76,0.35)" : "rgba(184,134,11,0.35)";
  const amberInner     = dark ? "rgba(201,168,76,0.22)" : "rgba(184,134,11,0.18)";
  const amberBright    = dark ? "#c9a84c" : "#b8860b";

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

      {/* Horizon selector + Run button row */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginRight: 4 }}>Horizon</span>
          {YEARS_OPTIONS.map(y => (
            <button
              key={y}
              onClick={() => setSimYears(y)}
              style={{
                padding: "4px 12px", fontSize: 11,
                fontFamily: "Space Mono, monospace",
                background: simYears === y ? "var(--accent)" : "var(--bg3)",
                color: simYears === y ? "#0a0e14" : "var(--text3)",
                border: "0.5px solid var(--border)", borderRadius: 6, cursor: "pointer",
                fontWeight: simYears === y ? 700 : 400,
                transition: "all 0.12s",
              }}
            >{y}yr</button>
          ))}
          {/* Run / Re-run button: small inline when results exist, prominent
              empty-state CTA renders below if no data yet. Click bumps
              runRequested which the run effect listens to. Disabled while
              already loading. */}
          {data && !loading && (
            <button
              onClick={() => setRunRequested(c => c + 1)}
              style={{
                marginLeft: "auto",
                padding: "4px 14px", fontSize: 11,
                fontFamily: "Space Mono, monospace", fontWeight: 700,
                background: "rgba(201,168,76,0.08)",
                color: dark ? C.amber : "#b8860b",
                border: "0.5px solid rgba(201,168,76,0.35)", borderRadius: 6,
                cursor: "pointer", transition: "all 0.12s",
                letterSpacing: 0.5,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.18)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.08)"; }}
            >Re-run →</button>
          )}
        </div>
        <p style={{ fontSize: 11, color: "var(--text3)", margin: 0, lineHeight: 1.55 }}>
          The further into the future you simulate, the wider the range of outcomes. Predictions become less precise over longer horizons.
        </p>
      </div>

      {/* Chart or loader or empty-state Run button */}
      {loading ? (
        <div style={{ height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 26, height: 26, border: "1.5px solid rgba(201,168,76,0.2)", borderTopColor: dark ? C.amber : "#b8860b", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase" }}>Running {simCount} simulations over {simYears}yr...</p>
        </div>
      ) : fetchError ? (
        <ErrorState
          message="Unable to run simulation. The server may be temporarily unavailable."
          onRetry={() => setRetryCount(c => c + 1)}
          minHeight={300}
        />
      ) : !data ? (
        // Empty state: prominent Run button. The user picks a horizon then
        // hits Run; until then we don't auto-fire the simulation so they
        // can't burn a backend call by accident or by tab-switching.
        <div style={{ height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "linear-gradient(180deg, rgba(201,168,76,0.04) 0%, transparent 80%)", borderRadius: 12, border: "0.5px dashed rgba(201,168,76,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dark ? C.amber : "#b8860b"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span style={{ fontSize: 10, letterSpacing: 2.5, color: dark ? C.amber : "#b8860b", textTransform: "uppercase", fontFamily: "Space Mono, monospace", fontWeight: 700 }}>Monte Carlo</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text2)", textAlign: "center", maxWidth: 380, margin: 0, lineHeight: 1.55 }}>
            Project {assets.length || 0} {assets.length === 1 ? "holding" : "holdings"} forward {simYears} {simYears === 1 ? "year" : "years"} across 10,000 simulated paths with Student-t fat tails.
          </p>
          <button
            onClick={() => setRunRequested(c => c + 1)}
            disabled={!assets.length}
            style={{
              padding: "10px 28px", fontSize: 12, fontWeight: 700,
              fontFamily: "Space Mono, monospace",
              background: assets.length ? "var(--accent)" : "var(--bg3)",
              color: assets.length ? "var(--bg)" : "var(--text3)",
              border: "none", borderRadius: 10,
              cursor: assets.length ? "pointer" : "not-allowed",
              letterSpacing: 0.5,
              boxShadow: assets.length ? "0 4px 14px rgba(201,168,76,0.3)" : "none",
              transition: "filter 0.15s, transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => { if (assets.length) { e.currentTarget.style.filter = "brightness(1.08)"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(201,168,76,0.4)"; }}}
            onMouseLeave={e => { if (assets.length) { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(201,168,76,0.3)"; }}}
          >
            {assets.length ? "Run Simulation →" : "Add holdings first"}
          </button>
        </div>
      ) : data ? (
        <motion.div
          // initial={false} is required - do not remove
          initial={false} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>

          {/* Legend */}
          <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
            {[
              { label: "Sample paths",     fill: false, color: dark ? "rgba(232,224,204,0.22)" : "rgba(60,60,60,0.25)", thick: false },
              { label: "5th - 95th pct",   fill: true,  linec: amberOuterLine, bg: amberOuter },
              { label: "25th - 75th pct",  fill: true,  linec: amberOuterLine, bg: amberInner },
              { label: "Median",           fill: false, color: amberBright, thick: true },
              { label: "Breakeven",        fill: false, color: "rgba(59,130,246,0.6)", dashed: true },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {l.fill ? (
                  <div style={{ width: 18, height: 8, borderRadius: 2, background: l.bg, border: `1px solid ${l.linec}` }} />
                ) : (
                  <svg width="18" height="10">
                    <line x1="0" y1="5" x2="18" y2="5"
                      stroke={l.color}
                      strokeWidth={l.thick ? 2.5 : 1}
                      strokeDasharray={l.dashed ? "4 2" : undefined} />
                  </svg>
                )}
                <span style={{ fontSize: 10, color: "var(--text3)" }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/*
            Fan chart structure (back-to-front draw order):
            [0..N-1] sample paths: ~250 hairline traces of individual GBM
                     paths so the user can see actual variance, including
                     losses, instead of just an abstract median + band.
            [N]      p5  outer bottom boundary (no fill)
            [N+1]    p95 outer top boundary (fill="tonexty" → fills p5-p95)
            [N+2]    p25 inner bottom boundary (no fill)
            [N+3]    p75 inner top boundary (fill="tonexty" → fills p25-p75)
            [N+4]    p50 median line (bright amber, no fill)
            [N+5]    breakeven at y=0 (blue dashed)
          */}
          <Plot
            data={[
              // Sample paths: drawn behind the bands so they read as ambient
              // texture. Color chosen to be visible but not compete with the
              // amber bands; opacity stacked across 250 lines reads as a fog.
              ...(((data?.paths_sample as number[][] | undefined) || []).map((pathPct) => ({
                x: xLabels,
                y: pathPct.map((v) => v * 100),
                type: "scatter",
                mode: "lines",
                line: { color: dark ? "rgba(232,224,204,0.07)" : "rgba(60,60,60,0.10)", width: 0.6 },
                hoverinfo: "skip",
                showlegend: false,
              } as any))),
              {
                x: xLabels, y: band("p5"),
                type: "scatter", mode: "lines",
                line: { color: amberOuterLine, width: 1, dash: "dot" },
                hoverinfo: "skip", showlegend: false,
              } as any,
              {
                x: xLabels, y: band("p95"),
                type: "scatter", mode: "lines",
                fill: "tonexty",
                fillcolor: amberOuter,
                line: { color: amberOuterLine, width: 1, dash: "dot" },
                hoverinfo: "skip", showlegend: false,
              } as any,
              {
                x: xLabels, y: band("p25"),
                type: "scatter", mode: "lines",
                line: { color: "transparent", width: 0 },
                hoverinfo: "skip", showlegend: false,
              } as any,
              {
                x: xLabels, y: band("p75"),
                type: "scatter", mode: "lines",
                fill: "tonexty",
                fillcolor: amberInner,
                line: { color: "transparent", width: 0 },
                hoverinfo: "skip", showlegend: false,
              } as any,
              {
                x: xLabels, y: band("p50"),
                type: "scatter", mode: "lines",
                line: { color: amberBright, width: 2.5 },
                hovertemplate: "Median: %{y:.1f}%<extra></extra>",
                showlegend: false,
              } as any,
              {
                x: [xLabels[0] ?? 0, xLabels[xLabels.length - 1] ?? horizonYears],
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
                title: { text: "Years", font: { color: dark ? "rgba(232,224,204,0.25)" : "#7a7a78", size: 9 } },
                gridcolor: mcGc, linecolor: mcLc, tickcolor: "transparent",
                range: [0, horizonYears + (horizonYears * 0.02)],
              },
              yaxis: {
                title: { text: "Gain / Loss", font: { color: dark ? "rgba(232,224,204,0.25)" : "#7a7a78", size: 9 } },
                gridcolor: mcGc, linecolor: mcLc,
                tickcolor: "transparent", tickformat: ".0f", ticksuffix: "%",
              },
              showlegend: false,
              hovermode: "x unified",
              hoverlabel: plotlyHoverlabel(),
            }}
            config={{ displayModeBar: false, responsive: true, scrollZoom: false }}
            style={{ width: "100%", height: isMobile ? 240 : 300 }}
          />

          {/* AI insight summary box */}
          {positiveProb !== null && (
            <motion.div
              // initial={false} is required - do not remove
              initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ marginTop: 16, background: dark ? C.amber3 : "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.15)", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: mcAmber, fontSize: 14, flexShrink: 0, marginTop: 1 }}>◈</span>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.75 }}>
                Based on {simCount} simulations, your portfolio has a{" "}
                <strong style={{ color: mcAmber }}>{positiveProb}% chance of positive returns</strong> over {horizonLabel},
                with a median outcome of{" "}
                <strong style={{ color: Number(p50) >= 0 ? mcAmber : C.red }}>
                  {Number(p50) >= 0 ? "+" : ""}{p50}%
                </strong>.{" "}
                {p5Raw < -15
                  ? `Worst-case downside is ${p5}%. Ensure you can absorb this before it occurs.`
                  : p5Raw < 0
                  ? `Worst 5% of scenarios still see a ${p5}% loss; sequence-of-returns risk applies.`
                  : Number(p95!) > 30
                  ? `Even the worst 5% of scenarios stay positive at +${p5}%, while the best 5% reach +${p95}%.`
                  : `The range from ${p5}% to +${p95}% reflects your portfolio's uncertainty over this period.`}
              </p>
            </motion.div>
          )}

          {/* What Would Your Money Become? */}
          {data && portfolioValue != null && (
            <motion.div
              // initial={false} is required - do not remove
              initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              style={{ marginTop: 20, background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px 8px", borderBottom: "0.5px solid var(--border)" }}>
                <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>
                  What Would Your Money Become in {horizonLabel}?
                </p>
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
                      const fmtDollar = (n: number) => "$" + Math.round(n).toLocaleString();
                      const midRet = (a: number, b: number) => (a + b) / 2;
                      // Use "Worst 5%" / "Best 5%" instead of "Bear Case" /
                      // "Bull Case" so the labels don't promise losses or
                      // gains that the underlying percentile may not deliver
                      // (e.g. an all-VTSAX 30y portfolio's 5th percentile is
                      // often still positive). The row's accent color flips
                      // red/green based on the actual sign below.
                      const scenarios = [
                        { name: "Worst 5%",      prob: "5%",  mult: data.final_p5 ?? 0, neutralColor: C.red },
                        { name: "Below Average", prob: "20%", mult: midRet(data.final_p5 ?? 0, data.final_p25 ?? 0), neutralColor: dark ? "#c9a84c" : "#b8860b" },
                        { name: "Median",        prob: "50%", mult: data.final_p50 ?? 0, neutralColor: "var(--text2)" },
                        { name: "Above Average", prob: "20%", mult: midRet(data.final_p75 ?? 0, data.final_p95 ?? 0), neutralColor: "#7dc98f" },
                        { name: "Best 5%",       prob: "5%",  mult: data.final_p95 ?? 0, neutralColor: C.green },
                      ];
                      return scenarios.map((s, i) => {
                        const ending = pv * (1 + s.mult);
                        const change = ending - pv;
                        const positive = change >= 0;
                        const valColor = positive ? C.green : C.red;
                        // Override the static neutralColor for the worst/best
                        // edges so they read green when the percentile is
                        // genuinely positive (instead of being painted red
                        // out of muscle memory).
                        const scenarioColor = (i === 0 || i === 4)
                          ? valColor
                          : s.neutralColor;
                        const scenarioBg = positive
                          ? "rgba(92,184,138,0.05)"
                          : "rgba(224,92,92,0.06)";
                        const rowBg = (i === 0 || i === 4) ? scenarioBg : (i === 2 ? "transparent" : "rgba(201,168,76,0.04)");
                        return (
                          <tr key={i} style={{ background: rowBg }}>
                            <td>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: scenarioColor, flexShrink: 0 }} />
                                <span style={{ color: scenarioColor, fontWeight: 600 }}>{s.name}</span>
                              </span>
                            </td>
                            <td style={{ fontFamily: "Space Mono, monospace", fontWeight: 700, color: scenarioColor }}>{s.prob}</td>
                            <td style={{ fontFamily: "Space Mono, monospace", color: "var(--text2)" }}>{fmtDollar(pv)}</td>
                            <td style={{ fontFamily: "Space Mono, monospace", fontWeight: 700, color: valColor }}>{fmtDollar(ending)}</td>
                            <td style={{ fontFamily: "Space Mono, monospace", fontWeight: 700, color: valColor }}>
                              {positive ? "+$" : "-$"}{Math.round(Math.abs(change)).toLocaleString()}
                              <span style={{ fontWeight: 500, marginLeft: 6, opacity: 0.75, fontSize: 10 }}>
                                ({positive ? "+" : "-"}{Math.abs(s.mult * 100).toFixed(1)}%)
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Risk Metrics Panel */}
          <motion.div
            // initial={false} is required - do not remove
            initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              {
                label: `Value at Risk (VaR 95%)`,
                value: varHasLoss ? `-${varPct}%` : `+${varPct}%`,
                subtext: varHasLoss
                  ? `Max expected loss over ${horizonLabel} with 95% confidence`
                  : `Even the worst 5% of scenarios end above starting value`,
                color: varHasLoss ? C.red : C.green,
                tooltip: { title: "Value at Risk (VaR 95%)", sections: [{ label: "Plain English", text: `The 5th-percentile outcome over ${horizonLabel}: 95% of simulated scenarios end better than this number, 5% end worse.` }, { label: "Example", text: "VaR of -18% on a $100K portfolio means there is a 95% chance you will not lose more than $18K over this period. A positive VaR means even the worst 5% of paths still gained." }, { label: "What's Good?", text: "When negative, lower (closer to 0) is better; under 15% loss is relatively safe. A positive VaR signals a low-risk portfolio over the chosen horizon, though longer horizons widen the band." }] },
              },
              {
                label: "Expected Shortfall",
                value: esHasLoss ? `-${esPct}%` : `+${esPct}%`,
                subtext: esHasLoss
                  ? "Average loss across the worst 5% of scenarios"
                  : "Average gain across the worst 5% of scenarios (no loss tail)",
                color: esHasLoss ? "#e07a5f" : C.green,
                tooltip: { title: "Expected Shortfall (CVaR)", sections: [{ label: "Plain English", text: "The average outcome across the worst 5% of simulated scenarios. Goes beyond VaR to show how bad things can get when they go wrong, or how shallow the downside actually is." }, { label: "Example", text: "If VaR is -18%, Expected Shortfall might be -25% (the average of all the worst outcomes beyond that threshold). If your VaR is positive, ES will be too, meaning your portfolio has no realistic loss tail at this horizon." }, { label: "What's Good?", text: "When negative, compare to VaR: if ES is much larger, the loss distribution has a fat tail. When positive, the portfolio is well-diversified or holds long enough to outrun short-term drawdowns." }] },
              },
              {
                label: "Probability of Ruin",
                value: ruinPct === "0.0" ? "< 0.1%" : `${ruinPct}%`,
                subtext: "Chance of losing more than 50% of portfolio",
                color: Number(ruinPct) > 5 ? C.red : Number(ruinPct) > 1 ? mcAmber : "var(--text3)",
                tooltip: { title: "Probability of Ruin", sections: [{ label: "Plain English", text: "The percentage of simulated scenarios where the portfolio loses more than 50% of its value. A measure of catastrophic downside risk." }, { label: "Example", text: "Probability of ruin of 2% means in about 1 out of 50 simulated scenarios, the portfolio halves in value." }, { label: "What's Good?", text: "Under 1% is very safe. 1-5% warrants caution. Above 5% suggests the portfolio may be too concentrated or volatile." }] },
              },
            ].map((card, i) => (
              <div key={i} style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ fontSize: 8, letterSpacing: 1.8, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                  {card.label}
                  <InfoModal title={card.tooltip.title} sections={card.tooltip.sections} />
                </p>
                <p style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: card.color, letterSpacing: -0.5, marginBottom: 6 }}>{card.value}</p>
                <p style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.5 }}>{card.subtext}</p>
              </div>
            ))}
          </motion.div>

          {/* What this means for you (Claude insight) */}
          <motion.div
            // initial={false} is required - do not remove
            initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
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
                Based on {data.simulations?.toLocaleString() ?? "10,000"} simulations, there is a{" "}
                <strong style={{ color: mcAmber }}>{positiveProb}% chance of positive returns</strong> over {horizonLabel}{lossProbPct > 0 ? ` (${lossProbPct}% chance of a loss)` : ""}.{" "}
                {varHasLoss ? (
                  <>In the worst 5% of scenarios, the portfolio declines by <strong style={{ color: C.red }}>{varPct}%</strong>.</>
                ) : (
                  <>Even the worst 5% of scenarios still end positive at <strong style={{ color: C.green }}>+{varPct}%</strong>.</>
                )}
              </p>
            )}
          </motion.div>

          {/* Simulation Assumptions Footer */}
          <p style={{ marginTop: 16, fontSize: 10, color: "var(--text3)", lineHeight: 1.6, textAlign: "center" }}>
            Based on {simCount} Monte Carlo simulations using historical volatility and returns over {horizonLabel}. Past performance does not guarantee future results.
          </p>
        </motion.div>
      ) : null}
    </>
  );
});

export default MonteCarloChart;
