"use client";
import { useEffect, useState, memo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { plotlyHoverlabel } from "../lib/theme";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const BENCHMARK_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500", "^IXIC": "Nasdaq", "^DJI": "Dow Jones",
  "^RUT": "Russell 2000", "SPY": "SPY ETF", "QQQ": "QQQ ETF", "GLD": "Gold",
};

const SAVED_PALETTE = ["#5cb88a", "#5b9cf6", "#e05c5c", "#a78bfa", "#fb923c", "#38bdf8", "#f472b6"];

export interface SavedPortfolioLine {
  id: string;
  name: string;
  color: string;
  dates: string[];
  cumulative: number[];
  visible: boolean;
}

interface Props {
  data: any;
  period?: string;
  savedLines?: SavedPortfolioLine[];
  onSavedLinesChange?: (lines: SavedPortfolioLine[]) => void;
  customDateRange?: { start: string; end: string } | null;
  onCustomDateChange?: (range: { start: string; end: string } | null) => void;
  benchmarkOverride?: { ticker: string; cumulative: number[] };
  onExplainDrawdown?: (date: string) => void;
  portfolioValue?: number;
}

// Compute the date at which the max drawdown trough occurs
function getMaxDrawdownDate(dates: string[], cumulative: number[]): string | null {
  if (!dates.length || !cumulative.length) return null;
  let peak = cumulative[0];
  let maxDD = 0;
  let ddIdx = 0;
  for (let i = 1; i < cumulative.length; i++) {
    if (cumulative[i] > peak) peak = cumulative[i];
    const dd = peak > -1 ? (cumulative[i] - peak) / (1 + peak) : 0;
    if (dd < maxDD) { maxDD = dd; ddIdx = i; }
  }
  return maxDD < -0.005 ? dates[ddIdx] : null;
}

// Filter arrays to a custom date range
function filterByDateRange(
  dates: string[], cumulative: number[], benchCum: number[],
  start: string, end: string
): { dates: string[]; cumulative: number[]; benchCum: number[] } {
  const filtered = { dates: [] as string[], cumulative: [] as number[], benchCum: [] as number[] };
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] >= start && dates[i] <= end) {
      filtered.dates.push(dates[i]);
      filtered.cumulative.push(cumulative[i]);
      if (benchCum.length > i) filtered.benchCum.push(benchCum[i]);
    }
  }
  // Re-base cumulative returns to 0 from the new start
  if (filtered.cumulative.length > 0) {
    const base = filtered.cumulative[0];
    filtered.cumulative = filtered.cumulative.map(v => v - base);
    if (filtered.benchCum.length > 0) {
      const bBase = filtered.benchCum[0];
      filtered.benchCum = filtered.benchCum.map(v => v - bBase);
    }
  }
  return filtered;
}

const PerformanceChart = memo(function PerformanceChart({ data, period = "1y", savedLines = [], onSavedLinesChange, customDateRange, onCustomDateChange, benchmarkOverride, onExplainDrawdown, portfolioValue }: Props) {
  const [dark, setDark] = useState(true);
  const [showCustomPicker, setShowCustomPicker] = useState(!!customDateRange);
  const [localStart, setLocalStart] = useState(customDateRange?.start || "");
  const [localEnd, setLocalEnd] = useState(customDateRange?.end || "");
  const [showDollars, setShowDollars] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setShowCustomPicker(!!customDateRange);
    setLocalStart(customDateRange?.start || "");
    setLocalEnd(customDateRange?.end || "");
  }, [customDateRange]);

  const amber = dark ? "#c9a84c" : "#b8860b";
  const fc = dark ? "rgba(232,224,204,0.35)" : "#4a4a4a";
  const gc = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.07)";
  const lc = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.1)";
  const legendFg = dark ? "rgba(232,224,204,0.3)" : "#6b6b68";

  const activeBenchTicker = benchmarkOverride?.ticker ?? data.benchmark_ticker;
  const benchLabel = BENCHMARK_LABELS[activeBenchTicker] ?? activeBenchTicker ?? "Benchmark";

  let portfolioY: number[] = data.portfolio_cumulative || data.growth || [];
  let benchmarkY: number[] = benchmarkOverride?.cumulative ?? data.benchmark_cumulative ?? data.benchmark ?? [];
  let chartDates: string[] = data.dates || [];

  // Apply custom date range filter
  if (customDateRange && localStart && localEnd && chartDates.length > 0) {
    const filtered = filterByDateRange(chartDates, portfolioY, benchmarkY, localStart, localEnd);
    chartDates = filtered.dates;
    portfolioY = filtered.cumulative;
    benchmarkY = filtered.benchCum;
  }

  // Max drawdown annotation
  const ddDate = getMaxDrawdownDate(chartDates, portfolioY);

  const toggleSavedLine = (id: string) => {
    if (!onSavedLinesChange) return;
    onSavedLinesChange(savedLines.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  // Dollar mode: convert cumulative decimal returns to absolute dollar values.
  //
  // The user's portfolioValue is the value of the portfolio TODAY (what they
  // typed into the sidebar input). The previous version treated it as the
  // value at the *start* of the lookback window, then grew it forward by the
  // cumulative return - so a $50k input with 25% YTD return would display
  // $62.5k at the right edge of the chart. That's exactly what the user
  // flagged: "how is it saying my portfolio is 62k when its 50k". The chart
  // and the sidebar input were disagreeing on what $50k means.
  //
  // Fix: anchor the right-edge (today) data point to portfolioValue. Derive
  // the implicit start-of-period value by walking the cumulative return
  // backwards: start = today / (1 + cumulative_return_at_today). Everything
  // else gets multiplied by that start so the line ends exactly at
  // portfolioValue. Benchmark and saved lines anchor to the same implicit
  // start so the comparison is apples-to-apples ("if you'd put $start into
  // S&P at the same date").
  const canShowDollars = showDollars && portfolioValue != null && portfolioValue > 0;
  const lastPortRet = portfolioY.length > 0 ? portfolioY[portfolioY.length - 1] : 0;
  const periodStartVal = canShowDollars && 1 + lastPortRet > 0.01
    ? portfolioValue! / (1 + lastPortRet)
    : portfolioValue ?? 0;
  const plotPortfolioY = canShowDollars ? portfolioY.map(v => periodStartVal * (1 + v)) : portfolioY;
  const plotBenchmarkY = canShowDollars ? benchmarkY.map(v => periodStartVal * (1 + v)) : benchmarkY;

  // Build Plotly traces
  const traces: any[] = [
    {
      x: chartDates, y: plotPortfolioY, type: "scatter", mode: "lines", name: "Portfolio",
      line: { color: amber, width: 2 },
      fill: "tozeroy", fillcolor: dark ? "rgba(201,168,76,0.05)" : "rgba(184,134,11,0.06)",
      yhoverformat: canShowDollars ? "$,.0f" : ".1%",
    },
    {
      x: chartDates, y: plotBenchmarkY, type: "scatter", mode: "lines", name: benchLabel,
      line: { color: fc, width: 1.5, dash: "dot" },
      fill: "tozeroy", fillcolor: "rgba(0,0,0,0.02)",
      yhoverformat: canShowDollars ? "$,.0f" : ".1%",
    },
    // Saved portfolio lines
    ...savedLines
      .filter(l => l.visible && l.dates.length > 0)
      .map(l => ({
        x: customDateRange && localStart && localEnd
          ? l.dates.filter(d => d >= localStart && d <= localEnd)
          : l.dates,
        y: (() => {
          const ys = customDateRange && localStart && localEnd
            ? l.cumulative.filter((_, i) => l.dates[i] >= localStart && l.dates[i] <= localEnd)
            : l.cumulative;
          if (!ys.length) return ys;
          const base = ys[0];
          const rebased = ys.map(v => v - base);
          // Saved-portfolio overlay anchors to the same implicit start value
          // as the main portfolio + benchmark lines, so a comparison reads as
          // "if you'd allocated $start into this saved portfolio at the same
          // date" rather than "this saved portfolio also happens to be worth
          // $50k today" (which would be misleading).
          return canShowDollars ? rebased.map(v => periodStartVal * (1 + v)) : rebased;
        })(),
        type: "scatter", mode: "lines", name: l.name,
        line: { color: l.color, width: 1.5, dash: "dashdot" },
        opacity: 0.75,
        yhoverformat: canShowDollars ? "$,.0f" : ".1%",
      })),
  ];

  // Shapes: drawdown annotation
  const shapes: any[] = ddDate ? [{
    type: "line",
    x0: ddDate, x1: ddDate,
    y0: 0, y1: 1,
    yref: "paper",
    line: { color: "#e05c5c", width: 1, dash: "dash" },
    opacity: 0.5,
  }] : [];

  // Annotations: drawdown label
  const annotations: any[] = ddDate ? [{
    x: ddDate,
    y: 1,
    yref: "paper",
    text: "Max Drawdown",
    showarrow: false,
    xanchor: "left",
    font: { size: 9, color: "#e05c5c" },
    bgcolor: "rgba(224,92,92,0.08)",
    borderpad: 2,
    xshift: 4,
    opacity: 0.85,
  }] : [];

  const handleApplyCustomRange = () => {
    if (localStart && localEnd && localStart <= localEnd) {
      onCustomDateChange?.({ start: localStart, end: localEnd });
    }
  };

  const handleClearCustomRange = () => {
    setLocalStart(""); setLocalEnd("");
    setShowCustomPicker(false);
    onCustomDateChange?.(null);
  };

  return (
    <motion.div
      // initial={false} is required - do not remove
      initial={false} transition={{ duration: 0.5 }} style={{ overflow: "hidden", width: "100%", minWidth: 0 }}>
      {/* The chart used to have its own header row above the Plot (legend +
          saved-line toggles + %/$ + Custom range). That row stacked under the
          parent Card's header (period buttons + benchmark + What-If) and made
          the top right feel like a wall of controls, plus left the Max
          drawdown "Why?" chip orphaned bottom-left. v0.42 redesign moved
          everything chart-internal into a single footer row below the Plot:
          legend / %/$ / Custom range on the left, Max drawdown insight on the
          right. The Card header stays clean (Performance title + period +
          benchmark + What-If). */}

      <Plot
        data={traces}
        layout={{
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: fc, family: "Inter", size: 10 },
          margin: { t: 0, b: 32, l: isMobile ? 44 : 48, r: 12 },
          xaxis: {
            gridcolor: gc, linecolor: lc, tickcolor: "transparent",
            ...(isMobile && chartDates.length > 0 ? {
              autorange: false,
              range: [chartDates[0], chartDates[chartDates.length - 1]],
              type: "date",
              dtick: period === "6mo" ? "M1" : period === "2y" ? "M3" : period === "5y" ? "M12" : "M2",
              tickformat: period === "5y" ? "%Y" : "%b %Y",
            } : {}),
          },
          yaxis: {
            gridcolor: gc, linecolor: lc, tickcolor: "transparent",
            tickformat: canShowDollars ? "$,.0f" : ".0%",
            ...(isMobile ? {
              autorange: true,
              // dtick in decimal units (data is decimal: 0.15 = 15%)
              // user-requested intervals: 6M→5%, 1Y→10%, 2Y→10%, 5Y→20%
              dtick: canShowDollars ? undefined : (period === "5y" ? 0.20 : period === "6mo" ? 0.05 : 0.10),
            } : {}),
          },
          showlegend: false,
          hovermode: "x unified",
          hoverlabel: plotlyHoverlabel({ borderColor: amber + "88" }),
          shapes,
          annotations,
        }}
        config={{ displayModeBar: false, responsive: true, scrollZoom: false }}
        style={{ width: "100%", minWidth: 0, height: isMobile ? 280 : 240 }}
        useResizeHandler
      />

      {/* Unified footer row: legend + saved lines + %/$ + Custom range on
          the left, Max drawdown insight on the right. Wraps cleanly on
          narrow viewports because every child is in a single flex row with
          flexWrap. */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 14, marginTop: 12, paddingTop: 10, borderTop: "0.5px solid var(--border)",
        flexWrap: "wrap",
      }}>
        {/* LEFT cluster: legend swatches + saved-line toggles + %/$ + Custom range */}
        <div style={{ display: "flex", gap: 12, fontSize: 10, color: legendFg, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 2, background: amber, display: "inline-block", borderRadius: 1 }} />
            Portfolio
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {/* Dotted swatch matches the benchmark line's `dash: "dot"`
                style on the chart so the legend reads as the same line. */}
            <svg width={14} height={4} aria-hidden style={{ display: "inline-block" }}>
              <line x1="0" y1="2" x2="14" y2="2" stroke={fc} strokeWidth={1.5} strokeDasharray="2 2" strokeLinecap="round" />
            </svg>
            {benchLabel}
          </span>
          {savedLines.map(l => (
            <button key={l.id} onClick={() => toggleSavedLine(l.id)}
              title={`Toggle ${l.name}`}
              style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 10, cursor: "pointer",
                background: l.visible ? "rgba(255,255,255,0.04)" : "transparent",
                border: `0.5px solid ${l.visible ? l.color + "55" : "var(--border)"}`,
                borderRadius: 5, padding: "2px 8px", color: l.visible ? l.color : legendFg,
                transition: "all 0.15s",
              }}>
              <span style={{ width: 12, height: 2, background: l.visible ? l.color : "transparent", border: l.visible ? "none" : `1px solid ${legendFg}`, display: "inline-block", borderRadius: 1 }} />
              {l.name}
            </button>
          ))}
          {/* $ / % view toggle - only when portfolio value is known */}
          {portfolioValue != null && portfolioValue > 0 && (
            <div style={{ display: "flex", borderRadius: 5, overflow: "hidden", border: "0.5px solid var(--border)" }}>
              {(["%", "$"] as const).map(mode => (
                <button key={mode}
                  onClick={() => setShowDollars(mode === "$")}
                  style={{
                    padding: "2px 8px", fontSize: 9, cursor: "pointer", border: "none",
                    background: (mode === "$") === showDollars ? "var(--accent)" : "transparent",
                    color: (mode === "$") === showDollars ? "var(--bg)" : legendFg,
                    fontFamily: "var(--font-mono)", fontWeight: 700, transition: "all 0.15s",
                  }}>
                  {mode}
                </button>
              ))}
            </div>
          )}
          {/* Custom date range toggle */}
          {onCustomDateChange && (
            <button
              onClick={() => setShowCustomPicker(p => !p)}
              style={{
                padding: "2px 8px", fontSize: 9, borderRadius: 5,
                border: `0.5px solid ${customDateRange ? "rgba(184,134,11,0.4)" : "var(--border)"}`,
                background: customDateRange ? "rgba(184,134,11,0.08)" : "transparent",
                color: customDateRange ? "var(--accent)" : legendFg,
                cursor: "pointer", transition: "all 0.15s",
              }}>
              {customDateRange ? "Custom: on" : "Custom range"}
            </button>
          )}
        </div>

        {/* RIGHT cluster: Max drawdown insight chip + Why button. Only renders
            when there's a real max-drawdown date to annotate - if the chart
            doesn't have one yet (still loading), the left cluster expands to
            fill the row. */}
        {ddDate && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", background: "rgba(224,92,92,0.06)", border: "0.5px solid rgba(224,92,92,0.25)", borderRadius: 6 }}>
              <div style={{ width: 12, height: 1, borderTop: "1.5px dashed var(--red)", opacity: 0.7 }} />
              <span style={{ fontSize: 10, color: "var(--red)", fontWeight: 600 }}>Max drawdown · {ddDate}</span>
            </div>
            {onExplainDrawdown && (
              <button
                onClick={() => onExplainDrawdown(ddDate)}
                title="Ask Corvo what drove this drawdown"
                style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", background: "rgba(184,134,11,0.06)", border: "0.5px solid rgba(184,134,11,0.3)", borderRadius: 6, padding: "3px 10px", cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "rgba(184,134,11,0.14)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(184,134,11,0.3)"; e.currentTarget.style.background = "rgba(184,134,11,0.06)"; }}
              >
                Why?
              </button>
            )}
          </div>
        )}
      </div>

      {/* Custom date picker - opens below the footer when the Custom range
          toggle is active. Inline above the chart would push the chart down
          on every toggle and feel jumpy; below it keeps the chart steady. */}
      {showCustomPicker && onCustomDateChange && (
        <motion.div
          // initial={false} is required - do not remove
          initial={false}
          style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap", padding: "10px 12px", background: "rgba(184,134,11,0.04)", border: "0.5px solid rgba(184,134,11,0.15)", borderRadius: 8 }}>
          <span style={{ fontSize: 10, color: legendFg, flexShrink: 0 }}>From</span>
          <input type="date" value={localStart} onChange={e => {
            const v = e.target.value;
            setLocalStart(v);
            if (v && localEnd && v <= localEnd) onCustomDateChange?.({ start: v, end: localEnd });
          }}
            style={{ padding: "4px 8px", fontSize: 11, background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none", cursor: "pointer" }} />
          <span style={{ fontSize: 10, color: legendFg, flexShrink: 0 }}>to</span>
          <input type="date" value={localEnd} onChange={e => {
            const v = e.target.value;
            setLocalEnd(v);
            if (localStart && v && localStart <= v) onCustomDateChange?.({ start: localStart, end: v });
          }}
            style={{ padding: "4px 8px", fontSize: 11, background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none", cursor: "pointer" }} />
          {customDateRange && (
            <button onClick={handleClearCustomRange}
              style={{ padding: "4px 10px", fontSize: 11, background: "transparent", border: "0.5px solid var(--border)", borderRadius: 6, color: "var(--text3)", cursor: "pointer" }}>
              Clear
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
});

export default PerformanceChart;
