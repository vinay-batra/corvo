"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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

function Reveal({ children, delay = 0, y = 40, style = {} }: any) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : `translateY(${y}px)`, transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  const [hov, setHov] = useState(false);
  const { ref, visible } = useReveal(0.1);
  return (
    <div ref={ref} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(32px)", transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, border-color 0.3s, background 0.3s`, padding: "28px", border: `1px solid ${hov ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.05)"}`, borderRadius: 16, background: hov ? "rgba(201,168,76,0.04)" : "rgba(255,255,255,0.015)", cursor: "default" }}>
      <div style={{ fontSize: 20, marginBottom: 16, color: "#c9a84c" }}>{icon}</div>
      <h3 style={{ fontSize: 15, fontWeight: 500, color: "#e8e0cc", marginBottom: 8, letterSpacing: -0.3 }}>{title}</h3>
      <p style={{ fontSize: 13, color: "rgba(232,224,204,0.4)", lineHeight: 1.75, fontWeight: 300 }}>{desc}</p>
    </div>
  );
}

const FEATURES = [
  { icon: "◈", title: "Real-Time Analytics", desc: "Sharpe ratio, volatility, max drawdown, and benchmark comparison — updated live as markets move." },
  { icon: "✦", title: "AI Portfolio Analyst", desc: "Ask anything in plain English. Your AI knows your exact holdings, goals, and risk tolerance." },
  { icon: "◬", title: "Risk Intelligence", desc: "Drawdown charts, correlation heatmaps, and 300-path Monte Carlo simulations." },
  { icon: "◎", title: "Health Score", desc: "Your portfolio gets a 0–100 score across returns, risk-adjustment, stability, and resilience." },
  { icon: "◷", title: "Goal Tracking", desc: "Set your retirement age, salary, and contribution targets. Corvo tells you if you're on track." },
  { icon: "◉", title: "Universal Search", desc: "Any stock, ETF, or crypto worldwide. Screenshot import for Fidelity, Robinhood, and Schwab." },
];

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setNavSolid(el.scrollTop > 60);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={containerRef} style={{ height: "100vh", overflowY: "auto", overflowX: "hidden", background: "#0a0e14", color: "#e8e0cc", fontFamily: "Inter,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.25;transform:scale(0.45)}}
        @keyframes spin-slow{to{transform:rotate(360deg)}}
        @keyframes fadein{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .cta{transition:all 0.25s!important}.cta:hover{background:#d4b558!important;transform:translateY(-2px)!important;box-shadow:0 12px 40px rgba(201,168,76,0.25)!important}
        .ghost{transition:all 0.25s!important}.ghost:hover{border-color:rgba(201,168,76,0.4)!important;color:#c9a84c!important}
        .nl:hover{color:#c9a84c!important}
      `}</style>

      {/* Fixed grid bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.025) 1px, transparent 1px),linear-gradient(90deg, rgba(201,168,76,0.025) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
        <div style={{ position: "absolute", top: "5%", left: "30%", width: 700, height: 500, background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(201,168,76,0.03) 0%, transparent 65%)" }} />
      </div>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 56px", background: navSolid ? "rgba(10,14,20,0.9)" : "transparent", backdropFilter: navSolid ? "blur(16px)" : "none", borderBottom: navSolid ? "1px solid rgba(201,168,76,0.07)" : "none", transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <svg width="18" height="18" viewBox="0 0 40 40" fill="none" style={{ animation: "spin-slow 14s linear infinite" }}>
            <rect x="1" y="1" width="38" height="38" rx="8" stroke="#c9a84c" strokeWidth="1.5"/>
            <path d="M14 28 A8 8 0 1 1 26 28" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <circle cx="20" cy="20" r="2.5" fill="#c9a84c"/>
          </svg>
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "#e8e0cc" }}>CORVO</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/auth" className="nl" style={{ padding: "7px 16px", fontSize: 12, color: "rgba(232,224,204,0.4)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Log in</Link>
          <Link href="/auth" className="cta" style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: "#c9a84c", borderRadius: 8, color: "#0a0e14", textDecoration: "none" }}>Get Started</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "110px 24px 70px" }}>
        <div style={{ animation: "fadein 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s both", display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 24, marginBottom: 36, background: "rgba(201,168,76,0.06)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block", animation: "pdot 2s infinite" }} />
          <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase" }}>AI-Powered Portfolio Intelligence</span>
        </div>

        <h1 style={{ animation: "fadein 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s both", fontFamily: "Space Mono,monospace", fontSize: "clamp(36px,6vw,78px)", fontWeight: 700, lineHeight: 1.06, letterSpacing: -3, marginBottom: 28, maxWidth: 840 }}>
          <span style={{ display: "block", color: "#e8e0cc" }}>Your portfolio.</span>
          <span style={{ display: "block", color: "#c9a84c", position: "relative" }}>
            Analyzed.
            <span style={{ position: "absolute", bottom: 2, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)" }} />
          </span>
        </h1>

        <p style={{ animation: "fadein 0.9s cubic-bezier(0.16,1,0.3,1) 0.45s both", fontSize: 17, color: "rgba(232,224,204,0.45)", lineHeight: 1.85, fontWeight: 300, maxWidth: 520, marginBottom: 48 }}>
          Stop guessing. Start knowing exactly what your money is doing and why.
        </p>

        <div style={{ animation: "fadein 0.9s cubic-bezier(0.16,1,0.3,1) 0.6s both", display: "flex", gap: 12, marginBottom: 80 }}>
          <Link href="/auth" className="cta" style={{ padding: "14px 38px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "#c9a84c", color: "#0a0e14", textDecoration: "none" }}>Start for free →</Link>
          <Link href="/app" className="ghost" style={{ padding: "14px 38px", borderRadius: 12, fontSize: 14, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(232,224,204,0.45)", textDecoration: "none" }}>Try demo</Link>
        </div>

        {/* Dashboard preview */}
        <div style={{ animation: "fadein 1s cubic-bezier(0.16,1,0.3,1) 0.8s both, float 7s ease-in-out 2.5s infinite", width: "min(900px,90vw)", position: "relative" }}>
          <div style={{ background: "rgba(13,17,23,0.95)", border: "1px solid rgba(201,168,76,0.1)", borderRadius: 16, overflow: "hidden", boxShadow: "0 48px 128px rgba(0,0,0,0.7), inset 0 1px 0 rgba(201,168,76,0.08)" }}>
            {/* Window chrome */}
            <div style={{ height: 38, background: "rgba(10,14,20,0.8)", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", padding: "0 16px", gap: 7 }}>
              {["#ff5f56","#ffbd2e","#27c93f"].map((c,i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
              <div style={{ flex: 1, margin: "0 12px", height: 20, background: "rgba(255,255,255,0.04)", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 10 }}>
                <span style={{ fontFamily: "Space Mono,monospace", fontSize: 9, color: "rgba(201,168,76,0.35)", letterSpacing: 1 }}>corvo1.vercel.app/app</span>
              </div>
              <span style={{ fontFamily: "Space Mono,monospace", fontSize: 9, color: "rgba(201,168,76,0.3)", letterSpacing: 2 }}>LIVE</span>
            </div>
            <div style={{ padding: 20 }}>
              {/* Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
                {[{l:"Return",v:"+10.01%",c:"#c9a84c"},{l:"Volatility",v:"24.29%",c:"#e8e0cc"},{l:"Sharpe",v:"0.25",c:"#e8e0cc"},{l:"Drawdown",v:"-18.7%",c:"#e05c5c"}].map((m,i)=>(
                  <div key={i} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 9, padding: "12px 12px 10px" }}>
                    <p style={{ fontSize: 7, letterSpacing: 2, color: "rgba(232,224,204,0.2)", textTransform: "uppercase", marginBottom: 7 }}>{m.l}</p>
                    <p style={{ fontFamily: "Space Mono,monospace", fontSize: 17, fontWeight: 700, color: m.c, letterSpacing: -1 }}>{m.v}</p>
                  </div>
                ))}
              </div>
              {/* Chart */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px", height: 100, position: "relative", overflow: "hidden" }}>
                <p style={{ fontSize: 7, letterSpacing: 2, color: "rgba(232,224,204,0.2)", textTransform: "uppercase", marginBottom: 8 }}>Performance</p>
                <svg width="100%" height="56" viewBox="0 0 800 56" preserveAspectRatio="none">
                  <defs><linearGradient id="grd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9a84c" stopOpacity="0.2"/><stop offset="100%" stopColor="#c9a84c" stopOpacity="0"/></linearGradient></defs>
                  <path d="M0,48 C100,44 200,36 300,28 C400,22 500,18 600,14 C680,11 740,16 800,8 L800,56 L0,56Z" fill="url(#grd)"/>
                  <path d="M0,48 C100,44 200,36 300,28 C400,22 500,18 600,14 C680,11 740,16 800,8" fill="none" stroke="#c9a84c" strokeWidth="1.5"/>
                  <path d="M0,48 C100,46 200,43 300,39 C400,35 500,31 600,28 C700,25 760,27 800,23" fill="none" stroke="rgba(232,224,204,0.18)" strokeWidth="1" strokeDasharray="4 3"/>
                </svg>
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: -30, left: "25%", right: "25%", height: 50, background: "radial-gradient(ellipse, rgba(201,168,76,0.18) 0%, transparent 70%)", filter: "blur(16px)" }} />
        </div>
      </section>

      {/* TICKER */}
      <div style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(201,168,76,0.07)", borderBottom: "1px solid rgba(201,168,76,0.07)", padding: "10px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 56, animation: "ticker 28s linear infinite", whiteSpace: "nowrap", width: "max-content" }}>
          {[...Array(2)].flatMap(() => ["AAPL +2.4%","MSFT +1.8%","VOO +0.9%","BTC +5.2%","NVDA +3.1%","SPY +0.7%","TSLA -1.2%","QQQ +1.4%","GLD +0.3%","AMZN +2.1%"]).map((item,i) => (
            <span key={i} style={{ fontSize: 11, fontFamily: "Space Mono,monospace", letterSpacing: 1, color: item.includes("-") ? "rgba(224,92,92,0.6)" : "rgba(201,168,76,0.5)" }}>{item}</span>
          ))}
        </div>
      </div>

      {/* STATS */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 56px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderLeft: "1px solid rgba(201,168,76,0.07)", borderRight: "1px solid rgba(201,168,76,0.07)" }}>
          {[{v:10,s:"K+",l:"Portfolios Analyzed"},{v:2400,s:"M+",l:"Assets Tracked ($)"},{v:300,s:"",l:"Monte Carlo Paths"},{v:1,s:"s",l:"Avg Analysis Time"}].map((s,i) => {
            const { ref, visible } = useReveal(0.3);
            return (
              <div key={i} ref={ref} style={{ opacity: visible?1:0, transform: visible?"translateY(0)":"translateY(24px)", transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${i*0.1}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${i*0.1}s`, textAlign: "center", padding: "48px 20px", borderRight: i<3?"1px solid rgba(201,168,76,0.07)":"none" }}>
                <p style={{ fontFamily: "Space Mono,monospace", fontSize: 44, fontWeight: 700, color: "#c9a84c", letterSpacing: -3, lineHeight: 1, marginBottom: 8 }}>
                  <Counter target={s.v} suffix={s.s} />
                </p>
                <p style={{ fontSize: 9, letterSpacing: 2.5, color: "rgba(232,224,204,0.25)", textTransform: "uppercase" }}>{s.l}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ position: "relative", zIndex: 1, padding: "120px 56px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 72 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>What Corvo Does</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,4vw,44px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2, lineHeight: 1.1 }}>Everything your portfolio<br />actually needs</h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {FEATURES.map((f,i) => <FeatureCard key={i} {...f} delay={i*0.09}/>)}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 72 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>How It Works</p>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(24px,4vw,44px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2 }}>Up and running in 60 seconds</h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "rgba(201,168,76,0.05)", borderRadius: 16, overflow: "hidden" }}>
            {[
              { n: "01", title: "Add your tickers", desc: "Search any stock, ETF, or crypto. Or screenshot your brokerage and we'll import it automatically." },
              { n: "02", title: "Set your weights", desc: "Drag sliders to match your actual allocation. Corvo normalizes automatically." },
              { n: "03", title: "Get your analysis", desc: "Instant metrics, AI insights, health score, and actionable recommendations." },
            ].map((s,i) => (
              <Reveal key={i} delay={i*0.15} style={{ padding: "44px 36px", background: "#0d1117" }}>
                <p style={{ fontFamily: "Space Mono,monospace", fontSize: 34, fontWeight: 700, color: "rgba(201,168,76,0.12)", letterSpacing: -2, marginBottom: 22 }}>{s.n}</p>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: "#e8e0cc", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(232,224,204,0.38)", lineHeight: 1.8, fontWeight: 300 }}>{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 56px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 60 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase" }}>What Investors Say</p>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {[
              { text: "Finally an app that explains what Sharpe ratio actually means for my portfolio.", name: "Marcus T.", role: "Retail Investor" },
              { text: "The AI chat told me I was too concentrated in tech before I even asked.", name: "Sarah K.", role: "Self-directed IRA" },
              { text: "Imported my Fidelity screenshot in 10 seconds. Immediately knew what to fix.", name: "James L.", role: "Index Fund Investor" },
            ].map((t,i) => (
              <Reveal key={i} delay={i*0.12} y={24}>
                <div style={{ padding: "28px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, background: "rgba(255,255,255,0.01)", height: "100%" }}>
                  <p style={{ fontFamily: "Space Mono,monospace", fontSize: 28, color: "rgba(201,168,76,0.18)", marginBottom: 14, lineHeight: 1 }}>"</p>
                  <p style={{ fontSize: 14, color: "rgba(232,224,204,0.6)", lineHeight: 1.8, fontWeight: 300, marginBottom: 20 }}>{t.text}</p>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "#c9a84c" }}>{t.name}</p>
                    <p style={{ fontSize: 11, color: "rgba(232,224,204,0.28)" }}>{t.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 56px 140px" }}>
        <Reveal>
          <div style={{ maxWidth: 740, margin: "0 auto", textAlign: "center", padding: "80px 40px", border: "1px solid rgba(201,168,76,0.1)", borderRadius: 24, background: "rgba(201,168,76,0.025)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.02) 1px, transparent 1px),linear-gradient(90deg, rgba(201,168,76,0.02) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <p style={{ position: "relative", fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 20 }}>Ready to start</p>
            <h2 style={{ position: "relative", fontFamily: "Space Mono,monospace", fontSize: "clamp(28px,5vw,50px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -2, marginBottom: 16, lineHeight: 1.1 }}>Invest smarter,<br />starting today.</h2>
            <p style={{ position: "relative", fontSize: 15, color: "rgba(232,224,204,0.38)", marginBottom: 40, fontWeight: 300 }}>Free to use. No credit card required.</p>
            <Link href="/auth" className="cta" style={{ position: "relative", display: "inline-block", padding: "16px 52px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "#c9a84c", color: "#0a0e14", textDecoration: "none" }}>Get Started Free →</Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "26px 56px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 40 40" fill="none"><rect x="1" y="1" width="38" height="38" rx="8" stroke="#c9a84c" strokeWidth="1.5"/><path d="M14 28 A8 8 0 1 1 26 28" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 10, fontWeight: 700, letterSpacing: 3, color: "rgba(232,224,204,0.2)" }}>CORVO</span>
        </div>
        <p style={{ fontSize: 11, color: "rgba(232,224,204,0.18)" }}>© 2026 Corvo</p>
        <div style={{ display: "flex", gap: 20 }}>
          {["Privacy","Terms"].map(l => <a key={l} href="#" style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", textDecoration: "none" }}>{l}</a>)}
          <a href="/learn" style={{ fontSize: 11, color: "rgba(201,168,76,0.4)", textDecoration: "none" }}>Learn</a>
        </div>
      </footer>
    </div>
  );
}