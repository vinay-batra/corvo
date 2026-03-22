"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ExportPDFProps {
  data: any;
  assets: any[];
  period: string;
}

export default function ExportPDF({ data, assets, period }: ExportPDFProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const ret = data.portfolio_return;
      const vol = data.portfolio_volatility;
      const sharpe = ((ret - 0.04) / vol).toFixed(2);
      const dd = (data.max_drawdown * 100).toFixed(2);
      const tickers = assets.map(a => a.ticker);
      const weights = data.weights || assets.map(a => a.weight);
      const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; background: #020408; color: #e2e8f0; padding: 48px; min-height: 100vh; }
  .header { border-bottom: 1px solid rgba(0,255,160,0.3); padding-bottom: 24px; margin-bottom: 32px; }
  .brand { font-size: 28px; font-weight: 900; letter-spacing: 8px; color: #00ffa0; }
  .brand span { color: rgba(255,255,255,0.25); }
  .subtitle { font-size: 10px; letter-spacing: 4px; color: rgba(226,232,240,0.4); margin-top: 4px; text-transform: uppercase; }
  .date { font-size: 10px; color: rgba(226,232,240,0.4); letter-spacing: 2px; margin-top: 20px; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 9px; letter-spacing: 4px; color: rgba(226,232,240,0.4); text-transform: uppercase; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .metric { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; }
  .metric-value { font-size: 24px; font-weight: 700; letter-spacing: -1px; }
  .metric-label { font-size: 9px; letter-spacing: 3px; color: rgba(226,232,240,0.4); margin-top: 4px; text-transform: uppercase; }
  .weights { display: flex; flex-direction: column; gap: 10px; }
  .weight-row { display: flex; align-items: center; gap: 16px; }
  .weight-ticker { font-size: 12px; color: #00ffa0; width: 60px; letter-spacing: 1px; }
  .weight-bar-bg { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; }
  .weight-bar { height: 100%; background: linear-gradient(90deg, #00ffa0, #00d4ff); border-radius: 2px; }
  .weight-pct { font-size: 13px; font-weight: 700; width: 50px; text-align: right; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 9px; color: rgba(226,232,240,0.3); letter-spacing: 2px; }
  .green { color: #00ffa0; }
  .red { color: #ff4060; }
  .cyan { color: #00d4ff; }
</style>
</head>
<body>
<div class="header">
  <div class="brand">ALPHA<span>i</span></div>
  <div class="subtitle">Portfolio Intelligence Platform</div>
  <div class="date">Report Generated: ${now} · Period: ${period.toUpperCase()}</div>
</div>

<div class="section">
  <div class="section-title">Portfolio Composition</div>
  <div class="weights">
    ${tickers.map((t: string, i: number) => `
      <div class="weight-row">
        <span class="weight-ticker">${t}</span>
        <div class="weight-bar-bg"><div class="weight-bar" style="width:${(weights[i] * 100).toFixed(1)}%"></div></div>
        <span class="weight-pct">${(weights[i] * 100).toFixed(1)}%</span>
      </div>
    `).join("")}
  </div>
</div>

<div class="section">
  <div class="section-title">Performance Metrics</div>
  <div class="metrics">
    <div class="metric">
      <div class="metric-value ${ret >= 0 ? "green" : "red"}">${(ret * 100).toFixed(2)}%</div>
      <div class="metric-label">Annual Return</div>
    </div>
    <div class="metric">
      <div class="metric-value cyan">${(vol * 100).toFixed(2)}%</div>
      <div class="metric-label">Volatility</div>
    </div>
    <div class="metric">
      <div class="metric-value ${Number(sharpe) >= 1 ? "green" : "red"}">${sharpe}</div>
      <div class="metric-label">Sharpe Ratio</div>
    </div>
    <div class="metric">
      <div class="metric-value red">${dd}%</div>
      <div class="metric-label">Max Drawdown</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Risk Analysis</div>
  <div class="metrics" style="grid-template-columns: repeat(3,1fr)">
    <div class="metric">
      <div class="metric-value">${Number(sharpe) > 2 ? "Excellent" : Number(sharpe) > 1 ? "Good" : Number(sharpe) > 0.5 ? "Fair" : "Poor"}</div>
      <div class="metric-label">Sharpe Rating</div>
    </div>
    <div class="metric">
      <div class="metric-value">${Math.abs(Number(dd)) < 10 ? "Low" : Math.abs(Number(dd)) < 20 ? "Moderate" : "High"}</div>
      <div class="metric-label">Drawdown Risk</div>
    </div>
    <div class="metric">
      <div class="metric-value">${tickers.length}</div>
      <div class="metric-label">Holdings</div>
    </div>
  </div>
</div>

<div class="footer">
  ALPHAi · Portfolio Intelligence Platform · Data sourced from Yahoo Finance · For informational purposes only. Not financial advice.
</div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        win.onload = () => {
          setTimeout(() => { win.print(); }, 500);
        };
      }
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleExport}
      disabled={loading}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 18px",
        background: loading ? "rgba(0,255,160,0.05)" : "rgba(0,255,160,0.08)",
        border: "1px solid rgba(0,255,160,0.25)",
        borderRadius: 8,
        color: "var(--green)",
        fontSize: 10,
        fontFamily: "var(--font-display)",
        letterSpacing: 2,
        textTransform: "uppercase" as const,
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.2s",
      }}
    >
      {loading ? (
        <>
          <div style={{ width: 12, height: 12, border: "1.5px solid rgba(0,255,160,0.3)", borderTopColor: "var(--green)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Generating...
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export PDF
        </>
      )}
    </motion.button>
  );
}
