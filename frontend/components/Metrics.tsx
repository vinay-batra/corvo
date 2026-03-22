"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{ background: "rgba(4,8,24,0.98)", border: `1px solid ${accentColor}30`, borderRadius: 24, padding: "32px", maxWidth: 440, width: "100%", position: "relative", overflow: "hidden" }}
      >
        {/* Animated top border */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, borderRadius: "24px 24px 0 0", transformOrigin: "left" }}
        />

        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%", color: "var(--text-muted)", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
        >✕</button>

        <p style={{ fontSize: 9, letterSpacing: 4, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 6 }}>Understanding</p>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: accentColor, letterSpacing: -0.5, marginBottom: 24 }}>{title}</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Plain English", content: simple },
            { label: "Example", content: example },
            { label: "What's Good?", content: good },
          ].map(({ label, content }, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              style={{ background: "rgba(255,255,255,0.025)", borderRadius: 12, padding: "14px 16px", borderLeft: i === 0 ? `2px solid ${accentColor}` : "2px solid rgba(255,255,255,0.06)" }}
            >
              <p style={{ fontSize: 9, color: "var(--text-faint)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
              <p style={{ fontSize: 13, color: i === 0 ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1.7 }}>{content}</p>
            </motion.div>
          ))}
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
    const end = value;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayed(end * eased);
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
    simple: "How wildly your portfolio swings up and down. High volatility means your portfolio value jumps around a lot day-to-day.",
    example: "A portfolio with 30% volatility could swing ±30% in a year. Government bonds might have 3% volatility — very stable.",
    good: "Lower is generally safer. Under 15% is low risk, 15-25% is moderate, over 30% is high risk.",
  },
  {
    title: "Sharpe Ratio",
    simple: "A score for how much return you're getting per unit of risk. It tells you if your gains are worth the ride.",
    example: "A Sharpe of 2.0 means you're getting great returns for your risk. A Sharpe of 0.2 means lots of risk, small gains.",
    good: "Above 1.0 is good. Above 2.0 is excellent. Below 0 means you'd be better off in a savings account.",
  },
  {
    title: "Max Drawdown",
    simple: "The biggest drop your portfolio experienced from its peak to its lowest point. The worst-case scenario that actually happened.",
    example: "If your portfolio hit $50,000 then dropped to $35,000, your max drawdown is -30%.",
    good: "Closer to 0% is better. Under 10% is very stable. Over 30% means you'd need strong nerves.",
  },
];

export default function Metrics({ data }: { data: any }) {
  const [openModal, setOpenModal] = useState<number | null>(null);

  const sharpe = data.portfolio_volatility > 0
    ? (data.portfolio_return - 0.04) / data.portfolio_volatility
    : 0;

  const items = [
    {
      label: "Return", sublabel: "Annualized",
      value: data.portfolio_return,
      fmt: (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`,
      color: data.portfolio_return >= 0 ? "var(--green)" : "var(--rose)",
      icon: data.portfolio_return >= 0 ? "↑" : "↓",
      bar: null,
    },
    {
      label: "Volatility", sublabel: "Annualized",
      value: data.portfolio_volatility,
      fmt: (v: number) => `${(v * 100).toFixed(2)}%`,
      color: "var(--cyan)",
      icon: "~",
      bar: { value: data.portfolio_volatility / 0.6, gradient: "linear-gradient(90deg, var(--green), var(--cyan), var(--rose))" },
    },
    {
      label: "Sharpe", sublabel: "Risk-adjusted",
      value: sharpe,
      fmt: (v: number) => v.toFixed(2),
      color: sharpe >= 1 ? "var(--green)" : sharpe >= 0 ? "var(--cyan)" : "var(--rose)",
      icon: "◈",
      bar: { value: Math.min(Math.max(sharpe / 3, 0), 1), gradient: sharpe >= 1 ? "var(--green)" : "var(--cyan)" },
    },
    {
      label: "Max Drawdown", sublabel: "Peak to trough",
      value: data.max_drawdown,
      fmt: (v: number) => `${(v * 100).toFixed(2)}%`,
      color: "var(--rose)",
      icon: "↓",
      bar: null,
    },
  ];

  return (
    <>
      {items.map(({ label, sublabel, value, fmt, color, icon, bar }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          style={{
            background: "var(--bg-card)", border: "1px solid var(--border-dim)",
            borderRadius: 20, padding: "22px 22px 20px", position: "relative",
            overflow: "hidden", cursor: "default",
          }}
        >
          {/* Glowing top accent */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: i * 0.07 + 0.2, duration: 0.6 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}80, transparent)`, transformOrigin: "left" }}
          />

          {/* Corner glow */}
          <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${color}08 0%, transparent 70%)`, pointerEvents: "none" }} />

          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 3 }}>{label}</p>
              <p style={{ fontSize: 8, color: "var(--text-faint)", opacity: 0.6, letterSpacing: 1 }}>{sublabel}</p>
            </div>
            <button
              onClick={() => setOpenModal(i)}
              style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-faint)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; e.currentTarget.style.background = `${color}12`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--text-faint)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            >?</button>
          </div>

          {/* Value */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: bar ? 14 : 0 }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, letterSpacing: -1.5, color, lineHeight: 1, textShadow: `0 0 30px ${color}30` }}>
              <AnimatedNumber value={value} format={fmt} />
            </p>
          </div>

          {/* Bar */}
          {bar && (
            <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(bar.value, 1) * 100}%` }}
                transition={{ duration: 1.2, delay: i * 0.07 + 0.4, ease: "easeOut" }}
                style={{ height: "100%", background: bar.gradient, borderRadius: 2, boxShadow: `0 0 8px ${color}40` }}
              />
            </div>
          )}
        </motion.div>
      ))}

      <AnimatePresence>
        {openModal !== null && (
          <ExplainerModal
            {...EXPLAINERS[openModal]}
            accentColor={items[openModal].color}
            onClose={() => setOpenModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
