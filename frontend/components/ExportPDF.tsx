"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = { amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", navy: "#0a0e14", cream: "#e8e0cc", cream3: "rgba(232,224,204,0.35)" };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props { data: any; assets: any[]; goals?: any; }

// Shared CSS for both reports — dark theme that actually prints correctly
const PRINT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    background: #0a0e14 !important;
    color: #e8e0cc !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  @page { margin: 0; size: A4; }
  @media print {
    html, body { background: #0a0e14 !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
  body { font-family: 'Courier New', monospace; padding: 48px; line-height: 1.6; }
  .amber { color: #c9a84c !important; }
  .red { color: #e05c5c !important; }
  .green { color: #5cb88a !important; }
  .dim { color: rgba(232,224,204,0.4) !important; }
`;

export default function ExportPDF({ data, assets, goals }: Props) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"ai" | "static">("ai");
  const [open, setOpen] = useState(false);

  const buildStaticReport = () => {
    const ret = data.portfolio_return;
    const vol = data.portfolio_volatility;
    const sharpe = ((ret - 0.04) / vol).toFixed(2);
    const dd = (data.max_drawdown * 100).toFixed(2);
    const weights = data.weights || assets.map(a => a.weight);
    const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const indRet = data.individual_returns || {};

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      ${PRINT_CSS}
      .header { border-bottom: 2px solid #c9a84c; padding-bottom: 20px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end; }
      .brand { font-size: 30px; font-weight: 900; letter-spacing: 10px; color: #c9a84c; }
      .subtitle { font-size: 9px; letter-spacing: 4px; color: rgba(232,224,204,0.4); margin-top: 4px; text-transform: uppercase; }
      .date { font-size: 10px; color: rgba(232,224,204,0.3); letter-spacing: 1px; }
      .section { margin-bottom: 28px; }
      .section-title { font-size: 8px; letter-spacing: 4px; color: #c9a84c; text-transform: uppercase; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px; }
      .metrics { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
      .metric { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px; }
      .metric-value { font-size: 22px; font-weight: 700; letter-spacing: -1px; }
      .metric-label { font-size: 8px; letter-spacing: 3px; color: rgba(232,224,204,0.4); margin-top: 4px; text-transform: uppercase; }
      .weight-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); }
      .weight-ticker { font-size: 12px; color: #c9a84c; width: 80px; font-weight: 700; letter-spacing: 1px; }
      .weight-bar-bg { flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; }
      .weight-bar { height: 100%; background: #c9a84c; border-radius: 2px; }
      .weight-pct { font-size: 12px; font-weight: 700; width: 48px; text-align: right; color: rgba(232,224,204,0.7); }
      .stock-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
      .stock-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 7px; padding: 12px; }
      .stock-ticker { font-size: 11px; color: #c9a84c; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; }
      .stock-ret { font-size: 16px; font-weight: 700; }
      .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; justify-content: space-between; align-items: center; }
      .footer-brand { font-size: 11px; color: #c9a84c; letter-spacing: 3px; }
      .footer-note { font-size: 8px; color: rgba(232,224,204,0.2); letter-spacing: 1px; }
    </style></head><body>
    <div class="header">
      <div>
        <div class="brand">CORVO</div>
        <div class="subtitle">Portfolio Intelligence Report</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:rgba(232,224,204,0.6);margin-bottom:3px">${assets.map(a => a.ticker).join(" · ")}</div>
        <div class="date">${now}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Performance Metrics</div>
      <div class="metrics">
        <div class="metric">
          <div class="metric-value ${ret >= 0 ? "amber" : "red"}">${ret >= 0 ? "+" : ""}${(ret * 100).toFixed(2)}%</div>
          <div class="metric-label">Annualized Return</div>
        </div>
        <div class="metric">
          <div class="metric-value" style="color:#e8e0cc">${(vol * 100).toFixed(2)}%</div>
          <div class="metric-label">Volatility</div>
        </div>
        <div class="metric">
          <div class="metric-value ${Number(sharpe) >= 1 ? "green" : Number(sharpe) >= 0 ? "amber" : "red"}">${sharpe}</div>
          <div class="metric-label">Sharpe Ratio</div>
        </div>
        <div class="metric">
          <div class="metric-value red">-${Math.abs(Number(dd))}%</div>
          <div class="metric-label">Max Drawdown</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Portfolio Composition</div>
      ${assets.map((a, i) => `
        <div class="weight-row">
          <span class="weight-ticker">${a.ticker}</span>
          <div class="weight-bar-bg"><div class="weight-bar" style="width:${((weights[i] || a.weight) * 100).toFixed(0)}%"></div></div>
          <span class="weight-pct">${((weights[i] || a.weight) * 100).toFixed(1)}%</span>
        </div>`).join("")}
    </div>

    ${Object.keys(indRet).length > 1 ? `
    <div class="section">
      <div class="section-title">Individual Performance</div>
      <div class="stock-grid">
        ${Object.entries(indRet).map(([t, r]: [string, any]) => `
          <div class="stock-card">
            <div class="stock-ticker">${t}</div>
            <div class="stock-ret ${r >= 0 ? "amber" : "red"}">${r >= 0 ? "+" : ""}${(r * 100).toFixed(1)}%</div>
            <div style="font-size:9px;color:rgba(232,224,204,0.35);margin-top:2px;letter-spacing:1px">ANNUALIZED</div>
          </div>`).join("")}
      </div>
    </div>` : ""}

    <div class="footer">
      <div class="footer-brand">CORVO</div>
      <div class="footer-note">Data sourced from Yahoo Finance · Not financial advice · ${now}</div>
    </div>
    </body></html>`;
  };

  const buildAiReport = (analysis: string) => {
    const ret = data.portfolio_return;
    const vol = data.portfolio_volatility;
    const sharpe = ((ret - 0.04) / vol).toFixed(2);
    const dd = (data.max_drawdown * 100).toFixed(2);
    const weights = data.weights || assets.map(a => a.weight);
    const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const formatAnalysis = (text: string) => {
      return text
        .replace(/^## (.+)$/gm, '<div class="section-hdr">$1</div>')
        .replace(/^### (.+)$/gm, '<div class="section-sub">$1</div>')
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8e0cc;font-weight:700">$1</strong>')
        .replace(/^[•\-] (.+)$/gm, '<div class="bullet"><span class="bullet-dot">▸</span><span>$1</span></div>')
        .replace(/\n\n/g, '</p><p class="para">')
        .replace(/\n/g, ' ');
    };

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      ${PRINT_CSS}
      body { font-family: 'Georgia', serif; font-size: 13px; }
      .page-header { background: #0d1117; border-bottom: 2px solid #c9a84c; padding: 32px 48px 24px; margin: -48px -48px 36px; display: flex; justify-content: space-between; align-items: flex-end; }
      .brand { font-family: 'Courier New', monospace; font-size: 28px; font-weight: 900; letter-spacing: 10px; color: #c9a84c; }
      .header-meta { text-align: right; }
      .header-sub { font-family: 'Courier New', monospace; font-size: 8px; letter-spacing: 3px; color: rgba(232,224,204,0.35); text-transform: uppercase; margin-bottom: 4px; }
      .header-date { font-family: 'Courier New', monospace; font-size: 10px; color: rgba(232,224,204,0.25); }
      .metrics-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 28px; }
      .metric { background: rgba(255,255,255,0.04); border: 1px solid rgba(201,168,76,0.15); border-radius: 8px; padding: 12px 14px; }
      .metric-value { font-family: 'Courier New', monospace; font-size: 20px; font-weight: 700; }
      .metric-label { font-family: 'Courier New', monospace; font-size: 7px; letter-spacing: 3px; color: rgba(232,224,204,0.35); margin-top: 3px; text-transform: uppercase; }
      .composition-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; }
      .comp-label { font-family: 'Courier New', monospace; font-size: 7px; letter-spacing: 4px; color: rgba(201,168,76,0.5); text-transform: uppercase; margin-bottom: 12px; }
      .weight-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
      .weight-ticker { font-family: 'Courier New', monospace; font-size: 11px; color: #c9a84c; width: 70px; font-weight: 700; }
      .weight-bar-bg { flex: 1; height: 3px; background: rgba(255,255,255,0.07); border-radius: 2px; }
      .weight-bar { height: 100%; background: #c9a84c; border-radius: 2px; }
      .weight-pct { font-family: 'Courier New', monospace; font-size: 11px; width: 40px; text-align: right; color: rgba(232,224,204,0.6); }
      .divider { height: 1px; background: rgba(255,255,255,0.07); margin: 24px 0; }
      .analysis-body { color: rgba(232,224,204,0.9); line-height: 1.85; }
      .section-hdr { font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 4px; color: #c9a84c; text-transform: uppercase; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 1px solid rgba(201,168,76,0.2); }
      .section-sub { font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 3px; color: rgba(232,224,204,0.5); text-transform: uppercase; margin: 18px 0 8px; }
      .para { margin: 10px 0; }
      .bullet { display: flex; gap: 8px; margin: 7px 0; padding-left: 4px; }
      .bullet-dot { color: #c9a84c; flex-shrink: 0; margin-top: 1px; }
      .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; justify-content: space-between; align-items: center; }
      .footer-brand { font-family: 'Courier New', monospace; font-size: 10px; color: #c9a84c; letter-spacing: 3px; }
      .footer-note { font-family: 'Courier New', monospace; font-size: 8px; color: rgba(232,224,204,0.2); }
    </style></head><body>
    <div class="page-header">
      <div>
        <div class="brand">CORVO</div>
        <div style="font-family:'Courier New',monospace;font-size:8px;letter-spacing:3px;color:rgba(232,224,204,0.3);margin-top:5px;text-transform:uppercase">AI Portfolio Analysis Report</div>
      </div>
      <div class="header-meta">
        <div class="header-sub">Generated by Claude AI</div>
        <div class="header-date">${now}</div>
      </div>
    </div>

    <div class="metrics-row">
      <div class="metric">
        <div class="metric-value ${ret >= 0 ? "amber" : "red"}">${ret >= 0 ? "+" : ""}${(ret * 100).toFixed(2)}%</div>
        <div class="metric-label">Return</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color:#e8e0cc">${(vol * 100).toFixed(2)}%</div>
        <div class="metric-label">Volatility</div>
      </div>
      <div class="metric">
        <div class="metric-value ${Number(sharpe) >= 1 ? "green" : Number(sharpe) >= 0 ? "amber" : "red"}">${sharpe}</div>
        <div class="metric-label">Sharpe Ratio</div>
      </div>
      <div class="metric">
        <div class="metric-value red">-${Math.abs(Number(dd))}%</div>
        <div class="metric-label">Max Drawdown</div>
      </div>
    </div>

    <div class="composition-box">
      <div class="comp-label">Portfolio Composition</div>
      ${assets.map((a, i) => `
        <div class="weight-row">
          <span class="weight-ticker">${a.ticker}</span>
          <div class="weight-bar-bg"><div class="weight-bar" style="width:${((weights[i] || a.weight) * 100).toFixed(0)}%"></div></div>
          <span class="weight-pct">${((weights[i] || a.weight) * 100).toFixed(1)}%</span>
        </div>`).join("")}
    </div>

    <div class="divider"></div>

    <div class="analysis-body">
      <p class="para">${formatAnalysis(analysis)}</p>
    </div>

    <div class="footer">
      <div class="footer-brand">CORVO</div>
      <div class="footer-note">Data from Yahoo Finance · AI analysis by Claude · Not financial advice</div>
    </div>
    </body></html>`;
  };

  const handleExport = async () => {
    if (!data) return;
    setLoading(true);
    setOpen(false);
    try {
      if (mode === "ai") {
        const res = await fetch(`${API_URL}/generate-report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portfolio_context: {
              tickers: assets.map(a => a.ticker),
              weights: data.weights || assets.map(a => a.weight),
              portfolio_return: data.portfolio_return,
              portfolio_volatility: data.portfolio_volatility,
              max_drawdown: data.max_drawdown,
              sharpe_ratio: data.sharpe_ratio,
              period: data.period,
              individual_returns: data.individual_returns,
            },
            user_goals: goals || {},
          }),
        });
        const result = await res.json();
        openPrint(result.analysis ? buildAiReport(result.analysis) : buildStaticReport());
      } else {
        openPrint(buildStaticReport());
      }
    } catch {
      openPrint(buildStaticReport());
    } finally {
      setLoading(false);
    }
  };

  const openPrint = (html: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) win.onload = () => setTimeout(() => win.print(), 800);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: "relative" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: "flex", gap: 0 }}>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleExport} disabled={!data || loading}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", background: C.amber2, border: "1px solid rgba(201,168,76,0.25)", borderRight: "none", borderRadius: "8px 0 0 8px", color: C.amber, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", cursor: !data || loading ? "not-allowed" : "pointer", opacity: !data ? 0.4 : 1, transition: "all 0.2s" }}>
          {loading
            ? <><div style={{ width: 11, height: 11, border: "1.5px solid rgba(201,168,76,0.3)", borderTopColor: C.amber, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />{mode === "ai" ? "Writing..." : "Generating..."}</>
            : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>{mode === "ai" ? "AI Report" : "Export PDF"}</>}
        </motion.button>
        <button onClick={() => setOpen(o => !o)} disabled={!data || loading}
          style={{ padding: "7px 8px", background: C.amber2, border: "1px solid rgba(201,168,76,0.25)", borderRadius: "0 8px 8px 0", color: C.amber, cursor: !data ? "not-allowed" : "pointer", opacity: !data ? 0.4 : 1, fontSize: 9 }}>▾</button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", zIndex: 100, width: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            {[
              { value: "ai", label: "✦ AI Report", desc: "Claude writes full analysis" },
              { value: "static", label: "↓ Quick PDF", desc: "Data summary only" },
            ].map(opt => (
              <button key={opt.value} onClick={() => { setMode(opt.value as any); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "11px 14px", background: mode === opt.value ? C.amber2 : "transparent", border: "none", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => { if (mode !== opt.value) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (mode !== opt.value) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ fontSize: 12, color: mode === opt.value ? C.amber : "#e8e0cc", fontWeight: mode === opt.value ? 500 : 400 }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: "rgba(232,224,204,0.4)", marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
