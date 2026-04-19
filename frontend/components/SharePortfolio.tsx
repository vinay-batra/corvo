"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  amber: "var(--accent)", amber2: "rgba(184,134,11,0.1)",
  navy: "#0a0e14", navy2: "#0d1117", navy3: "#111620",
  border: "rgba(255,255,255,0.06)", border2: "rgba(255,255,255,0.1)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.65)", cream3: "rgba(232,224,204,0.35)",
};

interface SharePortfolioProps {
  data: any;
  assets: { ticker: string; weight: number }[];
  period: string;
  benchmark: string;
}

export default function SharePortfolio({ data, assets, period, benchmark }: SharePortfolioProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  if (!data) return null;

  const generateShareUrl = () => {
    const encoded = btoa(JSON.stringify(assets));
    return `${window.location.origin}/app?portfolio=${encoded}`;
  };

  const handleShare = () => {
    const url = generateShareUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const ret = (data.portfolio_return * 100).toFixed(1);
  const vol = (data.portfolio_volatility * 100).toFixed(1);
  const isPos = data.portfolio_return >= 0;

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px", background: "rgba(255,255,255,0.04)",
          border: `1px solid ${C.border}`, borderRadius: 7,
          color: C.cream3, fontSize: 11, cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(184,134,11,0.3)"; e.currentTarget.style.color = C.amber; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.cream3; }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        Share
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: C.navy2, border: `1px solid ${C.border2}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: "min(480px, 95vw)", position: "relative" }}>

              {/* Close */}
              <button onClick={() => setOpen(false)}
                style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: C.cream3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>

              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 9, letterSpacing: 3, color: C.amber, textTransform: "uppercase", marginBottom: 6 }}>Share Portfolio</p>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: C.cream, marginBottom: 4 }}>
                  {assets.map(a => a.ticker).join(" + ")}
                </h2>
                <p style={{ fontSize: 12, color: C.cream3 }}>
                  <span style={{ color: isPos ? "#5cb88a" : "#e05c5c" }}>{isPos ? "+" : ""}{ret}% return</span>
                  {" · "}{vol}% volatility
                  {" · "}{period}
                </p>
              </div>

              {/* Preview card */}
              <div style={{ background: C.navy3, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: 2, color: C.cream3, textTransform: "uppercase", marginBottom: 4 }}>Portfolio</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {assets.map((a, i) => (
                        <span key={i} style={{ fontSize: 10, fontFamily: "Space Mono,monospace", color: C.amber, background: C.amber2, padding: "2px 7px", borderRadius: 4 }}>
                          {a.ticker} {(a.weight * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 9, letterSpacing: 2, color: C.cream3, textTransform: "uppercase", marginBottom: 4 }}>Return</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: isPos ? "#5cb88a" : "#e05c5c", fontFamily: "Space Mono,monospace" }}>
                      {isPos ? "+" : ""}{ret}%
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {[
                    { label: "Volatility", val: vol + "%" },
                    { label: "Max Drawdown", val: (data.max_drawdown * 100).toFixed(1) + "%" },
                    { label: "Sharpe", val: ((data.portfolio_return - 0.04) / data.portfolio_volatility).toFixed(2) },
                  ].map(m => (
                    <div key={m.label}>
                      <p style={{ fontSize: 8, letterSpacing: 2, color: C.cream3, textTransform: "uppercase", marginBottom: 2 }}>{m.label}</p>
                      <p style={{ fontSize: 13, color: C.cream, fontFamily: "Space Mono,monospace" }}>{m.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* URL box */}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, padding: "9px 12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11, color: C.cream3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {typeof window !== "undefined" ? generateShareUrl() : ""}
                </div>
                <button onClick={handleShare}
                  style={{ padding: "9px 16px", background: copied ? "rgba(92,184,138,0.15)" : C.amber2, border: `1px solid ${copied ? "rgba(92,184,138,0.4)" : "rgba(184,134,11,0.3)"}`, borderRadius: 8, color: copied ? "#5cb88a" : C.amber, fontSize: 11, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s" }}>
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>

              <p style={{ fontSize: 10, color: C.cream3, marginTop: 10, textAlign: "center" }}>
                Anyone with this link can view your portfolio analysis
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
