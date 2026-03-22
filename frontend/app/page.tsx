"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const FEATURES = [
  { icon: "◈", color: "#00ffb3", title: "Real-Time Analytics", desc: "Sharpe ratio, volatility, max drawdown, and benchmark comparison — updated live as you build." },
  { icon: "✦", color: "#38bdf8", title: "AI Portfolio Analyst", desc: "Ask anything in plain English. Your AI analyst knows your exact holdings, goals, and risk tolerance." },
  { icon: "◬", color: "#818cf8", title: "Risk Intelligence", desc: "Drawdown charts, correlation heatmaps, and Monte Carlo simulations reveal exactly how bad things could get." },
  { icon: "◎", color: "#fbbf24", title: "Health Score", desc: "Your portfolio gets a 0–100 score like a credit score. Know at a glance if you're on track." },
  { icon: "◷", color: "#fb7185", title: "Goal Tracking", desc: "Set your retirement age, risk tolerance, and savings rate. Get advice calibrated to your actual life." },
  { icon: "◇", color: "#34d399", title: "Universal Search", desc: "Any stock, ETF, or crypto worldwide. ASML, BTC-USD, VOO — if it trades, Corvo tracks it." },
];

const STATS = [
  { value: "10K+", label: "Portfolios Analyzed" },
  { value: "$2.4B", label: "Assets Tracked" },
  { value: "300+", label: "Monte Carlo Paths" },
  { value: "< 1s", label: "Analysis Time" },
];

const TESTIMONIALS = [
  { text: "Finally an app that explains what Sharpe ratio actually means for my specific portfolio.", name: "Marcus T.", role: "Retail Investor" },
  { text: "The AI chat is scary good. It told me I was too concentrated in tech before I even asked.", name: "Sarah K.", role: "Self-directed IRA" },
  { text: "Imported my Fidelity portfolio in 10 seconds using the screenshot import. Wild.", name: "James L.", role: "Index Fund Investor" },
];

function CorvoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <polygon points="20,2 35,11 35,29 20,38 5,29 5,11"
        stroke="#00ffb3" strokeWidth="1.5" fill="none"
        style={{ filter: "drop-shadow(0 0 6px rgba(0,255,179,0.5))" }} />
      <path d="M26 14 A8 8 0 1 0 26 26"
        stroke="#00ffb3" strokeWidth="2.5" strokeLinecap="round" fill="none"
        style={{ filter: "drop-shadow(0 0 4px rgba(0,255,179,0.7))" }} />
      <circle cx="20" cy="20" r="2" fill="#00ffb3"
        style={{ filter: "drop-shadow(0 0 6px #00ffb3)" }} />
    </svg>
  );
}

function AnimatedCorvoMark() {
  return (
    <svg width="72" height="72" viewBox="0 0 40 40" fill="none">
      <motion.polygon points="20,2 35,11 35,29 20,38 5,29 5,11"
        stroke="rgba(0,255,179,0.25)" strokeWidth="1" fill="none"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
      <motion.polygon points="20,2 35,11 35,29 20,38 5,29 5,11"
        stroke="#00ffb3" strokeWidth="1.5" fill="none"
        strokeDasharray="120"
        initial={{ strokeDashoffset: 120 }} animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
        style={{ filter: "drop-shadow(0 0 8px rgba(0,255,179,0.6))" }} />
      <motion.path d="M26 14 A8 8 0 1 0 26 26"
        stroke="#00ffb3" strokeWidth="2.5" strokeLinecap="round" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.6 }}
        style={{ filter: "drop-shadow(0 0 4px rgba(0,255,179,0.8))" }} />
      <motion.circle cx="20" cy="20" r="2.5" fill="#00ffb3"
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.8, type: "spring", stiffness: 300 }}
        style={{ filter: "drop-shadow(0 0 8px #00ffb3)" }} />
    </svg>
  );
}

export default function Landing() {
  const [mounted, setMounted] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setActiveTestimonial(p => (p + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#01020a", color: "#f0f4ff", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        .noise::before { content:''; position:fixed; inset:0; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E"); background-size:256px; pointer-events:none; z-index:0; }
      `}</style>

      {/* Grid bg */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(0,255,179,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,179,0.012) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0 }} />

      {/* Glow orbs */}
      <div style={{ position: "fixed", top: "5%", left: "20%", width: 500, height: 500, background: "radial-gradient(circle, rgba(0,255,179,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: "40%", right: "5%", width: 350, height: 350, background: "radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 60, background: "rgba(1,2,10,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CorvoMark size={28} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: 5, color: "#00ffb3", textShadow: "0 0 20px rgba(0,255,179,0.3)" }}>CORVO</span>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {["Features", "How It Works"].map((item, i) => (
            <a key={i} href={`#${item.toLowerCase().replace(" ", "-")}`}
              style={{ fontSize: 13, color: "rgba(240,244,255,0.5)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s", fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.color = "#f0f4ff"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(240,244,255,0.5)"}
            >{item}</a>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/auth" style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, letterSpacing: 0.5, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(240,244,255,0.55)", fontFamily: "'Inter', sans-serif", textDecoration: "none", transition: "all 0.2s", fontWeight: 500 }}
            onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(240,244,255,0.9)"; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(240,244,255,0.55)"; }}
          >Log in</Link>
          <Link href="/auth" style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, letterSpacing: 0.5, background: "rgba(0,255,179,0.1)", border: "1px solid rgba(0,255,179,0.35)", color: "#00ffb3", fontFamily: "'Inter', sans-serif", textDecoration: "none", transition: "all 0.2s", fontWeight: 600 }}
            onMouseEnter={(e: any) => { e.currentTarget.style.background = "rgba(0,255,179,0.18)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(0,255,179,0.15)"; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.background = "rgba(0,255,179,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
          >Get Started</Link>
        </motion.div>
      </nav>

      {/* HERO */}
      <motion.section ref={heroRef} style={{ y: heroY, opacity: heroOpacity, position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "100px 24px 80px" }}>
        <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
          style={{ marginBottom: 36, animation: "float 6s ease-in-out infinite" }}>
          <AnimatedCorvoMark />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "rgba(0,255,179,0.06)", border: "1px solid rgba(0,255,179,0.18)", borderRadius: 20, marginBottom: 28 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00ffb3", display: "inline-block", animation: "pulse-dot 2s infinite", boxShadow: "0 0 6px #00ffb3" }} />
          <span style={{ fontSize: 10, letterSpacing: 3, color: "#00ffb3", textTransform: "uppercase", fontFamily: "'Space Mono', monospace" }}>AI-Powered Portfolio Intelligence</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
          style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(44px, 8vw, 96px)", fontWeight: 800, lineHeight: 1.0, marginBottom: 24, letterSpacing: -3 }}>
          <span style={{ color: "#00ffb3", textShadow: "0 0 60px rgba(0,255,179,0.35)" }}>Know</span>{" "}
          <span style={{ color: "#f0f4ff" }}>your</span>{" "}
          <span style={{ color: "#38bdf8", textShadow: "0 0 60px rgba(56,189,248,0.35)" }}>portfolio.</span>
          <br />
          <span style={{ color: "#f0f4ff" }}>Beat</span>{" "}
          <span style={{ color: "#818cf8", textShadow: "0 0 60px rgba(129,140,248,0.35)" }}>the market.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.65 }}
          style={{ fontSize: "clamp(15px, 2vw, 19px)", color: "rgba(224,232,255,0.6)", maxWidth: 560, margin: "0 auto 48px", lineHeight: 1.8, fontWeight: 300 }}>
          Institutional-grade analytics, AI insights, and risk intelligence — built for everyday investors who want to invest smarter without the jargon.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.75 }}
          style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth" style={{ padding: "15px 36px", borderRadius: 12, fontSize: 13, letterSpacing: 1, background: "rgba(0,255,179,0.1)", border: "1px solid rgba(0,255,179,0.4)", color: "#00ffb3", fontFamily: "'Inter', sans-serif", textDecoration: "none", transition: "all 0.25s", boxShadow: "0 0 30px rgba(0,255,179,0.1)", fontWeight: 600 }}
            onMouseEnter={(e: any) => { e.currentTarget.style.background = "rgba(0,255,179,0.18)"; e.currentTarget.style.boxShadow = "0 0 50px rgba(0,255,179,0.2)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.background = "rgba(0,255,179,0.1)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(0,255,179,0.1)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >Start Free →</Link>
          <Link href="/app" style={{ padding: "15px 36px", borderRadius: 12, fontSize: 13, letterSpacing: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(224,232,255,0.55)", fontFamily: "'Inter', sans-serif", textDecoration: "none", transition: "all 0.2s", fontWeight: 500 }}
            onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(224,232,255,0.85)"; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(224,232,255,0.55)"; }}
          >Try Demo</Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, letterSpacing: 3, color: "rgba(224,232,255,0.2)", textTransform: "uppercase", fontFamily: "'Space Mono', monospace" }}>Scroll</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 1, height: 28, background: "linear-gradient(to bottom, rgba(0,255,179,0.4), transparent)" }} />
        </motion.div>
      </motion.section>

      {/* STATS */}
      <section style={{ position: "relative", zIndex: 2, padding: "0 0 0", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "rgba(255,255,255,0.04)" }}>
          {STATS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              style={{ textAlign: "center", padding: "36px 24px", background: "#01020a" }}>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, color: "#00ffb3", letterSpacing: -2, marginBottom: 8, textShadow: "0 0 30px rgba(0,255,179,0.25)" }}>{s.value}</p>
              <p style={{ fontSize: 11, color: "rgba(224,232,255,0.4)", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Space Mono', monospace" }}>{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ position: "relative", zIndex: 2, padding: "100px 48px" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 10, letterSpacing: 4, color: "#00ffb3", textTransform: "uppercase", marginBottom: 14, fontFamily: "'Space Mono', monospace" }}>What Corvo Does</p>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, color: "#f0f4ff", letterSpacing: -2, marginBottom: 16 }}>Everything your portfolio needs</h2>
          <p style={{ fontSize: 16, color: "rgba(224,232,255,0.45)", maxWidth: 480, margin: "0 auto", fontWeight: 300, lineHeight: 1.7 }}>From real-time analytics to AI-powered advice — all in one place.</p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 1, maxWidth: 1100, margin: "0 auto", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}>
          {FEATURES.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              whileHover={{ background: "rgba(255,255,255,0.03)", transition: { duration: 0.15 } }}
              style={{ padding: "36px 32px", background: "#01020a", position: "relative", overflow: "hidden", cursor: "default" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${f.color}40, transparent)` }} />
              <div style={{ fontSize: 20, marginBottom: 16, color: f.color, textShadow: `0 0 12px ${f.color}60` }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: "#f0f4ff", marginBottom: 10, letterSpacing: -0.3 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(224,232,255,0.45)", lineHeight: 1.75, fontWeight: 300 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ position: "relative", zIndex: 2, padding: "100px 48px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 72 }}>
          <p style={{ fontSize: 10, letterSpacing: 4, color: "#38bdf8", textTransform: "uppercase", marginBottom: 14, fontFamily: "'Space Mono', monospace" }}>Simple Process</p>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, color: "#f0f4ff", letterSpacing: -2 }}>Up and running in 60 seconds</h2>
        </motion.div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 48, maxWidth: 900, margin: "0 auto" }}>
          {[
            { step: "01", title: "Build Your Portfolio", desc: "Search any ticker worldwide and set your weights. Or import a screenshot from your brokerage.", color: "#00ffb3" },
            { step: "02", title: "Set Your Goals", desc: "Tell Corvo your age, salary, risk tolerance, and what you're investing for.", color: "#38bdf8" },
            { step: "03", title: "Get Smart Insights", desc: "Instantly see your health score, AI analysis, risk breakdown, and personalized recommendations.", color: "#818cf8" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 64, fontWeight: 800, color: s.color, opacity: 0.12, letterSpacing: -4, lineHeight: 1, marginBottom: 20 }}>{s.step}</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "#f0f4ff", marginBottom: 12, letterSpacing: -0.5 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(224,232,255,0.45)", lineHeight: 1.75, fontWeight: 300 }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ position: "relative", zIndex: 2, padding: "100px 48px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 10, letterSpacing: 4, color: "#818cf8", textTransform: "uppercase", marginBottom: 14, fontFamily: "'Space Mono', monospace" }}>Investors Love Corvo</p>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(24px, 3vw, 44px)", fontWeight: 800, color: "#f0f4ff", letterSpacing: -1.5 }}>Real investors. Real results.</h2>
        </motion.div>
        <div style={{ maxWidth: 600, margin: "0 auto", position: "relative", height: 160 }}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTestimonial}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 20 }}>
              <p style={{ fontSize: 19, color: "rgba(240,244,255,0.85)", lineHeight: 1.75, fontStyle: "italic", fontWeight: 300 }}>"{TESTIMONIALS[activeTestimonial].text}"</p>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#00ffb3", fontFamily: "'Syne', sans-serif" }}>{TESTIMONIALS[activeTestimonial].name}</p>
                <p style={{ fontSize: 11, color: "rgba(224,232,255,0.3)", letterSpacing: 1, fontFamily: "'Space Mono', monospace" }}>{TESTIMONIALS[activeTestimonial].role}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
          {TESTIMONIALS.map((_, i) => (
            <button key={i} onClick={() => setActiveTestimonial(i)}
              style={{ width: i === activeTestimonial ? 24 : 6, height: 6, borderRadius: 3, background: i === activeTestimonial ? "#00ffb3" : "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", transition: "all 0.3s", boxShadow: i === activeTestimonial ? "0 0 8px rgba(0,255,179,0.4)" : "none" }} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 2, padding: "120px 48px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <CorvoMark size={52} />
            </motion.div>
          </div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 6vw, 64px)", fontWeight: 800, color: "#f0f4ff", marginBottom: 16, lineHeight: 1.05, letterSpacing: -2 }}>
            Ready to invest <span style={{ color: "#00ffb3", textShadow: "0 0 40px rgba(0,255,179,0.4)" }}>smarter?</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(224,232,255,0.4)", marginBottom: 40, fontWeight: 300 }}>Free to use. No credit card required.</p>
          <Link href="/auth" style={{ display: "inline-block", padding: "16px 48px", borderRadius: 14, fontSize: 13, letterSpacing: 1, background: "rgba(0,255,179,0.1)", border: "1px solid rgba(0,255,179,0.4)", color: "#00ffb3", fontFamily: "'Inter', sans-serif", textDecoration: "none", fontWeight: 600, transition: "all 0.25s", boxShadow: "0 0 40px rgba(0,255,179,0.12)" }}
            onMouseEnter={(e: any) => { e.currentTarget.style.background = "rgba(0,255,179,0.18)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(0,255,179,0.22)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.background = "rgba(0,255,179,0.1)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(0,255,179,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >Get Started Free →</Link>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 2, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "36px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CorvoMark size={22} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 4, color: "rgba(0,255,179,0.5)" }}>CORVO</span>
        </div>
        <p style={{ fontSize: 11, color: "rgba(224,232,255,0.18)", fontFamily: "'Space Mono', monospace" }}>© 2026 Corvo. Portfolio intelligence for the modern investor.</p>
        <div style={{ display: "flex", gap: 20 }}>
          {["Privacy", "Terms"].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: "rgba(224,232,255,0.3)", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color = "rgba(224,232,255,0.7)"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(224,232,255,0.3)"}
            >{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
