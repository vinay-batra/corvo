"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = { amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", navy: "#0a0e14", cream: "#e8e0cc", cream3: "rgba(232,224,204,0.35)" };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props { data: any; assets: any[]; goals?: any; menuItem?: boolean; onClose?: () => void; }

// ── jsPDF dark-theme PDF builder ─────────────────────────────────────────────
async function buildJsPDF(data: any, assets: any[], goals?: any): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210, H = 297;
  const navy = [10, 14, 20] as [number, number, number];
  const amber = [201, 168, 76] as [number, number, number];
  const cream = [232, 224, 204] as [number, number, number];
  const dim: [number, number, number] = [100, 110, 115];
  const red = [224, 92, 92] as [number, number, number];
  const green = [92, 184, 138] as [number, number, number];

  const ret = data.portfolio_return ?? 0;
  const vol = data.portfolio_volatility ?? 0;
  const sharpe = vol > 0 ? (ret - 0.04) / vol : 0;
  const dd = data.max_drawdown ?? 0;
  const weights: number[] = data.weights ?? assets.map((a: any) => a.weight);
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  const normWeights = weights.map(w => w / total);
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const indRet: Record<string, number> = data.individual_returns ?? {};

  // ── PAGE 1: Cover ────────────────────────────────────────────────────────
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, H, "F");

  // Amber accent bar on left
  doc.setFillColor(...amber);
  doc.rect(0, 0, 4, H, "F");

  // CORVO brand
  doc.setFont("courier", "bold");
  doc.setFontSize(36);
  doc.setTextColor(...amber);
  doc.text("CORVO", 24, 54);

  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...dim);
  doc.setCharSpace(3);
  doc.text("PORTFOLIO INTELLIGENCE REPORT", 24, 62);
  doc.setCharSpace(0);

  // Divider
  doc.setDrawColor(...amber);
  doc.setLineWidth(0.5);
  doc.line(24, 68, W - 24, 68);

  // Portfolio name
  doc.setFont("courier", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...dim);
  doc.setCharSpace(2);
  doc.text("PORTFOLIO", 24, 84);
  doc.setCharSpace(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...cream);
  const tickerStr = assets.map((a: any) => a.ticker).join("  ·  ");
  doc.text(tickerStr, 24, 96);

  // Date
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...dim);
  doc.setCharSpace(1);
  doc.text(`GENERATED  ${now.toUpperCase()}`, 24, 108);
  doc.setCharSpace(0);

  // Large health score ring (drawn with arc)
  const score = computeHealthScore(data);
  const scoreColor = score >= 75 ? green : score >= 50 ? amber : red;
  const cx = W / 2, cy = 185, r = 44;
  doc.setFillColor(...navy);
  doc.circle(cx, cy, r + 6, "F");
  // Track ring
  doc.setDrawColor(40, 48, 58);
  doc.setLineWidth(5);
  doc.circle(cx, cy, r, "S");
  // Score arc (approximate with small segments)
  const pct = score / 100;
  const steps = Math.ceil(pct * 60);
  doc.setDrawColor(...scoreColor);
  doc.setLineWidth(5);
  for (let i = 0; i < steps; i++) {
    const a0 = (-Math.PI / 2) + (i / 60) * 2 * Math.PI;
    const a1 = (-Math.PI / 2) + ((i + 1) / 60) * 2 * Math.PI;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    doc.line(x0, y0, x1, y1);
  }
  // Score text
  doc.setFont("courier", "bold");
  doc.setFontSize(32);
  doc.setTextColor(...scoreColor);
  doc.text(String(score), cx - (score >= 100 ? 9 : 7), cy + 4, { align: "center" });
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...dim);
  doc.setCharSpace(2);
  doc.text("HEALTH SCORE", cx, cy + 12, { align: "center" });
  doc.setCharSpace(0);

  // Footer
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...dim);
  doc.text("corvo.capital", 24, H - 16);
  doc.text("Not financial advice · Data from Yahoo Finance", W - 24, H - 16, { align: "right" });

  // ── PAGE 2: Metrics + Allocation ─────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...amber);
  doc.rect(0, 0, 4, H, "F");

  // Page title
  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...amber);
  doc.setCharSpace(3);
  doc.text("PERFORMANCE METRICS", 24, 24);
  doc.setCharSpace(0);
  doc.setDrawColor(...amber);
  doc.setLineWidth(0.3);
  doc.line(24, 27, W - 24, 27);

  // Metric cards (2×2 grid)
  const metricData = [
    { label: "Annual Return", value: `${ret >= 0 ? "+" : ""}${(ret * 100).toFixed(2)}%`, color: ret >= 0 ? amber : red },
    { label: "Volatility",    value: `${(vol * 100).toFixed(2)}%`,                        color: cream },
    { label: "Sharpe Ratio",  value: sharpe.toFixed(2),                                   color: sharpe >= 1 ? green : sharpe >= 0 ? amber : red },
    { label: "Max Drawdown",  value: `${(dd * 100).toFixed(2)}%`,                         color: red },
  ];

  metricData.forEach((m, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const mx = 24 + col * 92, my = 38 + row * 44;
    doc.setFillColor(20, 28, 40);
    doc.roundedRect(mx, my, 84, 36, 2, 2, "F");
    doc.setDrawColor(40, 50, 65);
    doc.setLineWidth(0.3);
    doc.roundedRect(mx, my, 84, 36, 2, 2, "S");

    doc.setFont("courier", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...m.color);
    doc.text(m.value, mx + 8, my + 18);

    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...dim);
    doc.setCharSpace(2);
    doc.text(m.label.toUpperCase(), mx + 8, my + 28);
    doc.setCharSpace(0);
  });

  // Allocation section
  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...amber);
  doc.setCharSpace(3);
  doc.text("PORTFOLIO ALLOCATION", 24, 140);
  doc.setCharSpace(0);
  doc.setLineWidth(0.3);
  doc.line(24, 143, W - 24, 143);

  assets.forEach((a: any, i: number) => {
    const w = normWeights[i] ?? 0;
    const by = 152 + i * 14;
    if (by > H - 40) return;

    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...amber);
    doc.text(a.ticker, 24, by);

    // Bar background
    const barX = 60, barW = W - 24 - barX - 18;
    doc.setFillColor(30, 40, 55);
    doc.roundedRect(barX, by - 5, barW, 4, 1, 1, "F");

    // Bar fill
    doc.setFillColor(...amber);
    doc.roundedRect(barX, by - 5, barW * w, 4, 1, 1, "F");

    // Percentage
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...cream);
    doc.text(`${(w * 100).toFixed(1)}%`, W - 24, by, { align: "right" });
  });

  // ── PAGE 3: Individual Returns + AI Insights (if available) ─────────────
  if (Object.keys(indRet).length > 0) {
    doc.addPage();
    doc.setFillColor(...navy);
    doc.rect(0, 0, W, H, "F");
    doc.setFillColor(...amber);
    doc.rect(0, 0, 4, H, "F");

    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...amber);
    doc.setCharSpace(3);
    doc.text("INDIVIDUAL PERFORMANCE", 24, 24);
    doc.setCharSpace(0);
    doc.setDrawColor(...amber);
    doc.setLineWidth(0.3);
    doc.line(24, 27, W - 24, 27);

    const retEntries = Object.entries(indRet).sort((a, b) => (b[1] as number) - (a[1] as number));
    retEntries.forEach(([ticker, r], i) => {
      const rv = r as number;
      const by = 40 + i * 18;
      if (by > H - 40) return;
      const col = rv >= 0 ? green : red;

      doc.setFillColor(20, 28, 40);
      doc.roundedRect(24, by - 6, W - 48, 14, 2, 2, "F");

      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...amber);
      doc.text(ticker, 30, by + 3);

      doc.setFont("courier", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...col);
      doc.text(`${rv >= 0 ? "+" : ""}${(rv * 100).toFixed(1)}%`, W - 30, by + 3, { align: "right" });

      // Mini bar
      const barX = 68, barW = 80;
      const pct = Math.min(Math.abs(rv) / 0.5, 1);
      doc.setFillColor(35, 48, 60);
      doc.roundedRect(barX, by - 2, barW, 3, 1, 1, "F");
      doc.setFillColor(...col);
      doc.roundedRect(barX, by - 2, barW * pct, 3, 1, 1, "F");
    });
  }

  // ── Footer on every page ─────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let pg = 1; pg <= pageCount; pg++) {
    doc.setPage(pg);
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...dim);
    doc.text(`${pg} / ${pageCount}`, W - 24, H - 16, { align: "right" });
  }

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
              { value: "jspdf", label: "↓ Multi-page PDF", desc: "Cover · metrics · allocation · returns" },
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
