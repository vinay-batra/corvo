"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";

const FEATURES = [
  { title: "Real-Time Analytics", desc: "Sharpe ratio, volatility, max drawdown, and benchmark comparison , updated live." },
  { title: "AI Portfolio Analyst", desc: "Ask anything in plain English. Your AI analyst knows your exact holdings and goals." },
  { title: "Risk Intelligence", desc: "Drawdown charts, correlation heatmaps, and Monte Carlo simulations." },
  { title: "Health Score", desc: "Your portfolio gets a 0–100 score. Know at a glance if you're on track." },
  { title: "Goal Tracking", desc: "Set your retirement age, risk tolerance, and savings rate." },
  { title: "Universal Search", desc: "Any stock, ETF, or crypto worldwide , if it trades, Corvo tracks it." },
];

const TESTIMONIALS = [
  { text: "Finally an app that explains what Sharpe ratio actually means for my portfolio.", name: "Marcus T.", role: "Retail Investor" },
  { text: "The AI chat told me I was too concentrated in tech before I even asked.", name: "Sarah K.", role: "Self-directed IRA" },
  { text: "Imported my Fidelity portfolio in 10 seconds with the screenshot import.", name: "James L.", role: "Index Fund Investor" },
];

export default function Landing() {
  const [testimonial, setTestimonial] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTestimonial(p => (p + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const linkStyle = (primary: boolean): React.CSSProperties => ({
    padding: "12px 28px", borderRadius: 10, fontSize: 13, fontWeight: 500,
    background: primary ? "#111" : "transparent",
    border: `0.5px solid ${primary ? "#111" : "rgba(0,0,0,0.15)"}`,
    color: primary ? "#fff" : "#6b6b68",
    textDecoration: "none", transition: "all 0.2s", letterSpacing: 0.3,
  });

  return (
    <div style={{ background: "#fff", color: "#111", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
      `}</style>

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <rect x="1" y="1" width="38" height="38" rx="8" stroke="#111" strokeWidth="1.5"/>
            <path d="M14 28 A8 8 0 1 1 26 28" stroke="#111" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <circle cx="20" cy="20" r="2.5" fill="#111"/>
          </svg>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, letterSpacing: 4, color: "#111" }}>CORVO</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/auth" style={{ padding: "7px 16px", fontSize: 13, borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.12)", background: "transparent", color: "#6b6b68", textDecoration: "none" }}>Log in</Link>
          <Link href="/auth" style={{ padding: "7px 16px", fontSize: 13, borderRadius: 8, border: "none", background: "#111", color: "#fff", textDecoration: "none", fontWeight: 500 }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 140, paddingBottom: 100, textAlign: "center", maxWidth: 800, margin: "0 auto", padding: "140px 24px 100px" }}>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
          style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
          <svg width="56" height="56" viewBox="0 0 40 40" fill="none">
            <rect x="1" y="1" width="38" height="38" rx="8" stroke="#111" strokeWidth="1.5"/>
            <motion.path d="M14 28 A8 8 0 1 1 26 28" stroke="#111" strokeWidth="2" strokeLinecap="round" fill="none"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.4 }} />
            <motion.circle cx="20" cy="20" r="2.5" fill="#111"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.4, type: "spring" }} />
          </svg>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 20, marginBottom: 24 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#111", display: "inline-block", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 10, letterSpacing: 2, color: "#6b6b68", textTransform: "uppercase" }}>AI-Powered Portfolio Intelligence</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
          style={{ fontFamily: "'Space Mono', monospace", fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: -2, marginBottom: 20, color: "#111" }}>
          Know your portfolio.<br />Beat the market.
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          style={{ fontSize: 17, color: "#6b6b68", maxWidth: 500, margin: "0 auto 40px", lineHeight: 1.75, fontWeight: 300 }}>
          Institutional-grade analytics and AI insights built for everyday investors who want to invest smarter without the jargon.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Link href="/auth" style={linkStyle(true)}>Start Free →</Link>
          <Link href="/app" style={linkStyle(false)}>Try Demo</Link>
        </motion.div>
      </section>

      {/* Stats */}
      <section style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)", borderBottom: "0.5px solid rgba(0,0,0,0.08)", display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: "#f8f8f7" }}>
        {[
          { value: "10K+", label: "Portfolios Analyzed" },
          { value: "$2.4B", label: "Assets Tracked" },
          { value: "300+", label: "Monte Carlo Paths" },
          { value: "< 1s", label: "Analysis Time" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            style={{ textAlign: "center", padding: "36px 20px", borderRight: i < 3 ? "0.5px solid rgba(0,0,0,0.08)" : "none" }}>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 32, fontWeight: 700, letterSpacing: -2, color: "#111", marginBottom: 6 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "#9b9b98", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</p>
          </motion.div>
        ))}
      </section>

      {/* Features */}
      <section style={{ padding: "88px 48px", maxWidth: 1100, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} style={{ marginBottom: 56, textAlign: "center" }}>
          <p style={{ fontSize: 10, letterSpacing: 3, color: "#9b9b98", textTransform: "uppercase", marginBottom: 12 }}>What Corvo Does</p>
          <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 700, color: "#111", letterSpacing: -1 }}>Everything your portfolio needs</h2>
        </motion.div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "rgba(0,0,0,0.08)", border: "0.5px solid rgba(0,0,0,0.08)" }}>
          {FEATURES.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              style={{ padding: "32px 28px", background: "#fff" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8f8f7"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: "#111", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "#9b9b98", lineHeight: 1.7, fontWeight: 300 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: "80px 48px", textAlign: "center", borderTop: "0.5px solid rgba(0,0,0,0.08)", background: "#f8f8f7" }}>
        <p style={{ fontSize: 10, letterSpacing: 3, color: "#9b9b98", textTransform: "uppercase", marginBottom: 48 }}>What investors say</p>
        <div style={{ maxWidth: 560, margin: "0 auto", position: "relative", height: 120 }}>
          <AnimatePresence mode="wait">
            <motion.div key={testimonial} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 14 }}>
              <p style={{ fontSize: 17, color: "#111", lineHeight: 1.7, fontWeight: 300, fontStyle: "italic" }}>"{TESTIMONIALS[testimonial].text}"</p>
              <div>
                <p style={{ fontSize: 12, fontWeight: 500, color: "#111" }}>{TESTIMONIALS[testimonial].name}</p>
                <p style={{ fontSize: 11, color: "#9b9b98" }}>{TESTIMONIALS[testimonial].role}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
          {TESTIMONIALS.map((_, i) => (
            <button key={i} onClick={() => setTestimonial(i)}
              style={{ width: i === testimonial ? 20 : 6, height: 6, borderRadius: 3, background: i === testimonial ? "#111" : "rgba(0,0,0,0.15)", border: "none", cursor: "pointer", transition: "all 0.3s" }} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "100px 48px", textAlign: "center" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: "clamp(24px, 4vw, 48px)", fontWeight: 700, color: "#111", letterSpacing: -2, marginBottom: 14 }}>Ready to invest smarter?</h2>
          <p style={{ fontSize: 15, color: "#9b9b98", marginBottom: 36, fontWeight: 300 }}>Free to use. No credit card required.</p>
          <Link href="/auth" style={{ display: "inline-block", padding: "14px 40px", borderRadius: 12, fontSize: 14, fontWeight: 500, background: "#111", color: "#fff", textDecoration: "none" }}>
            Get Started Free →
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)", padding: "28px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
            <rect x="1" y="1" width="38" height="38" rx="8" stroke="#111" strokeWidth="1.5"/>
            <path d="M14 28 A8 8 0 1 1 26 28" stroke="#111" strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#9b9b98" }}>CORVO</span>
        </div>
        <p style={{ fontSize: 11, color: "#9b9b98" }}>© 2026 Corvo. Portfolio intelligence for the modern investor.</p>
        <div style={{ display: "flex", gap: 16 }}>
          {["Privacy", "Terms"].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: "#9b9b98", textDecoration: "none" }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
