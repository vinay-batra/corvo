"use client";
import { useEffect, useState, memo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
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

const PerformanceChart = memo(function PerformanceChart({ data, period = "1y", savedLines = [], onSavedLinesChange, customDateRange, onCustomDateChange, benchmarkOverride }: Props) {
  const [dark, setDark] = useState(true);
  const [showCustomPicker, setShowCustomPicker] = useState(!!customDateRange);
  const [localStart, setLocalStart] = useState(customDateRange?.start || "");
  const [localEnd, setLocalEnd] = useState(customDateRange?.end || "");
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

  // Build Plotly traces
  const traces: any[] = [
    {
      x: chartDates, y: portfolioY, type: "scatter", mode: "lines", name: "Portfolio",
      line: { color: amber, width: 2 },
      fill: "tozeroy", fillcolor: dark ? "rgba(201,168,76,0.05)" : "rgba(184,134,11,0.06)",
    },
    {
      x: chartDates, y: benchmarkY, type: "scatter", mode: "lines", name: benchLabel,
      line: { color: fc, width: 1.5, dash: "dot" },
      fill: "tozeroy", fillcolor: "rgba(0,0,0,0.02)",
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
          return ys.map(v => v - base);
        })(),
        type: "scatter", mode: "lines", name: l.name,
        line: { color: l.color, width: 1.5, dash: "dashdot" },
        opacity: 0.75,
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
    <motion.div initial={false} transition={{ duration: 0.5 }} style={{ overflow: "hidden", width: "100%", minWidth: 0 }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontSize: 9, letterSpacing: 2.5, color: legendFg, textTransform: "uppercase" }}>
          Performance vs {benchLabel}
        </p>
        <div style={{ display: "flex", gap: 12, fontSize: 10, color: legendFg, alignItems: "center", flexWrap: "wrap" }}>
          {/* Saved line toggles */}
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
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 2, background: amber, display: "inline-block", borderRadius: 1 }} />
            Portfolio
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 2, background: fc, display: "inline-block", borderRadius: 1 }} />
            {benchLabel}
          </span>
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
      </div>

      {/* Custom date picker */}
      {showCustomPicker && onCustomDateChange && (
        <motion.div initial={false}
          style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap", padding: "10px 12px", background: "rgba(184,134,11,0.04)", border: "0.5px solid rgba(184,134,11,0.15)", borderRadius: 8 }}>
          <span style={{ fontSize: 10, color: legendFg, flexShrink: 0 }}>From</span>
          <input type="date" value={localStart} onChange={e => setLocalStart(e.target.value)}
            style={{ padding: "4px 8px", fontSize: 11, background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none", cursor: "pointer" }} />
          <span style={{ fontSize: 10, color: legendFg, flexShrink: 0 }}>to</span>
          <input type="date" value={localEnd} onChange={e => setLocalEnd(e.target.value)}
            style={{ padding: "4px 8px", fontSize: 11, background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none", cursor: "pointer" }} />
          <button onClick={handleApplyCustomRange}
            disabled={!localStart || !localEnd || localStart > localEnd}
            style={{ padding: "4px 12px", fontSize: 11, fontWeight: 600, background: "var(--accent)", border: "none", borderRadius: 6, color: "#0a0e14", cursor: (!localStart || !localEnd || localStart > localEnd) ? "not-allowed" : "pointer", opacity: (!localStart || !localEnd || localStart > localEnd) ? 0.5 : 1 }}>
            Apply
          </button>
          {customDateRange && (
            <button onClick={handleClearCustomRange}
              style={{ padding: "4px 10px", fontSize: 11, background: "transparent", border: "0.5px solid var(--border)", borderRadius: 6, color: "var(--text3)", cursor: "pointer" }}>
              Clear
            </button>
          )}
        </motion.div>
      )}

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
              dtick: period === "6mo" ? "M1" : period === "2y" ? "M3" : period === "5y" ? "M6" : "M2",
              tickformat: "%b %y",
            } : {}),
          },
          yaxis: {
            gridcolor: gc, linecolor: lc, tickcolor: "transparent", tickformat: ".0%",
            ...(isMobile ? { dtick: (period === "2y" || period === "5y") ? 0.10 : 0.05 } : {}),
          },
          showlegend: false,
          hovermode: "x unified",
          hoverlabel: { bgcolor: "#0d1117", bordercolor: amber + "88", font: { color: "#e8e0cc", family: "Inter", size: 11 } },
          shapes,
          annotations,
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", minWidth: 0, height: isMobile ? 280 : 240 }}
        useResizeHandler
      />

      {/* Drawdown hint */}
      {ddDate && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <div style={{ width: 14, height: 1, borderTop: "1.5px dashed #e05c5c", opacity: 0.6 }} />
          <span style={{ fontSize: 9, color: "#e05c5c", opacity: 0.7 }}>
            Max drawdown: {ddDate}
          </span>
        </div>
      )}
    </motion.div>
  );
});

export default PerformanceChart;
