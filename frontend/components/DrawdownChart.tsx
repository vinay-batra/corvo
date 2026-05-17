"use client";

import { memo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchDrawdown } from "../lib/api";
import ErrorState from "./ErrorState";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const DrawdownChart = memo(function DrawdownChart({ assets, period }: { assets: any[]; period: string }) {
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
    if (!assets.length) return;
    setLoading(true);
    setFetchError(false);
    fetchDrawdown(assets, period)
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
  // Simulations tab already provides the card chrome + title + tooltip. We
  // used to duplicate both, which made the section look broken (card-in-card
  // + duplicate "Drawdown Chart" header). Now only the chart + the max-loss
  // pill render here.
  return (
    <div style={{ position: "relative" }}>
      {showSpinner && data && <div style={{ position: "absolute", top: -2, right: 0, width: 12, height: 12, border: "1.5px solid var(--border2)", borderTopColor: "var(--red)", borderRadius: "50%", animation: "spin 0.8s linear infinite", zIndex: 2 }} />}
      {data && Array.isArray(data.drawdown) && data.drawdown.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--red)", letterSpacing: 0, fontWeight: 700, background: "rgba(192,57,43,0.08)", border: "0.5px solid rgba(192,57,43,0.25)", borderRadius: 6, padding: "3px 9px" }}>
            Max: {(Math.min(...(data.drawdown as number[]).map((v: number) => v ?? 0)) * 100).toFixed(2)}%
          </span>
        </div>
      )}

      <style>{`@keyframes ddPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
      {loading && !data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 0" }}>
          <div style={{ height: 180, borderRadius: 6, background: "var(--bg3)", animation: "ddPulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: 11, width: "30%", borderRadius: 4, background: "var(--bg3)", animation: "ddPulse 1.5s ease-in-out infinite" }} />
        </div>
      ) : fetchError ? (
        <ErrorState
          message="Unable to load drawdown data. The server may be temporarily unavailable."
          onRetry={() => setRetryCount(c => c + 1)}
          minHeight={220}
        />
      ) : data ? (
        <Plot
          data={[{
            x: data.dates,
            y: data.drawdown,
            type: "scatter",
            mode: "lines",
            name: "Drawdown",
            line: { color: "var(--red)", width: 1.5 },
            fill: "tozeroy",
            fillcolor: "rgba(192,57,43,0.10)",
          }]}
          layout={{
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: dark ? "rgba(232,224,204,0.55)" : "#4a4a4a", family: "Inter", size: 10 },
            margin: { t: 0, b: 32, l: 52, r: 16 },
            xaxis: { gridcolor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.07)", linecolor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)", tickcolor: "transparent" },
            yaxis: { gridcolor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.07)", linecolor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)", tickcolor: "transparent", tickformat: ".1%" },
            showlegend: false,
            hovermode: "x unified",
            hoverlabel: { bgcolor: dark ? "#0a1020" : "#ffffff", bordercolor: "rgba(192,57,43,0.3)", font: { color: dark ? "#e2e8f0" : "#1a1a1a", family: "Inter", size: 11 } },
          }}
          config={{ displayModeBar: false, responsive: true, scrollZoom: false }}
          style={{ width: "100%", height: isMobile ? 200 : 240 }}
        />
      ) : (
        <p style={{ fontSize: 11, color: "var(--text3)", padding: "20px 0", textAlign: "center" }}>Add holdings to see drawdown history.</p>
      )}
    </div>
  );
});

export default DrawdownChart;
