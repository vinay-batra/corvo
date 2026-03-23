"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import { useState, useEffect, useRef } from "react";

function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const duration = 1000;
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplayed(value * e);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, value]);
  return <span ref={ref}>{format(displayed)}</span>;
}

const EXPLAINERS = [
  { title: "Annual Return", simple: "How much your portfolio grew over the period as a percentage.", example: "If you invested $10,000 and it's now $11,500, your return is +15%.", good: "Anything above the S&P 500 average of ~10%/year is excellent." },
  { title: "Volatility", simple: "How wildly your portfolio swings up and down day to day.", example: "30% volatility means your portfolio could swing ±30% in a year.", good: "Under 15% is low risk. 15–25% moderate. Over 30% is high risk." },
  { title: "Sharpe Ratio", simple: "How much return you're getting per unit of risk you're taking.", example: "Sharpe of 2.0 = great returns for the risk. 0.2 = lots of risk, little gain.", good: "Above 1.0 is good. Above 2.0 is excellent. Below 0 means underperforming cash." },
  { title: "Max Drawdown", simple: "The biggest drop from peak to trough that actually happened.", example: "Portfolio hits $50k then drops to $35k — max drawdown is -30%.", good: "Closer to 0% is better. Under 10% is very stable." },
];

export default function Metrics({ data }: { data: any }) {
  const [modal, setModal] = useState<number | null>(null);

  const sharpe = data.portfolio_volatility > 0
    ? (data.portfolio_return - 0.04) / data.portfolio_volatility : 0;

  const items = [
    { label: "Return",       value: data.portfolio_return,     fmt: (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`, positive: data.portfolio_return >= 0, bar: null },
    { label: "Volatility",   value: data.portfolio_volatility, fmt: (v: number) => `${(v * 100).toFixed(2)}%`,                      positive: true, bar: data.portfolio_volatility / 0.6 },
    { label: "Sharpe",       value: sharpe,                    fmt: (v: number) => v.toFixed(2),                                    positive: sharpe >= 0, bar: Math.min(Math.max(sharpe / 3, 0), 1) },
    { label: "Max Drawdown", value: data.max_drawdown,         fmt: (v: number) => `${(v * 100).toFixed(2)}%`,                      positive: false, bar: null },
  ];

  return (
    <>
      {items.map(({ label, value, fmt, positive, bar }, i) => (
        <motion.div key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.4 }}
          style={{ border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "16px 18px", background: "#fff", position: "relative", overflow: "hidden" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 9, letterSpacing: 2, color: "#9b9b98", textTransform: "uppercase" }}>{label}</p>
            <button onClick={() => setModal(i)} style={{ width: 18, height: 18, borderRadius: "50%", background: "#f0efed", border: "0.5px solid rgba(0,0,0,0.1)", color: "#9b9b98", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#111"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f0efed"; e.currentTarget.style.color = "#9b9b98"; }}>?</button>
          </div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 26, fontWeight: 700, letterSpacing: -1, color: label === "Max Drawdown" ? "#111" : positive ? "#111" : "#c0392b", lineHeight: 1 }}>
            <AnimatedNumber value={value} format={fmt} />
          </p>
          {bar !== null && (
            <div style={{ marginTop: 10, height: 2, background: "rgba(0,0,0,0.06)", borderRadius: 1, overflow: "hidden" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(bar, 1) * 100}%` }} transition={{ duration: 1, delay: i * 0.07 + 0.3 }}
                style={{ height: "100%", background: "#111", borderRadius: 1 }} />
            </div>
          )}
        </motion.div>
      ))}

      <AnimatePresence>
        {modal !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setModal(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 16, padding: 28, maxWidth: 420, width: "100%", position: "relative" }}>
              <button onClick={() => setModal(null)} style={{ position: "absolute", top: 14, right: 14, background: "#f0efed", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontSize: 12, color: "#6b6b68" }}>✕</button>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "#9b9b98", textTransform: "uppercase", marginBottom: 6 }}>Understanding</p>
              <h3 style={{ fontSize: 20, fontWeight: 500, color: "#111", marginBottom: 20 }}>{EXPLAINERS[modal].title}</h3>
              {[
                { label: "Plain English", text: EXPLAINERS[modal].simple },
                { label: "Example", text: EXPLAINERS[modal].example },
                { label: "What's good?", text: EXPLAINERS[modal].good },
              ].map(({ label, text }) => (
                <div key={label} style={{ background: "#f8f8f7", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                  <p style={{ fontSize: 9, letterSpacing: 2, color: "#9b9b98", textTransform: "uppercase", marginBottom: 5 }}>{label}</p>
                  <p style={{ fontSize: 13, color: "#111", lineHeight: 1.65 }}>{text}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
