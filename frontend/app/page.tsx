"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const STATS = [
  { value: "10K+", label: "Portfolios Analyzed" },
  { value: "$2.4B", label: "Assets Tracked" },
  { value: "300+", label: "Monte Carlo Paths" },
  { value: "99.9%", label: "Uptime" },
];

const FEATURES = [
  {
    icon: "◈", color: "#00ffa0",
    title: "Real-Time Analytics",
    desc: "Sharpe ratio, volatility, max drawdown, and performance vs any benchmark — updated live as you build your portfolio.",
  },
  {
    icon: "◎", color: "#00d4ff",
    title: "AI Portfolio Analyst",
    desc: "Ask questions in plain English. Your AI analyst knows your exact holdings, goals, and risk profile.",
  },
  {
    icon: "◬", color: "#a78bfa",
    title: "Risk Intelligence",
    desc: "Drawdown charts, correlation heatmaps, and Monte Carlo simulations show you exactly how bad things could get.",
  },
  {
    icon: "★", color: "#f59e0b",
    title: "Health Score",
    desc: "Your portfolio gets a 0–100 score like a credit score. Know at a glance if you're on track.",
  },
  {
    icon: "◷", color: "#f472b6",
    title: "Goal Tracking",
    desc: "Set your retirement age, risk tolerance, and savings rate. Get advice calibrated to your actual life.",
  },
  {
    icon: "◇", color: "#34d399",
    title: "Universal Search",
    desc: "Search any stock, ETF, or crypto worldwide. ASML, BTC-USD, VOO — if it trades, Corvo tracks it.",
  },
];

const TESTIMONIALS = [
  { text: "Finally an app that explains what Sharpe ratio actually means for my specific portfolio.", name: "Marcus T.", role: "Retail Investor" },
  { text: "The AI chat is scary good. It told me I was too concentrated in tech before I even asked.", name: "Sarah K.", role: "Self-directed IRA" },
  { text: "I imported my Fidelity portfolio in 10 seconds using the screenshot import. Wild.", name: "James L.", role: "Index Fund Investor" },
];

function CorvoLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer hexagon */}
      <motion.polygon
        points="20,2 35,11 35,29 20,38 5,29 5,11"
        stroke="#00ffa0"
        strokeWidth="1.5"
        fill="none"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        style={{ filter: "drop-shadow(0 0 6px rgba(0,255,160,0.6))" }}
      />
      {/* Inner C shape */}
      <motion.path
        d="M26 14 A8 8 0 1 0 26 26"
        stroke="#00ffa0"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.4 }}
        style={{ filter: "drop-shadow(0 0 4px rgba(0,255,160,0.8))" }}
      />
      {/* Center dot */}
      <motion.circle
        cx="20" cy="20" r="2"
        fill="#00ffa0"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 1 }}
        style={{ filter: "drop-shadow(0 0 4px rgba(0,255,160,1))" }}
      />
    </svg>
  );
}

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Landing() {
  const [mounted, setMounted] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setActiveTestimonial(p => (p + 1) % TESTIMONIALS.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#020408", color: "#fff", fontFamily: "'Space Grotesk', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Orbitron:wght@400;600;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.75); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(0,255,160,0.2); } 50% { box-shadow: 0 0 40px rgba(0,255,160,0.5); } }
      `}</style>

      {/* Grid bg */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(0,200,150,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,150,0.02) 1px, transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none", zIndex: 0 }} />

      {/* Glow orbs */}
      <div style={{ position: "fixed", top: "10%", left: "20%", width: 400, height: 400, background: "radial-gradient(circle, rgba(0,255,160,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: "40%", right: "10%", width: 300, height: 300, background: "radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "16px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(2,4,8,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <CorvoLogo size={32} />
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, letterSpacing: 4, color: "#00ffa0", textShadow: "0 0 20px rgba(0,255,160,0.4)" }}>CORVO</span>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {["Features", "How It Works", ].map((item, i) => (
            <a key={i} href={`#${item.toLowerCase().replace(" ", "-")}`}
              style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none", letterSpacing: 0.5, transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >{item}</a>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          style={{ display: "flex", gap: 10 }}>
          <Link href="/auth" style={{ padding: "9px 20px", borderRadius: 8, fontSize: 11, letterSpacing: 2, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontFamily: "'Orbitron', monospace", textDecoration: "none" }}>LOG IN</Link>
          <Link href="/auth" style={{ padding: "9px 20px", borderRadius: 8, fontSize: 11, letterSpacing: 2, background: "rgba(0,255,160,0.12)", border: "1px solid rgba(0,255,160,0.4)", color: "#00ffa0", fontFamily: "'Orbitron', monospace", textDecoration: "none", animation: "glow 3s infinite" }}>GET STARTED</Link>
        </motion.div>
      </nav>

      {/* HERO */}
      <motion.section ref={heroRef} style={{ y: heroY, opacity: heroOpacity, position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px" }}>

        {/* Animated logo hero */}
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, type: "spring" }}
          style={{ marginBottom: 32, animation: "float 6s ease-in-out infinite" }}>
          <CorvoLogo size={80} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 20, marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", display: "inline-block", animation: "pulse-dot 2s infinite" }} />
          <span style={{ fontSize: 10, letterSpacing: 3, color: "#00d4ff", textTransform: "uppercase" }}>AI-Powered Portfolio Intelligence</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
          style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(40px, 7vw, 88px)", fontWeight: 900, lineHeight: 1.05, marginBottom: 24, letterSpacing: -2 }}>
          <span style={{ color: "#00ffa0", textShadow: "0 0 60px rgba(0,255,160,0.4)" }}>Know</span>{" "}
          <span style={{ color: "#fff" }}>your</span>{" "}
          <span style={{ color: "#00d4ff", textShadow: "0 0 60px rgba(0,212,255,0.4)" }}>portfolio.</span>
          <br />
          <span style={{ color: "#fff" }}>Beat</span>{" "}
          <span style={{ color: "#a78bfa", textShadow: "0 0 60px rgba(167,139,250,0.4)" }}>the market.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
          style={{ fontSize: "clamp(15px, 2vw, 20px)", color: "rgba(255,255,255,0.55)", maxWidth: 600, margin: "0 auto 48px", lineHeight: 1.75 }}>
          Institutional-grade analytics, AI insights, and risk intelligence — built for everyday investors who want to invest smarter without the jargon.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}
          style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth" style={{ padding: "16px 40px", borderRadius: 12, fontSize: 12, letterSpacing: 3, background: "rgba(0,255,160,0.12)", border: "1px solid rgba(0,255,160,0.45)", color: "#00ffa0", fontFamily: "'Orbitron', monospace", textDecoration: "none", transition: "all 0.2s", boxShadow: "0 0 30px rgba(0,255,160,0.15)" }}>START FREE →</Link>
          <Link href="/app" style={{ padding: "16px 40px", borderRadius: 12, fontSize: 12, letterSpacing: 3, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontFamily: "'Orbitron', monospace", textDecoration: "none" }}>TRY DEMO</Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>Scroll</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: 1, height: 32, background: "linear-gradient(to bottom, rgba(0,255,160,0.5), transparent)" }} />
        </motion.div>
      </motion.section>

      {/* STATS */}
      <section style={{ position: "relative", zIndex: 2, padding: "60px 48px", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.02)" }}>
        {STATS.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 36, fontWeight: 900, color: "#00ffa0", letterSpacing: -1, textShadow: "0 0 20px rgba(0,255,160,0.3)", marginBottom: 8 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>{s.label}</div>
          </motion.div>
        ))}
      </section>

      {/* FEATURES */}
      <section id="features" style={{ position: "relative", zIndex: 2, padding: "100px 48px" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 10, letterSpacing: 4, color: "#00ffa0", textTransform: "uppercase", marginBottom: 12 }}>What Corvo Does</p>
          <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: "#fff", marginBottom: 16 }}>Everything your portfolio needs</h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 480, margin: "0 auto" }}>From real-time analytics to AI-powered advice — all in one place.</p>
        </motion.div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, maxWidth: 1100, margin: "0 auto" }}>
          {FEATURES.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, borderColor: f.color + "40" }}
              style={{ padding: "32px 28px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, position: "relative", overflow: "hidden", transition: "border-color 0.3s, transform 0.3s", cursor: "default" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`, opacity: 0.4 }} />
              <div style={{ fontSize: 28, marginBottom: 16, color: f.color, textShadow: `0 0 12px ${f.color}60` }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ position: "relative", zIndex: 2, padding: "100px 48px", background: "rgba(255,255,255,0.01)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 10, letterSpacing: 4, color: "#00d4ff", textTransform: "uppercase", marginBottom: 12 }}>Simple Process</p>
          <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: "#fff" }}>Up and running in 60 seconds</h2>
        </motion.div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, maxWidth: 900, margin: "0 auto" }}>
          {[
            { step: "01", title: "Build Your Portfolio", desc: "Search any ticker worldwide and set your weights. Or import a screenshot from your brokerage.", color: "#00ffa0" },
            { step: "02", title: "Set Your Goals", desc: "Tell Corvo your age, salary, risk tolerance, and what you're investing for.", color: "#00d4ff" },
            { step: "03", title: "Get Smart Insights", desc: "Instantly see your health score, AI analysis, risk breakdown, and personalized recommendations.", color: "#a78bfa" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 48, fontWeight: 900, color: s.color, opacity: 0.2, letterSpacing: -2, lineHeight: 1 }}>{s.step}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ position: "relative", zIndex: 2, padding: "100px 48px", textAlign: "center" }}>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 10, letterSpacing: 4, color: "#a78bfa", textTransform: "uppercase", marginBottom: 12 }}>Investors Love Corvo</p>
          <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(24px, 3vw, 40px)", fontWeight: 900, color: "#fff" }}>Real investors. Real results.</h2>
        </motion.div>
        <div style={{ maxWidth: 600, margin: "0 auto", position: "relative", height: 140 }}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTestimonial}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16 }}>
              <p style={{ fontSize: 18, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, fontStyle: "italic" }}>"{TESTIMONIALS[activeTestimonial].text}"</p>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#00ffa0" }}>{TESTIMONIALS[activeTestimonial].name}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>{TESTIMONIALS[activeTestimonial].role}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          {TESTIMONIALS.map((_, i) => (
            <button key={i} onClick={() => setActiveTestimonial(i)}
              style={{ width: i === activeTestimonial ? 20 : 6, height: 6, borderRadius: 3, background: i === activeTestimonial ? "#00ffa0" : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", transition: "all 0.3s" }} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 2, padding: "120px 48px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div style={{ marginBottom: 24 }}><CorvoLogo size={56} /></div>
          <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(28px, 5vw, 56px)", fontWeight: 900, color: "#fff", marginBottom: 16, lineHeight: 1.1 }}>
            Ready to invest <span style={{ color: "#00ffa0", textShadow: "0 0 40px rgba(0,255,160,0.4)" }}>smarter?</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", marginBottom: 40 }}>Join thousands of investors using Corvo to understand their portfolios.</p>
          <Link href="/auth" style={{ padding: "18px 52px", borderRadius: 14, fontSize: 12, letterSpacing: 3, background: "rgba(0,255,160,0.12)", border: "1px solid rgba(0,255,160,0.45)", color: "#00ffa0", fontFamily: "'Orbitron', monospace", textDecoration: "none", boxShadow: "0 0 40px rgba(0,255,160,0.15)" }}>GET STARTED FREE →</Link>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 2, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "40px 48px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <CorvoLogo size={24} />
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 900, letterSpacing: 3, color: "rgba(0,255,160,0.6)" }}>CORVO</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>Portfolio intelligence for the modern investor.</p>
        </div>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 12 }}>Product</p>
          {["Features", , "Demo"].map(l => <p key={l} style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{l}</p>)}
        </div>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 12 }}>Legal</p>
          {["Privacy Policy", "Terms of Service"].map(l => <p key={l} style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{l}</p>)}
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginTop: 20 }}>© 2026 Corvo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
