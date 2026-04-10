"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { motion } from "framer-motion";

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

/* ─── Counter ─── */
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

/* ─── Reveal wrapper ─── */
function Reveal({ children, delay = 0, y = 40, style = {} }: { children: React.ReactNode; delay?: number; y?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : `translateY(${y}px)`, transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ─── Email Capture ─── */
function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const submit = async () => {
    if (!email.trim() || status !== "idle") return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/notify-me`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      if (res.ok) { setStatus("done"); } else { setStatus("error"); }
    } catch { setStatus("error"); }
  };
  return (
    <section style={{ position: "relative", zIndex: 1, padding: "0 56px 100px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>Stay in the loop</p>
        <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3.5vw,36px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5, marginBottom: 14 }}>Get early access updates</h2>
        <p style={{ fontSize: 14, color: "rgba(232,224,204,0.4)", marginBottom: 32, lineHeight: 1.7, fontWeight: 300 }}>New features, market insights, and portfolio tips — straight to your inbox.</p>
        {status === "done" ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(92,184,138,0.08)", border: "1px solid rgba(92,184,138,0.25)", borderRadius: 12, padding: "16px 28px" }}>
            <span style={{ fontSize: 16, color: "#5cb88a" }}>✓</span>
            <span style={{ fontSize: 14, color: "#5cb88a", fontWeight: 500 }}>{"You're on the list!"}</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="your@email.com"
              style={{ flex: 1, padding: "13px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e8e0cc", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
              onFocus={e => (e.target.style.borderColor = "rgba(201,168,76,0.4)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")} />
            <button onClick={submit} disabled={status === "loading"}
              style={{ padding: "13px 24px", background: "#c9a84c", border: "none", borderRadius: 10, color: "#0a0e14", fontSize: 13, fontWeight: 700, cursor: status === "loading" ? "wait" : "pointer", letterSpacing: 0.3, transition: "opacity 0.2s", whiteSpace: "nowrap", flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              {status === "loading" ? "..." : "Notify Me"}
            </button>
          </div>
        )}
        {status === "error" && <p style={{ fontSize: 12, color: "#e05c5c", marginTop: 12 }}>Something went wrong. Try again.</p>}
      </div>
    </section>
  );
}

/* ─── Stat Item (extracted to avoid hook-in-loop) ─── */
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

/* ─── Bento Card base ─── */
function BentoCard({ children, style = {}, delay = 0 }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number }) {
  const { ref, visible } = useReveal(0.06);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)", transition: `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}s`, background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, overflow: "hidden", position: "relative", ...style }}>
      {children}
    </div>
  );
}

/* ─── Portfolio Analyzer bento card ─── */
function BentoPortfolioCard({ delay = 0 }: { delay?: number }) {
  return (
    <BentoCard delay={delay} style={{ gridArea: "portfolio", padding: "32px 32px 28px" }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none", borderRadius: "50%" }} />
      <p style={{ fontSize: 9, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase", marginBottom: 10 }}>Portfolio Analyzer</p>
      <h3 style={{ fontSize: 21, fontWeight: 600, color: "#e8e0cc", marginBottom: 6, letterSpacing: -0.5 }}>Full portfolio intelligence</h3>
      <p style={{ fontSize: 13, color: "rgba(232,224,204,0.4)", marginBottom: 24, lineHeight: 1.7, maxWidth: 360 }}>Sharpe ratio, volatility, max drawdown, and benchmark comparison — updated live as markets move.</p>
      <div style={{ background: "rgba(8,11,16,0.7)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[{ l: "Return", v: "+18.4%", c: "#c9a84c" }, { l: "Sharpe", v: "0.66", c: "#e8e0cc" }, { l: "Drawdown", v: "-14.2%", c: "#e05c5c" }, { l: "Beta", v: "0.84", c: "#e8e0cc" }].map((m, i) => (
            <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.025)", borderRadius: 9, padding: "9px 10px" }}>
              <p style={{ fontSize: 6, letterSpacing: 1.5, color: "rgba(232,224,204,0.28)", textTransform: "uppercase", marginBottom: 5 }}>{m.l}</p>
              <p style={{ fontFamily: "Space Mono,monospace", fontSize: 13, fontWeight: 700, color: m.c }}>{m.v}</p>
            </div>
          ))}
        </div>
        <svg width="100%" height="52" viewBox="0 0 500 52" preserveAspectRatio="none">
          <defs>
            <linearGradient id="portGrd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9a84c" stopOpacity="0.2" /><stop offset="100%" stopColor="#c9a84c" stopOpacity="0" /></linearGradient>
          </defs>
          <path d="M0,44 C60,40 120,32 190,20 C260,8 320,6 390,4 C430,3 465,5 500,2 L500,52 L0,52Z" fill="url(#portGrd)" />
          <path d="M0,44 C60,40 120,32 190,20 C260,8 320,6 390,4 C430,3 465,5 500,2" fill="none" stroke="#c9a84c" strokeWidth="1.5" />
          <path d="M0,44 C80,42 160,38 240,33 C320,28 400,23 500,19" fill="none" stroke="rgba(232,224,204,0.14)" strokeWidth="1" strokeDasharray="4 3" />
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          {["JAN", "MAR", "JUN", "SEP", "NOW"].map((l, i) => (
            <span key={i} style={{ fontSize: 7, color: i === 4 ? "#c9a84c" : "rgba(232,224,204,0.2)", fontFamily: "Space Mono,monospace" }}>{l}</span>
          ))}
        </div>
      </div>
    </BentoCard>
  );
}

/* ─── AI Chat bento card ─── */
function BentoAIChatCard({ delay = 0 }: { delay?: number }) {
  return (
    <BentoCard delay={delay} style={{ gridArea: "aichat", padding: "28px" }}>
      <p style={{ fontSize: 9, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase", marginBottom: 10 }}>AI Chat</p>
      <h3 style={{ fontSize: 19, fontWeight: 600, color: "#e8e0cc", marginBottom: 6, letterSpacing: -0.5 }}>Ask anything, get answers</h3>
      <p style={{ fontSize: 12, color: "rgba(232,224,204,0.4)", marginBottom: 20, lineHeight: 1.7 }}>Your AI knows your exact holdings, goals, and risk tolerance.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px 12px 2px 12px", padding: "10px 13px", alignSelf: "flex-end" }}>
          <p style={{ fontSize: 11, color: "rgba(232,224,204,0.7)" }}>Am I taking too much risk?</p>
        </div>
        <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: "12px 12px 12px 2px", padding: "10px 13px", display: "flex", gap: 8 }}>
          <img src="/corvo-logo.svg" width={12} height={10} alt="" style={{ marginTop: 2, opacity: 0.7, flexShrink: 0 }} />
          <p style={{ fontSize: 11, color: "rgba(232,224,204,0.65)", lineHeight: 1.65 }}>Your tech concentration is 67% — above the 40% threshold. Adding BND or GLD would reduce correlation risk significantly.</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px 12px 2px 12px", padding: "10px 13px", alignSelf: "flex-end" }}>
          <p style={{ fontSize: 11, color: "rgba(232,224,204,0.7)" }}>What's my Sharpe ratio?</p>
        </div>
        <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: "12px 12px 12px 2px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#c9a84c", animation: `pdot 1.2s infinite ${i * 0.22}s` }} />
          ))}
        </div>
      </div>
    </BentoCard>
  );
}

/* ─── Watchlist + Alerts bento card ─── */
function BentoWatchlistCard({ delay = 0 }: { delay?: number }) {
  return (
    <BentoCard delay={delay} style={{ gridArea: "watchlist", padding: "28px" }}>
      <p style={{ fontSize: 9, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase", marginBottom: 10 }}>Watchlist + Alerts</p>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#e8e0cc", marginBottom: 6, letterSpacing: -0.5 }}>Never miss a move</h3>
      <p style={{ fontSize: 12, color: "rgba(232,224,204,0.4)", marginBottom: 18, lineHeight: 1.6 }}>Set price & percent alerts on any ticker worldwide.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {[
          { ticker: "NVDA", price: "$875", change: "+3.1%", up: true, alert: true },
          { ticker: "AAPL", price: "$189", change: "+1.8%", up: true, alert: false },
          { ticker: "TSLA", price: "$248", change: "-2.4%", up: false, alert: true },
          { ticker: "VOO", price: "$478", change: "+0.7%", up: true, alert: false },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.025)", borderRadius: 9, padding: "9px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#c9a84c", fontFamily: "Space Mono,monospace" }}>{s.ticker[0]}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#e8e0cc", fontFamily: "Space Mono,monospace" }}>{s.ticker}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "rgba(232,224,204,0.35)", fontFamily: "Space Mono,monospace" }}>{s.price}</span>
              {s.alert && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block", animation: "pdot 2s infinite" }} />}
              <span style={{ fontSize: 10, fontFamily: "Space Mono,monospace", color: s.up ? "#5cb88a" : "#e05c5c", fontWeight: 600 }}>{s.change}</span>
            </div>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

/* ─── Learn & Earn XP bento card ─── */
function BentoLearnCard({ delay = 0 }: { delay?: number }) {
  const { ref, visible } = useReveal(0.1);
  const [xp, setXp] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1500, 1);
      setXp(Math.floor(2840 * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible]);
  return (
    <BentoCard delay={delay} style={{ gridArea: "learnxp", padding: "28px" }}>
      <div ref={ref} style={{ position: "absolute" }} />
      <p style={{ fontSize: 9, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase", marginBottom: 10 }}>Learn & Earn XP</p>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#e8e0cc", marginBottom: 6, letterSpacing: -0.5 }}>Level up your knowledge</h3>
      <p style={{ fontSize: 12, color: "rgba(232,224,204,0.4)", marginBottom: 18, lineHeight: 1.6 }}>Finance lessons that earn XP and unlock real features.</p>
      <div style={{ background: "rgba(8,11,16,0.6)", borderRadius: 12, padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 7, letterSpacing: 2, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", marginBottom: 4 }}>Level 7 · Portfolio Pro</p>
            <p style={{ fontFamily: "Space Mono,monospace", fontSize: 24, fontWeight: 700, color: "#c9a84c", letterSpacing: -1 }}>{xp.toLocaleString()} XP</p>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>⚡</div>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", width: visible ? "72%" : "0%", background: "linear-gradient(90deg, #c9a84c, #f59e0b)", borderRadius: 3, transition: "width 1.5s cubic-bezier(0.16,1,0.3,1) 0.4s" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Risk Basics ✓", "Diversification ✓", "Options →"].map((b, i) => (
            <div key={i} style={{ fontSize: 9, padding: "4px 9px", borderRadius: 6, background: i < 2 ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.04)", color: i < 2 ? "#c9a84c" : "rgba(232,224,204,0.3)", border: i < 2 ? "1px solid rgba(201,168,76,0.18)" : "1px solid rgba(255,255,255,0.05)" }}>{b}</div>
          ))}
        </div>
      </div>
    </BentoCard>
  );
}

/* ─── Stock Deep Dives bento card ─── */
function BentoDeepDivesCard({ delay = 0 }: { delay?: number }) {
  return (
    <BentoCard delay={delay} style={{ gridArea: "deepdives", padding: "28px" }}>
      <div style={{ position: "absolute", top: -30, left: -30, width: 160, height: 160, background: "radial-gradient(ellipse, rgba(92,184,138,0.05) 0%, transparent 70%)", pointerEvents: "none", borderRadius: "50%" }} />
      <p style={{ fontSize: 9, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase", marginBottom: 10 }}>Stock Deep Dives</p>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#e8e0cc", marginBottom: 6, letterSpacing: -0.5 }}>Research any stock, instantly</h3>
      <p style={{ fontSize: 12, color: "rgba(232,224,204,0.4)", marginBottom: 18, lineHeight: 1.6 }}>AI-powered fundamentals, news sentiment, and price history analysis.</p>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#e8e0cc", fontFamily: "Space Mono,monospace" }}>AAPL</div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#e8e0cc", fontFamily: "Space Mono,monospace" }}>$189.40</p>
              <p style={{ fontSize: 10, color: "#5cb88a" }}>+1.82% today</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[{ l: "P/E Ratio", v: "28.4" }, { l: "Revenue", v: "$391B" }, { l: "EPS", v: "$6.57" }, { l: "Sentiment", v: "🟢 Bullish" }].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.025)", borderRadius: 8, padding: "8px 10px" }}>
                <p style={{ fontSize: 6, letterSpacing: 1.5, color: "rgba(232,224,204,0.28)", textTransform: "uppercase", marginBottom: 3 }}>{s.l}</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#e8e0cc" }}>{s.v}</p>
              </div>
            ))}
          </div>
        </div>
        <svg width="130" height="72" viewBox="0 0 130 72" style={{ flexShrink: 0 }}>
          <defs><linearGradient id="ddGrd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5cb88a" stopOpacity="0.2" /><stop offset="100%" stopColor="#5cb88a" stopOpacity="0" /></linearGradient></defs>
          <path d="M0,60 C18,54 30,44 48,32 C66,20 78,28 96,20 C112,13 122,8 130,3 L130,72 L0,72Z" fill="url(#ddGrd)" />
          <path d="M0,60 C18,54 30,44 48,32 C66,20 78,28 96,20 C112,13 122,8 130,3" fill="none" stroke="#5cb88a" strokeWidth="1.5" />
        </svg>
      </div>
    </BentoCard>
  );
}

/* ─── Monte Carlo bento card ─── */
function BentoMonteCarloCard({ delay = 0 }: { delay?: number }) {
  return (
    <BentoCard delay={delay} style={{ gridArea: "montecarlo", padding: "28px" }}>
      <div style={{ position: "absolute", bottom: -40, right: -40, width: 160, height: 160, background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none", borderRadius: "50%" }} />
      <p style={{ fontSize: 9, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase", marginBottom: 10 }}>Monte Carlo Simulation</p>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#e8e0cc", marginBottom: 6, letterSpacing: -0.5 }}>See your future in 300 paths</h3>
      <p style={{ fontSize: 12, color: "rgba(232,224,204,0.4)", marginBottom: 18, lineHeight: 1.6 }}>Simulate outcomes based on your actual volatility and correlation.</p>
      <div style={{ background: "rgba(8,11,16,0.6)", borderRadius: 12, padding: "14px" }}>
        <svg width="100%" height="110" viewBox="0 0 280 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="mcFan" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(92,184,138,0.12)" /><stop offset="100%" stopColor="rgba(201,168,76,0.04)" /></linearGradient>
          </defs>
          <path d="M0,88 C40,82 80,62 130,38 C180,14 230,6 280,2 L280,95 C230,90 180,84 130,78 C80,72 40,74 0,88Z" fill="url(#mcFan)" />
          {["M0,88 C40,80 80,58 130,32 C180,6 230,2 280,1", "M0,88 C40,83 80,64 130,42 C180,20 230,12 280,8", "M0,88 C40,85 80,70 130,52 C180,34 230,24 280,20", "M0,88 C40,84 80,67 130,46 C180,26 230,16 280,12", "M0,88 C40,86 80,74 130,60 C180,46 230,36 280,30"].map((d, i) => (
            <path key={i} d={d} fill="none" stroke={`rgba(201,168,76,${0.06 + i * 0.02})`} strokeWidth="0.7" />
          ))}
          <path d="M0,88 C40,84 80,68 130,46 C180,24 230,14 280,10" fill="none" stroke="rgba(201,168,76,0.65)" strokeWidth="2" />
          <path d="M0,88 C40,86 80,76 130,64 C180,52 230,44 280,40" fill="none" stroke="rgba(224,92,92,0.4)" strokeWidth="1" strokeDasharray="4 3" />
          <path d="M0,88 C40,81 80,59 130,32 C180,5 230,1 280,0" fill="none" stroke="rgba(92,184,138,0.4)" strokeWidth="1" strokeDasharray="4 3" />
          <text x="240" y="8" fontSize="7" fill="rgba(92,184,138,0.7)" fontFamily="monospace">90th</text>
          <text x="240" y="16" fontSize="7" fill="rgba(201,168,76,0.7)" fontFamily="monospace">50th</text>
          <text x="240" y="42" fontSize="7" fill="rgba(224,92,92,0.7)" fontFamily="monospace">10th</text>
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <div>
            <p style={{ fontSize: 7, letterSpacing: 1.5, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", marginBottom: 3 }}>Median at Retirement</p>
            <p style={{ fontFamily: "Space Mono,monospace", fontSize: 20, fontWeight: 700, color: "#c9a84c", letterSpacing: -1 }}>$2.3M</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 7, letterSpacing: 1.5, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", marginBottom: 3 }}>Paths · Horizon</p>
            <p style={{ fontSize: 11, color: "rgba(232,224,204,0.5)", fontFamily: "Space Mono,monospace" }}>300 · 30yr</p>
          </div>
        </div>
      </div>
      {/* Divider + PDF Reports section */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "24px 0" }} />
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v8M5 7l3 3 3-3" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 12h10" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 9, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase", marginBottom: 5 }}>PDF Reports</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#e8e0cc", marginBottom: 5, letterSpacing: -0.3 }}>Export & share</p>
          <p style={{ fontSize: 12, color: "rgba(232,224,204,0.38)", lineHeight: 1.65 }}>Generate a full portfolio report in one click.</p>
        </div>
      </div>
    </BentoCard>
  );
}

/* ─── How It Works step ─── */
function HowStep({ n, icon, title, desc, delay }: { n: string; icon: string; title: string; desc: string; delay: number }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)", transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`, textAlign: "center", padding: "0 28px", position: "relative", zIndex: 1 }}>
      <div style={{ width: 68, height: 68, borderRadius: 20, background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 18px", boxShadow: "0 0 32px rgba(201,168,76,0.06)" }}>{icon}</div>
      <p style={{ fontFamily: "Space Mono,monospace", fontSize: 10, fontWeight: 700, color: "rgba(201,168,76,0.4)", letterSpacing: 2, marginBottom: 12 }}>{n}</p>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#e8e0cc", marginBottom: 10, letterSpacing: -0.4 }}>{title}</h3>
      <p style={{ fontSize: 13, color: "rgba(232,224,204,0.38)", lineHeight: 1.85, fontWeight: 300, maxWidth: 230, margin: "0 auto" }}>{desc}</p>
    </div>
  );
}

/* ─── Testimonial Card ─── */
function TestimonialCard({ text, name, role, delay }: { text: string; name: string; role: string; delay: number }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`, padding: "32px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, background: "rgba(255,255,255,0.012)", backdropFilter: "blur(10px)", height: "100%", display: "flex", flexDirection: "column" }}>
      <p style={{ fontFamily: "Space Mono,monospace", fontSize: 52, color: "#c9a84c", lineHeight: 0.75, marginBottom: 18, opacity: 0.55 }}>"</p>
      <p style={{ fontSize: 14, color: "rgba(232,224,204,0.65)", lineHeight: 1.9, fontWeight: 300, marginBottom: 24, flex: 1 }}>{text}</p>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c" }}>{name}</p>
        <p style={{ fontSize: 11, color: "rgba(232,224,204,0.28)", marginTop: 3 }}>{role}</p>
      </div>
    </div>
  );
}

/* ─── Animated Demo Preview ─── */
function DemoPreview() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % 4), 1800);
    return () => clearInterval(t);
  }, []);
  const lines = [
    "Analyzing AAPL · MSFT · NVDA · VOO...",
    "Computing Sharpe ratio: 0.66 ✓",
    "Running 300 Monte Carlo paths ✓",
    "AI insight ready — high tech concentration detected",
  ];
  return (
    <div style={{ background: "rgba(8,11,16,0.9)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 16, overflow: "hidden", boxShadow: "0 0 80px rgba(201,168,76,0.06), 0 32px 80px rgba(0,0,0,0.6)" }}>
      {/* Terminal bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {["#e05c5c", "#c9a84c", "#5cb88a"].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.6 }} />)}
        <span style={{ fontSize: 9, color: "rgba(232,224,204,0.2)", marginLeft: 8, fontFamily: "Space Mono,monospace" }}>corvo.capital/app?demo=true</span>
      </div>
      {/* Metrics row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, padding: "16px 16px 8px" }}>
        {[{ l: "Portfolio Return", v: "+18.4%", c: "#c9a84c" }, { l: "Health Score", v: "78/100", c: "#5cb88a" }, { l: "Risk Level", v: "Moderate", c: "#e8e0cc" }].map((m, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.025)", borderRadius: 10, padding: "10px 12px" }}>
            <p style={{ fontSize: 7, letterSpacing: 1.5, color: "rgba(232,224,204,0.28)", textTransform: "uppercase", marginBottom: 5 }}>{m.l}</p>
            <p style={{ fontFamily: "Space Mono,monospace", fontSize: 14, fontWeight: 700, color: m.c }}>{m.v}</p>
          </div>
        ))}
      </div>
      {/* Chart placeholder */}
      <div style={{ margin: "0 16px 8px", background: "rgba(255,255,255,0.018)", borderRadius: 10, padding: "12px", height: 72, display: "flex", alignItems: "flex-end" }}>
        <svg width="100%" height="52" viewBox="0 0 400 52" preserveAspectRatio="none">
          <defs><linearGradient id="demoGrd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9a84c" stopOpacity="0.18" /><stop offset="100%" stopColor="#c9a84c" stopOpacity="0" /></linearGradient></defs>
          <path d="M0,44 C55,40 110,31 180,19 C250,7 310,5 370,3 C385,3 395,4 400,2 L400,52 L0,52Z" fill="url(#demoGrd)" />
          <path d="M0,44 C55,40 110,31 180,19 C250,7 310,5 370,3 C385,3 395,4 400,2" fill="none" stroke="#c9a84c" strokeWidth="1.5" />
        </svg>
      </div>
      {/* AI terminal lines */}
      <div style={{ margin: "0 16px 16px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.1)", borderRadius: 10, padding: "12px 14px", fontFamily: "Space Mono,monospace", minHeight: 72 }}>
        <p style={{ fontSize: 8, letterSpacing: 2, color: "rgba(201,168,76,0.5)", marginBottom: 8, textTransform: "uppercase" }}>AI Analysis</p>
        {lines.slice(0, step + 1).map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, opacity: i === step ? 1 : 0.45, transition: "opacity 0.4s" }}>
            <span style={{ color: "#c9a84c", fontSize: 8 }}>›</span>
            <span style={{ fontSize: 10, color: i === step ? "rgba(232,224,204,0.8)" : "rgba(232,224,204,0.4)" }}>{l}</span>
            {i === step && <span style={{ display: "inline-block", width: 6, height: 12, background: "#c9a84c", animation: "pdot 1s infinite", marginLeft: 2 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Landing ─── */
export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [navSolid, setNavSolid] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [liveUserCount, setLiveUserCount] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setNavSolid(el.scrollTop > 60);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    sb.auth.getSession().then(({ data: { session } }) => { if (session) setLoggedIn(true); });
    fetch(`${API_URL}/stats`).then(r => r.json()).then(d => { if (d.user_count) setLiveUserCount(d.user_count); }).catch(() => {});
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Corvo",
    url: "https://corvo.capital",
    description: "Free Bloomberg-quality portfolio analytics for retail investors. Monte Carlo simulation, Sharpe ratio, AI chat, real-time alerts and more. No subscription required.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: [
      "Monte Carlo simulation",
      "Sharpe ratio & portfolio health score",
      "AI-powered portfolio chat",
      "Real-time price alerts",
      "Watchlist tracking",
      "PDF portfolio reports",
    ],
  };

  return (
    <div ref={containerRef} style={{ height: "100vh", overflowY: "auto", overflowX: "hidden", background: "#0a0e14", color: "#e8e0cc", fontFamily: "Inter,sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ParticleCanvas />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.25;transform:scale(0.45)}}
        @keyframes fadein{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes heroGrad{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes lineGrow{from{width:0}to{width:100%}}
        @keyframes amberPulse{0%,100%{box-shadow:0 0 24px rgba(201,168,76,0.3),0 12px 40px rgba(201,168,76,0.15)}50%{box-shadow:0 0 48px rgba(201,168,76,0.5),0 16px 60px rgba(201,168,76,0.25)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .cta{transition:all 0.25s!important}.cta:hover{background:#d4b558!important;transform:translateY(-2px)!important;box-shadow:0 12px 40px rgba(201,168,76,0.25)!important}
        .ghost{transition:all 0.25s!important}.ghost:hover{border-color:rgba(201,168,76,0.4)!important;color:#c9a84c!important}
        .nl:hover{color:#c9a84c!important}
        .demo-btn{animation:amberPulse 3s ease-in-out infinite}
        @media(max-width:900px){
          .bento-grid{display:flex!important;flex-direction:column!important}
          .how-grid{display:flex!important;flex-direction:column!important;gap:48px!important}
          .how-line{display:none!important}
          .demo-grid{display:flex!important;flex-direction:column!important}
          .compare-table th,.compare-table td{padding:10px 8px!important;font-size:10px!important}
          .tagline-h2{font-size:clamp(24px,5vw,44px)!important}
          .testi-grid{display:flex!important;flex-direction:column!important}
          .nav-pad{padding:0 20px!important}
          .sec-pad{padding-left:20px!important;padding-right:20px!important}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
        }
        @media(max-width:600px){
          .stats-grid{grid-template-columns:1fr 1fr!important}
          .footer-inner{flex-direction:column!important;gap:12px!important;text-align:center!important}
        }
      `}</style>

      {/* Fixed grid bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.025) 1px, transparent 1px),linear-gradient(90deg, rgba(201,168,76,0.025) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
      </div>

      {/* NAV */}
      <nav className="nav-pad" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 56px", background: navSolid ? "rgba(10,14,20,0.92)" : "transparent", backdropFilter: navSolid ? "blur(16px)" : "none", borderBottom: navSolid ? "1px solid rgba(201,168,76,0.07)" : "none", transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <img src="/corvo-logo.svg" width={28} height={28} alt="Corvo" />
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "#e8e0cc" }}>CORVO</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {loggedIn ? (
            <Link href="/app" className="cta" style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: "#c9a84c", borderRadius: 8, color: "#0a0e14", textDecoration: "none" }}>Go to Dashboard →</Link>
          ) : (
            <>
              <Link href="/auth" className="nl" style={{ padding: "7px 16px", fontSize: 12, color: "rgba(232,224,204,0.4)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Log in</Link>
              <Link href="/auth" className="cta" style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: "#c9a84c", borderRadius: 8, color: "#0a0e14", textDecoration: "none" }}>Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "110px 24px 70px" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-30%", left: "-20%", width: "80%", height: "80%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)", animation: "heroGrad 18s ease infinite", backgroundSize: "300% 300%", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", bottom: "-20%", right: "-15%", width: "70%", height: "70%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(180,140,50,0.06) 0%, transparent 70%)", animation: "heroGrad 24s ease infinite reverse", backgroundSize: "300% 300%", filter: "blur(60px)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, animation: "fadein 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s both", display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 24, marginBottom: 36, background: "rgba(201,168,76,0.06)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block", animation: "pdot 2s infinite" }} />
          <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase" }}>AI-Powered Portfolio Intelligence</span>
        </div>

        <motion.h1
          style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(36px,6vw,78px)", fontWeight: 700, lineHeight: 1.06, letterSpacing: -3, marginBottom: 28, maxWidth: 840 }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden" animate="visible">
          <span style={{ display: "block", color: "#e8e0cc" }}>
            {["Your", "portfolio."].map((w, i) => (
              <motion.span key={i} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 18, stiffness: 200 } } }}
                style={{ display: "inline-block", marginRight: "0.25em" }}>{w}</motion.span>
            ))}
          </span>
          <span style={{ display: "block", color: "#c9a84c", position: "relative" }}>
            {["Analyzed."].map((w, i) => (
              <motion.span key={i} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 18, stiffness: 200, delay: 0.16 } } }}
                style={{ display: "inline-block" }}>{w}</motion.span>
            ))}
            <span style={{ position: "absolute", bottom: 2, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)" }} />
          </span>
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}
          style={{ fontSize: 17, color: "rgba(232,224,204,0.45)", lineHeight: 1.85, fontWeight: 300, maxWidth: 520, marginBottom: 48 }}>
          Stop guessing. Start knowing exactly what your money is doing and why.
        </motion.p>

        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, type: "spring", damping: 20, stiffness: 200 }}
          style={{ display: "flex", gap: 12, marginBottom: 80, flexWrap: "wrap", justifyContent: "center" }}>
          {loggedIn ? (
            <Link href="/app" className="cta" style={{ padding: "14px 38px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "#c9a84c", color: "#0a0e14", textDecoration: "none" }}>Go to Dashboard →</Link>
          ) : (
            <Link href="/auth" className="cta" style={{ padding: "14px 38px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "#c9a84c", color: "#0a0e14", textDecoration: "none" }}>Start for free →</Link>
          )}
          <Link href="/app?demo=true" className="ghost" style={{ padding: "14px 38px", borderRadius: 12, fontSize: 14, background: "transparent", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", textDecoration: "none", fontWeight: 500 }}>Try demo →</Link>
        </motion.div>

        {/* Dashboard preview */}
        <div style={{ animation: "fadein 1s cubic-bezier(0.16,1,0.3,1) 0.8s both, float 7s ease-in-out 2.5s infinite", width: "min(920px,92vw)", position: "relative" }}>
          <div style={{ background: "rgba(10,14,20,0.97)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 16, overflow: "hidden", boxShadow: "0 48px 128px rgba(0,0,0,0.7), inset 0 1px 0 rgba(201,168,76,0.08)", display: "flex" }}>
            <div style={{ width: 180, background: "rgba(8,11,16,0.95)", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "16px 0", flexShrink: 0, display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ padding: "0 14px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <img src="/corvo-logo.svg" width={18} height={14} alt="Corvo" />
                  <span style={{ fontFamily: "Space Mono,monospace", fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#e8e0cc" }}>CORVO</span>
                </div>
              </div>
              {["◈  Overview", "◬  Risk", "◎  Simulate", "⊞  Compare", "◷  News", "✦  AI Chat"].map((t, i) => (
                <div key={i} style={{ padding: "7px 14px", fontSize: 10, color: i === 0 ? "#c9a84c" : "rgba(232,224,204,0.35)", background: i === 0 ? "rgba(201,168,76,0.06)" : "transparent", borderLeft: i === 0 ? "2px solid #c9a84c" : "2px solid transparent" }}>{t}</div>
              ))}
              <div style={{ marginTop: "auto", padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 9, color: "rgba(232,224,204,0.2)", letterSpacing: 1 }}>AAPL · MSFT · NVDA</div>
              </div>
            </div>
            <div style={{ flex: 1, padding: "14px 16px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Overview", "Risk", "Simulate", "Compare"].map((t, i) => (
                    <div key={i} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 9, background: i === 0 ? "rgba(255,255,255,0.06)" : "transparent", color: i === 0 ? "#e8e0cc" : "rgba(232,224,204,0.3)", border: i === 0 ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent" }}>{t}</div>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: "rgba(201,168,76,0.4)", fontFamily: "Space Mono,monospace" }}>1Y · S&amp;P 500</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginBottom: 10 }}>
                {[{ l: "Return", v: "+18.4%", c: "#c9a84c" }, { l: "Volatility", v: "22.1%", c: "#e8e0cc" }, { l: "Sharpe", v: "0.66", c: "#e8e0cc" }, { l: "Drawdown", v: "-14.2%", c: "#e05c5c" }].map((m, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 10px 8px" }}>
                    <p style={{ fontSize: 6, letterSpacing: 2, color: "rgba(232,224,204,0.2)", textTransform: "uppercase", marginBottom: 5 }}>{m.l}</p>
                    <p style={{ fontFamily: "Space Mono,monospace", fontSize: 15, fontWeight: 700, color: m.c, letterSpacing: -0.5 }}>{m.v}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8, marginBottom: 10 }}>
                <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 6, letterSpacing: 2, color: "rgba(232,224,204,0.2)", textTransform: "uppercase", marginBottom: 6 }}>Performance vs S&amp;P 500</p>
                  <svg width="100%" height="52" viewBox="0 0 600 52" preserveAspectRatio="none">
                    <defs><linearGradient id="grd2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9a84c" stopOpacity="0.18" /><stop offset="100%" stopColor="#c9a84c" stopOpacity="0" /></linearGradient></defs>
                    <path d="M0,44 C60,40 120,34 180,26 C240,18 300,14 360,11 C420,8 480,12 600,4 L600,52 L0,52Z" fill="url(#grd2)" />
                    <path d="M0,44 C60,40 120,34 180,26 C240,18 300,14 360,11 C420,8 480,12 600,4" fill="none" stroke="#c9a84c" strokeWidth="1.5" />
                    <path d="M0,44 C80,42 160,39 240,35 C320,31 400,27 480,24 C540,22 570,25 600,20" fill="none" stroke="rgba(232,224,204,0.15)" strokeWidth="1" strokeDasharray="3 3" />
                  </svg>
                </div>
                <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 6, letterSpacing: 2, color: "rgba(232,224,204,0.2)", textTransform: "uppercase", marginBottom: 8 }}>Health Score</p>
                  <p style={{ fontFamily: "Space Mono,monospace", fontSize: 28, fontWeight: 700, color: "#c9a84c", letterSpacing: -2, lineHeight: 1 }}>78</p>
                  <p style={{ fontSize: 8, color: "#5cb88a", letterSpacing: 1, marginTop: 3 }}>GOOD</p>
                  <div style={{ marginTop: 8, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ width: "78%", height: "100%", background: "#c9a84c", borderRadius: 2 }} />
                  </div>
                </div>
              </div>
              <div style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.14)", borderRadius: 8, padding: "9px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <img src="/corvo-logo.svg" width={14} height={11} alt="" style={{ marginTop: 2, opacity: 0.8 }} />
                <p style={{ fontSize: 10, color: "rgba(232,224,204,0.65)", lineHeight: 1.55 }}>Your tech concentration is high at 67% — consider adding BND or GLD to reduce correlation risk.</p>
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: -30, left: "25%", right: "25%", height: 50, background: "radial-gradient(ellipse, rgba(201,168,76,0.18) 0%, transparent 70%)", filter: "blur(16px)" }} />
        </div>
      </section>

      {/* TICKER */}
      <div style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(201,168,76,0.07)", borderBottom: "1px solid rgba(201,168,76,0.07)", padding: "10px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 56, animation: "ticker 28s linear infinite", whiteSpace: "nowrap", width: "max-content" }}>
          {[...Array(2)].flatMap(() => ["AAPL +2.4%", "MSFT +1.8%", "VOO +0.9%", "BTC +5.2%", "NVDA +3.1%", "SPY +0.7%", "TSLA -1.2%", "QQQ +1.4%", "GLD +0.3%", "AMZN +2.1%"]).map((item, i) => (
            <span key={i} style={{ fontSize: 11, fontFamily: "Space Mono,monospace", letterSpacing: 1, color: item.includes("-") ? "rgba(224,92,92,0.6)" : "rgba(201,168,76,0.5)" }}>{item}</span>
          ))}
        </div>
      </div>

      {/* ─── STATS BAR ─── */}
      <section style={{ position: "relative", zIndex: 1 }}>
        <div style={{ background: "rgba(10,14,20,0.7)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(201,168,76,0.08)", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div className="stats-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
            <StatItem target={liveUserCount ?? 2400} suffix="+" label="Active Users" delay={0} borderRight />
            <StatItem target={18000} suffix="+" label="Portfolios Analyzed" delay={0.1} borderRight />
            <StatItem target={340000} suffix="+" label="AI Insights Generated" delay={0.2} borderRight />
            <StatItem target={1} suffix="s" label="Avg Analysis Time" delay={0.3} />
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <div style={{ position: "relative", zIndex: 1, padding: "28px 56px", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex" }}>
            {[{ i: "M", c: "#c9a84c" }, { i: "S", c: "#5cb88a" }, { i: "J", c: "#c9a84c" }, { i: "A", c: "#e05c5c" }, { i: "R", c: "#5cb88a" }].map((u, idx) => (
              <div key={idx} style={{ width: 32, height: 32, borderRadius: "50%", background: u.c + "22", border: `2px solid ${u.c}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: u.c, marginLeft: idx === 0 ? 0 : -10, zIndex: 5 - idx, position: "relative" }}>{u.i}</div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "rgba(232,224,204,0.4)", letterSpacing: 0.2 }}>Join <span style={{ color: "#c9a84c", fontWeight: 600 }}>{liveUserCount ? `${liveUserCount.toLocaleString()}+` : "2,400+"}</span> investors already using Corvo</p>
        </div>
      </div>

      {/* ─── FEATURE SHOWCASE — BENTO GRID ─── */}
      <section className="sec-pad" style={{ position: "relative", zIndex: 1, padding: "80px 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>What Corvo Does</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,4vw,44px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2, lineHeight: 1.1 }}>Everything your portfolio<br />actually needs</h2>
          </Reveal>
          <div className="bento-grid" style={{ display: "grid", gridTemplateAreas: `"portfolio portfolio montecarlo" "aichat watchlist montecarlo" "learnxp deepdives deepdives"`, gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "auto auto auto", gap: 14 }}>
            <BentoPortfolioCard delay={0} />
            <BentoAIChatCard delay={0.1} />
            <BentoWatchlistCard delay={0.15} />
            <BentoMonteCarloCard delay={0.05} />
            <BentoLearnCard delay={0.2} />
            <BentoDeepDivesCard delay={0.25} />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="sec-pad" style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 80 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>How It Works</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,4vw,44px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2 }}>Up and running in 60 seconds</h2>
          </Reveal>
          <div style={{ position: "relative" }}>
            {/* Animated connecting line */}
            <div className="how-line" style={{ position: "absolute", top: 34, left: "20%", right: "20%", height: 1, zIndex: 0, overflow: "hidden", background: "rgba(201,168,76,0.08)" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, #c9a84c 0%, rgba(201,168,76,0.3) 50%, #c9a84c 100%)", animation: "shimmer 3s linear infinite", backgroundSize: "200% 100%" }} />
            </div>
            <div className="how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0, position: "relative", zIndex: 1 }}>
              <HowStep n="01" icon="📊" title="Add your tickers" desc="Search any stock, ETF, or crypto. Or screenshot your brokerage — we'll import it automatically." delay={0} />
              <HowStep n="02" icon="✦" title="Get instant AI analysis" desc="Corvo computes Sharpe, drawdown, Monte Carlo, and AI insights in under a second." delay={0.2} />
              <HowStep n="03" icon="🎯" title="Make smarter decisions" desc="Act on clear, personalized recommendations based on your actual holdings and goals." delay={0.4} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─── */}
      <section className="sec-pad" style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>Why Corvo</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3.5vw,40px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2, lineHeight: 1.1 }}>The only tool built<br />for serious investors</h2>
          </Reveal>
          <Reveal>
            <div style={{ overflowX: "auto" }}>
              <table className="compare-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 10, letterSpacing: 2, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", borderBottom: "1px solid rgba(201,168,76,0.08)", fontWeight: 400 }}>Feature</th>
                    {["Corvo", "Bloomberg", "Yahoo Finance", "Robinhood"].map((t, i) => (
                      <th key={t} style={{ padding: "14px 16px", textAlign: "center", fontSize: 11, fontWeight: 600, color: i === 0 ? "#c9a84c" : "rgba(232,224,204,0.3)", borderBottom: i === 0 ? "2px solid rgba(201,168,76,0.4)" : "1px solid rgba(201,168,76,0.08)", borderLeft: i === 0 ? "1px solid rgba(201,168,76,0.18)" : "none", borderRight: i === 0 ? "1px solid rgba(201,168,76,0.18)" : "none", background: i === 0 ? "rgba(201,168,76,0.05)" : "transparent", boxShadow: i === 0 ? "0 0 40px rgba(201,168,76,0.04)" : "none" }}>
                        {t}
                        {i === 0 && <span style={{ display: "block", fontSize: 8, letterSpacing: 1.5, color: "rgba(201,168,76,0.5)", fontWeight: 400, marginTop: 2 }}>FREE</span>}
                        {i === 1 && <span style={{ display: "block", fontSize: 8, letterSpacing: 1, color: "rgba(232,224,204,0.2)", fontWeight: 400, marginTop: 2 }}>~$2,000/mo</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["AI-Powered Insights", true, true, false, false],
                    ["Monte Carlo Simulation", true, true, false, false],
                    ["Learn & Earn XP", true, false, false, false],
                    ["Real-Time Alerts", true, true, true, true],
                    ["Portfolio Health Score", true, false, false, false],
                    ["Correlation Heatmap", true, true, true, false],
                    ["Screenshot Import", true, false, false, false],
                    ["Free to Use", true, false, true, true],
                    ["Beautiful UI", true, false, false, false],
                  ].map(([label, ...vals], ri) => (
                    <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "13px 20px", fontSize: 13, color: "rgba(232,224,204,0.6)", fontWeight: 300 }}>{label as string}</td>
                      {(vals as boolean[]).map((v, ci) => (
                        <td key={ci} style={{ padding: "13px 16px", textAlign: "center", borderLeft: ci === 0 ? "1px solid rgba(201,168,76,0.18)" : "none", borderRight: ci === 0 ? "1px solid rgba(201,168,76,0.18)" : "none", background: ci === 0 ? "rgba(201,168,76,0.03)" : "transparent", fontSize: 14 }}>
                          {v
                            ? <span style={{ color: ci === 0 ? "#c9a84c" : "#5cb88a", fontSize: ci === 0 ? 16 : 14, fontWeight: ci === 0 ? 700 : 400 }}>✓</span>
                            : <span style={{ color: "rgba(255,255,255,0.12)" }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── INTERACTIVE DEMO CTA ─── */}
      <section className="sec-pad" style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", background: "rgba(255,255,255,0.014)", border: "1px solid rgba(201,168,76,0.1)", borderRadius: 24, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.018) 1px, transparent 1px),linear-gradient(90deg, rgba(201,168,76,0.018) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "-30%", right: "-10%", width: "50%", height: "150%", background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div className="demo-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", padding: "64px 56px" }}>
            <div>
              <Reveal>
                <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 18 }}>Live Demo</p>
                <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(26px,3vw,40px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2, lineHeight: 1.15, marginBottom: 18 }}>See it in action.<br />No signup needed.</h2>
                <p style={{ fontSize: 15, color: "rgba(232,224,204,0.4)", lineHeight: 1.8, fontWeight: 300, marginBottom: 36 }}>Explore a live portfolio with real market data. Ask the AI anything. Run Monte Carlo. All before you create an account.</p>
                <Link href="/app?demo=true" className="demo-btn" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 40px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: "#c9a84c", color: "#0a0e14", textDecoration: "none", letterSpacing: 0.2 }}>
                  Try a live demo →
                </Link>
                <p style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", marginTop: 16 }}>No credit card · No account required</p>
              </Reveal>
            </div>
            <Reveal delay={0.15}>
              <DemoPreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="sec-pad" style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 60 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>Investor Stories</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3vw,36px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5 }}>What investors are saying</h2>
          </Reveal>
          <div className="testi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            <TestimonialCard text="Finally understand my portfolio's actual risk exposure. The correlation heatmap alone changed how I think about diversification." name="Marcus T." role="Retail Investor · 12yr experience" delay={0} />
            <TestimonialCard text="I replaced my Bloomberg subscription for personal investing. Corvo gives me 90% of the analytics at zero cost, with a UI that doesn't look like it's from 2003." name="Sarah K." role="Self-directed IRA · Former analyst" delay={0.12} />
            <TestimonialCard text="The Monte Carlo simulator is genuinely impressive. I ran 300 paths against my retirement timeline and completely rethought my allocation." name="David R." role="Index Fund Investor · Engineer" delay={0.24} />
          </div>
        </div>
      </section>

      {/* ─── "BLOOMBERG-SERIOUS" TAGLINE ─── */}
      <section className="sec-pad" style={{ position: "relative", zIndex: 1, padding: "0 56px 140px" }}>
        <Reveal>
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "rgba(201,168,76,0.5)", textTransform: "uppercase", marginBottom: 28 }}>Our philosophy</p>
            <h2 className="tagline-h2" style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(28px,5vw,56px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2.5, lineHeight: 1.1, marginBottom: 28 }}>
              Built for investors who are serious,<br />
              <span style={{ color: "#c9a84c" }}>but not Bloomberg-serious.</span>
            </h2>
            <p style={{ fontSize: 17, color: "rgba(232,224,204,0.38)", lineHeight: 1.85, fontWeight: 300, maxWidth: 580, margin: "0 auto 48px" }}>
              You care about your portfolio. You want real analytics, not guesswork. But you don't need a $2,000/month terminal. Corvo is built exactly for that gap.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/auth" className="cta" style={{ padding: "14px 40px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "#c9a84c", color: "#0a0e14", textDecoration: "none" }}>
                Get started free →
              </Link>
              <Link href="/app?demo=true" className="ghost" style={{ padding: "14px 40px", borderRadius: 12, fontSize: 14, background: "transparent", border: "1px solid rgba(201,168,76,0.25)", color: "#c9a84c", textDecoration: "none", fontWeight: 500 }}>
                Try demo first
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* EMAIL CAPTURE */}
      <EmailCapture />

      {/* MOBILE STICKY CTA */}
      <div style={{ display: "none" }} className="mob-cta">
        <style>{`@media(max-width:768px){.mob-cta{display:block!important;position:fixed;bottom:0;left:0;right:0;padding:12px 16px 20px;background:linear-gradient(to top,rgba(10,14,20,0.98) 0%,rgba(10,14,20,0.9) 100%);z-index:200;border-top:1px solid rgba(201,168,76,0.1);}}`}</style>
        <a href="/auth" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "#c9a84c", color: "#0a0e14", textDecoration: "none" }}>
          Analyze your portfolio free →
        </a>
      </div>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "26px 56px" }}>
        <div className="footer-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/corvo-logo.svg" width={16} height={13} alt="Corvo" style={{ opacity: 0.5 }} />
            <span style={{ fontFamily: "Space Mono,monospace", fontSize: 10, fontWeight: 700, letterSpacing: 3, color: "rgba(232,224,204,0.2)" }}>CORVO</span>
          </div>
          <p style={{ fontSize: 11, color: "rgba(232,224,204,0.18)", textAlign: "center" }}>© 2026 Corvo. All rights reserved.</p>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <a href="/privacy" style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", textDecoration: "none" }}>Privacy</a>
            <a href="/terms" style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", textDecoration: "none" }}>Terms</a>
            <a href="https://github.com/vinay-batra/corvo" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", textDecoration: "none" }}>GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
