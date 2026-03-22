"use client";

import { motion, useSpring, useTransform, useInView } from "framer-motion";
import { useState, useEffect, useRef } from "react";

interface ExplainerModalProps {
  title: string;
  simple: string;
  example: string;
  good: string;
  onClose: () => void;
  accentColor: string;
}

function ExplainerModal({ title, simple, example, good, onClose, accentColor }: ExplainerModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        onClick={e => e.stopPropagation()}
        style={{ background: "#0a1222", border: `1px solid ${accentColor}40`, borderRadius: 16, padding: "28px 32px", maxWidth: 420, width: "100%", position: "relative" }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, borderRadius: "16px 16px 0 0" }} />
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "rgba(226,232,240,0.3)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>

        <p style={{ fontSize: 9, letterSpacing: 3, color: "rgba(226,232,240,0.3)", textTransform: "uppercase", marginBottom: 8 }}>What is</p>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: accentColor, letterSpacing: 2, marginBottom: 20 }}>{title}?</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px 16px", borderLeft: `3px solid ${accentColor}` }}>
            <p style={{ fontSize: 11, color: "rgba(226,232,240,0.4)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Plain English</p>
            <p style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.65 }}>{simple}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, color: "rgba(226,232,240,0.4)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Example</p>
            <p style={{ fontSize: 13, color: "rgba(226,232,240,0.7)", lineHeight: 1.65 }}>{example}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, color: "rgba(226,232,240,0.4)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>What's Good?</p>
            <p style={{ fontSize: 13, color: "rgba(226,232,240,0.7)", lineHeight: 1.65 }}>{good}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = 0;
    const end = value;
    const duration = 1000;
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, value]);

  return <span ref={ref}>{format(displayed)}</span>;
}

const EXPLAINERS = [
  {
    title: "Annual Return",
    simple: "How much your portfolio grew (or shrank) over one year, expressed as a percentage. This is your profit or loss.",
    example: "If you invested $10,000 and it's now worth $11,500, your return is +15%. If it's worth $9,200, your return is -8%.",
    good: "Anything beating the S&P 500's historical average of ~10%/year is excellent. Positive is good, higher is better.",
  },
  {
    title: "Volatility",
    simple: "How wildly your portfolio swings up and down. High volatility means your portfolio value jumps around a lot day-to-day. Low volatility means it's stable.",
    example: "A portfolio with 30% volatility could swing ±30% in a year. Government bonds might have 3% volatility — very stable.",
    good: "Lower is generally safer. Under 15% is low risk, 15-25% is moderate, over 30% is high risk (like holding crypto).",
  },
  {
    title: "Sharpe Ratio",
    simple: "A score for how much return you're getting per unit of risk. It tells you if your gains are worth the stomach-churning ride.",
    example: "A Sharpe of 2.0 means you're getting great returns for your risk level. A Sharpe of 0.2 means you're taking a lot of risk for small gains.",
    good: "Above 1.0 is good. Above 2.0 is excellent. Below 0 means you'd be better off in a savings account.",
  },
  {
    title: "Max Drawdown",
    simple: "The biggest drop your portfolio experienced from its peak to its lowest point. It's the worst-case scenario that actually happened.",
    example: "If your portfolio hit $50,000 then dropped to $35,000, your max drawdown is -30%. It shows how much pain you'd have felt at the worst moment.",
    good: "Closer to 0% is better. Under 10% is very stable. Over 30% means you'd need strong nerves to hold through the dip.",
  },
];

const COLORS = ["var(--green)", "var(--cyan)", "var(--purple)", "var(--red)"];

export default function Metrics({ data }: { data: any }) {
  const [openModal, setOpenModal] = useState<number | null>(null);

  const sharpe = data.portfolio_volatility > 0
    ? (data.portfolio_return - 0.04) / data.portfolio_volatility
    : 0;

  const items = [
    { label: "Return",      value: data.portfolio_return,     fmt: (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`, color: data.portfolio_return >= 0 ? "var(--green)" : "var(--red)" },
    { label: "Volatility",  value: data.portfolio_volatility, fmt: (v: number) => `${(v * 100).toFixed(2)}%`,                       color: "var(--cyan)" },
    { label: "Sharpe",      value: sharpe,                    fmt: (v: number) => v.toFixed(2),                                     color: sharpe >= 1 ? "var(--green)" : sharpe >= 0 ? "var(--cyan)" : "var(--red)" },
    { label: "Max Drawdown",value: data.max_drawdown,         fmt: (v: number) => `${(v * 100).toFixed(2)}%`,                       color: "var(--red)" },
  ];

  return (
    <>
      {items.map(({ label, value, fmt, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "22px 24px", position: "relative", overflow: "hidden", cursor: "default" }}
          whileHover={{ borderColor: color, backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          {/* Top shimmer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: i * 0.1 + 0.3 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
          />

          {/* Label + ? button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</p>
            <button
              onClick={() => setOpenModal(i)}
              style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(226,232,240,0.4)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body)", transition: "all 0.2s", flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(226,232,240,0.4)"; }}
            >?</button>
          </div>

          {/* Animated value */}
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, letterSpacing: -1, color, lineHeight: 1 }}>
            <AnimatedNumber value={value} format={fmt} />
          </p>

          {/* Mini progress bar for context */}
          {label === "Sharpe" && (
            <div style={{ marginTop: 12, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(Math.max(sharpe / 3, 0), 1) * 100}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                style={{ height: "100%", background: color, borderRadius: 1 }}
              />
            </div>
          )}
          {label === "Volatility" && (
            <div style={{ marginTop: 12, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(data.portfolio_volatility / 0.6, 1) * 100}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                style={{ height: "100%", background: `linear-gradient(90deg, var(--green), var(--cyan), var(--red))`, borderRadius: 1 }}
              />
            </div>
          )}
        </motion.div>
      ))}

      {/* Modal */}
      {openModal !== null && (
        <ExplainerModal
          {...EXPLAINERS[openModal]}
          accentColor={COLORS[openModal]}
          onClose={() => setOpenModal(null)}
        />
      )}
    </>
  );
}
