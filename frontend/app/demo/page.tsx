"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/* ── Palette ── */
const C = {
  bg: "#0a0e14", bg2: "#0d1117", bg3: "#111620", bg4: "#161b25",
  border: "rgba(255,255,255,0.07)", border2: "rgba(255,255,255,0.14)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.6)", cream3: "rgba(232,224,204,0.28)",
  amber: "#c9a84c", amberBg: "rgba(201,168,76,0.1)", amberBd: "rgba(201,168,76,0.25)",
  green: "#4caf7d", greenBg: "rgba(76,175,125,0.12)",
  red: "#e05c5c", redBg: "rgba(224,92,92,0.12)",
};

/* ── Particle canvas (step 6) ── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf: number;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const N = 55;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.5,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < N; i++) {
        const p = pts[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
        if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(201,168,76,0.45)"; ctx.fill();
        for (let j = i + 1; j < N; j++) {
          const q = pts[j]; const dx = p.x - q.x, dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(201,168,76,${0.1 * (1 - d / 110)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

/* ── useCountUp ── */
function useCountUp(target: number, active: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(target * ease);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return val;
}

/* ─────────────────────────────────────────────────────────
   STEP 1 — Portfolio Builder
───────────────────────────────────────────────────────── */
const DEMO_STOCKS = [
  { ticker: "AAPL", name: "Apple Inc.", price: 212.45, pct: 25 },
  { ticker: "MSFT", name: "Microsoft Corp.", price: 378.20, pct: 25 },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: 892.40, pct: 30 },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: 178.55, pct: 20 },
];
const EXTRA_STOCKS: Record<string, { name: string; price: number }> = {
  TSLA: { name: "Tesla, Inc.", price: 241.10 }, AMZN: { name: "Amazon.com", price: 224.80 },
  META: { name: "Meta Platforms", price: 591.70 }, SPY: { name: "SPDR S&P 500 ETF", price: 527.30 },
  QQQ: { name: "Invesco QQQ", price: 452.10 }, BTC: { name: "Bitcoin", price: 89200.00 },
};
const ALL_STOCKS = { ...Object.fromEntries(DEMO_STOCKS.map(s => [s.ticker, { name: s.name, price: s.price }])), ...EXTRA_STOCKS };

function Step1Panel({ active }: { active: boolean }) {
  const [portfolio, setPortfolio] = useState<typeof DEMO_STOCKS>([]);
  const [searchText, setSearchText] = useState("");
  const [showResult, setShowResult] = useState<typeof DEMO_STOCKS[0] | null>(null);
  const [animDone, setAnimDone] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [userResult, setUserResult] = useState<{ ticker: string; name: string; price: number } | null>(null);

  useEffect(() => {
    if (!active) { setPortfolio([]); setSearchText(""); setShowResult(null); setAnimDone(false); setUserInput(""); setUserResult(null); return; }
    let cancelled = false;
    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    (async () => {
      await delay(600);
      for (const stock of DEMO_STOCKS) {
        if (cancelled) return;
        for (let i = 1; i <= stock.ticker.length; i++) {
          if (cancelled) return;
          setSearchText(stock.ticker.slice(0, i)); await delay(90);
        }
        await delay(350);
        if (cancelled) return; setShowResult(stock);
        await delay(650);
        if (cancelled) return;
        setPortfolio(p => [...p, stock]); setSearchText(""); setShowResult(null);
        await delay(350);
      }
      if (!cancelled) setAnimDone(true);
    })();
    return () => { cancelled = true; };
  }, [active]);

  const handleUser = (v: string) => {
    setUserInput(v);
    const t = v.toUpperCase().trim();
    if (t in ALL_STOCKS && !portfolio.some(s => s.ticker === t)) setUserResult({ ticker: t, ...ALL_STOCKS[t] });
    else setUserResult(null);
  };
  const addUser = () => {
    if (!userResult) return;
    setPortfolio(p => [...p, { ...userResult, pct: 0 }]);
    setUserInput(""); setUserResult(null);
  };

  const inputBox = (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: C.bg4, border: `1px solid ${C.border2}`, borderRadius: 10 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.cream3} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        {animDone
          ? <input value={userInput} onChange={e => handleUser(e.target.value)} onKeyDown={e => e.key === "Enter" && addUser()}
              placeholder="Try TSLA, AMZN, BTC…"
              style={{ background: "none", border: "none", outline: "none", color: C.cream, fontSize: 14, flex: 1, fontFamily: "inherit" }} />
          : <span style={{ color: C.cream, fontSize: 14, flex: 1, fontFamily: "'Space Mono', monospace" }}>
              {searchText}<span style={{ animation: "blink 1s step-end infinite", opacity: 0.8 }}>|</span>
            </span>
        }
      </div>
      <AnimatePresence>
        {(showResult || userResult) && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", top: "110%", left: 0, right: 0, background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 10, overflow: "hidden", zIndex: 10 }}>
            {[showResult || userResult].filter(Boolean).map(r => r && (
              <div key={r.ticker} onClick={animDone ? addUser : undefined}
                style={{ padding: "10px 14px", cursor: animDone ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onMouseEnter={e => animDone && ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = "")}>
                <div>
                  <div style={{ color: C.cream, fontSize: 13, fontWeight: 600 }}>{r.ticker}</div>
                  <div style={{ color: C.cream3, fontSize: 11 }}>{r.name}</div>
                </div>
                <div style={{ color: C.amber, fontSize: 12, fontFamily: "'Space Mono', monospace" }}>${r.price.toFixed(2)}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <style>{`@keyframes blink{50%{opacity:0}}`}</style>
      {inputBox}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto" }}>
        <AnimatePresence>
          {portfolio.map((s) => (
            <motion.div key={s.ticker} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              style={{ padding: "10px 14px", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.amber, fontFamily: "'Space Mono', monospace", flexShrink: 0 }}>{s.ticker.slice(0, 2)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.cream, fontSize: 13, fontWeight: 600 }}>{s.ticker}</div>
                <div style={{ color: C.cream3, fontSize: 10 }}>{s.name}</div>
              </div>
              {s.pct > 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span style={{ color: C.amber, fontSize: 12, fontWeight: 600 }}>{s.pct}%</span>
                  <div style={{ width: 60, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 0.5, ease: "easeOut" }}
                      style={{ height: "100%", background: C.amber, borderRadius: 2 }} />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {portfolio.length === 0 && (
          <div style={{ color: C.cream3, fontSize: 12, textAlign: "center", marginTop: 24 }}>Stocks will appear here…</div>
        )}
      </div>
      {portfolio.length > 0 && (
        <div style={{ padding: "10px 14px", background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: C.cream2, fontSize: 11 }}>Total allocation</span>
          <span style={{ color: C.amber, fontWeight: 700, fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
            {portfolio.reduce((a, s) => a + s.pct, 0)}%
          </span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   STEP 2 — AI Insights
───────────────────────────────────────────────────────── */
const AI_INSIGHT = "Your portfolio is heavily weighted toward US large-cap growth (82%). NVDA dominates at 30%, introducing single-stock concentration risk. The Sharpe ratio of 1.92 is exceptional — outperforming 94% of retail investors. Consider diversifying with international exposure or REITs to reduce drawdown risk.";

function Step2Panel({ active }: { active: boolean }) {
  const sharpe = useCountUp(1.92, active, 1200);
  const health = useCountUp(78, active, 1000);
  const ret = useCountUp(41.3, active, 1300);
  const [typed, setTyped] = useState("");
  const [startTyping, setStartTyping] = useState(false);

  useEffect(() => {
    if (!active) { setTyped(""); setStartTyping(false); return; }
    const t = setTimeout(() => setStartTyping(true), 1600);
    return () => clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (!startTyping) { setTyped(""); return; }
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(AI_INSIGHT.slice(0, i));
      if (i >= AI_INSIGHT.length) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [startTyping]);

  const metrics = [
    { label: "Sharpe Ratio", value: sharpe.toFixed(2), sub: "Risk-adjusted return", color: C.green },
    { label: "Health Score", value: Math.round(health).toString(), sub: "Out of 100", color: C.amber },
    { label: "Annual Return", value: `+${ret.toFixed(1)}%`, sub: "12-month performance", color: C.green },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ padding: "14px 12px", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.color, fontFamily: "'Space Mono', monospace", lineHeight: 1.2 }}>{m.value}</div>
            <div style={{ fontSize: 10, color: C.cream, marginTop: 4, fontWeight: 600 }}>{m.label}</div>
            <div style={{ fontSize: 9, color: C.cream3, marginTop: 2 }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: 16, background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="m16 8 4-4-4-4"/><path d="M20 4v6h-6"/></svg>
          </div>
          <span style={{ fontSize: 11, color: C.amber, fontWeight: 600, letterSpacing: 0.5 }}>AI ANALYSIS</span>
        </div>
        <p style={{ fontSize: 12.5, color: C.cream2, lineHeight: 1.7, margin: 0, minHeight: 80 }}>
          {typed}{startTyping && typed.length < AI_INSIGHT.length && <span style={{ animation: "blink 0.8s step-end infinite" }}>|</span>}
          {!startTyping && <span style={{ color: C.cream3 }}>Analyzing portfolio…</span>}
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ padding: "10px 14px", background: C.greenBg, border: `1px solid rgba(76,175,125,0.25)`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: C.cream3, marginBottom: 4 }}>Max Drawdown</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.red, fontFamily: "'Space Mono', monospace" }}>-18.4%</div>
        </div>
        <div style={{ padding: "10px 14px", background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: C.cream3, marginBottom: 4 }}>Beta vs S&P 500</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.amber, fontFamily: "'Space Mono', monospace" }}>1.24</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   STEP 3 — Monte Carlo
───────────────────────────────────────────────────────── */
type SimPath = { d: string; color: string; opacity: number };

function Step3Panel({ active }: { active: boolean }) {
  const [paths, setPaths] = useState<SimPath[]>([]);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!active) { setDrawn(false); return; }
    // Generate paths on client
    const generated: SimPath[] = Array.from({ length: 45 }, (_, i) => {
      const t = i / 44; // 0 = worst, 1 = best
      const endY = 170 - t * 145; // SVG y: 170 (bottom=worst) to 25 (top=best)
      const c1y = 100 + (Math.sin(i * 2.4) * 30);
      const c2y = endY + (Math.cos(i * 1.7) * 25);
      const color = t > 0.65 ? "#4caf7d" : t < 0.3 ? "#e05c5c" : "#c9a84c";
      return { d: `M 0 100 C 130 ${c1y.toFixed(1)} 270 ${c2y.toFixed(1)} 400 ${endY.toFixed(1)}`, color, opacity: 0.22 + t * 0.18 };
    });
    setPaths(generated);
    const t = setTimeout(() => setDrawn(true), 100);
    return () => clearTimeout(t);
  }, [active]);

  const outcomes = [
    { label: "Worst Case", value: "+8.9%", color: C.red, bg: C.redBg, pct: 10 },
    { label: "Median", value: "+50.5%", color: C.amber, bg: C.amberBg, pct: 50 },
    { label: "Best Case", value: "+100.8%", color: C.green, bg: C.greenBg, pct: 100 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ padding: "10px 14px", background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: C.cream2, fontSize: 11 }}>Simulation</span>
        <span style={{ color: C.amber, fontSize: 11, fontWeight: 600 }}>300 paths · 12-month horizon</span>
      </div>
      <div style={{ background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, overflow: "hidden" }}>
        <svg viewBox="0 0 400 200" style={{ width: "100%", height: "auto", display: "block" }} preserveAspectRatio="none">
          {/* Grid lines */}
          {[50, 100, 150].map(y => (
            <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          ))}
          {/* Paths */}
          {paths.map((p, i) => (
            <motion.path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth="1"
              opacity={p.opacity}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: drawn ? 1 : 0 }}
              transition={{ duration: 1.8, delay: i * 0.012, ease: "easeOut" }}
            />
          ))}
          {/* Start dot */}
          <circle cx="0" cy="100" r="3" fill={C.amber} />
          {/* Today label */}
          <text x="4" y="96" fontSize="8" fill={C.cream3}>Today</text>
          <text x="360" y="14" fontSize="8" fill={C.cream3}>+12mo</text>
        </svg>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, flex: 1 }}>
        {outcomes.map(o => (
          <motion.div key={o.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: drawn ? 1 : 0, y: drawn ? 0 : 10 }}
            transition={{ duration: 0.4, delay: 2.0 }}
            style={{ padding: "12px 10px", background: o.bg, border: `1px solid ${o.color}30`, borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: o.color, fontWeight: 700, marginBottom: 6 }}>{o.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: o.color, fontFamily: "'Space Mono', monospace" }}>{o.value}</div>
            <div style={{ marginTop: 8, height: 3, background: C.border, borderRadius: 2 }}>
              <motion.div initial={{ width: 0 }} animate={{ width: drawn ? `${o.pct}%` : 0 }}
                transition={{ duration: 0.8, delay: 2.2 }}
                style={{ height: "100%", background: o.color, borderRadius: 2 }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   STEP 4 — Watchlist
───────────────────────────────────────────────────────── */
type WatchItem = { ticker: string; name: string; price: number; change: number; alert?: number };
const INITIAL_WATCH: WatchItem[] = [
  { ticker: "SPY", name: "S&P 500 ETF", price: 527.30, change: 0.68 },
  { ticker: "QQQ", name: "Nasdaq 100 ETF", price: 452.10, change: 1.12 },
  { ticker: "AAPL", name: "Apple Inc.", price: 212.45, change: -0.34, alert: 215.00 },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: 892.40, change: 2.84 },
];

function Step4Panel({ active }: { active: boolean }) {
  const [items, setItems] = useState<WatchItem[]>(INITIAL_WATCH);
  const [ping, setPing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (!active) { setItems(INITIAL_WATCH); setPing(false); setShowAlert(false); return; }
    // Show alert notification after 2s
    const t1 = setTimeout(() => { setPing(true); setShowAlert(true); }, 2000);
    const t2 = setTimeout(() => setPing(false), 3500);
    // Tick prices
    const iv = setInterval(() => {
      setItems(prev => prev.map(item => {
        const delta = (Math.random() - 0.48) * 0.4;
        const newPrice = +(item.price + delta).toFixed(2);
        const newChange = +(item.change + (Math.random() - 0.5) * 0.08).toFixed(2);
        return { ...item, price: newPrice, change: newChange };
      }));
    }, 1000);
    return () => { clearInterval(iv); clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      <AnimatePresence>
        {showAlert && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ padding: "10px 14px", background: "rgba(201,168,76,0.12)", border: `1px solid ${C.amberBd}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <span style={{ color: C.cream }}>Alert: <strong style={{ color: C.amber }}>AAPL</strong> approaching target <strong style={{ color: C.amber }}>$215.00</strong></span>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", flex: 1 }}>
        <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, fontSize: 9, color: C.cream3, letterSpacing: 0.8, textTransform: "uppercase" }}>
          <span>Asset</span><span style={{ textAlign: "right" }}>Price</span><span style={{ textAlign: "right" }}>Change</span><span style={{ textAlign: "center" }}>Alert</span>
        </div>
        <AnimatePresence>
          {items.map((item, idx) => (
            <motion.div key={item.ticker} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
              style={{ padding: "11px 14px", borderBottom: idx < items.length - 1 ? `1px solid ${C.border}` : "none", display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ color: C.cream, fontSize: 13, fontWeight: 600 }}>{item.ticker}</div>
                <div style={{ color: C.cream3, fontSize: 10 }}>{item.name}</div>
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: C.cream, textAlign: "right" }}>
                ${item.price.toFixed(2)}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: item.change >= 0 ? C.green : C.red, textAlign: "right" }}>
                {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
              </div>
              <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
                {item.alert ? (
                  <div style={{ position: "relative" }}>
                    <span style={{ fontSize: 14 }}>🔔</span>
                    {ping && item.ticker === "AAPL" && (
                      <motion.div initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 2.5, opacity: 0 }} transition={{ duration: 1, repeat: Infinity }}
                        style={{ position: "absolute", inset: -2, borderRadius: "50%", border: `2px solid ${C.amber}` }} />
                    )}
                  </div>
                ) : (
                  <span style={{ color: C.cream3, fontSize: 13 }}>—</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, padding: "10px 14px", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 9, color: C.cream3, letterSpacing: 0.8, marginBottom: 4 }}>TRACKED ASSETS</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.cream, fontFamily: "'Space Mono', monospace" }}>4</div>
        </div>
        <div style={{ flex: 1, padding: "10px 14px", background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 10 }}>
          <div style={{ fontSize: 9, color: C.cream3, letterSpacing: 0.8, marginBottom: 4 }}>ACTIVE ALERTS</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.amber, fontFamily: "'Space Mono', monospace" }}>1</div>
        </div>
        <div style={{ flex: 1, padding: "10px 14px", background: C.greenBg, border: `1px solid rgba(76,175,125,0.25)`, borderRadius: 10 }}>
          <div style={{ fontSize: 9, color: C.cream3, letterSpacing: 0.8, marginBottom: 4 }}>LIVE PRICES</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>ON</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   STEP 5 — Learn
───────────────────────────────────────────────────────── */
const LESSONS = [
  { icon: "📊", title: "Portfolio Diversification", xp: 50, done: true },
  { icon: "📈", title: "Understanding Sharpe Ratio", xp: 75, done: true },
  { icon: "🎲", title: "Monte Carlo Methods", xp: 100, active: true },
  { icon: "🏦", title: "Dollar-Cost Averaging", xp: 60, locked: true },
];
const QUIZ_Q = "What does a Sharpe ratio above 1.5 generally indicate?";
const QUIZ_OPTS = ["High portfolio risk", "Strong risk-adjusted returns", "Negative performance", "Low volatility only"];
const CORRECT = 1;

function Step5Panel({ active }: { active: boolean }) {
  const [answered, setAnswered] = useState<number | null>(null);
  const [xpStarted, setXpStarted] = useState(false);
  const xp = useCountUp(450, xpStarted, 900);
  const [showXp, setShowXp] = useState(false);

  useEffect(() => {
    if (!active) { setAnswered(null); setXpStarted(false); setShowXp(false); return; }
    const t = setTimeout(() => setXpStarted(true), 400);
    return () => clearTimeout(t);
  }, [active]);

  const answer = (i: number) => {
    if (answered !== null) return;
    setAnswered(i);
    if (i === CORRECT) setShowXp(true);
  };

  const xpPct = Math.min(100, (xp / 600) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      {/* XP bar */}
      <div style={{ padding: "10px 14px", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontSize: 11, color: C.cream, fontWeight: 600 }}>Analyst Level</span>
          </div>
          <span style={{ fontSize: 11, color: C.amber, fontFamily: "'Space Mono', monospace", fontWeight: 600 }}>
            {Math.round(xp)} / 600 XP
          </span>
        </div>
        <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
          <motion.div style={{ height: "100%", background: `linear-gradient(90deg, ${C.amber}, #f0c060)`, borderRadius: 3 }}
            initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
        </div>
        {showXp && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: 6, fontSize: 11, color: C.amber, fontWeight: 600 }}>
            +100 XP earned! 🎉
          </motion.div>
        )}
      </div>

      {/* Lesson list */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {LESSONS.map((l, i) => (
          <motion.div key={l.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{ padding: "10px 12px", background: l.active ? C.amberBg : C.bg4, border: `1px solid ${l.active ? C.amberBd : C.border}`, borderRadius: 10, opacity: l.locked ? 0.45 : 1 }}>
            <div style={{ fontSize: 18, marginBottom: 5 }}>{l.locked ? "🔒" : l.icon}</div>
            <div style={{ fontSize: 11, color: C.cream, fontWeight: 500, lineHeight: 1.35 }}>{l.title}</div>
            <div style={{ fontSize: 9, color: l.done ? C.green : l.active ? C.amber : C.cream3, marginTop: 4, fontWeight: 600 }}>
              {l.done ? "✓ Completed" : l.active ? "▶ In Progress" : `${l.xp} XP`}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Daily challenge */}
      <div style={{ flex: 1, padding: 14, background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 12 }}>
        <div style={{ fontSize: 9, color: C.amber, letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>DAILY CHALLENGE</div>
        <div style={{ fontSize: 12, color: C.cream, lineHeight: 1.5, marginBottom: 12 }}>{QUIZ_Q}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {QUIZ_OPTS.map((opt, i) => {
            const isCorrect = i === CORRECT;
            const isChosen = i === answered;
            const revealed = answered !== null;
            const bg = revealed ? (isCorrect ? "rgba(76,175,125,0.15)" : isChosen ? "rgba(224,92,92,0.1)" : C.bg) : "rgba(255,255,255,0.03)";
            const border = revealed ? (isCorrect ? "rgba(76,175,125,0.4)" : isChosen ? "rgba(224,92,92,0.3)" : C.border) : C.border;
            const color = revealed ? (isCorrect ? C.green : isChosen ? C.red : C.cream3) : C.cream2;
            return (
              <button key={opt} onClick={() => answer(i)}
                style={{ padding: "7px 10px", background: bg, border: `1px solid ${border}`, borderRadius: 8, color, fontSize: 11, textAlign: "left", cursor: answered === null ? "pointer" : "default", transition: "all 0.2s", fontFamily: "inherit" }}>
                <span style={{ marginRight: 6, opacity: 0.6 }}>{String.fromCharCode(65 + i)}.</span>{opt}
                {revealed && isCorrect && <span style={{ float: "right" }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   STEP 6 — CTA
───────────────────────────────────────────────────────── */
function useCountUpCta(target: number, active: boolean, duration = 2000) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const t = setTimeout(() => {
      const start = performance.now();
      let raf: number;
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick); else setVal(target);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, 400);
    return () => clearTimeout(t);
  }, [active, target, duration]);
  return val;
}

function Step6Panel({ active }: { active: boolean }) {
  const users = useCountUpCta(12400, active, 2000);
  const portfolios = useCountUpCta(48000, active, 2200);
  const free = useCountUpCta(100, active, 1200);

  const stats = [
    { value: users.toLocaleString() + "+", label: "Active investors" },
    { value: portfolios.toLocaleString() + "+", label: "Portfolios analyzed" },
    { value: free + "%", label: "Free forever" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", gap: 28, position: "relative", zIndex: 1 }}>
      <ParticleCanvas />
      <div style={{ position: "relative", zIndex: 1 }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <img src="/corvo-logo.svg" width={52} height={42} alt="Corvo" style={{ marginBottom: 16 }} />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ fontSize: "clamp(22px, 4vw, 36px)", fontWeight: 700, color: C.cream, margin: "0 0 10px", lineHeight: 1.2, fontFamily: "'Space Mono', monospace" }}>
          You&apos;ve seen what Corvo can do
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          style={{ fontSize: 15, color: C.cream2, margin: "0 0 28px" }}>
          Join thousands of investors already using Corvo
        </motion.p>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ display: "flex", gap: 28, justifyContent: "center", marginBottom: 32 }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.amber, fontFamily: "'Space Mono', monospace" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.cream3, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth"
            style={{ padding: "14px 32px", background: C.amber, borderRadius: 12, color: C.bg, fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: 0.3, display: "inline-block", transition: "opacity 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            Get Started Free
          </Link>
          <Link href="/"
            style={{ padding: "14px 32px", background: "transparent", border: `1px solid ${C.border2}`, borderRadius: 12, color: C.cream2, fontSize: 14, fontWeight: 500, textDecoration: "none", display: "inline-block", transition: "border-color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.amber)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border2)}>
            Back to Home
          </Link>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          style={{ marginTop: 20, fontSize: 11, color: C.cream3 }}>
          No credit card required · Free forever · Cancel anytime
        </motion.p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Step metadata
───────────────────────────────────────────────────────── */
const STEPS = [
  {
    title: "Portfolio Builder",
    subtitle: "Build your portfolio in seconds",
    desc: "Search any stock, ETF, or crypto by ticker. Set your allocation with a simple slider. Corvo instantly calculates risk metrics and tells you what your mix really means.",
    icon: "📁",
    panel: Step1Panel,
  },
  {
    title: "AI Insights",
    subtitle: "Instant AI analysis of your portfolio",
    desc: "Get Bloomberg-quality intelligence powered by Claude AI. Understand your Sharpe ratio, health score, concentration risk, and what to do about it — in plain English.",
    icon: "🤖",
    panel: Step2Panel,
  },
  {
    title: "Monte Carlo Simulation",
    subtitle: "See 300 possible futures",
    desc: "Corvo runs hundreds of simulations to show you the realistic range of outcomes for your portfolio over the next 12 months — from the worst case to the best.",
    icon: "🎲",
    panel: Step3Panel,
  },
  {
    title: "Watchlist & Alerts",
    subtitle: "Track your favorite stocks with live prices",
    desc: "Add any stock or ETF to your watchlist and get live price updates. Set price alerts and get notified the moment an asset hits your target — no noise, just signal.",
    icon: "👁️",
    panel: Step4Panel,
  },
  {
    title: "Learn",
    subtitle: "Level up your investing knowledge",
    desc: "AI-powered lessons tailored to your level. Earn XP, hit daily challenges, and build real investing knowledge — from diversification to derivatives, at your own pace.",
    icon: "🎓",
    panel: Step5Panel,
  },
  {
    title: "Get Started",
    subtitle: "You've seen what Corvo can do",
    desc: "",
    icon: "🚀",
    panel: Step6Panel,
  },
];

/* ─────────────────────────────────────────────────────────
   Main DemoPage
───────────────────────────────────────────────────────── */
export default function DemoPage() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1); // 1 = forward, -1 = backward

  const goTo = (next: number, direction: number) => {
    setDir(direction);
    setStep(next);
    if (next === STEPS.length - 1) {
      try { localStorage.setItem("corvo_tour_completed", "true"); } catch { /* */ }
    }
  };

  const prev = () => step > 0 && goTo(step - 1, -1);
  const next = () => step < STEPS.length - 1 && goTo(step + 1, 1);

  const current = STEPS[step];
  const Panel = current.panel;
  const isCta = step === STEPS.length - 1;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg2, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, background: `linear-gradient(${C.bg2}, transparent)` }}>
        {/* Logo */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
          <img src="/corvo-logo.svg" width={24} height={20} alt="" />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: 3, color: C.cream }}>CORVO</span>
        </a>

        {/* Progress bar */}
        <div style={{ flex: 1, display: "flex", gap: 6, alignItems: "center" }}>
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => goTo(i, i > step ? 1 : -1)}
              style={{ flex: 1, height: 3, borderRadius: 2, border: "none", cursor: "pointer", padding: 0, background: i <= step ? C.amber : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
          ))}
          <span style={{ fontSize: 10, color: C.cream3, flexShrink: 0, marginLeft: 6, fontFamily: "'Space Mono', monospace" }}>
            {step + 1}/{STEPS.length}
          </span>
        </div>

        {/* Skip */}
        <Link href="/" style={{ fontSize: 11, color: C.cream3, textDecoration: "none", letterSpacing: 0.5, transition: "color 0.2s", flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = C.amber)}
          onMouseLeave={e => (e.currentTarget.style.color = C.cream3)}>
          Skip tour ×
        </Link>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "stretch", paddingTop: 60, paddingBottom: 80, minHeight: "100vh" }}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={variants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ flex: 1, display: "flex", padding: "0 24px", maxWidth: 1100, margin: "0 auto", width: "100%", gap: 32, alignItems: "center" }}>

            {isCta ? (
              /* Step 6: full-width CTA */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <Panel active={step === STEPS.length - 1} />
              </div>
            ) : (
              <>
                {/* Left panel */}
                <div style={{ flex: "0 0 320px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{current.icon}</span>
                    <div>
                      <div style={{ fontSize: 10, color: C.amber, letterSpacing: 1.5, fontWeight: 600, textTransform: "uppercase" }}>
                        Step {step + 1} of {STEPS.length - 1}
                      </div>
                      <div style={{ fontSize: 10, color: C.cream3 }}>{current.title}</div>
                    </div>
                  </div>
                  <h2 style={{ margin: 0, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, color: C.cream, lineHeight: 1.25, fontFamily: "'Space Mono', monospace" }}>
                    {current.subtitle}
                  </h2>
                  <p style={{ margin: 0, fontSize: 14, color: C.cream2, lineHeight: 1.75 }}>
                    {current.desc}
                  </p>
                  {step === 0 && (
                    <div style={{ padding: "10px 14px", background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 10, fontSize: 11, color: C.amber }}>
                      💡 Try typing a ticker in the search box after the demo plays
                    </div>
                  )}
                  {step === 3 && (
                    <div style={{ padding: "10px 14px", background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 10, fontSize: 11, color: C.amber }}>
                      💡 Prices update live every second — watch them tick
                    </div>
                  )}
                  {step === 4 && (
                    <div style={{ padding: "10px 14px", background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 10, fontSize: 11, color: C.amber }}>
                      💡 Answer the challenge question to earn XP
                    </div>
                  )}
                </div>

                {/* Right panel */}
                <div style={{ flex: 1, minHeight: 420, maxHeight: 520, display: "flex", flexDirection: "column", padding: 20, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
                  <Panel active={true} />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom nav ── */}
      {!isCta && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 24px", background: `linear-gradient(transparent, ${C.bg2})`, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50 }}>
          <button onClick={prev} disabled={step === 0}
            style={{ padding: "10px 24px", background: "transparent", border: `1px solid ${C.border2}`, borderRadius: 10, color: step === 0 ? C.cream3 : C.cream, fontSize: 13, cursor: step === 0 ? "default" : "pointer", transition: "all 0.2s", opacity: step === 0 ? 0.4 : 1, fontFamily: "inherit" }}>
            ← Previous
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {STEPS.slice(0, -1).map((_, i) => (
              <button key={i} onClick={() => goTo(i, i > step ? 1 : -1)}
                style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, border: "none", background: i === step ? C.amber : "rgba(255,255,255,0.15)", cursor: "pointer", transition: "all 0.3s", padding: 0 }} />
            ))}
          </div>
          <button onClick={next}
            style={{ padding: "10px 24px", background: step === STEPS.length - 2 ? C.amber : "rgba(201,168,76,0.12)", border: `1px solid ${step === STEPS.length - 2 ? C.amber : C.amberBd}`, borderRadius: 10, color: step === STEPS.length - 2 ? C.bg : C.amber, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>
            {step === STEPS.length - 2 ? "Finish tour 🎉" : "Next →"}
          </button>
        </div>
      )}

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: "radial-gradient(ellipse, rgba(201,168,76,0.04) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
    </div>
  );
}
