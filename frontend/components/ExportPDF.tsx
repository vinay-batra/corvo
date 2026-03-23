"use client";
import { useState } from "react";
import { motion } from "framer-motion";

const C = { amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", navy: "#0a0e14", cream: "#e8e0cc" };

export default function ExportPDF({ data, assets }: { data: any; assets: any[] }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!data) return;
    setLoading(true);
    try {
      const ret = data.portfolio_return;
      const vol = data.portfolio_volatility;
      const sharpe = ((ret - 0.04) / vol).toFixed(2);
      const dd = (data.max_drawdown * 100).toFixed(2);
      const weights = data.weights || assets.map(a => a.weight);
      const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Courier New',monospace;background:#0a0e14;color:#e8e0cc;padding:48px;min-height:100vh}
        .header{border-bottom:1px solid rgba(201,168,76,0.3);padding-bottom:24px;margin-bottom:32px}
        .brand{font-size:28px;font-weight:900;letter-spacing:8px;color:#c9a84c}
        .subtitle{font-size:10px;letter-spacing:4px;color:rgba(232,224,204,0.4);margin-top:4px;text-transform:uppercase}
        .date{font-size:10px;color:rgba(232,224,204,0.3);letter-spacing:2px;margin-top:16px}
        .section{margin-bottom:32px}
        .section-title{font-size:9px;letter-spacing:4px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:8px}
        .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .metric{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:16px}
        .metric-value{font-size:22px;font-weight:700;letter-spacing:-1px}
        .metric-label{font-size:9px;letter-spacing:3px;color:rgba(232,224,204,0.4);margin-top:4px;text-transform:uppercase}
        .weights{display:flex;flex-direction:column;gap:10px}
        .weight-row{display:flex;align-items:center;gap:16px}
        .weight-ticker{font-size:12px;color:#c9a84c;width:60px;letter-spacing:1px}
        .weight-bar-bg{flex:1;height:3px;background:rgba(255,255,255,0.06);border-radius:2px}
        .weight-bar{height:100%;background:#c9a84c;border-radius:2px}
        .weight-pct{font-size:13px;font-weight:700;width:50px;text-align:right;color:#c9a84c}
        .footer{margin-top:48px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);font-size:9px;color:rgba(232,224,204,0.25);letter-spacing:2px}
        .amber{color:#c9a84c} .red{color:#e05c5c}
      </style></head><body>
      <div class="header">
        <div class="brand">CORVO</div>
        <div class="subtitle">Portfolio Intelligence Report</div>
        <div class="date">Generated: ${now}</div>
      </div>
      <div class="section">
        <div class="section-title">Portfolio Composition</div>
        <div class="weights">
          ${assets.map((a, i) => `<div class="weight-row"><span class="weight-ticker">${a.ticker}</span><div class="weight-bar-bg"><div class="weight-bar" style="width:${(weights[i]*100).toFixed(1)}%"></div></div><span class="weight-pct">${(weights[i]*100).toFixed(1)}%</span></div>`).join("")}
        </div>
      </div>
      <div class="section">
        <div class="section-title">Performance Metrics</div>
        <div class="metrics">
          <div class="metric"><div class="metric-value ${ret>=0?"amber":"red"}">${ret>=0?"+":""}${(ret*100).toFixed(2)}%</div><div class="metric-label">Return</div></div>
          <div class="metric"><div class="metric-value" style="color:#e8e0cc">${(vol*100).toFixed(2)}%</div><div class="metric-label">Volatility</div></div>
          <div class="metric"><div class="metric-value ${Number(sharpe)>=1?"amber":"red"}">${sharpe}</div><div class="metric-label">Sharpe Ratio</div></div>
          <div class="metric"><div class="metric-value red">${dd}%</div><div class="metric-label">Max Drawdown</div></div>
        </div>
      </div>
      <div class="footer">CORVO · Portfolio Intelligence · Data sourced from Yahoo Finance · Not financial advice.</div>
      </body></html>`;

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) win.onload = () => setTimeout(() => win.print(), 500);
      URL.revokeObjectURL(url);
    } finally { setLoading(false); }
  };

  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleExport} disabled={!data || loading}
      style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 8, color: C.amber, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", cursor: !data||loading ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: !data ? 0.4 : 1 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {loading
        ? <><div style={{ width: 11, height: 11, border: "1.5px solid rgba(201,168,76,0.3)", borderTopColor: C.amber, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Generating...</>
        : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export PDF</>}
    </motion.button>
  );
}