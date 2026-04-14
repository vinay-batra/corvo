"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ─── Particle Canvas ─── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const N = 60;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.8 + 0.6,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < N; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(201,168,76,0.4)";
        ctx.fill();
        for (let j = i + 1; j < N; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(201,168,76,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

/* ─── Reveal hook ─── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Reveal wrapper ─── */
function Reveal({ children, delay = 0, y = 40, style = {} }: { children: React.ReactNode; delay?: number; y?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : `translateY(${y}px)`, transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

/* ─── Animated Counter ─── */
function Counter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useReveal(0.5);
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, target, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── SVG Icons ─── */
const IconTransparency = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="13" stroke="rgba(201,168,76,0.8)" strokeWidth="1.5" />
    <path d="M16 8v8l5 3" stroke="rgba(201,168,76,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 16h2M21 16h2M16 9v2M16 21v2" stroke="rgba(201,168,76,0.4)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconIntelligence = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M16 3 L17.8 13.2 L28 15 L17.8 16.8 L16 27 L14.2 16.8 L4 15 L14.2 13.2 Z" stroke="rgba(201,168,76,0.8)" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(201,168,76,0.06)" />
    <circle cx="7" cy="7" r="1.5" fill="rgba(201,168,76,0.4)" />
    <circle cx="25" cy="25" r="1.5" fill="rgba(201,168,76,0.4)" />
  </svg>
);

const IconEducation = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M4 12L16 6L28 12L16 18L4 12Z" stroke="rgba(201,168,76,0.8)" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(201,168,76,0.06)" />
    <path d="M9 15v7c0 2.2 3.1 4 7 4s7-1.8 7-4v-7" stroke="rgba(201,168,76,0.7)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M28 12v5" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/* ─── Value Card ─── */
function ValueCard({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      background: "rgba(255,255,255,0.018)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 20,
      padding: "36px 32px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        {icon}
      </div>
      <h3 style={{ fontFamily: "Space Mono,monospace", fontSize: 16, fontWeight: 700, color: "#e8e0cc", marginBottom: 10, letterSpacing: -0.3 }}>{title}</h3>
      <p style={{ fontSize: 14, color: "rgba(232,224,204,0.45)", lineHeight: 1.75, fontWeight: 300 }}>{desc}</p>
    </div>
  );
}

/* ─── Product Timeline Step ─── */
function TimelineStep({ n, title, desc, delay, isLast = false }: { n: string; title: string; desc: string; delay: number; isLast?: boolean }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-24px)", transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`, display: "flex", gap: 24, position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 11, fontWeight: 700, color: "#c9a84c" }}>{n}</span>
        </div>
        {!isLast && <div style={{ width: 1, flex: 1, marginTop: 8, background: "linear-gradient(to bottom, rgba(201,168,76,0.25), rgba(201,168,76,0.04))", minHeight: 40 }} />}
      </div>
      <div style={{ paddingTop: 8, paddingBottom: isLast ? 0 : 40 }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: "#e8e0cc", marginBottom: 6, letterSpacing: -0.3 }}>{title}</h3>
        <p style={{ fontSize: 14, color: "rgba(232,224,204,0.42)", lineHeight: 1.75, fontWeight: 300 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ─── Stat Item ─── */
function StatItem({ target, suffix, label, delay, borderRight }: { target: number; suffix: string; label: string; delay: number; borderRight?: boolean }) {
  const { ref, visible } = useReveal(0.3);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`, textAlign: "center", padding: "44px 20px", borderRight: borderRight ? "1px solid rgba(201,168,76,0.08)" : "none" }}>
      <p style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(32px,3.5vw,48px)", fontWeight: 700, color: "#c9a84c", letterSpacing: -3, lineHeight: 1, marginBottom: 8 }}>
        <Counter target={target} suffix={suffix} />
      </p>
      <p style={{ fontSize: 9, letterSpacing: 2.5, color: "rgba(232,224,204,0.25)", textTransform: "uppercase" }}>{label}</p>
    </div>
  );
}

/* ─── Mock Portfolio Card ─── */
function MockPortfolioCard() {
  return (
    <div style={{ background: "rgba(8,11,16,0.97)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(201,168,76,0.05)" }}>
      {/* Window bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {["#e05c5c", "#c9a84c", "#5cb88a"].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.6 }} />)}
        <span style={{ fontSize: 9, color: "rgba(232,224,204,0.2)", marginLeft: 8, fontFamily: "Space Mono,monospace" }}>corvo.capital/app</span>
      </div>
      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, padding: "16px 16px 8px" }}>
        {[
          { l: "Return", v: "+18.4%", c: "#c9a84c" },
          { l: "Sharpe", v: "0.66", c: "#e8e0cc" },
          { l: "Drawdown", v: "-14.2%", c: "#e05c5c" },
          { l: "Health", v: "78/100", c: "#5cb88a" },
        ].map((m, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.025)", borderRadius: 8, padding: "10px 10px 8px" }}>
            <p style={{ fontSize: 6, letterSpacing: 2, color: "rgba(232,224,204,0.22)", textTransform: "uppercase", marginBottom: 5 }}>{m.l}</p>
            <p style={{ fontFamily: "Space Mono,monospace", fontSize: 14, fontWeight: 700, color: m.c }}>{m.v}</p>
          </div>
        ))}
      </div>
      {/* Chart */}
      <div style={{ margin: "0 16px 8px", background: "rgba(255,255,255,0.018)", borderRadius: 10, padding: "12px", height: 88, display: "flex", alignItems: "flex-end" }}>
        <svg width="100%" height="64" viewBox="0 0 500 64" preserveAspectRatio="none">
          <defs>
            <linearGradient id="aboutGrd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,54 C55,50 110,42 180,30 C250,18 310,10 380,6 C420,4 460,5 500,2 L500,64 L0,64Z" fill="url(#aboutGrd)" />
          <path d="M0,54 C55,50 110,42 180,30 C250,18 310,10 380,6 C420,4 460,5 500,2" fill="none" stroke="#c9a84c" strokeWidth="1.8" />
          <path d="M0,54 C80,52 160,48 240,42 C320,36 400,30 500,24" fill="none" stroke="rgba(232,224,204,0.12)" strokeWidth="1" strokeDasharray="4 3" />
        </svg>
      </div>
      {/* Holdings */}
      <div style={{ margin: "0 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { ticker: "AAPL", pct: "28%", bar: 0.28, color: "#c9a84c" },
          { ticker: "MSFT", pct: "22%", bar: 0.22, color: "#c9a84c" },
          { ticker: "NVDA", pct: "19%", bar: 0.19, color: "#e05c5c" },
          { ticker: "VOO", pct: "31%", bar: 0.31, color: "#5cb88a" },
        ].map((h, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "rgba(255,255,255,0.018)", borderRadius: 7 }}>
            <span style={{ fontFamily: "Space Mono,monospace", fontSize: 10, fontWeight: 700, color: "#e8e0cc", width: 36, flexShrink: 0 }}>{h.ticker}</span>
            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${h.bar * 100}%`, height: "100%", background: h.color, borderRadius: 2, opacity: 0.7 }} />
            </div>
            <span style={{ fontFamily: "Space Mono,monospace", fontSize: 10, color: "rgba(232,224,204,0.35)", width: 28, textAlign: "right", flexShrink: 0 }}>{h.pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Roadmap status config ─── */
const ROADMAP_STATUS = {
  inprogress: { label: "In Progress", bg: "rgba(201,168,76,0.1)",      color: "#c9a84c",                 border: "rgba(201,168,76,0.28)" },
  soon:       { label: "Coming Soon", bg: "rgba(99,155,220,0.1)",       color: "#7aaee0",                 border: "rgba(99,155,220,0.22)" },
  planned:    { label: "Planned",     bg: "rgba(255,255,255,0.04)",     color: "rgba(232,224,204,0.38)",  border: "rgba(255,255,255,0.07)" },
} as const;

/* ─── Roadmap Card ─── */
function RoadmapCard({ icon, name, desc, status, delay }: {
  icon: React.ReactNode; name: string; desc: string; status: keyof typeof ROADMAP_STATUS; delay: number;
}) {
  const { ref, visible } = useReveal(0.08);
  const s = ROADMAP_STATUS[status];
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      background: "rgba(255,255,255,0.018)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: "26px 24px 22px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -24, right: -24, width: 100, height: 100, background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: 1.5, padding: "4px 10px", borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: "uppercase", flexShrink: 0, marginTop: 2 }}>
          {s.label}
        </span>
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e8e0cc", marginBottom: 7, letterSpacing: -0.2 }}>{name}</h3>
      <p style={{ fontSize: 12, color: "rgba(232,224,204,0.4)", lineHeight: 1.7, fontWeight: 300 }}>{desc}</p>
    </div>
  );
}

/* ─── Main About Page ─── */
export default function AboutPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [liveUserCount, setLiveUserCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/stats`)
      .then(r => r.json())
      .then(d => { if (d.user_count) setLiveUserCount(d.user_count); })
      .catch(() => {});
  }, []);

  return (
    <div ref={containerRef} style={{ height: "100vh", overflowY: "auto", overflowX: "hidden", background: "#0a0e14", color: "#e8e0cc", fontFamily: "Inter,sans-serif" }}>
      <ParticleCanvas />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
        @keyframes fadein{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes heroGrad{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.25;transform:scale(0.45)}}
        .cta{transition:all 0.25s!important}.cta:hover{background:#d4b558!important;transform:translateY(-2px)!important;box-shadow:0 12px 40px rgba(201,168,76,0.25)!important}
        .ghost{transition:all 0.25s!important}.ghost:hover{border-color:rgba(201,168,76,0.4)!important;color:#c9a84c!important}
        .nl:hover{color:#c9a84c!important}
        @media(max-width:900px){
          .about-hero-grid{display:flex!important;flex-direction:column!important;gap:60px!important}
          .about-product-grid{display:flex!important;flex-direction:column!important}
          .about-stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .about-values-grid{display:flex!important;flex-direction:column!important}
          .roadmap-grid{display:flex!important;flex-direction:column!important}
          .nav-pad{padding:0 20px!important}
          .about-section{padding-left:20px!important;padding-right:20px!important}
        }
        @media(max-width:600px){
          .about-stats-grid{grid-template-columns:1fr 1fr!important}
          .footer-inner{flex-direction:column!important;gap:12px!important;text-align:center!important}
        }
      `}</style>

      {/* Fixed grid bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.025) 1px, transparent 1px),linear-gradient(90deg, rgba(201,168,76,0.025) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
      </div>

      {/* ─── NAV ─── */}
      <PublicNav />

      {/* ─── HERO ─── */}
      <section style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-30%", left: "-20%", width: "80%", height: "80%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", bottom: "-20%", right: "-15%", width: "70%", height: "70%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(180,140,50,0.06) 0%, transparent 70%)", filter: "blur(60px)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, animation: "fadein 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both", display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 24, marginBottom: 32, background: "rgba(201,168,76,0.06)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block", animation: "pdot 2s infinite" }} />
          <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase" }}>Our Story</span>
        </div>
        <h1 style={{ position: "relative", zIndex: 1, fontFamily: "Space Mono,monospace", fontSize: "clamp(32px,5.5vw,68px)", fontWeight: 700, lineHeight: 1.08, letterSpacing: -2.5, marginBottom: 28, maxWidth: 820, animation: "fadein 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s both", color: "#e8e0cc" }}>
          Built for investors who are{" "}
          <span style={{ color: "#c9a84c" }}>serious about their money.</span>
        </h1>
        <p style={{ position: "relative", zIndex: 1, fontSize: 17, color: "rgba(232,224,204,0.45)", lineHeight: 1.85, fontWeight: 300, maxWidth: 640, animation: "fadein 0.9s cubic-bezier(0.16,1,0.3,1) 0.35s both" }}>
          Corvo started as a frustration with existing tools. Yahoo Finance
          {" hasn't"} changed in a decade, and Robinhood gives you a chart with nothing underneath.
        </p>
      </section>

      {/* ─── OUR MISSION ─── */}
      <section className="about-section" style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>Our Mission</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5, lineHeight: 1.15, maxWidth: 700, margin: "0 auto" }}>
              We believe every retail investor deserves{" "}
              <span style={{ color: "#c9a84c" }}>institutional-grade analytics.</span>
            </h2>
          </Reveal>
          <div className="about-values-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            <ValueCard
              delay={0}
              icon={<IconTransparency />}
              title="Transparency"
              desc="No ads, no data selling, no conflicts of interest. We make money when you find value in the product, not by monetizing your information."
            />
            <ValueCard
              delay={0.12}
              icon={<IconIntelligence />}
              title="Intelligence"
              desc="AI that actually understands your portfolio. Not a generic chatbot, but an analyst that knows your exact holdings, risk exposure, and goals."
            />
            <ValueCard
              delay={0.24}
              icon={<IconEducation />}
              title="Education"
              desc="We help you understand your money, not just track it. Every metric comes with context, and every insight teaches you something new."
            />
          </div>
        </div>
      </section>

      {/* ─── THE PRODUCT ─── */}
      <section className="about-section" style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>The Product</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>
              What Corvo does
            </h2>
          </Reveal>
          <div className="about-product-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
            <div>
              <TimelineStep n="01" title="Enter your portfolio" desc="Add your holdings by ticker and weight. No brokerage login, no OAuth, no sensitive credentials. Your data stays yours." delay={0} />
              <TimelineStep n="02" title="Instant analytics" desc="Sharpe ratio, volatility, max drawdown, beta, correlation heatmap, and a 0–100 health score computed in seconds using real market data." delay={0.1} />
              <TimelineStep n="03" title="Monte Carlo simulation" desc="Run 300 forward paths based on your actual volatility and correlations. See your 10th, 50th, and 90th percentile outcomes over any horizon." delay={0.2} />
              <TimelineStep n="04" title="Ask the AI" desc="Chat with an AI analyst that knows your exact portfolio. Ask about risk, diversification, or rebalancing and get institutional-quality answers." delay={0.3} />
              <TimelineStep n="05" title="Stay informed" desc="Price alerts, a weekly portfolio digest, daily market briefs, and a learning module that teaches you the finance behind the numbers." delay={0.4} isLast />
            </div>
            <Reveal delay={0.15} style={{ position: "sticky", top: 80 }}>
              <MockPortfolioCard />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── WHY WE BUILT THIS ─── */}
      <section className="about-section" style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <Reveal style={{ marginBottom: 56 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>Origin</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>
              The problem we{"'"}re solving
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p style={{ fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(232,224,204,0.6)", lineHeight: 1.95, fontWeight: 300, marginBottom: 28 }}>
              Yahoo Finance {"hasn't"} changed since 2008. Robinhood gives you a chart and a buy button. Neither of them treats retail investors like adults.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <p style={{ fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(232,224,204,0.6)", lineHeight: 1.95, fontWeight: 300, marginBottom: 28 }}>
              We built Corvo because we were frustrated. Frustrated that institutional-grade analytics were locked behind paywalls. Frustrated that learning about investing meant reading dry textbooks or watching YouTube videos. Frustrated that the tools we had were either too expensive or too shallow.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <p style={{ fontSize: "clamp(16px,1.7vw,20px)", color: "rgba(232,224,204,0.85)", lineHeight: 1.85, fontWeight: 400 }}>
              Corvo is the tool we wish existed. Powerful enough for serious analysis. Free enough for everyone. Beautiful enough that you actually want to use it.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── THE TEAM ─── */}
      <section className="about-section" style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <Reveal style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>The Team</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>
              Built by the team at Corvo
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ display: "inline-block", maxWidth: 480, width: "100%", background: "rgba(255,255,255,0.018)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 24, padding: "40px 48px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src="/corvo-logo.svg" width={32} height={28} alt="Corvo" />
                </div>
              </div>
              <p style={{ fontFamily: "Space Mono,monospace", fontSize: 13, fontWeight: 700, letterSpacing: 3, color: "#c9a84c", marginBottom: 14 }}>CORVO</p>
              <p style={{ fontSize: 15, color: "rgba(232,224,204,0.55)", lineHeight: 1.8, fontWeight: 300 }}>
                A small team obsessed with making investing tools that {"don't"} suck.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── BY THE NUMBERS ─── */}
      <section className="about-section" style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>By the Numbers</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5, marginBottom: 48 }}>
              Growing with investors
            </h2>
          </Reveal>
          <div className="about-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", border: "1px solid rgba(201,168,76,0.08)", borderRadius: 20, overflow: "hidden", background: "rgba(255,255,255,0.012)" }}>
            <StatItem target={liveUserCount ?? 847} suffix="+" label="Users" delay={0} borderRight />
            <StatItem target={5500} suffix="+" label="Portfolios Analyzed" delay={0.12} borderRight />
            <StatItem target={17000} suffix="+" label="AI Insights Generated" delay={0.24} />
          </div>
        </div>
      </section>

      {/* ─── PRODUCT ROADMAP ─── */}
      <section className="about-section" style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>Roadmap</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>
              {"What we're building next"}
            </h2>
          </Reveal>
          <div className="roadmap-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            <RoadmapCard status="inprogress" delay={0} name="Options Chain Viewer"
              desc="Full options chain with live greeks, open interest, and volume. Built-in scanner highlights unusual activity."
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="2" rx="1" fill="rgba(201,168,76,0.6)"/><rect x="2" y="9" width="16" height="2" rx="1" fill="rgba(201,168,76,0.4)"/><rect x="2" y="15" width="16" height="2" rx="1" fill="rgba(201,168,76,0.4)"/><rect x="6.5" y="2" width="1.5" height="16" rx="0.75" fill="rgba(201,168,76,0.2)"/><rect x="12" y="2" width="1.5" height="16" rx="0.75" fill="rgba(201,168,76,0.2)"/></svg>}
            />
            <RoadmapCard status="inprogress" delay={0.08} name="Paper Trading Simulation"
              desc="Practice trading with live market data and your actual portfolio context. No real money at risk."
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 14C4 12 6 8 9 7C12 6 14 10 17 8" stroke="rgba(201,168,76,0.7)" strokeWidth="1.4" strokeLinecap="round"/><circle cx="9" cy="7" r="1.6" fill="rgba(201,168,76,0.2)" stroke="rgba(201,168,76,0.7)" strokeWidth="1.2"/><path d="M15 16l3-3-3-3M17 13H9" stroke="rgba(201,168,76,0.6)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            />
            <RoadmapCard status="soon" delay={0.16} name="AI Stock Summary Cards"
              desc="One-click AI-generated deep dives on any ticker with fundamentals, sentiment, and price history analysis."
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="11" rx="3" stroke="rgba(201,168,76,0.65)" strokeWidth="1.3"/><path d="M10 2L10.7 6.3L15 7L10.7 7.7L10 12L9.3 7.7L5 7L9.3 6.3Z" fill="rgba(201,168,76,0.55)"/></svg>}
            />
            <RoadmapCard status="soon" delay={0.24} name="Brokerage Direct Connect"
              desc="Sync your real holdings automatically from Fidelity, Schwab, and Interactive Brokers. One click, always up to date."
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="5" cy="10" r="2.5" stroke="rgba(201,168,76,0.65)" strokeWidth="1.3"/><circle cx="15" cy="10" r="2.5" stroke="rgba(201,168,76,0.65)" strokeWidth="1.3"/><path d="M7.5 10h5" stroke="rgba(201,168,76,0.65)" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="2 1.5"/><path d="M5 4V2M15 4V2" stroke="rgba(201,168,76,0.35)" strokeWidth="1.2" strokeLinecap="round"/></svg>}
            />
            <RoadmapCard status="soon" delay={0.32} name="Mobile App"
              desc="Native iOS and Android with real-time alerts, portfolio snapshots, and full AI chat on the go."
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="6" y="2" width="8" height="16" rx="2.5" stroke="rgba(201,168,76,0.65)" strokeWidth="1.3"/><circle cx="10" cy="15.5" r="0.9" fill="rgba(201,168,76,0.6)"/><path d="M8 5h4" stroke="rgba(201,168,76,0.35)" strokeWidth="1.2" strokeLinecap="round"/></svg>}
            />
            <RoadmapCard status="planned" delay={0.4} name="Social Portfolio Sharing"
              desc="Share anonymized portfolio snapshots with the Corvo community. Learn from how others are allocated."
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="4.5" r="2" stroke="rgba(201,168,76,0.5)" strokeWidth="1.3"/><circle cx="4" cy="15.5" r="2" stroke="rgba(201,168,76,0.5)" strokeWidth="1.3"/><circle cx="16" cy="15.5" r="2" stroke="rgba(201,168,76,0.5)" strokeWidth="1.3"/><path d="M8.5 6L5.5 13.5M11.5 6L14.5 13.5M6 15.5h8" stroke="rgba(201,168,76,0.3)" strokeWidth="1.2" strokeLinecap="round"/></svg>}
            />
            <RoadmapCard status="planned" delay={0.48} name="Tax Document Export"
              desc="Generate a tax-ready summary of realized gains, losses, and dividend income. Download as CSV or PDF."
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 2H5a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1V6l-3-4z" stroke="rgba(201,168,76,0.5)" strokeWidth="1.3" strokeLinejoin="round"/><path d="M13 2v4h4" stroke="rgba(201,168,76,0.5)" strokeWidth="1.3" strokeLinejoin="round"/><path d="M10 9v5M8 12l2 2 2-2" stroke="rgba(201,168,76,0.5)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            />
            <RoadmapCard status="planned" delay={0.56} name="Options Strategy Builder"
              desc="Visual builder for covered calls, spreads, and multi-leg strategies with real-time risk and reward charts."
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 15C4 15 4 8 7 8C10 8 10 13 13 13C16 13 16 6 18 5" stroke="rgba(201,168,76,0.55)" strokeWidth="1.4" strokeLinecap="round"/><circle cx="7" cy="8" r="1.5" fill="rgba(201,168,76,0.45)"/><circle cx="13" cy="13" r="1.5" fill="rgba(201,168,76,0.45)"/></svg>}
            />
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="about-section" style={{ position: "relative", zIndex: 1, padding: "0 56px 140px" }}>
        <Reveal>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", background: "rgba(201,168,76,0.03)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 24, padding: "64px 48px", boxShadow: "0 0 80px rgba(201,168,76,0.04)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 300, height: 300, background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <img src="/corvo-logo.svg" width={36} height={36} alt="Corvo" style={{ opacity: 0.7 }} />
            </div>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>Get Started</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5, marginBottom: 16, lineHeight: 1.2 }}>
              Ready to take your portfolio seriously?
            </h2>
            <p style={{ fontSize: 15, color: "rgba(232,224,204,0.4)", marginBottom: 40, lineHeight: 1.8, fontWeight: 300 }}>
              Institutional-grade analytics. Free. No credit card required.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/auth" className="cta" style={{ padding: "14px 38px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "#c9a84c", color: "#0a0e14", textDecoration: "none" }}>
                Try Corvo Free →
              </Link>
              <Link href="/app?demo=true" className="ghost" style={{ padding: "14px 38px", borderRadius: 12, fontSize: 14, background: "transparent", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", textDecoration: "none", fontWeight: 500 }}>
                View Demo
              </Link>
            </div>
            <p style={{ fontSize: 11, color: "rgba(232,224,204,0.18)", marginTop: 20 }}>No credit card · No account required for demo</p>
          </div>
        </Reveal>
      </section>

      {/* ─── COMPARE LINKS ─── */}
      <section className="about-section" style={{ position: "relative", zIndex: 1, padding: "0 56px 80px" }}>
        <Reveal>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 20 }}>Comparisons</p>
            <p style={{ fontSize: 15, color: "rgba(232,224,204,0.4)", marginBottom: 28, lineHeight: 1.8, fontWeight: 300 }}>
              See how Corvo stacks up against the most popular investing tools.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/compare/bloomberg" style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(201,168,76,0.2)", color: "rgba(201,168,76,0.7)", fontSize: 13, textDecoration: "none", transition: "border-color 0.2s, color 0.2s" }}>
                Corvo vs Bloomberg →
              </Link>
              <Link href="/compare/yahoo-finance" style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(201,168,76,0.2)", color: "rgba(201,168,76,0.7)", fontSize: 13, textDecoration: "none", transition: "border-color 0.2s, color 0.2s" }}>
                Corvo vs Yahoo Finance →
              </Link>
              <Link href="/compare/robinhood" style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(201,168,76,0.2)", color: "rgba(201,168,76,0.7)", fontSize: 13, textDecoration: "none", transition: "border-color 0.2s, color 0.2s" }}>
                Corvo vs Robinhood →
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── GET IN TOUCH ─── */}
      <section className="about-section" style={{ position: "relative", zIndex: 1, padding: "0 56px 100px" }}>
        <Reveal>
          <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 20 }}>Contact</p>
            <p style={{ fontSize: "clamp(15px,1.5vw,17px)", color: "rgba(232,224,204,0.5)", lineHeight: 1.8, fontWeight: 300, marginBottom: 32 }}>
              {"We're"} a small team. We read every email.
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, flexWrap: "wrap" }}>
              <a href="mailto:hello@corvo.capital" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#c9a84c", textDecoration: "none", fontFamily: "Space Mono,monospace", letterSpacing: 0.3, transition: "opacity 0.2s" }} onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2 7l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                hello@corvo.capital
              </a>
              <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
              <a href="https://github.com/vinay-batra/corvo" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "rgba(232,224,204,0.4)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color = "#e8e0cc")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(232,224,204,0.4)")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                GitHub
              </a>
              <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
              <a href="https://x.com/corvocapital" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "rgba(232,224,204,0.4)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color = "#e8e0cc")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(232,224,204,0.4)")}>
                <svg width="13" height="13" viewBox="0 0 300 300" fill="currentColor"><path d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66"/></svg>
                X / Twitter
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── FOOTER ─── */}
      <PublicFooter />
    </div>
  );
}
