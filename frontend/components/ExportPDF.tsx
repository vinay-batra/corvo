"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = { amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", navy: "#0a0e14", cream: "#e8e0cc", cream3: "rgba(232,224,204,0.35)" };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props { data: any; assets: any[]; goals?: any; menuItem?: boolean; onClose?: () => void; onAiGenerationStart?: () => void; onAiGenerationEnd?: () => void; }

// ── jsPDF single-page PDF builder ────────────────────────────────────────────
async function buildJsPDF(data: any, assets: any[], goals?: any): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const isLight = document.documentElement.getAttribute("data-theme") === "light";

  const W = 210, H = 297;
  const ML = 14, MR = 14;
  const CW = W - ML - MR;
  const FOOTER_Y = 280;  // fixed footer top

  const bg:         [number,number,number] = isLight ? [255,255,255]  : [10,14,20];
  const text:       [number,number,number] = isLight ? [26,26,26]     : [232,224,204];
  const cardBg:     [number,number,number] = isLight ? [245,240,232]  : [20,28,40];   // warmer in light
  const cardBorder: [number,number,number] = isLight ? [224,216,200]  : [40,50,65];
  const dim:        [number,number,number] = isLight ? [136,130,112]  : [100,110,115];
  const hdrBg:      [number,number,number] = isLight ? [245,240,232]  : [14,20,30];
  const barTrack:   [number,number,number] = isLight ? [224,216,200]  : [30,40,55];
  const amber:      [number,number,number] = [201,168,76];
  const red:        [number,number,number] = [224,92,92];
  const green:      [number,number,number] = [92,184,138];

  // helpers
  const sectionLabel = (label: string, yy: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...amber);
    doc.setCharSpace(3);
    doc.text(label, ML, yy);
    doc.setCharSpace(0);
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.2);
    doc.line(ML, yy + 2, W - MR, yy + 2);
  };

  const ret    = data.portfolio_return    ?? 0;
  const vol    = data.portfolio_volatility ?? 0;
  const sharpe = vol > 0 ? (ret - 0.04) / vol : 0;
  const dd     = data.max_drawdown ?? 0;
  const score  = computeHealthScore(data);
  const scoreColor = score >= 75 ? green : score >= 50 ? amber : red;
  const weights: number[] = data.weights ?? assets.map((a: any) => a.weight);
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  const normWeights = weights.map(w => w / total);
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const indRet: Record<string, number> = data.individual_returns ?? {};
  const tickerRaw = assets.slice(0, 5).map((a: any) => a.ticker).join("  ·  ") + (assets.length > 5 ? "  ·  …" : "");

  // ── BACKGROUND ───────────────────────────────────────────────────────────────
  doc.setFillColor(...bg);
  doc.rect(0, 0, W, H, "F");

  // ── HEADER ───────────────────────────────────────────────────────────────────
  // 4px amber top stripe
  doc.setFillColor(...amber);
  doc.rect(0, 0, W, 1.5, "F");

  // header background
  doc.setFillColor(...hdrBg);
  doc.rect(0, 1.5, W, 18, "F");

  // CORVO — courier bold amber (keep mono for brand)
  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...amber);
  doc.text("CORVO", ML, 12.5);

  // Subtitle — smaller, tighter, less crowding
  doc.setFont("courier", "normal");
  doc.setFontSize(4.5);
  doc.setTextColor(...dim);
  doc.setCharSpace(3);
  doc.text("PORTFOLIO INTELLIGENCE", ML, 17.5);
  doc.setCharSpace(0);

  // Tickers centered — helvetica bold
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...text);
  let tickerStr = tickerRaw;
  if (doc.getTextWidth(tickerStr) > 80) {
    const parts = assets.slice(0, 5).map((a: any) => a.ticker);
    while (parts.length > 1 && doc.getTextWidth(parts.join("  ·  ") + "...") > 80) parts.pop();
    tickerStr = parts.join("  ·  ") + "...";
  }
  doc.text(tickerStr, W / 2, 12.5, { align: "center" });

  // Date top-right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...dim);
  doc.text(now.toUpperCase(), W - MR, 12.5, { align: "right" });

  // Period below date
  if (data.period) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...dim);
    doc.text(String(data.period).toUpperCase(), W - MR, 17.5, { align: "right" });
  }

  // Amber divider under header
  doc.setDrawColor(...amber);
  doc.setLineWidth(0.3);
  doc.line(0, 19.5, W, 19.5);

  let y = 28;

  // ── PERFORMANCE METRICS ───────────────────────────────────────────────────────
  // Section label + health score on same line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...amber);
  doc.setCharSpace(3);
  doc.text("PERFORMANCE METRICS", ML, y);
  doc.setCharSpace(0);

  doc.setFont("courier", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...scoreColor);
  doc.setCharSpace(0.5);
  doc.text(`HEALTH SCORE  ${score}`, W - MR, y, { align: "right" });
  doc.setCharSpace(0);
  y += 5;

  const cardW = (CW - 3 * 3) / 4;
  const cardH = 30;
  const metricData = [
    { label: "Annual Return", value: `${ret >= 0 ? "+" : ""}${(ret * 100).toFixed(2)}%`, color: ret >= 0 ? amber : red },
    { label: "Volatility",    value: `${(vol * 100).toFixed(2)}%`,                       color: text },
    { label: "Sharpe Ratio",  value: sharpe.toFixed(2),                                  color: sharpe >= 1 ? green : sharpe >= 0 ? amber : red },
    { label: "Max Drawdown",  value: `${(dd * 100).toFixed(2)}%`,                        color: red },
  ];

  metricData.forEach((m, i) => {
    const mx = ML + i * (cardW + 3);
    doc.setFillColor(...cardBg);
    doc.roundedRect(mx, y, cardW, cardH, 1.5, 1.5, "F");
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(mx, y, cardW, cardH, 1.5, 1.5, "S");

    // Value — courier bold, large (keep mono for numbers)
    doc.setFont("courier", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...m.color);
    doc.text(m.value, mx + cardW / 2, y + 16, { align: "center" });

    // Label — helvetica, dim, spaced
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...dim);
    doc.setCharSpace(1.5);
    doc.text(m.label.toUpperCase(), mx + cardW / 2, y + 26, { align: "center" });
    doc.setCharSpace(0);
  });
  y += cardH + 12;

  // ── PORTFOLIO ALLOCATION ──────────────────────────────────────────────────────
  sectionLabel("PORTFOLIO ALLOCATION", y);
  y += 8;

  const allocTickW = 24;
  const allocBarX  = ML + allocTickW;
  const allocPctW  = 16;
  const allocBarW  = CW - allocTickW - allocPctW;
  const barH       = 3.5;
  const allocRowH  = 9;

  assets.forEach((a: any, i: number) => {
    const w = normWeights[i] ?? 0;
    if (y + allocRowH > FOOTER_Y - 6) return;

    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...amber);
    doc.text(a.ticker, ML, y + barH);

    doc.setFillColor(...barTrack);
    doc.roundedRect(allocBarX, y, allocBarW, barH, 1, 1, "F");
    doc.setFillColor(...amber);
    doc.roundedRect(allocBarX, y, allocBarW * w, barH, 1, 1, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...text);
    doc.text(`${(w * 100).toFixed(1)}%`, W - MR, y + barH, { align: "right" });

    y += allocRowH;
  });
  y += 10;

  // ── INDIVIDUAL PERFORMANCE ────────────────────────────────────────────────────
  if (Object.keys(indRet).length > 0 && y + 20 < FOOTER_Y - 6) {
    sectionLabel("INDIVIDUAL PERFORMANCE", y);
    y += 8;

    const retTickW   = 24;
    const retBarX    = ML + retTickW;
    const retBarMaxW = 80;
    const retValW    = 22;
    const retRowH    = 8;

    const retEntries = Object.entries(indRet).sort((a, b) => (b[1] as number) - (a[1] as number));
    retEntries.forEach(([ticker, r]) => {
      const rv = r as number;
      if (y + retRowH > FOOTER_Y - 6) return;
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
    y += 10;
  }

  // ── INVESTOR PROFILE ──────────────────────────────────────────────────────────
  const profileRows: [string, string][] = [];
  if (goals?.age)                 profileRows.push(["Age",                  String(goals.age)]);
  if (goals?.riskTolerance)       profileRows.push(["Risk Tolerance",       goals.riskTolerance.replace(/_/g, " ")]);
  if (goals?.goal)                profileRows.push(["Goal",                 goals.goal]);
  if (goals?.monthlyContribution) profileRows.push(["Monthly Contribution", `$${Number(goals.monthlyContribution).toLocaleString()}`]);
  if (goals?.retirementAge)       profileRows.push(["Retirement Age",       String(goals.retirementAge)]);

  if (profileRows.length > 0 && y + 18 < FOOTER_Y - 6) {
    sectionLabel("INVESTOR PROFILE", y);
    y += 8;

    // 2-column layout
    const colW = CW / 2;
    for (let i = 0; i < profileRows.length; i += 2) {
      if (y + 8 > FOOTER_Y - 6) break;
      ([0, 1] as const).forEach(col => {
        const row = profileRows[i + col];
        if (!row) return;
        const rx = ML + col * colW;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(...dim);
        doc.setCharSpace(1);
        doc.text(row[0].toUpperCase(), rx, y);
        doc.setCharSpace(0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...text);
        doc.text(row[1], rx, y + 5.5);
      });
      y += 11;
    }
    y += 10;
  }

  // ── BENCHMARK COMPARISON ──────────────────────────────────────────────────────
  const benchRet: number | null = data.benchmark_return ?? null;
  if (benchRet !== null && y + 22 < FOOTER_Y - 6) {
    sectionLabel("BENCHMARK COMPARISON", y);
    y += 8;

    const bHalfW = (CW - 10) / 2;
    const bBarH  = 4;
    const bX2    = ML + bHalfW + 10;
    const maxVal = Math.max(Math.abs(ret), Math.abs(benchRet), 0.01);
    const pCol   = ret      >= 0 ? green : red;
    const bCol   = benchRet >= 0 ? green : red;

    // Labels
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...dim);
    doc.setCharSpace(1);
    doc.text("PORTFOLIO", ML, y);
    const bLabel = data.benchmark_ticker ? `BENCHMARK (${data.benchmark_ticker})` : "BENCHMARK (S&P 500)";
    doc.text(bLabel, bX2, y);
    doc.setCharSpace(0);
    y += 4;

    // Portfolio bar
    const pBarW = bHalfW * Math.min(Math.abs(ret) / maxVal, 1);
    doc.setFillColor(...barTrack);
    doc.roundedRect(ML, y, bHalfW, bBarH, 1, 1, "F");
    doc.setFillColor(...pCol);
    doc.roundedRect(ML, y, pBarW, bBarH, 1, 1, "F");

    // Benchmark bar
    const benchBarW = bHalfW * Math.min(Math.abs(benchRet) / maxVal, 1);
    doc.setFillColor(...barTrack);
    doc.roundedRect(bX2, y, bHalfW, bBarH, 1, 1, "F");
    doc.setFillColor(...bCol);
    doc.roundedRect(bX2, y, benchBarW, bBarH, 1, 1, "F");
    y += bBarH + 3.5;

    // Values
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...pCol);
    doc.text(`${ret >= 0 ? "+" : ""}${(ret * 100).toFixed(2)}%`, ML, y);
    doc.setTextColor(...bCol);
    doc.text(`${benchRet >= 0 ? "+" : ""}${(benchRet * 100).toFixed(2)}%`, bX2, y);
    y += 10;
  }

  // ── KEY INSIGHTS ──────────────────────────────────────────────────────────────
  const insights: string[] = Array.isArray(data.ai_insights) ? data.ai_insights.slice(0, 3) : [];
  if (insights.length > 0 && y + 16 < FOOTER_Y - 6) {
    sectionLabel("KEY INSIGHTS", y);
    y += 8;

    insights.forEach(insight => {
      if (y + 6 > FOOTER_Y - 6) return;
      doc.setFillColor(...amber);
      doc.circle(ML + 1.5, y - 1.2, 0.9, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...text);
      const lines = doc.splitTextToSize(String(insight), CW - 8);
      doc.text(lines[0], ML + 5, y);
      y += 7;
    });
    y += 6;
  }

  // ── FOOTER BAR (y=280, always at fixed position) ─────────────────────────────
  doc.setDrawColor(...amber);
  doc.setLineWidth(0.5);
  doc.line(0, FOOTER_Y, W, FOOTER_Y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...dim);
  doc.text(
    "CORVO PORTFOLIO INTELLIGENCE  ·  corvo.capital  ·  Not financial advice  ·  Data from Yahoo Finance",
    W / 2, FOOTER_Y + 7, { align: "center" },
  );

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
    .replace(/^# (.+)$/gm, `<div style="font-size:11px;letter-spacing:4px;color:#c9a84c;text-transform:uppercase;margin:0 0 16px;border-bottom:2px solid rgba(201,168,76,0.3);padding-bottom:6px;font-family:'Courier New',monospace">$1</div>`)
    .replace(/^## (.+)$/gm, `<div style="font-size:9px;letter-spacing:4px;color:#c9a84c;text-transform:uppercase;margin:24px 0 10px;border-bottom:1px solid rgba(201,168,76,0.2);padding-bottom:4px">$1</div>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${strongColor}">$1</strong>`)
    .replace(/^[•\-] (.+)$/gm, `<div style="display:flex;gap:8px;margin:5px 0"><span style="color:#c9a84c">▸</span><span>$1</span></div>`)
    .replace(/\n\n/g, `</p><p style="margin:10px 0;color:${mutedText(0.8)};font-family:Georgia,serif;font-size:13px;line-height:1.8">`);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${printCss}
    .hdr{background:${hdrBg};border-bottom:2px solid #c9a84c;padding:32px 48px 36px;margin:-48px -48px 40px;display:flex;justify-content:space-between;align-items:flex-end}
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
    <div><div class="brand">CORVO</div></div>
    <div style="text-align:right">
      <div style="font-size:16px;font-weight:700;color:#c9a84c;letter-spacing:1px">${assets.map((a: any) => a.ticker).join("  ·  ")}</div>
      <div style="font-size:10px;color:${mutedText(0.5)};margin-top:4px">${now}${data.period ? "  ·  " + data.period : ""}</div>
    </div>
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

export default function ExportPDF({ data, assets, goals, menuItem, onClose, onAiGenerationStart, onAiGenerationEnd }: Props) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"jspdf" | "ai">("jspdf");
  const [open, setOpen] = useState(false);

  const handleExport = async (exportMode?: "jspdf" | "ai") => {
    if (!data) return;
    const m = exportMode ?? mode;
    setLoading(true); setOpen(false); onClose?.();
    if (m === "ai") onAiGenerationStart?.();
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
      if (m === "ai") onAiGenerationEnd?.();
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
    return <>{row("AI Report", "ai")}{row("↓ Download PDF", "jspdf")}</>;
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

      <AnimatePresence initial={false}>
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
