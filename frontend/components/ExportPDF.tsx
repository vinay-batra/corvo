"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = { amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", navy: "#0a0e14", cream: "#e8e0cc", cream3: "rgba(232,224,204,0.35)" };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props { data: any; assets: any[]; goals?: any; menuItem?: boolean; onClose?: () => void; }

// ── jsPDF single-page PDF builder ────────────────────────────────────────────
async function buildJsPDF(data: any, assets: any[], goals?: any): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const isLight = document.documentElement.getAttribute("data-theme") === "light";

  const W = 210, H = 297;
  const ML = 14, MR = 14;
  const CW = W - ML - MR;

  const bg:        [number,number,number] = isLight ? [255,255,255] : [10,14,20];
  const text:      [number,number,number] = isLight ? [26,26,26]    : [232,224,204];
  const cardBg:    [number,number,number] = isLight ? [245,245,240] : [20,28,40];
  const cardBorder:[number,number,number] = isLight ? [224,216,200] : [40,50,65];
  const dim:       [number,number,number] = isLight ? [136,136,136] : [100,110,115];
  const hdrBg:     [number,number,number] = isLight ? [245,245,240] : [14,20,30];
  const barTrack:  [number,number,number] = isLight ? [224,216,200] : [30,40,55];
  const amber:     [number,number,number] = [201,168,76];
  const red:       [number,number,number] = [224,92,92];
  const green:     [number,number,number] = [92,184,138];

  const ret = data.portfolio_return ?? 0;
  const vol = data.portfolio_volatility ?? 0;
  const sharpe = vol > 0 ? (ret - 0.04) / vol : 0;
  const dd = data.max_drawdown ?? 0;
  const score = computeHealthScore(data);
  const scoreColor = score >= 75 ? green : score >= 50 ? amber : red;
  const weights: number[] = data.weights ?? assets.map((a: any) => a.weight);
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  const normWeights = weights.map(w => w / total);
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const indRet: Record<string, number> = data.individual_returns ?? {};
  const tickerStr = assets.map((a: any) => a.ticker).join("  ·  ");

  // Background
  doc.setFillColor(...bg);
  doc.rect(0, 0, W, H, "F");

  // ── HEADER BAR ──────────────────────────────────────────────────────────────
  doc.setFillColor(...amber);
  doc.rect(0, 0, W, 1.5, "F");

  doc.setFillColor(...hdrBg);
  doc.rect(0, 1.5, W, 18, "F");

  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...amber);
  doc.text("CORVO", ML, 13);

  doc.setFont("courier", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...dim);
  doc.setCharSpace(2);
  doc.text("PORTFOLIO INTELLIGENCE", ML, 17);
  doc.setCharSpace(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...text);
  doc.text(tickerStr, W / 2, 13, { align: "center" });

  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...dim);
  doc.text(now.toUpperCase(), W - MR, 13, { align: "right" });

  doc.setDrawColor(...amber);
  doc.setLineWidth(0.3);
  doc.line(0, 19.5, W, 19.5);

  let y = 27;

  // ── METRICS + HEALTH SCORE ──────────────────────────────────────────────────
  doc.setFont("courier", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...amber);
  doc.setCharSpace(3);
  doc.text("PERFORMANCE METRICS", ML, y);
  doc.setCharSpace(0);

  // Health score inline (right-aligned on same row)
  doc.setFont("courier", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...scoreColor);
  doc.setCharSpace(1);
  doc.text(`HEALTH SCORE  ${score}`, W - MR, y, { align: "right" });
  doc.setCharSpace(0);
  y += 4;

  const cardW = (CW - 3 * 3) / 4;
  const cardH = 26;
  const metricData = [
    { label: "Annual Return", value: `${ret >= 0 ? "+" : ""}${(ret * 100).toFixed(2)}%`, color: ret >= 0 ? amber : red },
    { label: "Volatility",    value: `${(vol * 100).toFixed(2)}%`,                        color: text },
    { label: "Sharpe Ratio",  value: sharpe.toFixed(2),                                   color: sharpe >= 1 ? green : sharpe >= 0 ? amber : red },
    { label: "Max Drawdown",  value: `${(dd * 100).toFixed(2)}%`,                         color: red },
  ];

  metricData.forEach((m, i) => {
    const mx = ML + i * (cardW + 3);
    doc.setFillColor(...cardBg);
    doc.roundedRect(mx, y, cardW, cardH, 1.5, 1.5, "F");
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(mx, y, cardW, cardH, 1.5, 1.5, "S");

    doc.setFont("courier", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...m.color);
    doc.text(m.value, mx + 5, y + 13);

    doc.setFont("courier", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...dim);
    doc.setCharSpace(1.5);
    doc.text(m.label.toUpperCase(), mx + 5, y + 21);
    doc.setCharSpace(0);
  });
  y += cardH + 8;

  // ── PORTFOLIO ALLOCATION ─────────────────────────────────────────────────────
  doc.setFont("courier", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...amber);
  doc.setCharSpace(3);
  doc.text("PORTFOLIO ALLOCATION", ML, y);
  doc.setCharSpace(0);
  doc.setDrawColor(...cardBorder);
  doc.setLineWidth(0.2);
  doc.line(ML, y + 2, W - MR, y + 2);
  y += 7;

  const allocTickW = 24;
  const allocPctW = 16;
  const allocBarX = ML + allocTickW;
  const allocBarW = CW - allocTickW - allocPctW;
  const barH = 3.5;
  const allocRowH = 9;

  assets.forEach((a: any, i: number) => {
    const w = normWeights[i] ?? 0;
    if (y + allocRowH > H - 16) return;

    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...amber);
    doc.text(a.ticker, ML, y + barH);

    doc.setFillColor(...barTrack);
    doc.roundedRect(allocBarX, y, allocBarW, barH, 1, 1, "F");
    doc.setFillColor(...amber);
    doc.roundedRect(allocBarX, y, allocBarW * w, barH, 1, 1, "F");

    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...text);
    doc.text(`${(w * 100).toFixed(1)}%`, W - MR, y + barH, { align: "right" });

    y += allocRowH;
  });
  y += 6;

  // ── INDIVIDUAL RETURNS ───────────────────────────────────────────────────────
  if (Object.keys(indRet).length > 0 && y + 20 < H - 16) {
    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...amber);
    doc.setCharSpace(3);
    doc.text("INDIVIDUAL PERFORMANCE", ML, y);
    doc.setCharSpace(0);
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.2);
    doc.line(ML, y + 2, W - MR, y + 2);
    y += 7;

    const retTickW = 24;
    const retBarX = ML + retTickW;
    const retBarMaxW = 80;
    const retValW = 22;
    const retRowH = 8;

    const retEntries = Object.entries(indRet).sort((a, b) => (b[1] as number) - (a[1] as number));
    retEntries.forEach(([ticker, r]) => {
      const rv = r as number;
      if (y + retRowH > H - 16) return;
      const col = rv >= 0 ? green : red;
      const pct = Math.min(Math.abs(rv) / 0.5, 1);

      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...amber);
      doc.text(ticker, ML, y + 3);

      doc.setFillColor(...barTrack);
      doc.roundedRect(retBarX, y, retBarMaxW, 3, 1, 1, "F");
      doc.setFillColor(...col);
      doc.roundedRect(retBarX, y, retBarMaxW * pct, 3, 1, 1, "F");

      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...col);
      doc.text(`${rv >= 0 ? "+" : ""}${(rv * 100).toFixed(1)}%`, retBarX + retBarMaxW + retValW, y + 3, { align: "right" });

      y += retRowH;
    });
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  doc.setFont("courier", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...dim);
  doc.text("corvo.capital", ML, H - 8);
  doc.text("Not financial advice · Data from Yahoo Finance", W - MR, H - 8, { align: "right" });

  doc.save(`corvo_${assets.map((a: any) => a.ticker).join("-")}_report.pdf`);
}

function computeHealthScore(data: any): number {
  const ret = data.portfolio_return ?? 0;
  const vol = data.portfolio_volatility ?? 0.2;
  const sharpe = vol > 0 ? (ret - 0.04) / vol : 0;
  const rS = Math.min(Math.max(((ret + 0.3) / 0.6) * 100, 0), 100);
  const shS = Math.min(Math.max((sharpe / 3) * 100, 0), 100);
  const vS = Math.min(Math.max((1 - vol / 0.6) * 100, 0), 100);
  const dS = Math.min(Math.max((1 + (data.max_drawdown ?? 0) / 0.5) * 100, 0), 100);
  return Math.round(rS * 0.3 + shS * 0.3 + vS * 0.25 + dS * 0.15);
}

// ── HTML print fallback (AI report) ──────────────────────────────────────────
function buildAiReport(analysis: string, data: any, assets: any[]): string {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";

  const bg = isLight ? "#ffffff" : "#0a0e14";
  const fg = isLight ? "#1a1a1a" : "#e8e0cc";
  const hdrBg = isLight ? "#f5f5f0" : "#0d1117";
  const cardBg = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)";
  const cardBorder = isLight ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(201,168,76,0.15)";
  const mutedText = (a: number) => isLight ? `rgba(0,0,0,${a})` : `rgba(232,224,204,${a})`;
  const subtleBg = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.03)";
  const subtleBorder = isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)";
  const wbgColor = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.07)";
  const strongColor = isLight ? "#1a1a1a" : "#e8e0cc";

  const printCss = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: ${bg} !important; color: ${fg} !important;
      -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { margin: 0; size: A4; }
    body { font-family: 'Courier New', monospace; padding: 48px; line-height: 1.6; }
    .amber { color: #c9a84c !important; } .red { color: #e05c5c !important; } .green { color: #5cb88a !important; }
  `;

  const ret = data.portfolio_return, vol = data.portfolio_volatility;
  const sharpe = (data.sharpe_ratio ?? ((data.annualized_return ?? ret) - 0.04) / vol).toFixed(2), dd = (data.max_drawdown * 100).toFixed(2);
  const weights: number[] = data.weights ?? assets.map((a: any) => a.weight);
  const total = weights.reduce((s, w) => s + w, 1);
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const fmt = (text: string) => text
    .replace(/^## (.+)$/gm, `<div style="font-size:9px;letter-spacing:4px;color:#c9a84c;text-transform:uppercase;margin:24px 0 10px;border-bottom:1px solid rgba(201,168,76,0.2);padding-bottom:4px">$1</div>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${strongColor}">$1</strong>`)
    .replace(/^[•\-] (.+)$/gm, `<div style="display:flex;gap:8px;margin:5px 0"><span style="color:#c9a84c">▸</span><span>$1</span></div>`)
    .replace(/\n\n/g, `</p><p style="margin:10px 0;color:${mutedText(0.8)};font-family:Georgia,serif;font-size:13px;line-height:1.8">`);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${printCss}
    .hdr{background:${hdrBg};border-bottom:2px solid #c9a84c;padding:32px 48px 24px;margin:-48px -48px 32px;display:flex;justify-content:space-between;align-items:flex-end}
    .brand{font-size:26px;font-weight:900;letter-spacing:10px;color:#c9a84c}
    .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:28px}
    .m{background:${cardBg};border:${cardBorder};border-radius:8px;padding:12px 14px}
    .mv{font-size:20px;font-weight:700;font-family:'Courier New',monospace}
    .ml{font-size:7px;letter-spacing:3px;color:${mutedText(0.35)};text-transform:uppercase;margin-top:3px}
    .wrow{display:flex;align-items:center;gap:12px;margin-bottom:8px}
    .wtk{color:#c9a84c;width:70px;font-weight:700;font-size:11px}
    .wbg{flex:1;height:3px;background:${wbgColor};border-radius:2px}
    .wbar{height:100%;background:#c9a84c;border-radius:2px}
    .wpct{font-size:11px;width:40px;text-align:right;color:${mutedText(0.6)}}
  </style></head><body>
  <div class="hdr">
    <div><div class="brand">CORVO</div><div style="font-size:8px;letter-spacing:3px;color:${mutedText(0.3)};margin-top:5px">AI PORTFOLIO ANALYSIS · ${now}</div></div>
    <div style="text-align:right;font-size:10px;color:${mutedText(0.3)}">${assets.map(a => a.ticker).join(" · ")}</div>
  </div>
  <div class="metrics">
    <div class="m"><div class="mv ${ret >= 0 ? "amber" : "red"}">${ret >= 0 ? "+" : ""}${(ret * 100).toFixed(2)}%</div><div class="ml">Return</div></div>
    <div class="m"><div class="mv">${(vol * 100).toFixed(2)}%</div><div class="ml">Volatility</div></div>
    <div class="m"><div class="mv ${Number(sharpe) >= 1 ? "green" : "amber"}">${sharpe}</div><div class="ml">Sharpe</div></div>
    <div class="m"><div class="mv red">-${Math.abs(Number(dd))}%</div><div class="ml">Max Drawdown</div></div>
  </div>
  <div style="background:${subtleBg};border:1px solid ${subtleBorder};border-radius:10px;padding:16px 20px;margin-bottom:28px">
    <div style="font-size:7px;letter-spacing:4px;color:rgba(201,168,76,0.5);text-transform:uppercase;margin-bottom:12px">Composition</div>
    ${assets.map((a, i) => `<div class="wrow"><span class="wtk">${a.ticker}</span><div class="wbg"><div class="wbar" style="width:${((weights[i] ?? a.weight) / total * 100).toFixed(0)}%"></div></div><span class="wpct">${((weights[i] ?? a.weight) / total * 100).toFixed(1)}%</span></div>`).join("")}
  </div>
  <hr style="border:none;border-top:1px solid ${subtleBorder};margin:0 0 24px"/>
  <p style="margin:10px 0;color:${mutedText(0.8)};font-family:Georgia,serif;font-size:13px;line-height:1.8">${fmt(analysis)}</p>
  <div style="margin-top:40px;padding-top:14px;border-top:1px solid ${subtleBorder};display:flex;justify-content:space-between">
    <span style="color:#c9a84c;font-size:10px;letter-spacing:3px">CORVO</span>
    <span style="font-size:8px;color:${mutedText(0.2)}">AI analysis by Claude · Not financial advice</span>
  </div>
  </body></html>`;
}

export default function ExportPDF({ data, assets, goals, menuItem, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"jspdf" | "ai">("jspdf");
  const [open, setOpen] = useState(false);

  const handleExport = async (exportMode?: "jspdf" | "ai") => {
    if (!data) return;
    const m = exportMode ?? mode;
    setLoading(true); setOpen(false); onClose?.();
    try {
      if (m === "jspdf") {
        await buildJsPDF(data, assets, goals);
      } else {
        // AI narrative PDF from backend (ReportLab)
        const res = await fetch(`${API_URL}/generate-report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portfolio_context: {
              tickers: assets.map((a: any) => a.ticker),
              weights: data.weights ?? assets.map((a: any) => a.weight),
              portfolio_return: data.portfolio_return,
              portfolio_volatility: data.portfolio_volatility,
              max_drawdown: data.max_drawdown,
              sharpe_ratio: data.sharpe_ratio,
              period: data.period,
              individual_returns: data.individual_returns,
            },
            user_goals: goals ?? {},
          }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `corvo_${assets.map((a: any) => a.ticker).join("-")}_report.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // silently ignore, user can try again
    } finally {
      setLoading(false);
    }
  };

  if (menuItem) {
    const row = (label: string, m: "jspdf" | "ai") => (
      <button key={m} onClick={() => handleExport(m)} disabled={!data || loading}
        style={{ width: "100%", textAlign: "left" as const, padding: "9px 14px", fontSize: 12, color: !data ? "var(--text3)" : "var(--text)", background: "transparent", border: "none", cursor: !data || loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: !data ? 0.5 : 1, transition: "background 0.12s" }}
        onMouseEnter={e => { if (data && !loading) e.currentTarget.style.background = "var(--bg3)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
        {loading && mode === m ? (m === "jspdf" ? "Building…" : "Writing…") : label}
      </button>
    );
    return <>{row("↓ Export PDF", "jspdf")}{row("AI Report", "ai")}</>;
  }

  return (
    <div style={{ position: "relative" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: "flex", gap: 0 }}>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => handleExport()} disabled={!data || loading}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", background: C.amber2, border: "1px solid rgba(201,168,76,0.25)", borderRight: "none", borderRadius: "8px 0 0 8px", color: C.amber, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", cursor: !data || loading ? "not-allowed" : "pointer", opacity: !data ? 0.4 : 1, transition: "all 0.2s" }}>
          {loading
            ? <><div style={{ width: 11, height: 11, border: "1.5px solid rgba(201,168,76,0.3)", borderTopColor: C.amber, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />{mode === "ai" ? "Writing..." : "Building..."}</>
            : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>{mode === "ai" ? "AI Report" : "Export PDF"}</>}
        </motion.button>
        <button onClick={() => setOpen(o => !o)} disabled={!data || loading}
          style={{ padding: "7px 8px", background: C.amber2, border: "1px solid rgba(201,168,76,0.25)", borderRadius: "0 8px 8px 0", color: C.amber, cursor: !data ? "not-allowed" : "pointer", opacity: !data ? 0.4 : 1, fontSize: 9 }}>▾</button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", zIndex: 100, width: 220, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            {[
              { value: "jspdf", label: "↓ Single-page PDF", desc: "Metrics · allocation · returns · health" },
              { value: "ai",    label: "AI Narrative PDF", desc: "Claude writes full analysis (print)" },
            ].map(opt => (
              <button key={opt.value} onClick={() => { setMode(opt.value as "jspdf" | "ai"); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "11px 14px", background: mode === opt.value ? C.amber2 : "transparent", border: "none", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => { if (mode !== opt.value) e.currentTarget.style.background = "var(--bg3)"; }}
                onMouseLeave={e => { if (mode !== opt.value) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ fontSize: 12, color: mode === opt.value ? C.amber : "var(--text)", fontWeight: mode === opt.value ? 500 : 400 }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
