"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SharePortfolioProps {
  data: any;
  assets: { ticker: string; weight: number }[];
  period: string;
  benchmark: string;
}

function getShareUrl(assets: { ticker: string; weight: number }[]): string {
  const encoded = btoa(JSON.stringify(assets));
  return `${window.location.origin}/app?portfolio=${encoded}`;
}

function downloadCardAsImage(
  assets: { ticker: string; weight: number }[],
  ret: string,
  vol: string,
  data: any,
  isPos: boolean,
  period: string,
) {
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  const scale = 2;
  const W = 600, H = 290;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const bgMain   = isDark ? "#0d1117" : "#ffffff";
  const bgCard   = isDark ? "#111620" : "#f4f4f5";
  const borderC  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const textPrim = isDark ? "#e8e0cc" : "#111827";
  const textMut  = isDark ? "rgba(232,224,204,0.38)" : "#6b7280";
  const accentC  = isDark ? "#c9a84c" : "#8b6914";
  const posC     = "#5cb88a";
  const negC     = "#e05c5c";
  const retColor = isPos ? posC : negC;

  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Outer background
  ctx.fillStyle = bgMain;
  rr(0, 0, W, H, 14);
  ctx.fill();

  // Outer border
  ctx.strokeStyle = borderC;
  ctx.lineWidth = 1;
  rr(0.5, 0.5, W - 1, H - 1, 14);
  ctx.stroke();

  const PAD = 28;

  // Header: "CORVO" label
  ctx.font = `700 10px "Space Mono", monospace`;
  ctx.fillStyle = accentC;
  ctx.letterSpacing = "3px";
  ctx.fillText("CORVO", PAD, PAD + 10);
  ctx.letterSpacing = "0px";

  // Period chip top-right
  ctx.font = `400 10px "Space Mono", monospace`;
  ctx.fillStyle = textMut;
  ctx.textAlign = "right";
  ctx.fillText(period, W - PAD, PAD + 10);
  ctx.textAlign = "left";

  // Return — large center
  const retStr = `${isPos ? "+" : ""}${ret}%`;
  ctx.font = `700 48px "Space Mono", monospace`;
  ctx.fillStyle = retColor;
  ctx.textAlign = "center";
  ctx.fillText(retStr, W / 2, 100);
  ctx.textAlign = "left";

  // Sub-label under return
  ctx.font = `400 11px Inter, sans-serif`;
  ctx.fillStyle = textMut;
  ctx.textAlign = "center";
  ctx.fillText("Portfolio return", W / 2, 122);
  ctx.textAlign = "left";

  // Inner card background
  const cardY = 146, cardH = 96;
  ctx.fillStyle = bgCard;
  rr(PAD, cardY, W - PAD * 2, cardH, 10);
  ctx.fill();
  ctx.strokeStyle = borderC;
  ctx.lineWidth = 0.8;
  rr(PAD, cardY, W - PAD * 2, cardH, 10);
  ctx.stroke();

  // Tickers row
  const colW = (W - PAD * 2) / assets.length;
  assets.slice(0, 6).forEach((a, i) => {
    const cx = PAD + i * colW + colW / 2;
    ctx.font = `700 12px "Space Mono", monospace`;
    ctx.fillStyle = accentC;
    ctx.textAlign = "center";
    ctx.fillText(a.ticker, cx, cardY + 26);
    ctx.font = `400 10px Inter, sans-serif`;
    ctx.fillStyle = textMut;
    ctx.fillText(`${(a.weight * 100).toFixed(0)}%`, cx, cardY + 42);
  });

  // Divider
  ctx.strokeStyle = borderC;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(PAD + 8, cardY + 56);
  ctx.lineTo(W - PAD - 8, cardY + 56);
  ctx.stroke();

  // Metrics row
  const sharpe = (data.sharpe_ratio ?? ((data.annualized_return ?? data.portfolio_return) - 0.04) / data.portfolio_volatility).toFixed(2);
  const drawdown = (data.max_drawdown * 100).toFixed(1) + "%";
  const metrics = [
    { label: "VOLATILITY", val: vol + "%" },
    { label: "MAX DRAWDOWN", val: drawdown },
    { label: "SHARPE", val: sharpe },
  ];
  const mColW = (W - PAD * 2) / metrics.length;
  metrics.forEach((m, i) => {
    const mx = PAD + i * mColW + mColW / 2;
    ctx.font = `400 8px Inter, sans-serif`;
    ctx.fillStyle = textMut;
    ctx.letterSpacing = "1px";
    ctx.textAlign = "center";
    ctx.fillText(m.label, mx, cardY + 72);
    ctx.letterSpacing = "0px";
    ctx.font = `600 12px "Space Mono", monospace`;
    ctx.fillStyle = textPrim;
    ctx.fillText(m.val, mx, cardY + 89);
  });
  ctx.textAlign = "left";

  // Footer watermark
  ctx.font = `400 9px Inter, sans-serif`;
  ctx.fillStyle = textMut;
  ctx.textAlign = "center";
  ctx.fillText("corvo.capital", W / 2, H - 12);
  ctx.textAlign = "left";

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `corvo-${assets.map(x => x.ticker).join("-")}-${period}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export default function SharePortfolio({ data, assets, period }: SharePortfolioProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  if (!data) return null;

  const ret = (data.portfolio_return * 100).toFixed(1);
  const vol = (data.portfolio_volatility * 100).toFixed(1);
  const isPos = data.portfolio_return >= 0;
  const retLabel = `${isPos ? "+" : ""}${ret}%`;

  const handleCopy = () => {
    const url = getShareUrl(assets);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareX = () => {
    const url = getShareUrl(assets);
    const text = `My portfolio is ${retLabel} on Corvo`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleShareLinkedIn = () => {
    const url = getShareUrl(assets);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const btnBase: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: "0.5px solid var(--border2)",
    background: "var(--bg3)", color: "var(--text2)", transition: "all 0.15s",
    flex: 1,
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{
          height: 32, display: "flex", alignItems: "center", gap: 5,
          padding: "0 12px", background: "transparent",
          border: "0.5px solid var(--border)", borderRadius: 8,
          color: "var(--text3)", fontSize: 11, fontFamily: "var(--font-mono)",
          cursor: "pointer", letterSpacing: 0.5, whiteSpace: "nowrap",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        Share
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            // initial={false} is required — do not remove
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "var(--card-bg)", border: "1px solid var(--border2)", borderRadius: 16, padding: 28, width: "100%", maxWidth: "min(480px, 95vw)", position: "relative" }}>

              {/* Close */}
              <button onClick={() => setOpen(false)}
                style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>

              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>Share Portfolio</p>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  {assets.map(a => a.ticker).join(" + ")}
                </h2>
                <p style={{ fontSize: 12, color: "var(--text3)" }}>
                  <span style={{ color: isPos ? "var(--green)" : "var(--red)" }}>{isPos ? "+" : ""}{ret}% return</span>
                  {" · "}{vol}% volatility
                  {" · "}{period}
                </p>
              </div>

              {/* Preview card */}
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Portfolio</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {assets.map((a, i) => (
                        <span key={i} style={{ fontSize: 10, fontFamily: "Space Mono,monospace", color: "var(--accent)", background: "rgba(var(--accent-rgb), 0.1)", padding: "2px 7px", borderRadius: 4 }}>
                          {a.ticker} {(a.weight * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Return</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: isPos ? "var(--green)" : "var(--red)", fontFamily: "Space Mono,monospace" }}>
                      {isPos ? "+" : ""}{ret}%
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {[
                    { label: "Volatility", val: vol + "%" },
                    { label: "Max Drawdown", val: (data.max_drawdown * 100).toFixed(1) + "%" },
                    { label: "Sharpe", val: (data.sharpe_ratio ?? ((data.annualized_return ?? data.portfolio_return) - 0.04) / data.portfolio_volatility).toFixed(2) },
                  ].map(m => (
                    <div key={m.label}>
                      <p style={{ fontSize: 8, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>{m.label}</p>
                      <p style={{ fontSize: 13, color: "var(--text)", fontFamily: "Space Mono,monospace" }}>{m.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* URL box + copy */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, padding: "9px 12px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {typeof window !== "undefined" ? getShareUrl(assets) : ""}
                </div>
                <button onClick={handleCopy}
                  style={{ padding: "9px 16px", background: copied ? "rgba(92,184,138,0.15)" : "rgba(var(--accent-rgb), 0.1)", border: `1px solid ${copied ? "rgba(92,184,138,0.4)" : "rgba(var(--accent-rgb), 0.3)"}`, borderRadius: 8, color: copied ? "#5cb88a" : "var(--accent)", fontSize: 11, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s" }}>
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {/* Share action buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => downloadCardAsImage(assets, ret, vol, data, isPos, period)}
                  style={btnBase}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text2)"; }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download
                </button>
                <button
                  onClick={handleShareX}
                  style={btnBase}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text2)"; }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
                  </svg>
                  Share on X
                </button>
                <button
                  onClick={handleShareLinkedIn}
                  style={btnBase}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text2)"; }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>
                  </svg>
                  LinkedIn
                </button>
              </div>

              <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 10, textAlign: "center" }}>
                Anyone with this link can view your portfolio analysis
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
