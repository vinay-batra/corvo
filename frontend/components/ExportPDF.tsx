"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = { amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", navy: "#0a0e14", cream: "#e8e0cc", cream3: "rgba(232,224,204,0.35)" };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props { data: any; assets: any[]; goals?: any; }

export default function ExportPDF({ data, assets, goals }: Props) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"static"|"ai">("ai");
  const [open, setOpen] = useState(false);

  const buildStaticReport = () => {
    const ret = data.portfolio_return;
    const vol = data.portfolio_volatility;
    const sharpe = ((ret - 0.04) / vol).toFixed(2);
    const dd = (data.max_drawdown * 100).toFixed(2);
    const weights = data.weights || assets.map(a => a.weight);
    const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
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
      .weight-ticker{font-size:12px;color:#c9a84c;width:80px;letter-spacing:1px}
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
        ${assets.map((a, i) => `<div class="weight-row"><span class="weight-ticker">${a.ticker}</span><div class="weight-bar-bg"><div class="weight-bar" style="width:${((weights[i]||a.weight)*100).toFixed(1)}%"></div></div><span class="weight-pct">${((weights[i]||a.weight)*100).toFixed(1)}%</span></div>`).join("")}
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
  };

  const buildAiReport = (analysis: string) => {
    const ret = data.portfolio_return;
    const vol = data.portfolio_volatility;
    const sharpe = ((ret - 0.04) / vol).toFixed(2);
    const dd = (data.max_drawdown * 100).toFixed(2);
    const weights = data.weights || assets.map(a => a.weight);
    const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Convert markdown-like formatting to HTML
    const formatAnalysis = (text: string) => {
      return text
        .replace(/^### (.+)$/gm, '<h3 style="font-size:11px;letter-spacing:3px;color:rgba(201,168,76,0.7);text-transform:uppercase;margin:24px 0 10px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:6px">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 style="font-size:13px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;margin:28px 0 12px">$1</h2>')
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8e0cc">$1</strong>')
        .replace(/^• (.+)$/gm, '<div style="display:flex;gap:8px;margin:6px 0"><span style="color:#c9a84c;flex-shrink:0">▸</span><span>$1</span></div>')
        .replace(/^- (.+)$/gm, '<div style="display:flex;gap:8px;margin:6px 0"><span style="color:#c9a84c;flex-shrink:0">▸</span><span>$1</span></div>')
        .replace(/\n\n/g, '</p><p style="margin:10px 0">')
        .replace(/\n/g, '<br>');
    };

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      body{font-family:'Georgia',serif;background:#0a0e14;color:#e8e0cc;padding:56px;min-height:100vh;line-height:1.7}
      .header{border-bottom:2px solid rgba(201,168,76,0.4);padding-bottom:28px;margin-bottom:36px;display:flex;justify-content:space-between;align-items:flex-end}
      .brand{font-family:'Courier New',monospace;font-size:32px;font-weight:900;letter-spacing:10px;color:#c9a84c}
      .header-right{text-align:right}
      .subtitle{font-family:'Courier New',monospace;font-size:9px;letter-spacing:4px;color:rgba(232,224,204,0.35);text-transform:uppercase;margin-bottom:6px}
      .date{font-family:'Courier New',monospace;font-size:10px;color:rgba(232,224,204,0.25);letter-spacing:1px}
      .metrics-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:36px}
      .metric{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px 16px}
      .metric-value{font-family:'Courier New',monospace;font-size:20px;font-weight:700;letter-spacing:-0.5px}
      .metric-label{font-family:'Courier New',monospace;font-size:8px;letter-spacing:3px;color:rgba(232,224,204,0.35);margin-top:3px;text-transform:uppercase}
      .composition{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:20px;margin-bottom:32px}
      .comp-title{font-family:'Courier New',monospace;font-size:8px;letter-spacing:4px;color:rgba(201,168,76,0.5);text-transform:uppercase;margin-bottom:16px}
      .weight-row{display:flex;align-items:center;gap:14px;margin-bottom:8px}
      .weight-ticker{font-family:'Courier New',monospace;font-size:11px;color:#c9a84c;width:80px;letter-spacing:1px;font-weight:700}
      .weight-bar-bg{flex:1;height:3px;background:rgba(255,255,255,0.06);border-radius:2px}
      .weight-bar{height:100%;background:#c9a84c;border-radius:2px}
      .weight-pct{font-family:'Courier New',monospace;font-size:11px;font-weight:700;width:44px;text-align:right;color:rgba(232,224,204,0.65)}
      .analysis{font-size:14px;color:rgba(232,224,204,0.85);line-height:1.85}
      .analysis p{margin:10px 0}
      .divider{height:1px;background:rgba(255,255,255,0.06);margin:32px 0}
      .footer{margin-top:48px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center}
      .footer-brand{font-family:'Courier New',monospace;font-size:10px;color:#c9a84c;letter-spacing:3px}
      .footer-note{font-family:'Courier New',monospace;font-size:8px;color:rgba(232,224,204,0.2);letter-spacing:1px}
      .amber{color:#c9a84c} .red{color:#e05c5c} .green{color:#5cb88a}
    </style></head><body>
    <div class="header">
      <div>
        <div class="brand">CORVO</div>
        <div style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:3px;color:rgba(232,224,204,0.3);margin-top:4px;text-transform:uppercase">AI Portfolio Intelligence Report</div>
      </div>
      <div class="header-right">
        <div class="subtitle">Generated by Claude AI</div>
        <div class="date">${now}</div>
      </div>
    </div>

    <div class="metrics-bar">
      <div class="metric">
        <div class="metric-value ${ret>=0?"amber":"red"}">${ret>=0?"+":""}${(ret*100).toFixed(2)}%</div>
        <div class="metric-label">Annualized Return</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color:#e8e0cc">${(vol*100).toFixed(2)}%</div>
        <div class="metric-label">Volatility</div>
      </div>
      <div class="metric">
        <div class="metric-value ${Number(sharpe)>=1?"green":Number(sharpe)>=0?"amber":"red"}">${sharpe}</div>
        <div class="metric-label">Sharpe Ratio</div>
      </div>
      <div class="metric">
        <div class="metric-value red">-${Math.abs(Number(dd))}%</div>
        <div class="metric-label">Max Drawdown</div>
      </div>
    </div>

    <div class="composition">
      <div class="comp-title">Portfolio Composition</div>
      ${assets.map((a, i) => `<div class="weight-row"><span class="weight-ticker">${a.ticker}</span><div class="weight-bar-bg"><div class="weight-bar" style="width:${((weights[i]||a.weight)*100).toFixed(0)}%"></div></div><span class="weight-pct">${((weights[i]||a.weight)*100).toFixed(1)}%</span></div>`).join("")}
    </div>

    <div class="divider"></div>

    <div class="analysis">
      <p>${formatAnalysis(analysis)}</p>
    </div>

    <div class="footer">
      <div class="footer-brand">CORVO</div>
      <div class="footer-note">Data sourced from Yahoo Finance · AI analysis by Claude · Not financial advice</div>
    </div>
    </body></html>`;
  };

  const handleExport = async () => {
    if (!data) return;
    setLoading(true);
    setOpen(false);
    try {
      if (mode === "ai") {
        // Call backend to generate AI analysis
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
        if (result.analysis) {
          const html = buildAiReport(result.analysis);
          openPrint(html);
        } else {
          // Fallback to static
          openPrint(buildStaticReport());
        }
      } else {
        openPrint(buildStaticReport());
      }
    } catch (e) {
      // Fallback to static on error
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
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRight: "none", borderRadius: "8px 0 0 8px", color: C.amber, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", cursor: !data||loading ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: !data ? 0.4 : 1 }}>
          {loading
            ? <><div style={{ width: 11, height: 11, border: "1.5px solid rgba(201,168,76,0.3)", borderTopColor: C.amber, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />{mode === "ai" ? "Writing..." : "Generating..."}</>
            : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {mode === "ai" ? "AI Report" : "Export PDF"}</>}
        </motion.button>

        <button onClick={() => setOpen(o => !o)} disabled={!data || loading}
          style={{ padding: "7px 8px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "0 8px 8px 0", color: C.amber, cursor: !data ? "not-allowed" : "pointer", opacity: !data ? 0.4 : 1, fontSize: 9 }}>
          ▾
        </button>
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
                style={{ width: "100%", textAlign: "left", padding: "11px 14px", background: mode === opt.value ? "rgba(201,168,76,0.08)" : "transparent", border: "none", cursor: "pointer", transition: "background 0.1s" }}
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
