"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const EASE = [0.25, 0.1, 0.25, 1] as const;

// ── Headline letter timing ────────────────────────────────────────────────────
const HEADLINE = "Install Corvo";
const H_CHARS = HEADLINE.split("");
const H_STAGGER = 0.03;
const H_CHAR_DUR = 0.22;
// last char (index 12) starts at 0.1 + 12*0.03 = 0.46; ends at 0.46 + 0.22 = 0.68
const H_END = 0.1 + (H_CHARS.length - 1) * H_STAGGER + H_CHAR_DUR;
const UNDERLINE_DELAY = H_END;           // 0.68s
const SUBTITLE_DELAY = H_END + 0.4;     // 1.08s

// ── Background data ───────────────────────────────────────────────────────────
const ORBS = [
  { size: 600, top: "-8%",  left: "-14%",  floatDur: 12, floatDelay: 0 },
  { size: 450, top: "52%",  right: "-10%", floatDur: 15, floatDelay: -4 },
];

const PARTICLES = [
  { size: 4, top: "12%", left:  "7%", dur: 12, animName: "pfloat0" },
  { size: 6, top: "38%", left: "91%", dur: 16, animName: "pfloat1" },
  { size: 8, top: "58%", left: "14%", dur: 14, animName: "pfloat2" },
  { size: 4, top: "78%", left: "74%", dur: 18, animName: "pfloat3" },
  { size: 6, top: "22%", left: "58%", dur: 10, animName: "pfloat4" },
];

// ── Demo strip constants ──────────────────────────────────────────────────────
const DEMO_TICKERS = ["AAPL", "MSFT", "NVDA"];
const STEP_LABELS = ["Add your portfolio", "Analyze returns", "Ask Corvo AI"];
const STEP_DURATIONS = [4800, 4200, 5200]; // ms per step
const AI_TEXT = "Your portfolio beat the S&P 500 by 31.8%. Consider trimming NVDA.";

// ── SVG Illustrations ─────────────────────────────────────────────────────────

function IPhoneIllustration({ hoverKey, isHovered }: { hoverKey: number; isHovered: boolean }) {
  return (
    <svg viewBox="0 0 160 300" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 130, height: "auto" }}>
      <rect x="12" y="0" width="136" height="300" rx="26" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5"/>
      <rect x="9.5" y="76" width="3" height="20" rx="1.5" fill="var(--border2)"/>
      <rect x="9.5" y="102" width="3" height="20" rx="1.5" fill="var(--border2)"/>
      <rect x="147.5" y="88" width="3" height="30" rx="1.5" fill="var(--border2)"/>
      <rect x="20" y="12" width="120" height="276" rx="20" fill="var(--bg)"/>
      <rect x="52" y="18" width="56" height="18" rx="9" fill="var(--bg2)"/>
      <rect x="28" y="21" width="16" height="4" rx="2" fill="var(--text3)" opacity="0.3"/>
      <rect x="116" y="21" width="16" height="4" rx="2" fill="var(--text3)" opacity="0.3"/>
      <rect x="26" y="48" width="108" height="22" rx="8" fill="var(--bg3)" stroke="var(--border)" strokeWidth="0.5"/>
      <rect x="48" y="56" width="52" height="4" rx="2" fill="var(--text3)" opacity="0.22"/>
      <rect x="26" y="82" width="108" height="64" rx="8" fill="var(--bg2)"/>
      <polyline
        key={`iphone-${hoverKey}`}
        className={isHovered ? "chart-draw" : ""}
        points="34,136 50,120 64,124 78,108 94,114 110,100 126,106"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"/>
      <polygon points="34,136 50,120 64,124 78,108 94,114 110,100 126,106 126,142 34,142"
        fill="var(--accent)" opacity="0.08"/>
      <rect x="26" y="156" width="72" height="5" rx="2" fill="var(--text3)" opacity="0.2"/>
      <rect x="26" y="166" width="56" height="4" rx="2" fill="var(--text3)" opacity="0.13"/>
      <rect x="26" y="175" width="64" height="4" rx="2" fill="var(--text3)" opacity="0.13"/>
      <rect x="20" y="192" width="120" height="96" rx="14" fill="var(--card-bg)" stroke="var(--border)" strokeWidth="0.7"/>
      <rect x="64" y="199" width="32" height="3" rx="1.5" fill="var(--border2)"/>
      <rect x="26" y="209" width="32" height="32" rx="10"
        fill="color-mix(in srgb, var(--accent) 15%, transparent)" stroke="var(--accent)" strokeWidth="1.2"/>
      <rect x="32" y="222" width="20" height="13" rx="3" fill="none" stroke="var(--accent)" strokeWidth="1.3"/>
      <path d="M42 222v-8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M39 217l3-3 3 3" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="64" y="214" width="68" height="5" rx="2" fill="var(--text)" opacity="0.5"/>
      <rect x="64" y="223" width="48" height="3.5" rx="1.5" fill="var(--text3)" opacity="0.28"/>
      <line x1="26" y1="248" x2="134" y2="248" stroke="var(--border)" strokeWidth="0.5"/>
      <rect x="26" y="254" width="108" height="24" rx="8" fill="var(--bg2)"/>
      <rect x="52" y="262" width="56" height="4" rx="2" fill="var(--text3)" opacity="0.25"/>
      <rect x="56" y="282" width="48" height="4" rx="2" fill="var(--text3)" opacity="0.22"/>
    </svg>
  );
}

function AndroidIllustration({ hoverKey, isHovered }: { hoverKey: number; isHovered: boolean }) {
  return (
    <svg viewBox="0 0 160 300" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 130, height: "auto" }}>
      <rect x="10" y="4" width="140" height="292" rx="20" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5"/>
      <rect x="7.5" y="80" width="3" height="22" rx="1.5" fill="var(--border2)"/>
      <rect x="7.5" y="108" width="3" height="22" rx="1.5" fill="var(--border2)"/>
      <rect x="149.5" y="95" width="3" height="30" rx="1.5" fill="var(--border2)"/>
      <rect x="18" y="18" width="124" height="264" rx="14" fill="var(--bg)"/>
      <circle cx="80" cy="28" r="5" fill="var(--bg2)"/>
      <circle cx="80" cy="28" r="3" fill="var(--bg3)"/>
      <rect x="18" y="18" width="124" height="38" rx="14" fill="var(--bg2)"/>
      <rect x="18" y="38" width="124" height="18" fill="var(--bg2)"/>
      <rect x="26" y="28" width="86" height="20" rx="10" fill="var(--bg3)" stroke="var(--border)" strokeWidth="0.5"/>
      <rect x="36" y="35" width="52" height="4" rx="2" fill="var(--text3)" opacity="0.22"/>
      <circle cx="126" cy="31" r="2.4" fill="var(--accent)"/>
      <circle cx="126" cy="38" r="2.4" fill="var(--accent)"/>
      <circle cx="126" cy="45" r="2.4" fill="var(--accent)"/>
      <rect x="82" y="54" width="56" height="100" rx="8" fill="var(--card-bg)" stroke="var(--border)" strokeWidth="0.7"/>
      <rect x="84" y="56" width="52" height="24" rx="4" fill="color-mix(in srgb, var(--accent) 10%, transparent)"/>
      <rect x="90" y="62" width="40" height="4" rx="2" fill="var(--accent)" opacity="0.65"/>
      <rect x="90" y="70" width="28" height="3" rx="1.5" fill="var(--accent)" opacity="0.35"/>
      <line x1="84" y1="82" x2="136" y2="82" stroke="var(--border)" strokeWidth="0.5"/>
      <rect x="90" y="89" width="36" height="4" rx="2" fill="var(--text3)" opacity="0.22"/>
      <rect x="90" y="105" width="32" height="4" rx="2" fill="var(--text3)" opacity="0.18"/>
      <rect x="90" y="121" width="38" height="4" rx="2" fill="var(--text3)" opacity="0.18"/>
      <rect x="90" y="137" width="28" height="4" rx="2" fill="var(--text3)" opacity="0.15"/>
      <rect x="26" y="164" width="108" height="62" rx="8" fill="var(--bg2)"/>
      <polyline
        key={`android-${hoverKey}`}
        className={isHovered ? "chart-draw" : ""}
        points="34,216 50,200 64,204 78,188 94,194 110,180 126,186"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"/>
      <polygon points="34,216 50,200 64,204 78,188 94,194 110,180 126,186 126,222 34,222"
        fill="var(--accent)" opacity="0.08"/>
      <rect x="26" y="234" width="70" height="5" rx="2" fill="var(--text3)" opacity="0.2"/>
      <rect x="26" y="244" width="54" height="4" rx="2" fill="var(--text3)" opacity="0.13"/>
      <rect x="18" y="266" width="124" height="16" rx="14" fill="var(--bg2)"/>
      <path d="M52 274 l-5 0 2-2 m-2 2 2 2" stroke="var(--border2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="80" cy="274" r="4" fill="none" stroke="var(--border2)" strokeWidth="1.2"/>
      <rect x="104" y="270" width="7" height="7" rx="1.5" fill="none" stroke="var(--border2)" strokeWidth="1.2"/>
    </svg>
  );
}

function DesktopIllustration({ hoverKey, isHovered }: { hoverKey: number; isHovered: boolean }) {
  return (
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 240, height: "auto" }}>
      <rect x="4" y="4" width="252" height="192" rx="10" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5"/>
      <rect x="4" y="4" width="252" height="32" rx="10" fill="var(--bg3)"/>
      <rect x="4" y="24" width="252" height="12" fill="var(--bg3)"/>
      <circle cx="22" cy="20" r="4.5" fill="var(--border2)" opacity="0.55"/>
      <circle cx="36" cy="20" r="4.5" fill="var(--border2)" opacity="0.55"/>
      <circle cx="50" cy="20" r="4.5" fill="var(--border2)" opacity="0.55"/>
      <rect x="70" y="8" width="100" height="22" rx="6" fill="var(--bg)" stroke="var(--border)" strokeWidth="0.5"/>
      <rect x="80" y="15" width="56" height="5" rx="2.5" fill="var(--text3)" opacity="0.28"/>
      <rect x="14" y="40" width="232" height="26" rx="8" fill="var(--bg)" stroke="var(--border)" strokeWidth="0.7"/>
      <path d="M25 51v-2.5a3 3 0 016 0V51" stroke="var(--text3)" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
      <rect x="23" y="51" width="10" height="8" rx="2" fill="none" stroke="var(--text3)" strokeWidth="1" opacity="0.4"/>
      <rect x="40" y="51" width="118" height="5" rx="2" fill="var(--text3)" opacity="0.2"/>
      <line x1="178" y1="44" x2="178" y2="62" stroke="var(--border)" strokeWidth="0.5"/>
      <circle cx="218" cy="53" r="10" fill="color-mix(in srgb, var(--accent) 15%, transparent)" stroke="var(--accent)" strokeWidth="1.3"/>
      <path d="M218 47v8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M214.5 52l3.5 3.5 3.5-3.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="213" y1="57" x2="223" y2="57" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="176" y="70" width="80" height="36" rx="8" fill="var(--card-bg)" stroke="var(--border)" strokeWidth="0.7"/>
      <path d="M218 70 l-5 -5 h10 z" fill="var(--card-bg)"/>
      <line x1="213" y1="70" x2="223" y2="70" stroke="var(--card-bg)" strokeWidth="1.5"/>
      <rect x="184" y="78" width="64" height="4.5" rx="2" fill="var(--text2)" opacity="0.5"/>
      <rect x="190" y="87" width="52" height="3.5" rx="1.5" fill="var(--text3)" opacity="0.28"/>
      <rect x="194" y="94" width="44" height="3" rx="1.5" fill="var(--text3)" opacity="0.18"/>
      <rect x="14" y="112" width="52" height="72" rx="0" fill="var(--bg2)"/>
      <rect x="14" y="168" width="52" height="16" rx="0" fill="var(--bg2)" style={{ borderRadius: "0 0 0 8px" }}/>
      <rect x="22" y="120" width="36" height="4" rx="2" fill="var(--text3)" opacity="0.18"/>
      <rect x="22" y="130" width="30" height="4" rx="2" fill="var(--accent)" opacity="0.35"/>
      <rect x="22" y="140" width="34" height="4" rx="2" fill="var(--text3)" opacity="0.14"/>
      <rect x="22" y="150" width="28" height="4" rx="2" fill="var(--text3)" opacity="0.14"/>
      <rect x="22" y="160" width="32" height="4" rx="2" fill="var(--text3)" opacity="0.11"/>
      <rect x="74" y="112" width="172" height="72" rx="0" fill="var(--bg)"/>
      <polyline
        key={`desktop-${hoverKey}`}
        className={isHovered ? "chart-draw" : ""}
        points="84,172 104,154 122,160 144,140 164,146 184,130 206,136 228,122 238,128"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"/>
      <polygon points="84,172 104,154 122,160 144,140 164,146 184,130 206,136 228,122 238,128 238,180 84,180"
        fill="var(--accent)" opacity="0.07"/>
    </svg>
  );
}

// ── Card data ─────────────────────────────────────────────────────────────────

const CARDS = [
  {
    key: "iphone",
    label: "iPhone",
    sub: "Safari required",
    Illustration: IPhoneIllustration,
    steps: [
      "Tap the Share button at the bottom of Safari",
      'Tap "Add to Home Screen"',
      'Tap "Add" to confirm',
    ],
  },
  {
    key: "android",
    label: "Android",
    sub: "Chrome required",
    Illustration: AndroidIllustration,
    steps: [
      "Tap the three-dot menu in Chrome",
      'Tap "Add to Home Screen"',
      'Tap "Add" to confirm',
    ],
  },
  {
    key: "desktop",
    label: "Desktop",
    sub: "Chrome or Edge",
    Illustration: DesktopIllustration,
    steps: [
      "Click the install icon in the address bar",
      'Click "Install"',
      "Corvo opens as a standalone app",
    ],
  },
];

// ── Demo strip sub-components ─────────────────────────────────────────────────

const demoScreenStyle: React.CSSProperties = {
  background: "var(--bg)",
  borderRadius: 10,
  padding: "10px 12px",
  border: "1px solid var(--border)",
  minHeight: 148,
};

function DemoStep1({ active }: { active: boolean }) {
  const [typedTickers, setTypedTickers] = useState<string[]>([]);
  const [currentTyping, setCurrentTyping] = useState("");
  const [tickerIdx, setTickerIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    if (!active) {
      setTypedTickers([]);
      setCurrentTyping("");
      setTickerIdx(0);
      setCharIdx(0);
      return;
    }
    const ticker = DEMO_TICKERS[tickerIdx];
    if (!ticker) return;
    if (charIdx < ticker.length) {
      const t = setTimeout(() => {
        setCurrentTyping(ticker.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      }, 110);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setTypedTickers((prev) => [...prev, ticker]);
        setCurrentTyping("");
        setTickerIdx((i) => i + 1);
        setCharIdx(0);
      }, 380);
      return () => clearTimeout(t);
    }
  }, [active, tickerIdx, charIdx]);

  return (
    <div style={demoScreenStyle}>
      <div style={{ fontSize: 8, letterSpacing: 1.5, color: "var(--accent)", textTransform: "uppercase", marginBottom: 10, fontFamily: "Space Mono, monospace" }}>
        Portfolio Input
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {typedTickers.map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", padding: "5px 8px", background: "var(--bg2)", borderRadius: 6, border: "1px solid var(--border)" }}>
            <span style={{ fontFamily: "Space Mono, monospace", fontSize: 10, fontWeight: 700, color: "var(--text)" }}>{t}</span>
            <span style={{ marginLeft: "auto", fontFamily: "Space Mono, monospace", fontSize: 10, color: "var(--accent)" }}>33%</span>
          </div>
        ))}
        {tickerIdx < DEMO_TICKERS.length && (
          <div style={{ display: "flex", alignItems: "center", padding: "5px 8px", background: "color-mix(in srgb, var(--accent) 6%, var(--bg2))", borderRadius: 6, border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }}>
            <span className="typing-cursor" style={{ fontFamily: "Space Mono, monospace", fontSize: 10, fontWeight: 700, color: "var(--text)" }}>
              {currentTyping}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DemoStep2({ active }: { active: boolean }) {
  const [progress, setProgress] = useState(0);
  const [cagr, setCagr] = useState(0);
  const [sharpe, setSharpe] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      setCagr(0);
      setSharpe(0);
      return;
    }
    let start: number | null = null;
    let phase: "loading" | "counting" = "loading";
    let countStart: number | null = null;

    const animate = (ts: number) => {
      if (!start) start = ts;
      if (phase === "loading") {
        const p = Math.min((ts - start) / 1400, 1);
        setProgress(Math.round(p * 100));
        if (p >= 1) { phase = "counting"; countStart = ts; }
      } else {
        const elapsed = ts - (countStart ?? ts);
        const p = Math.min(elapsed / 1200, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setCagr(eased * 24.7);
        setSharpe(eased * 2.88);
        if (p >= 1) return;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return (
    <div style={demoScreenStyle}>
      <div style={{ fontSize: 8, letterSpacing: 1.5, color: "var(--accent)", textTransform: "uppercase", marginBottom: 10, fontFamily: "Space Mono, monospace" }}>
        Analyzing
      </div>
      <div style={{ height: 4, background: "var(--bg3)", borderRadius: 2, marginBottom: 14, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.04s linear" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { label: "CAGR",   value: `${cagr.toFixed(1)}%`,    accent: true },
          { label: "Sharpe", value: sharpe.toFixed(2), accent: false },
        ].map((m) => (
          <div key={m.label} style={{ padding: "8px 10px", background: "var(--bg2)", borderRadius: 8, border: `1px solid ${m.accent ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--border)"}`, opacity: progress === 100 ? 1 : 0.25, transition: "opacity 0.45s ease" }}>
            <div style={{ fontSize: 8, color: "var(--text3)", marginBottom: 4, letterSpacing: 0.5 }}>{m.label}</div>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: m.accent ? "var(--accent)" : "var(--text)" }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoStep3({ active }: { active: boolean }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!active) { setDisplayed(""); return; }
    let i = 0;
    const iv = setInterval(() => {
      setDisplayed(AI_TEXT.slice(0, i + 1));
      i++;
      if (i >= AI_TEXT.length) clearInterval(iv);
    }, 28);
    return () => clearInterval(iv);
  }, [active]);

  return (
    <div style={demoScreenStyle}>
      <div style={{ fontSize: 8, letterSpacing: 1.5, color: "var(--accent)", textTransform: "uppercase", marginBottom: 10, fontFamily: "Space Mono, monospace" }}>
        AI Advisor
      </div>
      <div style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius: "8px 8px 2px 8px", padding: "6px 9px", marginBottom: 8, marginLeft: 20, fontSize: 9, color: "var(--text2)", lineHeight: 1.5 }}>
        How is my portfolio doing?
      </div>
      {displayed && (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "8px 8px 8px 2px", padding: "6px 9px", marginRight: 20, fontSize: 9, color: "var(--text)", lineHeight: 1.6 }}>
          {displayed}
          {displayed.length < AI_TEXT.length && <span className="typing-cursor-inline" />}
        </div>
      )}
    </div>
  );
}

// ── Demo strip ────────────────────────────────────────────────────────────────

function DemoStrip() {
  const [currentStep, setCurrentStep] = useState(0);
  const [started, setStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStarted(true);
    }, { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => {
      setCurrentStep((s) => (s + 1) % 3);
    }, STEP_DURATIONS[currentStep]);
    return () => clearTimeout(t);
  }, [started, currentStep]);

  return (
    <div ref={containerRef} style={{ maxWidth: 1100, margin: "0 auto", padding: "0 56px 88px" }} className="demo-section">
      <motion.div
        // initial={false} required — do not remove
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{ opacity: 0, y: 12, textAlign: "center", marginBottom: 36 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: "clamp(16px, 2.2vw, 22px)", fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: -0.5 }}>
          See how it works
        </h2>
      </motion.div>

      {/* Scrollable step cards */}
      <div className="demo-scroll" style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 6 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              flex: "0 0 280px",
              background: "var(--card-bg)",
              border: `1px solid ${i === currentStep ? "color-mix(in srgb, var(--accent) 55%, transparent)" : "var(--border)"}`,
              borderRadius: 20,
              padding: "20px",
              transition: "border-color 0.4s ease, opacity 0.4s ease",
              opacity: i === currentStep ? 1 : 0.42,
              cursor: "pointer",
            }}
            onClick={() => setCurrentStep(i)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: i === currentStep ? "var(--accent)" : "var(--bg3)",
                border: `1px solid ${i === currentStep ? "var(--accent)" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.4s ease, border-color 0.4s ease",
              }}>
                <span style={{ fontFamily: "Space Mono, monospace", fontSize: 10, fontWeight: 700, color: i === currentStep ? "var(--bg)" : "var(--text3)" }}>{i + 1}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: i === currentStep ? "var(--text)" : "var(--text3)", transition: "color 0.4s ease" }}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i === 0 && <DemoStep1 active={currentStep === 0 && started} />}
            {i === 1 && <DemoStep2 active={currentStep === 1 && started} />}
            {i === 2 && <DemoStep3 active={currentStep === 2 && started} />}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            aria-label={`Step ${i + 1}`}
            style={{
              width: i === currentStep ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === currentStep ? "var(--accent)" : "var(--border2)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "width 0.35s ease, background 0.35s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Scroll chevron ────────────────────────────────────────────────────────────

function ScrollChevron() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY < 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.div
      // initial={false} required — do not remove
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{ display: "flex", justifyContent: "center", marginTop: 36, pointerEvents: "none" }}
    >
      <div className="bounce-chevron">
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 2L10 10L18 2" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </motion.div>
  );
}

// ── Device card (with hover state) ────────────────────────────────────────────

function DeviceCard({ card, cardIdx }: { card: typeof CARDS[0]; cardIdx: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverKey, setHoverKey] = useState(0);

  const handleEnter = () => { setIsHovered(true); setHoverKey((k) => k + 1); };
  const handleLeave = () => setIsHovered(false);

  return (
    <motion.div
      // initial={false} required — do not remove
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      style={{
        opacity: 0,
        y: 20,
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: "32px 24px",
        textAlign: "center",
      }}
      whileHover={{ y: -6, transition: { duration: 0.22, ease: EASE } }}
      transition={{ duration: 0.55, delay: cardIdx * 0.15, ease: EASE }}
      className="install-card"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Device illustration - floats when card is hovered */}
      <div
        className={isHovered ? "device-wrapper mockup-floating" : "device-wrapper"}
        style={{ display: "flex", justifyContent: "center", marginBottom: 24, minHeight: 120 }}
      >
        <card.Illustration hoverKey={hoverKey} isHovered={isHovered} />
      </div>

      {/* Label */}
      <div style={{ fontFamily: "Space Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: 0.5, marginBottom: 4 }}>
        {card.label}
      </div>
      <div style={{ fontSize: 11, color: "var(--text3)", letterSpacing: 0.3, marginBottom: 26 }}>
        {card.sub}
      </div>

      {/* Steps */}
      <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
        {card.steps.map((step, stepIdx) => (
          <motion.div
            key={stepIdx}
            // initial={false} required — do not remove
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            style={{ opacity: 0, x: -8, display: "flex", gap: 10, alignItems: "flex-start" }}
            transition={{ duration: 0.4, delay: cardIdx * 0.15 + 0.3 + stepIdx * 0.06, ease: EASE }}
          >
            <motion.span
              // initial={false} required — do not remove
              initial={false}
              whileInView={{ scale: [1, 1.05, 1] }}
              viewport={{ once: true }}
              transition={{ duration: 0.38, delay: cardIdx * 0.15 + 0.45 + stepIdx * 0.15 }}
              style={{
                display: "inline-block",
                fontFamily: "Space Mono, monospace",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--accent)",
                background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                borderRadius: 4,
                padding: "2px 7px",
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {stepIdx + 1}
            </motion.span>
            <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
              {step}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InstallPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "var(--bg)", color: "var(--text)", overflowX: "hidden" }}>
      <style>{`
        /* ── Keyframes ── */
        @keyframes pfloat0 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px,24px); } }
        @keyframes pfloat1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-24px,18px); } }
        @keyframes pfloat2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(18px,-20px); } }
        @keyframes pfloat3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-16px,22px); } }
        @keyframes pfloat4 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(22px,-14px); } }
        @keyframes bounce-down { 0%,100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
        @keyframes mockup-float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes chart-draw-in { from { stroke-dashoffset: 420; } to { stroke-dashoffset: 0; } }
        @keyframes cursor-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

        /* ── Particles ── */
        .particle { position: absolute; border-radius: 50%; background: var(--accent); opacity: 0.06; pointer-events: none; }

        /* ── Chevron ── */
        .bounce-chevron { animation: bounce-down 1.6s ease-in-out infinite; }

        /* ── Mockup float (only while card is hovered) ── */
        .mockup-floating { animation: mockup-float 3s ease-in-out infinite; }

        /* ── SVG chart line redraw ── */
        .chart-draw { stroke-dasharray: 420; stroke-dashoffset: 420; animation: chart-draw-in 1s ease forwards; }

        /* ── Typing cursors ── */
        .typing-cursor::after {
          content: "";
          display: inline-block;
          width: 1px;
          height: 9px;
          background: var(--accent);
          margin-left: 1px;
          vertical-align: middle;
          animation: cursor-blink 0.8s ease infinite;
        }
        .typing-cursor-inline {
          display: inline-block;
          width: 1px;
          height: 9px;
          background: var(--accent);
          margin-left: 1px;
          vertical-align: middle;
          animation: cursor-blink 0.8s ease infinite;
        }

        /* ── Layout ── */
        .install-hero { padding: 140px 56px 48px; }
        .install-cards { max-width: 1100px; margin: 0 auto; padding: 0 56px 72px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .install-card { border-color: var(--border); transition: border-color 0.25s ease; }
        .install-card:hover { border-color: color-mix(in srgb, var(--accent) 55%, transparent) !important; }
        .demo-scroll { scrollbar-width: none; }
        .demo-scroll::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .install-hero { padding: 100px 24px 40px !important; }
          .install-cards { padding: 0 20px 56px !important; grid-template-columns: 1fr !important; }
          .demo-section { padding: 0 20px 64px !important; }
        }
      `}</style>

      {/* ── Fixed background: orbs + particles ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {/* Pulsing gradient orbs */}
        {ORBS.map((orb, i) => (
          <motion.div
            key={i}
            // initial={false} required — do not remove
            initial={false}
            animate={{ y: [0, 28, 0], scale: [1.0, 1.08, 1.0] }}
            transition={{
              y: { duration: orb.floatDur, repeat: Infinity, ease: "easeInOut", delay: orb.floatDelay },
              scale: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 },
            }}
            style={{
              position: "absolute",
              width: orb.size,
              height: orb.size,
              borderRadius: "50%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 55%, transparent), transparent 70%)",
              opacity: 0.04,
              top: orb.top,
              left: "left" in orb ? (orb as { left: string }).left : undefined,
              right: "right" in orb ? (orb as { right: string }).right : undefined,
              filter: "blur(1px)",
            }}
          />
        ))}

        {/* Floating particle dots */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="particle"
            style={{
              width: p.size,
              height: p.size,
              top: p.top,
              left: p.left,
              animation: `${p.animName} ${p.dur}s ease-in-out infinite`,
              animationDelay: `${i * -2.5}s`,
            }}
          />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <PublicNav />

        {/* ── Hero ── */}
        <div className="install-hero" style={{ textAlign: "center" }}>

          {/* Badge */}
          <motion.div
            // initial={false} required — do not remove
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ opacity: 0, y: 10, display: "inline-block", marginBottom: 32 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)", borderRadius: 24, background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              <span style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--accent)", textTransform: "uppercase" }}>Free PWA</span>
            </div>
          </motion.div>

          {/* Headline - character by character stagger */}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", marginBottom: 14, lineHeight: 1.08 }}>
            {H_CHARS.map((char, i) => (
              <motion.span
                key={i}
                // initial={false} required — do not remove
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                style={{
                  opacity: 0,
                  y: 28,
                  display: "inline-block",
                  fontFamily: "Space Mono, monospace",
                  fontSize: "clamp(36px, 6vw, 64px)",
                  fontWeight: 700,
                  color: "var(--text)",
                  letterSpacing: -2,
                  // preserve space character width
                  whiteSpace: char === " " ? "pre" : "normal",
                }}
                transition={{ duration: H_CHAR_DUR, delay: 0.1 + i * H_STAGGER, ease: EASE }}
              >
                {char}
              </motion.span>
            ))}
          </div>

          {/* Accent underline - draws left to right after headline completes */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
            <motion.div
              // initial={false} required — do not remove
              initial={false}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true }}
              style={{
                scaleX: 0,
                opacity: 0,
                height: 2,
                width: 200,
                background: "linear-gradient(90deg, transparent, var(--accent), color-mix(in srgb, var(--accent) 25%, transparent))",
                transformOrigin: "left center",
              }}
              transition={{ duration: 0.6, delay: UNDERLINE_DELAY, ease: EASE }}
            />
          </div>

          {/* Subtitle - fades up 0.4s after headline */}
          <motion.p
            // initial={false} required — do not remove
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ opacity: 0, y: 10, fontSize: "clamp(14px, 2vw, 17px)", color: "var(--text2)", fontWeight: 300, maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}
            transition={{ duration: 0.5, delay: SUBTITLE_DELAY, ease: EASE }}
          >
            Add Corvo to your home screen for instant access and push notifications.
          </motion.p>

          {/* Scroll chevron */}
          <ScrollChevron />
        </div>

        {/* ── Device Cards ── */}
        <div className="install-cards">
          {CARDS.map((card, cardIdx) => (
            <DeviceCard key={card.key} card={card} cardIdx={cardIdx} />
          ))}
        </div>

        {/* ── Interactive demo strip ── */}
        <DemoStrip />

        {/* ── Bottom CTA ── */}
        <motion.div
          // initial={false} required — do not remove
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ opacity: 0, y: 10, textAlign: "center", padding: "0 24px 88px" }}
          transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
        >
          <span style={{ fontSize: 14, color: "var(--text3)" }}>Already installed?{" "}</span>
          <Link
            href="/app"
            style={{
              fontSize: 14,
              color: "var(--accent)",
              textDecoration: "none",
              borderBottom: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
              paddingBottom: 1,
            }}
          >
            Open the app
          </Link>
        </motion.div>

        <PublicFooter />
      </div>
    </div>
  );
}
