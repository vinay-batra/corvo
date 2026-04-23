"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { posthog } from "../../lib/posthog";
import {
  BrainCircuit,
  Swords,
  TrendingDown,
  Landmark,
  PiggyBank,
  BarChart2,
  Timer,
  Trophy,
  RefreshCw,
  CheckCircle2,
  BookOpen,
  Star,
  Flame,
  Lock,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  TrendingUp,
  Target,
  Gamepad2,
  GraduationCap,
  Calculator,
  TrendingDown as CrashIcon,
  Percent,
  Building2,
  GitCompare,
  ListOrdered,
  Sun,
  CalendarCheck,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import FeedbackButton from "../../components/FeedbackButton";

// ── Constants ────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AMBER = "var(--accent)";
const GREEN = "#4caf7d";
const RED   = "#e05c5c";

const LEVELS = [
  { min: 0,     max: 99,    name: "Novice",         color: "#9b9b98" },
  { min: 100,   max: 199,   name: "Beginner",        color: "#a0a8b8" },
  { min: 200,   max: 349,   name: "Learner",         color: "#6ab0de" },
  { min: 350,   max: 499,   name: "Investor",        color: "#4a9eff" },
  { min: 500,   max: 699,   name: "Analyst",         color: "#4caf7d" },
  { min: 700,   max: 899,   name: "Strategist",      color: "#3ecf8e" },
  { min: 900,   max: 1149,  name: "Portfolio Pro",   color: "var(--accent)" },
  { min: 1150,  max: 1449,  name: "Market Watcher",  color: "#c9a84c" },
  { min: 1450,  max: 1799,  name: "Risk Manager",    color: "#f59e0b" },
  { min: 1800,  max: 2199,  name: "Fund Manager",    color: "#f97316" },
  { min: 2200,  max: 2699,  name: "Quant",           color: "#a78bfa" },
  { min: 2700,  max: 3299,  name: "Expert",          color: "#8b5cf6" },
  { min: 3300,  max: 3999,  name: "Master",          color: "#ec4899" },
  { min: 4000,  max: 4999,  name: "Elite",           color: "#ef4444" },
  { min: 5000,  max: Infinity, name: "Legend",       color: "#f97316" },
];

function getLevel(xp: number) { return LEVELS.findLast(l => xp >= l.min) ?? LEVELS[0]; }
function getNextLevel(xp: number) { return LEVELS.find(l => l.min > xp) ?? null; }
function getProgressPct(xp: number) {
  const cur = getLevel(xp); const nxt = getNextLevel(xp);
  if (!nxt) return 100;
  return Math.min(100, ((xp - cur.min) / (nxt.min - cur.min)) * 100);
}
function getAIDifficulty(xp: number): "beginner" | "intermediate" | "advanced" {
  const lvl = getLevel(xp);
  if (lvl.name === "Beginner") return "beginner";
  if (lvl.name === "Investor") return "intermediate";
  return "advanced";
}

// ── XP Toast ─────────────────────────────────────────────────────────────────
function XPToast({ amount, onDone }: { amount: number; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.15, y: -20 }}
      transition={{ type: "spring", damping: 14, stiffness: 260 }}
      onAnimationComplete={() => setTimeout(onDone, 1200)}
      style={{
        position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
        background: AMBER, color: "#0a0e14", borderRadius: 40,
        padding: "10px 22px", fontSize: 15, fontWeight: 700,
        fontFamily: "Space Mono, monospace", letterSpacing: 0.5,
        boxShadow: "0 8px 32px rgba(184,134,11,0.45)", zIndex: 2000,
        display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}>
      <Star size={14} fill={AMBER} color={AMBER} /> +{amount} XP
    </motion.div>
  );
}

// ── Animation Styles ─────────────────────────────────────────────────────────
function AnimStyles() {
  return (
    <style>{`
      @keyframes xpShimmer {
        0% { transform: translateX(-150%); }
        100% { transform: translateX(150%); }
      }
      @keyframes flicker {
        0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
        20% { transform: scale(1.08) rotate(-3deg); opacity: 0.92; }
        40% { transform: scale(0.95) rotate(2deg); opacity: 1; }
        60% { transform: scale(1.05) rotate(-2deg); opacity: 0.96; }
        80% { transform: scale(0.98) rotate(3deg); opacity: 1; }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        15% { transform: translateX(-7px); }
        30% { transform: translateX(7px); }
        45% { transform: translateX(-5px); }
        60% { transform: translateX(5px); }
        75% { transform: translateX(-3px); }
        90% { transform: translateX(3px); }
      }
      @keyframes flashGreen {
        0% { box-shadow: none; }
        25% { box-shadow: 0 0 0 3px rgba(76,175,125,0.45); }
        100% { box-shadow: none; }
      }
      @keyframes flashRed {
        0% { box-shadow: none; }
        25% { box-shadow: 0 0 0 3px rgba(224,92,92,0.45); }
        100% { box-shadow: none; }
      }
      .anim-shake { animation: shake 0.5s ease-out; }
      .anim-flash-green { animation: flashGreen 0.65s ease-out; }
      .anim-flash-red { animation: flashRed 0.65s ease-out; }
    `}</style>
  );
}

// ── Animated Flame ────────────────────────────────────────────────────────────
function AnimatedFlame({ streak }: { streak: number }) {
  const lit = streak > 0;
  const intense = streak > 7;
  const color = lit ? "#f97316" : "var(--text3)";
  const sz = intense ? 18 : 14;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      animation: lit ? "flicker 2.4s ease-in-out infinite" : "none",
      transformOrigin: "50% 100%",
      filter: intense ? "drop-shadow(0 0 5px rgba(249,115,22,0.7))" : lit ? "drop-shadow(0 0 2px rgba(249,115,22,0.35))" : "none",
    }}>
      <Flame size={sz} color={color} fill={lit ? color : "none"} />
    </span>
  );
}

// ── Level-Up Modal ────────────────────────────────────────────────────────────
function LevelUpModal({ levelName, color, onDone }: { levelName: string; color: string; onDone: () => void }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    (async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({ particleCount: 130, spread: 85, origin: { y: 0.5 }, colors: [color, "#ffffff", AMBER, "#a78bfa"] });
      } catch {}
    })();
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}
      onClick={onDone}
    >
      <motion.div
        initial={{ scale: 0.45, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ background: "var(--bg2)", border: `1.5px solid ${color}55`, borderRadius: 22, padding: "40px 52px", textAlign: "center", maxWidth: 340 }}
        onClick={e => e.stopPropagation()}
      >
        <motion.div
          initial={{ rotate: -200, scale: 0 }} animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.1 }}
          style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}
        >
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: `${color}1e`, border: `2px solid ${color}66`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trophy size={32} color={color} />
          </div>
        </motion.div>
        <p style={{ fontSize: 10, letterSpacing: 3, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8 }}>Level Up!</p>
        <p style={{ fontSize: 26, fontWeight: 700, color, marginBottom: 10, fontFamily: "Space Mono, monospace" }}>{levelName}</p>
        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.55 }}>You've reached a new level. Keep learning!</p>
      </motion.div>
    </motion.div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function LevelBadge({ xp }: { xp: number }) {
  const lvl = getLevel(xp);
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
      padding: "3px 8px", borderRadius: 20, background: `${lvl.color}22`,
      color: lvl.color, border: `0.5px solid ${lvl.color}55`,
    }}>
      {lvl.name}
    </span>
  );
}

function LearnHeader({ xp, streak, displayName, avatarUrl, loading }: { xp: number; streak: number; displayName: string; avatarUrl: string | null; loading?: boolean }) {
  const lvl = getLevel(xp); const nxt = getNextLevel(xp); const pct = getProgressPct(xp);
  return (
    <div style={{ background: "var(--bg2)", borderBottom: "0.5px solid var(--border)" }}>
      <nav style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "0.5px solid var(--border)" }}>
        <Link href="/app" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/corvo-logo.svg" width={24} height={20} alt="Corvo" />
          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 700, letterSpacing: 4, color: "var(--text)" }}>CORVO</span>
        </Link>
        <span style={{ fontSize: 9, letterSpacing: 2.5, color: AMBER, textTransform: "uppercase" }}>Learn & Practice</span>
        <Link href="/app" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--text2)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--bg3)", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text2)"; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </Link>
      </nav>

      <div className="c-learn-header" style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 28px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {loading ? (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
        ) : avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "0.5px solid var(--border2)", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${AMBER}22`, border: `0.5px solid ${AMBER}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: AMBER, flexShrink: 0 }}>
            {(displayName || "?")[0]?.toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <>
              <div style={{ height: 14, width: 160, borderRadius: 4, background: "rgba(255,255,255,0.06)", marginBottom: 8 }} />
              <div style={{ height: 7, background: "var(--track)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: "0%", height: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <LevelBadge xp={xp} />
                <span style={{ fontSize: 11, color: "var(--text2)" }}>
                  {xp} XP{nxt ? <span style={{ color: "var(--text3)" }}> · {nxt.min - xp} to {nxt.name}</span> : " · Max level!"}
                </span>
              </div>
              <div style={{ height: 7, background: "var(--track)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut" }}
                  style={{ height: "100%", background: lvl.color, borderRadius: 4, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)", animation: "xpShimmer 2.2s ease-in-out infinite", willChange: "transform" }} />
                </motion.div>
              </div>
            </>
          )}
        </div>

        {loading ? (
          <div style={{ width: 80, height: 30, borderRadius: 20, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, background: streak > 0 ? "rgba(249,115,22,0.1)" : "var(--bg3)", border: `0.5px solid ${streak > 0 ? "rgba(249,115,22,0.3)" : "var(--border)"}`, flexShrink: 0 }}>
            <AnimatedFlame streak={streak} />
            <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: streak > 0 ? "#f97316" : "var(--text3)" }}>{streak}</span>
            <span style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 0.5 }}>day{streak !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Game 1: Guess the Sharpe Ratio ───────────────────────────────────────────
const SHARPE_ROUNDS = [
  { portfolio: "AAPL 50% + MSFT 50%", ret: 18.2, vol: 22.1, answer: 0.64, hint: "Two big tech stocks, correlated, decent return." },
  { portfolio: "SPY 100%",             ret: 10.8, vol: 15.3, answer: 0.44, hint: "The S&P 500 index: diversified, moderate volatility." },
  { portfolio: "BTC 50% + ETH 50%",   ret: 42.1, vol: 68.4, answer: 0.56, hint: "Crypto: high returns, extremely volatile." },
  { portfolio: "GLD 50% + TLT 50%",   ret: 5.2,  vol: 12.8, answer: 0.09, hint: "Gold + bonds: defensive, low return." },
  { portfolio: "TSLA 40% + NVDA 60%", ret: 31.4, vol: 54.2, answer: 0.51, hint: "High-growth tech: big swings both ways." },
];

function SharpGame({ onXP }: { onXP: (n: number) => void }) {
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<{ correct: boolean; guess: number; answer: number }[]>([]);
  const [xpAwarded, setXpAwarded] = useState(false);

  const current = SHARPE_ROUNDS[round];
  const numGuess = parseFloat(guess);
  const isClose = Math.abs(numGuess - current.answer) <= 0.15;

  const submit = () => {
    if (!guess || isNaN(numGuess)) return;
    if (isClose) setScore(s => s + 1);
    setHistory(h => [...h, { correct: isClose, guess: numGuess, answer: current.answer }]);
    setSubmitted(true);
  };

  const next = () => {
    if (round >= SHARPE_ROUNDS.length - 1) { setDone(true); return; }
    setRound(r => r + 1); setGuess(""); setSubmitted(false);
  };

  const finalScore = history.length === SHARPE_ROUNDS.length
    ? history.filter(h => h.correct).length
    : score;

  useEffect(() => {
    if (done && !xpAwarded && finalScore >= 3) { onXP(20); setXpAwarded(true); }
  }, [done, xpAwarded, finalScore, onXP]);

  const reset = () => { setRound(0); setGuess(""); setSubmitted(false); setScore(0); setDone(false); setHistory([]); setXpAwarded(false); };

  if (done) return (
    <div style={{ textAlign: "center", padding: "28px 0" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        {finalScore >= 4
          ? <Target size={44} color={AMBER} />
          : finalScore >= 2
            ? <TrendingUp size={44} color={GREEN} />
            : <BookOpen size={44} color="var(--text3)" />}
      </div>
      <p style={{ fontSize: 22, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>{finalScore} / {SHARPE_ROUNDS.length}</p>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 22, lineHeight: 1.6 }}>
        {finalScore >= 4 ? "Excellent! Great intuition for risk-adjusted returns." : finalScore >= 2 ? "Good effort! Keep practicing." : "Sharpe intuition takes time. Keep at it."}
      </p>
      {finalScore >= 3 && <p style={{ fontSize: 12, color: AMBER, marginBottom: 16 }}>+20 XP for winning!</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 22 }}>
        {SHARPE_ROUNDS.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", background: "var(--bg2)", borderRadius: 8, border: `0.5px solid ${history[i]?.correct ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"}` }}>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>{r.portfolio}</span>
            <span style={{ fontSize: 12, fontFamily: "Space Mono, monospace", color: history[i]?.correct ? GREEN : RED }}>
              {history[i]?.guess.toFixed(2)} · ans {r.answer.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <button onClick={reset} style={{ padding: "10px 26px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Play Again</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, color: AMBER, textTransform: "uppercase" }}>Round {round + 1} of {SHARPE_ROUNDS.length}</span>
        <span style={{ fontSize: 12, color: "var(--text3)" }}>Score: {score}</span>
      </div>
      <div style={{ background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 18 }}>
        <p style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>Portfolio</p>
        <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", marginBottom: 14 }}>{current.portfolio}</p>
        <div style={{ display: "flex", gap: 24 }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Annual Return</p>
            <p style={{ fontFamily: "Space Mono, monospace", fontSize: 20, color: AMBER }}>{current.ret}%</p>
          </div>
          <div>
            <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Volatility</p>
            <p style={{ fontFamily: "Space Mono, monospace", fontSize: 20, color: "var(--text)" }}>{current.vol}%</p>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>What's the Sharpe ratio? (±0.15 counts as correct)</p>
      {!submitted ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" step="0.01" value={guess} onChange={e => setGuess(e.target.value)}
            placeholder="e.g. 0.65" onKeyDown={e => e.key === "Enter" && submit()}
            style={{ flex: 1, padding: "11px 14px", background: "var(--input-bg)", border: "0.5px solid var(--input-border)", borderRadius: 9, color: "var(--text)", fontSize: 14, fontFamily: "Space Mono, monospace", outline: "none" }} />
          <button onClick={submit} disabled={!guess || isNaN(numGuess)}
            style={{ padding: "11px 22px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Submit
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ background: isClose ? "rgba(76,175,125,0.08)" : "rgba(224,92,92,0.08)", border: `0.5px solid ${isClose ? "rgba(76,175,125,0.35)" : "rgba(224,92,92,0.35)"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: isClose ? GREEN : RED, marginBottom: 5 }}>{isClose ? "Correct" : "Not quite"}</p>
            <p style={{ fontSize: 12, color: "var(--text3)" }}>
              Answer: <span style={{ fontFamily: "Space Mono, monospace", color: AMBER }}>{current.answer.toFixed(2)}</span>
              {" · "}({current.ret} − 4) ÷ {current.vol} = {current.answer.toFixed(2)}
            </p>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>{current.hint}</p>
          </div>
          <button onClick={next} style={{ width: "100%", padding: "11px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {round >= SHARPE_ROUNDS.length - 1 ? "See Results" : "Next Round"}
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ── Game 2: Portfolio Builder Challenge ──────────────────────────────────────
const CHALLENGES = [
  { goal: "Maximize diversification", desc: "Build a portfolio where assets are not highly correlated (avoid all tech stocks).", assets: ["AAPL", "GOOGL", "GLD", "TLT", "VNQ", "BTC", "OIL"], correct: ["GLD", "TLT", "VNQ"], hint: "Gold, bonds, and real estate move independently of each other." },
  { goal: "Best Sharpe ratio",        desc: "Pick 3 assets to maximize risk-adjusted return.", assets: ["SPY", "QQQ", "GLD", "TLT", "VIG", "SCHD", "BND"],          correct: ["SPY", "VIG", "SCHD"], hint: "Dividend ETFs tend to have lower volatility, improving the Sharpe ratio." },
];

function BuilderChallenge({ onXP }: { onXP: (n: number) => void }) {
  const [challenge, setChallenge] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const current = CHALLENGES[challenge];
  const score = selected.filter(s => current.correct.includes(s)).length;

  const toggle = (a: string) => {
    if (selected.includes(a)) { setSelected(s => s.filter(x => x !== a)); return; }
    if (selected.length >= 3) return;
    setSelected(s => [...s, a]);
  };

  const handleSubmit = () => {
    if (score >= 2 && !xpAwarded) { onXP(20); setXpAwarded(true); }
    setSubmitted(true);
  };

  const next = () => {
    setChallenge(c => c + 1); setSelected([]); setSubmitted(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, color: AMBER, textTransform: "uppercase" }}>Challenge {challenge + 1} of {CHALLENGES.length}</span>
      </div>
      <div style={{ background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
        <p style={{ fontSize: 9, letterSpacing: 2, color: AMBER, textTransform: "uppercase", marginBottom: 5 }}>Goal</p>
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>{current.goal}</p>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>{current.desc}</p>
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>Pick 3 assets ({selected.length}/3 selected)</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {current.assets.map(a => {
          const isSel = selected.includes(a);
          return (
            <button key={a} onClick={() => !submitted && toggle(a)}
              style={{ padding: "8px 16px", background: isSel ? `${AMBER}22` : "var(--bg2)", border: `0.5px solid ${isSel ? AMBER : "var(--border)"}`, borderRadius: 8, color: isSel ? AMBER : "var(--text2)", fontSize: 13, fontWeight: isSel ? 600 : 400, cursor: submitted ? "default" : "pointer", fontFamily: "Space Mono, monospace" }}>
              {a}
            </button>
          );
        })}
      </div>
      {!submitted ? (
        <button onClick={handleSubmit} disabled={selected.length !== 3}
          style={{ width: "100%", padding: "11px", background: selected.length === 3 ? AMBER : "var(--bg3)", border: "none", borderRadius: 9, color: selected.length === 3 ? "#0a0e14" : "var(--text3)", fontSize: 13, fontWeight: 600, cursor: selected.length === 3 ? "pointer" : "default" }}>
          Submit
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ background: score >= 2 ? "rgba(76,175,125,0.08)" : "rgba(224,92,92,0.08)", border: `0.5px solid ${score >= 2 ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: score >= 2 ? GREEN : RED, marginBottom: 5 }}>{score >= 2 ? "Well done!" : "Not quite"}, {score}/3 correct</p>
            <p style={{ fontSize: 12, color: "var(--text3)" }}>Best picks: <span style={{ color: AMBER, fontFamily: "Space Mono, monospace" }}>{current.correct.join(", ")}</span></p>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>{current.hint}</p>
          </div>
          {challenge < CHALLENGES.length - 1
            ? <button onClick={next} style={{ width: "100%", padding: "11px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Next Challenge</button>
            : <p style={{ textAlign: "center", fontSize: 12, color: "var(--text3)" }}>All challenges complete!</p>
          }
        </motion.div>
      )}
    </div>
  );
}

// ── Lessons & Quizzes ─────────────────────────────────────────────────────────
const LESSONS = [
  {
    id: "sharpe", title: "What is Sharpe Ratio?", iconKey: "sharpe", time: "3 min",
    xpReward: 50,
    content: [
      { type: "text", text: "The Sharpe ratio measures how much return you're getting per unit of risk. It was invented by Nobel laureate William Sharpe in 1966." },
      { type: "formula", text: "Sharpe = (Portfolio Return − Risk-Free Rate) ÷ Volatility" },
      { type: "text", text: "A higher Sharpe ratio is better. Here's a rough guide:" },
      { type: "list", items: ["Below 0: Not compensated for the risk", "0–1: Acceptable, but room for improvement", "1–2: Good risk-adjusted return", "Above 2: Excellent (rare outside specific strategies)"] },
      { type: "text", text: "The risk-free rate is typically the 3-month US Treasury yield (~4–5%). So a portfolio returning 12% with 20% volatility has a Sharpe of (12 − 4) ÷ 20 = 0.40." },
    ],
    example: {
      problem: "A portfolio returns 12% annually with 20% volatility. The risk-free rate is 4%.",
      steps: [
        "Excess return  =  Return − Risk-free rate  =  12% − 4%  =  8%",
        "Sharpe ratio   =  Excess return ÷ Volatility  =  8% ÷ 20%  =  0.40",
      ],
      answer: "Sharpe = 0.40: acceptable, but there's room to improve.",
    },
    quiz: [
      { q: "What does a Sharpe ratio of exactly 0 mean?", options: ["Great risk-adjusted return", "No return above the risk-free rate", "Maximum possible volatility", "Perfect diversification"], correct: 1 },
      { q: "Portfolio returns 15%, volatility 20%, risk-free rate 4%. What's the Sharpe?", options: ["0.55", "0.75", "0.35", "1.10"], correct: 0 },
      { q: "Which Sharpe ratio indicates the best performance?", options: ["0.3", "0.8", "1.5", "-0.2"], correct: 2 },
    ],
  },
  {
    id: "drawdown", title: "Max Drawdown Explained", iconKey: "drawdown", time: "3 min",
    xpReward: 50,
    content: [
      { type: "text", text: "Max drawdown measures the largest peak-to-trough decline in portfolio value before a new peak is reached." },
      { type: "formula", text: "Max Drawdown = (Trough Value − Peak Value) ÷ Peak Value" },
      { type: "text", text: "Why it matters more than volatility:" },
      { type: "list", items: ["Volatility treats upswings and downswings equally", "Drawdown only captures losing periods", "A -50% drawdown requires a +100% return to break even", "Many investors panic-sell at the trough, locking in losses"] },
      { type: "text", text: "A max drawdown under 20% is generally manageable. Crypto portfolios often see 60–80% drawdowns." },
    ],
    example: {
      problem: "A portfolio peaks at $10,000 then falls to $7,500 before recovering.",
      steps: [
        "Decline       =  Trough − Peak  =  $7,500 − $10,000  =  −$2,500",
        "Max Drawdown  =  Decline ÷ Peak  =  −$2,500 ÷ $10,000  =  −25%",
      ],
      answer: "Max drawdown = −25%. To break even, the portfolio must gain +33.3%.",
    },
    quiz: [
      { q: "Portfolio peaks at $100k, falls to $65k. What's the max drawdown?", options: ["-25%", "-35%", "-45%", "-15%"], correct: 1 },
      { q: "A -50% drawdown requires what return just to break even?", options: ["+50%", "+75%", "+100%", "+150%"], correct: 2 },
      { q: "Which max drawdown is generally considered manageable for long-term investors?", options: ["Under 20%", "Under 5%", "Under 50%", "Under 1%"], correct: 0 },
    ],
  },
  {
    id: "diversification", title: "Diversification vs Correlation", iconKey: "diversification", time: "4 min",
    xpReward: 50,
    content: [
      { type: "text", text: "Holding many stocks doesn't automatically mean you're diversified. True diversification requires assets that don't move together, measured by correlation." },
      { type: "formula", text: "Correlation ranges from −1 (perfect inverse) to +1 (perfect positive)" },
      { type: "list", items: ["AAPL vs MSFT: ~0.85 (highly correlated)", "SPY vs GLD: ~0.05 (near zero, good diversifier)", "SPY vs TLT: ~−0.30 (negative: bonds often rise when stocks fall)", "BTC vs stocks: ~0.40 (mild, increasing over time)"] },
      { type: "text", text: "The ideal portfolio combines assets with low or negative correlations, the free lunch of investing." },
    ],
    example: {
      problem: "You hold AAPL and want to add a second asset. Which one diversifies your portfolio better?",
      steps: [
        "AAPL vs MSFT correlation: +0.85, both drop heavily in tech selloffs",
        "AAPL vs GLD correlation:  +0.03, gold is nearly uncorrelated with tech",
        "Lower correlation → less portfolio risk for the same expected return",
      ],
      answer: "Add GLD. Near-zero correlation with AAPL provides genuine diversification.",
    },
    quiz: [
      { q: "What correlation value means assets move in exactly the same direction?", options: ["0", "-1", "+1", "0.5"], correct: 2 },
      { q: "Which asset is most likely to provide diversification to an S&P 500 holding?", options: ["AAPL", "MSFT", "GLD", "QQQ"], correct: 2 },
      { q: "What is the approximate correlation between SPY and TLT (bonds)?", options: ["+0.85", "0.0", "−0.30", "+0.40"], correct: 2 },
    ],
  },
  {
    id: "montecarlo", title: "Monte Carlo Simulation", iconKey: "montecarlo", time: "3 min",
    xpReward: 50,
    content: [
      { type: "text", text: "Monte Carlo simulation runs thousands of possible future scenarios using historical return data. Corvo runs 8,500 paths." },
      { type: "list", items: ["Uses historical mean return and volatility", "Randomly samples returns based on a statistical distribution", "Runs each scenario forward over time", "The spread of outcomes shows your uncertainty range"] },
      { type: "text", text: "The wider the cone, the more uncertain your future. A volatile portfolio has a huge range: you might be up 300% or down 60%." },
      { type: "text", text: "Use the 10th percentile (bottom of the cone) as a stress-test: can you afford that outcome?" },
    ],
    example: {
      problem: "Two portfolios: A has 15% mean return, 40% volatility. B has 8% mean return, 12% volatility. Which has the wider Monte Carlo cone?",
      steps: [
        "Monte Carlo samples random returns using each portfolio's mean and volatility",
        "Portfolio A: high volatility (40%) → a wide spread of outcomes over time",
        "Portfolio B: low volatility (12%) → a narrow, more predictable cone",
      ],
      answer: "Portfolio A has the wider cone: higher volatility means more uncertainty about future value.",
    },
    quiz: [
      { q: "What does a wider cone in a Monte Carlo simulation indicate?", options: ["Lower returns", "More uncertainty about future outcomes", "Better expected performance", "Lower risk"], correct: 1 },
      { q: "What inputs does Monte Carlo use to generate scenarios?", options: ["Expert predictions", "Historical mean return and volatility", "Future earnings forecasts", "Economic indicators"], correct: 1 },
      { q: "Which percentile should you use as a portfolio stress-test?", options: ["90th", "50th", "10th", "75th"], correct: 2 },
    ],
  },
  {
    id: "bonds", title: "Bonds & Interest Rates", iconKey: "bonds", time: "4 min",
    xpReward: 50,
    content: [
      { type: "text", text: "Bonds are loans you make to governments or corporations. In return, they pay you interest (the coupon) and return your principal at maturity. Bond prices and interest rates move in opposite directions. This is the most important rule in fixed income." },
      { type: "formula", text: "Bond Price ↑ when Interest Rates ↓  ·  Bond Price ↓ when Interest Rates ↑" },
      { type: "text", text: "Yield is the effective return you earn on a bond given today's price. When a bond's price falls below its face value, the yield rises above the coupon rate." },
      { type: "list", items: ["Duration: measures how sensitive a bond is to rate changes", "A 10-year bond has higher duration (more sensitive) than a 2-year bond", "Rising rates hurt long-duration bonds more than short-duration ones", "Yield curve: normally upward sloping, longer maturities pay more"] },
      { type: "text", text: "A duration of 7 means a 1% rise in rates reduces the bond's price by approximately 7%. This is why long-term bonds are riskier in rising-rate environments." },
    ],
    example: {
      problem: "You hold a 10-year Treasury bond with a 4% coupon. Interest rates rise from 4% to 5%.",
      steps: [
        "Your bond pays 4% but new bonds now offer 5%, nobody wants to pay face value for yours",
        "Duration of ~8 means a 1% rate rise → approx. −8% price decline",
        "Your $10,000 bond is now worth roughly $9,200 on the open market",
      ],
      answer: "Bond price falls ~8%. You lose paper value but still receive the 4% coupon if you hold to maturity.",
    },
    quiz: [
      { q: "When interest rates rise, what happens to existing bond prices?", options: ["They rise", "They fall", "They stay the same", "They double"], correct: 1 },
      { q: "What is 'yield' on a bond?", options: ["The face value at maturity", "The effective return at current market price", "The coupon payment amount", "The credit rating"], correct: 1 },
      { q: "Which bond is most sensitive to interest rate changes?", options: ["3-month Treasury bill", "2-year note", "10-year Treasury bond", "30-year Treasury bond"], correct: 3 },
      { q: "Duration of 8 means a 1% rate increase causes approximately what price change?", options: ["+8%", "-1%", "-8%", "+1%"], correct: 2 },
      { q: "A bond's coupon is 3% but it yields 5%. What does this imply about its price?", options: ["Trading above face value", "Trading at face value", "Trading below face value", "The bond has defaulted"], correct: 2 },
    ],
  },
  {
    id: "options", title: "Options Basics", iconKey: "options", time: "4 min",
    xpReward: 50,
    content: [
      { type: "text", text: "An option is a contract giving you the right (but not the obligation) to buy or sell an asset at a predetermined price (the strike price) before a set date (expiry)." },
      { type: "formula", text: "Call = right to BUY  ·  Put = right to SELL  ·  Premium = price you pay for the option" },
      { type: "list", items: ["Call option: profits when stock rises above the strike price", "Put option: profits when stock falls below the strike price", "In the money (ITM): exercising the option has intrinsic value", "Out of the money (OTM): exercising would result in a loss; let it expire worthless", "Time decay: options lose value as expiry approaches (all else equal)"] },
      { type: "text", text: "Intrinsic value for a call = Stock Price − Strike Price (if positive). For a put = Strike Price − Stock Price (if positive). Options also carry time value, the extra premium for the chance things move your way before expiry." },
    ],
    example: {
      problem: "You buy a call option on AAPL with a $180 strike price, paying a $5 premium. At expiry, AAPL is at $195.",
      steps: [
        "Intrinsic value  =  Stock Price − Strike  =  $195 − $180  =  $15",
        "Profit per share =  Intrinsic value − Premium paid  =  $15 − $5  =  $10",
        "Each options contract covers 100 shares, so total profit = $1,000",
      ],
      answer: "You profit $10 per share ($1,000 per contract). If AAPL had stayed below $180, the option would expire worthless and you'd lose only the $5 premium.",
    },
    quiz: [
      { q: "A call option gives you the right to:", options: ["Sell shares at the strike price", "Buy shares at the strike price", "Receive dividends automatically", "Borrow shares from the broker"], correct: 1 },
      { q: "A put option is profitable when:", options: ["The stock rises above the strike price", "The stock stays flat", "The stock falls below the strike price", "Interest rates rise"], correct: 2 },
      { q: "What happens to an out-of-the-money option at expiry?", options: ["It converts to shares", "It is exercised at a loss", "It expires worthless", "It rolls over to the next month"], correct: 2 },
      { q: "You buy a put with a $50 strike. Stock falls to $38. What is the intrinsic value?", options: ["$12", "$38", "$50", "$0"], correct: 0 },
      { q: "Time decay refers to:", options: ["The premium increasing as expiry approaches", "The option losing value as expiry approaches", "Dividends reducing the strike price", "Volatility shrinking over time"], correct: 1 },
    ],
  },
  {
    id: "taxes", title: "Tax Efficiency", iconKey: "taxes", time: "4 min",
    xpReward: 50,
    content: [
      { type: "text", text: "How and when you sell investments matters almost as much as what you invest in. Taxes can silently erode returns; tax-efficient investing keeps more money compounding for you." },
      { type: "formula", text: "Short-term gain (held < 1 year): taxed as ordinary income  ·  Long-term gain (held ≥ 1 year): taxed at 0%, 15%, or 20%" },
      { type: "list", items: ["Long-term capital gains rates are significantly lower than ordinary income tax rates", "Tax-loss harvesting: sell a losing position to realize a loss that offsets gains", "The wash-sale rule: you cannot buy the same (or substantially identical) security within 30 days before/after the loss sale", "Tax-deferred accounts (401k, IRA): gains grow untaxed until withdrawal", "Index funds and ETFs are more tax-efficient than actively managed funds (lower turnover)"] },
      { type: "text", text: "Asset location matters: hold high-turnover assets in tax-deferred accounts and buy-and-hold assets in taxable accounts to minimize your annual tax bill." },
    ],
    example: {
      problem: "You have a $5,000 gain on AAPL (held 14 months) and a $3,000 loss on TSLA (held 6 months). Your income puts you in the 24% tax bracket.",
      steps: [
        "AAPL gain: long-term → taxed at 15% (not 24%) → tax = $750",
        "TSLA loss: harvest by selling → offsets $3,000 of gains",
        "Net taxable gain = $5,000 − $3,000 = $2,000  →  tax = $300",
        "Tax saving vs. not harvesting: $750 − $300 = $450 saved",
      ],
      answer: "By harvesting the TSLA loss, you save $450 in taxes. Remember: don't buy TSLA back within 30 days (wash-sale rule).",
    },
    quiz: [
      { q: "Long-term capital gains tax rates apply when you hold an asset for at least:", options: ["6 months", "1 year", "2 years", "3 years"], correct: 1 },
      { q: "Tax-loss harvesting means:", options: ["Avoiding all capital gains taxes", "Selling a losing position to offset gains", "Holding losses until they recover", "Moving assets to a lower-tax state"], correct: 1 },
      { q: "The wash-sale rule prevents you from:", options: ["Selling at a loss in a taxable account", "Claiming a loss if you rebuy the same security within 30 days", "Using a tax-deferred account for losses", "Harvesting more than $3,000 in losses per year"], correct: 1 },
      { q: "Which account type allows gains to grow without annual tax?", options: ["Standard brokerage account", "Checking account", "Tax-deferred retirement account (401k/IRA)", "Money market account"], correct: 2 },
      { q: "Index ETFs tend to be more tax-efficient than active funds because:", options: ["They have lower expense ratios", "They generate fewer taxable events due to low turnover", "They never pay dividends", "They are held in tax-deferred accounts by default"], correct: 1 },
    ],
  },
  {
    id: "valuation", title: "Stock Valuation", iconKey: "valuation", time: "4 min",
    xpReward: 50,
    content: [
      { type: "text", text: "Stock valuation is about determining what a company is actually worth (its intrinsic value) and comparing that to the market price. A stock trading below intrinsic value is considered undervalued (a potential buy); above intrinsic value is overvalued." },
      { type: "formula", text: "P/E Ratio = Price Per Share ÷ Earnings Per Share (EPS)" },
      { type: "list", items: ["P/E of 15 = investors pay $15 for every $1 of annual earnings", "Low P/E: cheaper stock, but could signal low growth expectations", "High P/E: investors expect strong future growth (e.g., tech stocks often trade at 30–50x)", "Forward P/E uses next year's estimated earnings, more forward-looking"] },
      { type: "text", text: "Discounted Cash Flow (DCF) is the gold standard of valuation. You project future cash flows, then discount them back to today's value using a required rate of return. The sum of those discounted flows is the intrinsic value." },
      { type: "formula", text: "Intrinsic Value = Sum of (Future Cash Flows ÷ (1 + Discount Rate)^Year)" },
    ],
    example: {
      problem: "Company A has a stock price of $50 and EPS of $2.50. Company B has a stock price of $80 and EPS of $5.33. Which is cheaper on a P/E basis?",
      steps: [
        "Company A P/E  =  $50 ÷ $2.50  =  20x",
        "Company B P/E  =  $80 ÷ $5.33  =  15x",
        "Company B trades at a lower multiple, cheaper per dollar of earnings",
      ],
      answer: "Company B is cheaper on P/E (15x vs 20x). But always check why: lower P/E can mean lower growth, not just a better bargain.",
    },
    quiz: [
      { q: "A P/E ratio of 25 means investors pay $25 for every:", options: ["$25 of revenue", "$1 of annual earnings", "$1 of book value", "$25 of dividends"], correct: 1 },
      { q: "Which P/E ratio suggests a cheaper stock (all else equal)?", options: ["50x", "35x", "20x", "10x"], correct: 3 },
      { q: "In a DCF model, you discount future cash flows because:", options: ["Future money is worth more than today's money", "A dollar today is worth more than a dollar in the future", "Cash flows are uncertain and unreliable", "The government taxes future earnings more heavily"], correct: 1 },
      { q: "Intrinsic value is best described as:", options: ["The current market price", "What a company is fundamentally worth based on future cash flows", "The book value on the balance sheet", "The 52-week high price"], correct: 1 },
      { q: "A stock trading below its intrinsic value is considered:", options: ["Overvalued", "Undervalued", "Fairly valued", "A growth stock"], correct: 1 },
    ],
  },
];

// Icon map for lessons
function LessonIconComponent({ iconKey, size = 20, color = AMBER }: { iconKey: string; size?: number; color?: string }) {
  const props = { size, color, strokeWidth: 1.5 };
  switch (iconKey) {
    case "sharpe":       return <Target {...props} />;
    case "drawdown":     return <TrendingDown {...props} />;
    case "diversification": return <BarChart2 {...props} />;
    case "montecarlo":   return <RefreshCw {...props} />;
    case "bonds":        return <Landmark {...props} />;
    case "options":      return <TrendingUp {...props} />;
    case "taxes":        return <PiggyBank {...props} />;
    case "valuation":    return <BarChart2 {...props} />;
    default:             return <Star {...props} />;
  }
}

type Lesson = typeof LESSONS[0];

// ── AI Question type ─────────────────────────────────────────────────────────
interface AIQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

// ── AI Practice Session ───────────────────────────────────────────────────────
function AIPracticeSession({ lesson, xp, onBack }: { lesson: Lesson; xp: number; onBack: () => void }) {
  const [questions, setQuestions] = useState<AIQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);

  const difficulty = getAIDifficulty(xp);
  const todayUTC = new Date().toISOString().split("T")[0];
  const cacheKey = `corvo_ai_practice_${lesson.id}_${difficulty}`;
  const dateCacheKey = `corvo_ai_practice_date_${lesson.id}_${difficulty}`;
  const prevCacheKey = `corvo_ai_practice_prev_${lesson.id}_${difficulty}`;

  const fetchQuestions = useCallback(async (forceRefresh = false) => {
    // Check local cache for today's questions first (unless forcing refresh)
    if (!forceRefresh) {
      try {
        const storedDate = localStorage.getItem(dateCacheKey);
        if (storedDate === todayUTC) {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const data = JSON.parse(raw);
            if (Array.isArray(data) && data.length > 0) {
              setQuestions(data);
              return;
            }
          }
        } else {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(dateCacheKey);
        }
      } catch {}
    }

    setLoading(true);
    setError(null);
    setQuestions(null);
    setQi(0); setSelected(null); setAnswered(false); setResults([]); setDone(false);

    // Gather previous questions to exclude
    let excludePrevious: string[] = [];
    try {
      const prevRaw = localStorage.getItem(prevCacheKey);
      if (prevRaw) {
        const prev = JSON.parse(prevRaw);
        if (Array.isArray(prev.data)) {
          excludePrevious = prev.data.slice(0, 5).map((q: AIQuestion) => q.question);
        }
      }
    } catch {}

    try {
      const res = await fetch(`${API_URL}/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: lesson.title, difficulty, count: 5, exclude_previous: excludePrevious }),
      });
      if (res.status === 429) { setError("Rate limit reached. Try again in an hour."); setLoading(false); return; }
      if (!res.ok) { setError("Failed to generate questions. Please try again."); setLoading(false); return; }
      const apiData = await res.json();
      const qs: AIQuestion[] = apiData.questions ?? [];
      setQuestions(qs);
      // Cache for today and save as "previous" for tomorrow
      try {
        localStorage.setItem(dateCacheKey, todayUTC);
        localStorage.setItem(cacheKey, JSON.stringify(qs));
        localStorage.setItem(prevCacheKey, JSON.stringify({ date: todayUTC, data: qs }));
      } catch {}
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [lesson.title, difficulty, cacheKey, prevCacheKey, todayUTC]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const answer = (idx: number) => {
    if (answered || !questions) return;
    setSelected(idx);
    setAnswered(true);
    setResults(r => [...r, idx === questions[qi].correct]);
  };

  const nextQ = () => {
    if (!questions) return;
    if (qi >= questions.length - 1) { setDone(true); return; }
    setQi(i => i + 1); setSelected(null); setAnswered(false);
  };

  const accuracy = results.length > 0 ? Math.round(results.filter(Boolean).length / results.length * 100) : 0;

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", marginBottom: 16 }}>
        <RefreshCw size={32} color={AMBER} />
      </motion.div>
      <p style={{ fontSize: 14, color: "var(--text3)" }}>Generating {difficulty} questions about {lesson.title}...</p>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <AlertCircle size={36} color={RED} style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 14, color: RED, marginBottom: 20 }}>{error}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => fetchQuestions(true)} style={{ padding: "10px 20px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Retry</button>
        <button onClick={onBack} style={{ padding: "10px 20px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 9, color: "var(--text2)", fontSize: 13, cursor: "pointer" }}>Back</button>
      </div>
    </div>
  );

  if (done || !questions) {
    if (!questions) return null;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <BrainCircuit size={48} color={AMBER} />
        </div>
        <p style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Practice Complete</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: accuracy >= 80 ? GREEN : accuracy >= 60 ? AMBER : RED, marginBottom: 4, fontFamily: "Space Mono, monospace" }}>{accuracy}%</p>
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>{results.filter(Boolean).length} of {results.length} correct</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24, textAlign: "left" }}>
          {questions.map((q, i) => (
            <div key={i} style={{ padding: "10px 14px", background: "var(--bg2)", borderRadius: 10, border: `0.5px solid ${results[i] ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"}` }}>
              <p style={{ fontSize: 12, color: results[i] ? GREEN : RED, marginBottom: 3, fontWeight: 500 }}>{results[i] ? "Correct" : "Incorrect"}: {q.options[q.correct]}</p>
              <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{q.explanation}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={() => fetchQuestions(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={14} /> Generate New Set
          </button>
          <button onClick={onBack} style={{ padding: "10px 20px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 9, color: "var(--text2)", fontSize: 13, cursor: "pointer" }}>Back</button>
        </div>
      </motion.div>
    );
  }

  const q = questions[qi];
  return (
    <motion.div key={qi} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, color: AMBER, textTransform: "uppercase" }}>Question {qi + 1} of {questions.length}</span>
        <span style={{ fontSize: 10, padding: "3px 8px", background: `${AMBER}18`, color: AMBER, borderRadius: 6, textTransform: "capitalize" }}>{difficulty}</span>
      </div>
      <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", lineHeight: 1.5, marginBottom: 18 }}>{q.question}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {q.options.map((opt, oi) => {
          const isSelected = selected === oi;
          const isCorrect = oi === q.correct;
          let bg = "var(--bg2)", border = "var(--border)", color = "var(--text2)";
          if (answered) {
            if (isCorrect) { bg = "rgba(76,175,125,0.1)"; border = "rgba(76,175,125,0.4)"; color = GREEN; }
            else if (isSelected && !isCorrect) { bg = "rgba(224,92,92,0.08)"; border = "rgba(224,92,92,0.4)"; color = RED; }
          }
          return (
            <button key={oi} onClick={() => answer(oi)}
              style={{ padding: "12px 16px", background: bg, border: `0.5px solid ${border}`, borderRadius: 10, color, fontSize: 13, textAlign: "left", cursor: answered ? "default" : "pointer", pointerEvents: answered ? "none" : "auto", transition: "all 0.15s", fontWeight: (isSelected || (answered && isCorrect)) ? 500 : 400 }}>
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ background: selected === q.correct ? "rgba(76,175,125,0.08)" : "rgba(224,92,92,0.08)", border: `0.5px solid ${selected === q.correct ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{q.explanation}</p>
          </div>
          <button onClick={nextQ}
            style={{ width: "100%", padding: "11px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {qi >= questions.length - 1 ? "See Results" : "Next"}
          </button>
        </motion.div>
      )}
      <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 12, textAlign: "center" }}>AI Practice, no XP awarded</p>
    </motion.div>
  );
}

// ── Challenge Mode ────────────────────────────────────────────────────────────
function ChallengeMode({
  masteredLessons, xp, userId, displayName, onBack, onPointsAwarded,
}: {
  masteredLessons: Lesson[]; xp: number; userId: string | null; displayName: string;
  onBack: () => void; onPointsAwarded: (pts: number) => void;
}) {
  const [phase, setPhase] = useState<"loading" | "quiz" | "done">("loading");
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [questionScores, setQuestionScores] = useState<number[]>([]);
  const [results, setResults] = useState<boolean[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topics = masteredLessons.map(l => l.title).join(", ");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/generate-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: `mixed topics covering: ${topics}`, difficulty: "advanced", count: 10 }),
        });
        if (!res.ok) { setLoadError("Failed to load challenge. Try again."); return; }
        const data = await res.json();
        setQuestions(data.questions ?? []);
        setPhase("quiz");
      } catch {
        setLoadError("Network error. Check your connection.");
      }
    })();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== "quiz" || answered) return;
    if (timeLeft <= 0) {
      handleAnswer(-1);
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, timeLeft, answered]);

  const handleAnswer = (idx: number) => {
    if (answered || !questions[qi]) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const correct = idx === questions[qi].correct;
    const timeBonus = correct ? Math.round(timeLeft / 60 * 10) : 0; // 0-10 pts bonus
    const pts = correct ? 10 + timeBonus : 0;
    setResults(r => [...r, correct]);
    setQuestionScores(s => [...s, pts]);
    setSelected(idx);
    setAnswered(true);
  };

  const nextQ = async () => {
    if (qi >= questions.length - 1) {
      const finalScore = questionScores.reduce((a, b) => a + b, 0);
      if (userId) {
        const { data: ls } = await supabase.from("learn_scores").select("total_points").eq("user_id", userId).single();
        const prevPts = ls?.total_points ?? 0;
        const newPts = prevPts + finalScore;
        await supabase.from("learn_scores").upsert(
          { user_id: userId, display_name: displayName || "", total_points: newPts, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
        onPointsAwarded(finalScore);
      }
      setPhase("done");
      return;
    }
    setQi(i => i + 1);
    setSelected(null);
    setAnswered(false);
    setTimeLeft(60);
  };

  const totalScore = questionScores.reduce((a, b) => a + b, 0);
  const correctCount = results.filter(Boolean).length;

  if (phase === "loading") return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      {loadError ? (
        <>
          <AlertCircle size={36} color={RED} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: RED, marginBottom: 20 }}>{loadError}</p>
          <button onClick={onBack} style={{ padding: "10px 20px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 9, color: "var(--text2)", fontSize: 13, cursor: "pointer" }}>Back</button>
        </>
      ) : (
        <>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", marginBottom: 16 }}>
            <RefreshCw size={32} color={AMBER} />
          </motion.div>
          <p style={{ fontSize: 14, color: "var(--text3)" }}>Generating 10-question challenge from your mastered topics...</p>
        </>
      )}
    </div>
  );

  if (phase === "done") return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "24px 0" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <Trophy size={48} color={AMBER} />
      </div>
      <p style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Challenge Complete</p>
      <p style={{ fontFamily: "Space Mono, monospace", fontSize: 36, fontWeight: 700, color: AMBER, marginBottom: 4 }}>{totalScore}</p>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>{correctCount}/{questions.length} correct</p>
      <p style={{ fontSize: 11, color: GREEN, marginBottom: 24 }}>Score posted to leaderboard</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 24, textAlign: "left" }}>
        {questions.map((q, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: "var(--bg2)", borderRadius: 10, border: `0.5px solid ${results[i] ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"}`, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: results[i] ? GREEN : RED, flexShrink: 0 }}>{results[i] ? "+" + questionScores[i] : "0"} pts</span>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.4 }}>{q.question}</p>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => { setPhase("loading"); setQi(0); setSelected(null); setAnswered(false); setTimeLeft(60); setQuestionScores([]); setResults([]); }} style={{ padding: "10px 20px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 9, color: "var(--text2)", fontSize: 13, cursor: "pointer" }}>Play Again</button>
        <button onClick={onBack} style={{ padding: "10px 24px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Back to Learn</button>
      </div>
    </motion.div>
  );

  // Quiz phase
  const q = questions[qi];
  if (!q) return null;
  const timerPct = (timeLeft / 60) * 100;
  const timerColor = timeLeft > 20 ? GREEN : timeLeft > 10 ? AMBER : RED;

  return (
    <motion.div key={qi} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, color: AMBER, textTransform: "uppercase" }}>Question {qi + 1} of {questions.length}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Timer size={13} color={timerColor} />
          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: timerColor }}>{timeLeft}s</span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>· Score: {totalScore}</span>
        </div>
      </div>
      {/* Timer bar */}
      <div style={{ height: 4, background: "var(--track)", borderRadius: 2, overflow: "hidden", marginBottom: 18 }}>
        <motion.div animate={{ width: `${timerPct}%` }} transition={{ duration: 0.3 }}
          style={{ height: "100%", background: timerColor, borderRadius: 2 }} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", lineHeight: 1.5, marginBottom: 18 }}>{q.question}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {q.options.map((opt, oi) => {
          const isSelected = selected === oi;
          const isCorrect = oi === q.correct;
          let bg = "var(--bg2)", border = "var(--border)", color = "var(--text2)";
          if (answered) {
            if (isCorrect) { bg = "rgba(76,175,125,0.1)"; border = "rgba(76,175,125,0.4)"; color = GREEN; }
            else if (isSelected && !isCorrect) { bg = "rgba(224,92,92,0.08)"; border = "rgba(224,92,92,0.4)"; color = RED; }
          }
          return (
            <button key={oi} onClick={() => handleAnswer(oi)}
              style={{ padding: "12px 16px", background: bg, border: `0.5px solid ${border}`, borderRadius: 10, color, fontSize: 13, textAlign: "left", cursor: answered ? "default" : "pointer", pointerEvents: answered ? "none" : "auto", transition: "all 0.15s", fontWeight: (isSelected || (answered && isCorrect)) ? 500 : 400 }}>
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ background: selected === q.correct ? "rgba(76,175,125,0.08)" : "rgba(224,92,92,0.08)", border: `0.5px solid ${selected === q.correct ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{q.explanation}</p>
            {selected === q.correct && <p style={{ fontSize: 12, color: GREEN, marginTop: 4, fontFamily: "Space Mono, monospace" }}>+{questionScores[qi] ?? 0} pts (speed bonus included)</p>}
          </div>
          <button onClick={nextQ}
            style={{ width: "100%", padding: "11px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {qi >= questions.length - 1 ? "See Results" : "Next"}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── LevelsReference ───────────────────────────────────────────────────────────
function LevelsReference({ currentXp }: { currentXp: number }) {
  const currentLevel = getLevel(currentXp);
  return (
    <div style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "22px 24px", marginTop: 32 }}>
      <p style={{ fontSize: 10, letterSpacing: 2.5, color: AMBER, textTransform: "uppercase", marginBottom: 6 }}>Progression</p>
      <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, marginBottom: 18 }}>Levels & XP</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {LEVELS.map((lvl, i) => {
          const isCurrentLevel = currentLevel.name === lvl.name;
          const isUnlocked = currentXp >= lvl.min;
          const xpNeeded = lvl.min > currentXp ? lvl.min - currentXp : 0;
          return (
            <div key={lvl.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: isCurrentLevel ? `${lvl.color}12` : "var(--bg2)", border: `0.5px solid ${isCurrentLevel ? `${lvl.color}55` : "var(--border)"}`, borderRadius: 10, opacity: isUnlocked ? 1 : 0.5 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: isUnlocked ? lvl.color : "var(--border)", flexShrink: 0, boxShadow: isCurrentLevel ? `0 0 8px ${lvl.color}88` : "none" }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isUnlocked ? lvl.color : "var(--text3)" }}>{lvl.name}</span>
                  {isCurrentLevel && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${lvl.color}22`, color: lvl.color, letterSpacing: 1 }}>YOU ARE HERE</span>}
                </div>
                <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>
                  {lvl.max === Infinity ? `${lvl.min}+ XP` : `${lvl.min} – ${lvl.max} XP`}
                </span>
              </div>
              {!isUnlocked && xpNeeded > 0 && (
                <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "Space Mono, monospace" }}>{xpNeeded} XP away</span>
              )}
              {isUnlocked && !isCurrentLevel && (
                <CheckCircle2 size={14} color={lvl.color} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
interface LeaderEntry { display_name: string; total_points: number; rank: number; id?: string; }

function Leaderboard({ myPoints }: { myPoints: number }) {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => {});
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name,xp,id")
        .order("xp", { ascending: false })
        .limit(10);
      if (!error && data) setEntries(data.map((r: any, i: number) => ({ display_name: r.display_name, total_points: r.xp ?? 0, id: r.id, rank: i + 1 })));
      setLoading(false);
    })();
  }, []);

  const rankLabel = (rank: number) => {
    if (rank === 1) return <Trophy size={14} color={AMBER} />;
    if (rank === 2) return <Trophy size={14} color="#9b9b98" />;
    if (rank === 3) return <Trophy size={14} color="#cd7f32" />;
    return <span style={{ fontFamily: "Space Mono, monospace", fontSize: 11, color: "var(--text3)" }}>#{rank}</span>;
  };

  return (
    <div style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderTop: `1.5px solid ${AMBER}44`, borderRadius: 14, padding: "22px 24px", marginTop: 40 }}>
      <p style={{ fontSize: 10, letterSpacing: 2.5, color: AMBER, textTransform: "uppercase", marginBottom: 6 }}>Global Leaderboard</p>
      <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, marginBottom: 18 }}>Top learners</h2>
      {loading ? (
        <p style={{ fontSize: 12, color: "var(--text3)" }}>Loading...</p>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <motion.div initial={false} animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} style={{ display: "inline-flex", marginBottom: 10, opacity: 0.4 }}>
            <Trophy size={32} color="var(--text3)" />
          </motion.div>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>No scores yet</p>
          <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>Complete Challenge Mode to post your score. You could be #1.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {entries.map(e => {
            const isMe = user && e.id === user.id;
            return (
              <motion.div initial={false} whileHover={{ x: 3 }} key={e.rank} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: isMe ? `${AMBER}12` : "var(--bg2)", border: `0.5px solid ${isMe ? `${AMBER}44` : "var(--border)"}`, borderRadius: 10 }}>
                <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {rankLabel(e.rank)}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: isMe ? AMBER : "var(--text2)" }}>{e.display_name}{isMe ? " (you)" : ""}</span>
                <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: AMBER }}>{e.total_points}</span>
                <span style={{ fontSize: 9, color: "var(--text3)" }}>pts</span>
              </motion.div>
            );
          })}
        </div>
      )}
      {!user && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>Log in to earn XP and appear on the leaderboard</p>
          <Link href="/auth" style={{ padding: "8px 20px", background: AMBER, borderRadius: 9, color: "#0a0e14", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Log in</Link>
        </div>
      )}
      {user && myPoints > 0 && (
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 14, textAlign: "center" }}>Your score: {myPoints} pts · {getLevel(myPoints).name}</p>
      )}
    </div>
  );
}

// ── Arcade Game: Market Crash Simulator ─────────────────────────────────────
const CRASH_SCENARIOS = [
  { name: "2008 Financial Crisis", clue: "Lehman Brothers collapsed, banks froze credit, housing market imploded.", answer: 2, options: ["-18%", "-32%", "-57%", "-71%"], correct: 2, explanation: "The S&P 500 fell ~57% from its 2007 peak to March 2009 trough." },
  { name: "COVID Crash 2020",      clue: "Global pandemic declared, economies locked down overnight.", answer: 1, options: ["-15%", "-34%", "-50%", "-60%"], correct: 1, explanation: "The S&P 500 dropped 34% in just 33 days, the fastest bear market ever." },
  { name: "Dot-com Bust 2000–02",  clue: "Tech valuations collapsed after years of speculative excess.", answer: 2, options: ["-20%", "-35%", "-49%", "-65%"], correct: 2, explanation: "S&P 500 fell 49%. Nasdaq dropped 78% from peak to trough." },
  { name: "2022 Rate Hike Cycle",  clue: "Fed raised rates at fastest pace since the 1980s to fight 8% inflation.", answer: 1, options: ["-10%", "-25%", "-40%", "-55%"], correct: 1, explanation: "S&P 500 fell 25.4% in 2022, the worst year since 2008." },
];
function CrashSimulator({ onXP }: { onXP: (n: number) => void }) {
  const [qi, setQi] = useState(0); const [sel, setSel] = useState<number|null>(null); const [done, setDone] = useState(false); const [score, setScore] = useState(0); const [awarded, setAwarded] = useState(false);
  const q = CRASH_SCENARIOS[qi];
  const submit = (i: number) => { if (sel !== null) return; setSel(i); if (i === q.correct) setScore(s => s + 1); };
  const next = () => { if (qi >= CRASH_SCENARIOS.length - 1) { setDone(true); return; } setQi(i => i + 1); setSel(null); };
  useEffect(() => { if (done && !awarded && score >= 2) { onXP(15); setAwarded(true); } }, [done, awarded, score, onXP]);
  if (done) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <Trophy size={40} color={AMBER} style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{score}/{CRASH_SCENARIOS.length} correct</p>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>{score >= 2 ? "+15 XP earned!" : "Need 2+ correct for XP. Try again!"}</p>
      <button onClick={() => { setQi(0); setSel(null); setDone(false); setScore(0); setAwarded(false); }} style={{ padding: "8px 20px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>Play Again</button>
    </div>
  );
  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: 2, color: "#e05c5c", textTransform: "uppercase", marginBottom: 8 }}>Scenario {qi+1}/{CRASH_SCENARIOS.length}</p>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{q.name}</h3>
      <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 18 }}>{q.clue}</p>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>How much did the S&P 500 drop at its worst?</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: sel !== null ? 14 : 0 }}>
        {q.options.map((opt, i) => {
          const picked = sel === i; const correct = i === q.correct; const show = sel !== null;
          return (
            <button key={i} onClick={() => submit(i)} style={{ padding: "12px", borderRadius: 10, border: `0.5px solid ${show ? (correct ? "rgba(76,175,125,0.6)" : picked ? "rgba(224,92,92,0.6)" : "var(--border)") : "var(--border)"}`, background: show ? (correct ? "rgba(76,175,125,0.1)" : picked ? "rgba(224,92,92,0.1)" : "transparent") : "transparent", color: "var(--text)", fontSize: 14, fontFamily: "Space Mono, monospace", fontWeight: 700, cursor: sel === null ? "pointer" : "default", transition: "all 0.15s" }}>
              {opt}
            </button>
          );
        })}
      </div>
      {sel !== null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: "var(--bg2)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{q.explanation}</p>
        </motion.div>
      )}
      {sel !== null && <button onClick={next} style={{ padding: "10px 24px", fontSize: 12, fontWeight: 600, borderRadius: 9, border: "none", background: AMBER, color: "#0a0e14", cursor: "pointer" }}>{qi < CRASH_SCENARIOS.length - 1 ? "Next →" : "See Results"}</button>}
    </div>
  );
}

// ── Arcade Game: Options Profit Calculator ───────────────────────────────────
const OPTIONS_QS = [
  { desc: "You buy a call option: Strike $150, Premium $8, Stock at expiry: $165", options: ["-$800", "+$700", "+$1,500", "+$300"], correct: 1, explanation: "Profit = (165-150-8) × 100 = $700. You exercise the option and net $7/share." },
  { desc: "You buy a put option: Strike $100, Premium $5, Stock at expiry: $88", options: ["+$700", "-$500", "+$1,200", "+$500"], correct: 0, explanation: "Profit = (100-88-5) × 100 = $700. You sell at $100 what's worth $88." },
  { desc: "You buy a call option: Strike $200, Premium $15, Stock at expiry: $205", options: ["-$1,000", "+$500", "+$1,500", "-$500"], correct: 3, explanation: "Profit = (205-200-15) × 100 = -$1,000. The net is -$10/share = -$1,000. Actually: (205-200) = 5, minus $15 premium = -$10/share × 100 = -$1,000. Loss!" },
  { desc: "You buy a put option: Strike $50, Premium $3, Stock at expiry: $50", options: ["+$300", "-$300", "+$150", "$0"], correct: 1, explanation: "Stock is at strike, option expires worthless. You lose the $3 × 100 = $300 premium." },
];
function OptionsGame({ onXP }: { onXP: (n: number) => void }) {
  const [qi, setQi] = useState(0); const [sel, setSel] = useState<number|null>(null); const [done, setDone] = useState(false); const [score, setScore] = useState(0); const [awarded, setAwarded] = useState(false);
  const q = OPTIONS_QS[qi];
  const submit = (i: number) => { if (sel !== null) return; setSel(i); if (i === q.correct) setScore(s => s + 1); };
  const next = () => { if (qi >= OPTIONS_QS.length - 1) { setDone(true); return; } setQi(i => i + 1); setSel(null); };
  useEffect(() => { if (done && !awarded && score >= 2) { onXP(15); setAwarded(true); } }, [done, awarded, score, onXP]);
  if (done) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <Calculator size={40} color="#a78bfa" style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{score}/{OPTIONS_QS.length} correct</p>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>{score >= 2 ? "+15 XP earned!" : "Try again to earn XP"}</p>
      <button onClick={() => { setQi(0); setSel(null); setDone(false); setScore(0); setAwarded(false); }} style={{ padding: "8px 20px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>Play Again</button>
    </div>
  );
  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: 2, color: "#a78bfa", textTransform: "uppercase", marginBottom: 8 }}>Question {qi+1}/{OPTIONS_QS.length}</p>
      <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.65, marginBottom: 18, fontWeight: 500 }}>{q.desc}</p>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>What is your total profit/loss? (1 contract = 100 shares)</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: sel !== null ? 14 : 0 }}>
        {q.options.map((opt, i) => {
          const picked = sel === i; const correct = i === q.correct; const show = sel !== null;
          return <button key={i} onClick={() => submit(i)} style={{ padding: "12px", borderRadius: 10, border: `0.5px solid ${show ? (correct ? "rgba(76,175,125,0.6)" : picked ? "rgba(224,92,92,0.6)" : "var(--border)") : "var(--border)"}`, background: show ? (correct ? "rgba(76,175,125,0.1)" : picked ? "rgba(224,92,92,0.1)" : "transparent") : "transparent", color: "var(--text)", fontSize: 13, fontFamily: "Space Mono, monospace", fontWeight: 700, cursor: sel === null ? "pointer" : "default", transition: "all 0.15s" }}>{opt}</button>;
        })}
      </div>
      {sel !== null && <><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: "var(--bg2)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}><p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{q.explanation}</p></motion.div><button onClick={next} style={{ padding: "10px 24px", fontSize: 12, fontWeight: 600, borderRadius: 9, border: "none", background: "#a78bfa", color: "#fff", cursor: "pointer" }}>{qi < OPTIONS_QS.length - 1 ? "Next →" : "See Results"}</button></>}
    </div>
  );
}

// ── Arcade Game: Inflation Impact ────────────────────────────────────────────
const INFLATION_QS = [
  { q: "Inflation is 7% and your savings account pays 2%. What is your real return?", options: ["+9%", "+5%", "-5%", "-2%"], correct: 2, explanation: "Real return = 2% - 7% = -5%. Your money is losing purchasing power even though the nominal balance grows." },
  { q: "Your bond pays 4% annually. Inflation rises to 6%. What happens to your real return?", options: ["+10%", "+2%", "-2%", "0%"], correct: 2, explanation: "Real return = 4% - 6% = -2%. Inflation erodes the real value of fixed-income returns." },
  { q: "Inflation is 3% and stocks return 11%. What is the real return?", options: ["+8%", "+14%", "+3%", "+11%"], correct: 0, explanation: "Real return = 11% - 3% = 8%. Stocks historically beat inflation over the long run." },
  { q: "$10,000 earning 0% with 5% inflation for 10 years is worth approximately:", options: ["$16,288", "$10,000", "$6,139", "$8,500"], correct: 2, explanation: "Real value = $10,000 / (1.05)^10 ≈ $6,139. Inflation destroys idle cash over time." },
];
function InflationGame({ onXP }: { onXP: (n: number) => void }) {
  const [qi, setQi] = useState(0); const [sel, setSel] = useState<number|null>(null); const [done, setDone] = useState(false); const [score, setScore] = useState(0); const [awarded, setAwarded] = useState(false);
  const q = INFLATION_QS[qi];
  const submit = (i: number) => { if (sel !== null) return; setSel(i); if (i === q.correct) setScore(s => s + 1); };
  const next = () => { if (qi >= INFLATION_QS.length - 1) { setDone(true); return; } setQi(i => i + 1); setSel(null); };
  useEffect(() => { if (done && !awarded && score >= 2) { onXP(10); setAwarded(true); } }, [done, awarded, score, onXP]);
  if (done) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <Percent size={40} color="#4a9eff" style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{score}/{INFLATION_QS.length} correct</p>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>{score >= 2 ? "+10 XP earned!" : "Try again to earn XP"}</p>
      <button onClick={() => { setQi(0); setSel(null); setDone(false); setScore(0); setAwarded(false); }} style={{ padding: "8px 20px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>Play Again</button>
    </div>
  );
  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: 2, color: "#4a9eff", textTransform: "uppercase", marginBottom: 8 }}>Question {qi+1}/{INFLATION_QS.length}</p>
      <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.65, marginBottom: 18, fontWeight: 500 }}>{q.q}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: sel !== null ? 14 : 0 }}>
        {q.options.map((opt, i) => {
          const picked = sel === i; const correct = i === q.correct; const show = sel !== null;
          return <button key={i} onClick={() => submit(i)} style={{ padding: "12px", borderRadius: 10, border: `0.5px solid ${show ? (correct ? "rgba(76,175,125,0.6)" : picked ? "rgba(224,92,92,0.6)" : "var(--border)") : "var(--border)"}`, background: show ? (correct ? "rgba(76,175,125,0.1)" : picked ? "rgba(224,92,92,0.1)" : "transparent") : "transparent", color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: sel === null ? "pointer" : "default", transition: "all 0.15s" }}>{opt}</button>;
        })}
      </div>
      {sel !== null && <><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: "var(--bg2)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}><p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{q.explanation}</p></motion.div><button onClick={next} style={{ padding: "10px 24px", fontSize: 12, fontWeight: 600, borderRadius: 9, border: "none", background: "#4a9eff", color: "#fff", cursor: "pointer" }}>{qi < INFLATION_QS.length - 1 ? "Next →" : "See Results"}</button></>}
    </div>
  );
}

// ── Arcade Game: Fed Rate Decision ───────────────────────────────────────────
const FED_SCENARIOS = [
  { year: "June 2022", inflation: "8.6%", unemployment: "3.6%", correct: 0, options: ["Raise +75bps", "Hold", "Cut -25bps", "Raise +25bps"], actualAction: "Raised +75bps", why: "Inflation at 40-year high. Fed prioritized price stability over growth risk with the largest hike since 1994." },
  { year: "March 2020", inflation: "2.3%", unemployment: "4.4% (rising)", correct: 2, options: ["Raise +50bps", "Hold", "Cut -100bps", "Cut -25bps"], actualAction: "Cut -100bps to near zero", why: "COVID caused sudden economic collapse. Emergency cut to near-zero + QE to support the economy." },
  { year: "December 2019", inflation: "2.3%", unemployment: "3.5%", correct: 1, options: ["Raise +25bps", "Hold", "Cut -25bps", "Raise +50bps"], actualAction: "Held rates steady", why: "Economy was healthy with low inflation near target and full employment, no urgency to move." },
  { year: "September 2024", inflation: "2.5%", unemployment: "4.2%", correct: 2, options: ["Raise +25bps", "Hold", "Cut -50bps", "Cut -25bps"], actualAction: "Cut -50bps", why: "Inflation was falling toward target. Labor market softening. Fed began easing cycle with a larger-than-expected cut." },
];
function FedGame({ onXP }: { onXP: (n: number) => void }) {
  const [qi, setQi] = useState(0); const [sel, setSel] = useState<number|null>(null); const [done, setDone] = useState(false); const [score, setScore] = useState(0); const [awarded, setAwarded] = useState(false);
  const q = FED_SCENARIOS[qi];
  const submit = (i: number) => { if (sel !== null) return; setSel(i); if (i === q.correct) setScore(s => s + 1); };
  const next = () => { if (qi >= FED_SCENARIOS.length - 1) { setDone(true); return; } setQi(i => i + 1); setSel(null); };
  useEffect(() => { if (done && !awarded && score >= 2) { onXP(15); setAwarded(true); } }, [done, awarded, score, onXP]);
  if (done) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <Building2 size={40} color="#4caf7d" style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{score}/{FED_SCENARIOS.length} correct</p>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>{score >= 2 ? "+15 XP earned!" : "Try again!"}</p>
      <button onClick={() => { setQi(0); setSel(null); setDone(false); setScore(0); setAwarded(false); }} style={{ padding: "8px 20px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>Play Again</button>
    </div>
  );
  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: 2, color: "#4caf7d", textTransform: "uppercase", marginBottom: 8 }}>Scenario: {q.year}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[{label: "Inflation", val: q.inflation}, {label: "Unemployment", val: q.unemployment}].map(s => (
          <div key={s.label} style={{ background: "var(--bg2)", borderRadius: 10, padding: "12px 14px", border: "0.5px solid var(--border)" }}>
            <p style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontFamily: "Space Mono, monospace", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{s.val}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>What should the Fed do?</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: sel !== null ? 14 : 0 }}>
        {q.options.map((opt, i) => {
          const picked = sel === i; const correct = i === q.correct; const show = sel !== null;
          return <button key={i} onClick={() => submit(i)} style={{ padding: "10px", borderRadius: 10, border: `0.5px solid ${show ? (correct ? "rgba(76,175,125,0.6)" : picked ? "rgba(224,92,92,0.6)" : "var(--border)") : "var(--border)"}`, background: show ? (correct ? "rgba(76,175,125,0.1)" : picked ? "rgba(224,92,92,0.1)" : "transparent") : "transparent", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: sel === null ? "pointer" : "default", transition: "all 0.15s" }}>{opt}</button>;
        })}
      </div>
      {sel !== null && <><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: "var(--bg2)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}><p style={{ fontSize: 11, fontWeight: 600, color: "#4caf7d", marginBottom: 4 }}>Actual: {q.actualAction}</p><p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{q.why}</p></motion.div><button onClick={next} style={{ padding: "10px 24px", fontSize: 12, fontWeight: 600, borderRadius: 9, border: "none", background: "#4caf7d", color: "#fff", cursor: "pointer" }}>{qi < FED_SCENARIOS.length - 1 ? "Next →" : "See Results"}</button></>}
    </div>
  );
}

// ── Arcade Game: Stock Valuation Showdown ────────────────────────────────────
const VALUATION_ROUNDS = [
  { a: { name: "Company A", pe: 12, eps: 5.2, growth: "8%" }, b: { name: "Company B", pe: 28, eps: 2.1, growth: "5%" }, winner: 0, reason: "Company A has a much lower P/E with higher EPS and faster growth, significantly more undervalued." },
  { a: { name: "Company A", pe: 35, eps: 8.0, growth: "22%" }, b: { name: "Company B", pe: 15, eps: 3.5, growth: "4%" }, winner: 0, reason: "Company A's high growth rate justifies the premium. PEG ratio (P/E ÷ growth) is ~1.6 vs B's 3.75, so A is cheaper on a growth-adjusted basis." },
  { a: { name: "Company A", pe: 18, eps: 4.0, growth: "10%" }, b: { name: "Company B", pe: 22, eps: 6.5, growth: "12%" }, winner: 1, reason: "Company B has higher EPS, slightly more growth, and only a small P/E premium, better value overall." },
];
function ValuationShowdown({ onXP }: { onXP: (n: number) => void }) {
  const [round, setRound] = useState(0); const [sel, setSel] = useState<number|null>(null); const [done, setDone] = useState(false); const [score, setScore] = useState(0); const [awarded, setAwarded] = useState(false);
  const q = VALUATION_ROUNDS[round];
  const submit = (i: number) => { if (sel !== null) return; setSel(i); if (i === q.winner) setScore(s => s + 1); };
  const next = () => { if (round >= VALUATION_ROUNDS.length - 1) { setDone(true); return; } setRound(r => r + 1); setSel(null); };
  useEffect(() => { if (done && !awarded && score >= 2) { onXP(20); setAwarded(true); } }, [done, awarded, score, onXP]);
  if (done) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <GitCompare size={40} color={AMBER} style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{score}/{VALUATION_ROUNDS.length} correct</p>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>{score >= 2 ? "+20 XP earned!" : "Try again!"}</p>
      <button onClick={() => { setRound(0); setSel(null); setDone(false); setScore(0); setAwarded(false); }} style={{ padding: "8px 20px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer" }}>Play Again</button>
    </div>
  );
  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: 2, color: AMBER, textTransform: "uppercase", marginBottom: 12 }}>Round {round+1}/{VALUATION_ROUNDS.length}: Which is more undervalued?</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: sel !== null ? 14 : 0 }}>
        {[q.a, q.b].map((co, i) => {
          const picked = sel === i; const correct = i === q.winner; const show = sel !== null;
          return (
            <button key={i} onClick={() => submit(i)} style={{ padding: "16px", borderRadius: 12, border: `0.5px solid ${show ? (correct ? "rgba(76,175,125,0.6)" : picked ? "rgba(224,92,92,0.6)" : "var(--border)") : "var(--border)"}`, background: show ? (correct ? "rgba(76,175,125,0.1)" : picked ? "rgba(224,92,92,0.1)" : "transparent") : "transparent", cursor: sel === null ? "pointer" : "default", textAlign: "left", transition: "all 0.15s" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>{co.name}</p>
              {[["P/E", co.pe], ["EPS", `$${co.eps}`], ["Growth", co.growth]].map(([l, v]) => (
                <div key={l as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>{l}</span>
                  <span style={{ fontSize: 11, fontFamily: "Space Mono, monospace", fontWeight: 700, color: "var(--text)" }}>{v}</span>
                </div>
              ))}
            </button>
          );
        })}
      </div>
      {sel !== null && <><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: "var(--bg2)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}><p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{q.reason}</p></motion.div><button onClick={next} style={{ padding: "10px 24px", fontSize: 12, fontWeight: 600, borderRadius: 9, border: "none", background: AMBER, color: "#0a0e14", cursor: "pointer" }}>{round < VALUATION_ROUNDS.length - 1 ? "Next Round →" : "See Results"}</button></>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const ARCADE_GAMES = [
  { id: "sharpe-game",   title: "Guess the Sharpe",       desc: "Calculate Sharpe ratios from real portfolio data.",                color: AMBER,     Icon: Target,       xp: 20, difficulty: "Medium" },
  { id: "crash-sim",     title: "Market Crash Simulator", desc: "Guess how far markets fell in famous historical crashes.",         color: "#e05c5c",  Icon: TrendingDown, xp: 15, difficulty: "Easy"   },
  { id: "options-game",  title: "Options P&L Calculator", desc: "Calculate profit/loss on calls and puts at expiry.",               color: "#a78bfa",  Icon: Calculator,   xp: 15, difficulty: "Medium" },
  { id: "inflation-game",title: "Inflation Impact",       desc: "Real vs nominal returns: does your money keep up?",              color: "#b47ee0",  Icon: Percent,      xp: 10, difficulty: "Easy"   },
  { id: "fed-game",      title: "Fed Rate Decision",      desc: "Given macro indicators, what should the Fed do?",                 color: "#4caf7d",  Icon: Building2,    xp: 15, difficulty: "Hard"   },
  { id: "builder-game",  title: "Portfolio Challenge",    desc: "Pick assets to hit a specific goal: maximize Sharpe or diversify.",color: "#f97316",  Icon: BarChart2,    xp: 20, difficulty: "Easy"   },
  { id: "valuation-game",title: "Stock Valuation Showdown",desc: "Pick the more undervalued stock given P/E, EPS, and growth rate.", color: AMBER,     Icon: GitCompare,   xp: 20, difficulty: "Hard"   },
] as const;

const COMPLETED_KEY = "corvo_completed_lessons";

export default function LearnPage() {
  const [activeSection, setActiveSection] = useState<"home" | "game" | "lesson" | "ai-practice" | "challenge">("home");
  const [activeGame, setActiveGame]           = useState<string | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [activeLesson, setActiveLesson]       = useState<Lesson | null>(null);
  const [activePracticeLesson, setActivePracticeLesson] = useState<Lesson | null>(null);

  const [xp, setXp]               = useState(0);
  const [streak, setStreak]       = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [lessonProgress, setLessonProgress] = useState<Record<string, number[]>>({});
  const [gameXpAwarded, setGameXpAwarded] = useState<string[]>([]);
  const [gameAlreadyAwardedMsg, setGameAlreadyAwardedMsg] = useState(false);
  const [xpToast, setXpToast]     = useState<number | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<{ name: string; color: string } | null>(null);
  const [dailyFlash, setDailyFlash] = useState<"correct" | "wrong" | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [learnPoints, setLearnPoints] = useState(0);
  const [profileReady, setProfileReady] = useState(false);

  // Daily challenge: 3 questions, +25 XP each
  type DailyQ = { question: string; options: string[]; correct: number; explanation: string };
  const [dailyQuestions, setDailyQuestions]     = useState<DailyQ[]>([]);
  const [dailyIdx, setDailyIdx]                 = useState(0);
  const [dailyCompleted, setDailyCompleted]     = useState(false);
  const [dailyLoading, setDailyLoading]         = useState(false);
  const [dailySelected, setDailySelected]       = useState<number | null>(null);
  const [dailyShowResult, setDailyShowResult]   = useState(false);
  const [midnightCountdown, setMidnightCountdown] = useState("");
  // LS keys: _done = completion marker; _date = today's UTC date string; _qs = cached questions for today; _prev = yesterday's for exclusion
  const LS_DAILY_DONE_KEY = "corvo_daily_challenge";
  const LS_DAILY_DATE_KEY = "corvo_daily_questions_date";
  const LS_DAILY_QS_KEY   = "corvo_daily_questions";
  const LS_DAILY_PREV_KEY = "corvo_daily_questions_prev";

  // Countdown to midnight UTC
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setMidnightCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toISOString().split("T")[0];

  // Returns true if user already completed today's challenge
  const checkLocalDaily = () => {
    try {
      const raw = localStorage.getItem(LS_DAILY_DONE_KEY);
      if (!raw) return false;
      const { date } = JSON.parse(raw);
      return date === today;
    } catch { return false; }
  };

  // Load cached questions for today; returns true if found
  const loadCachedDailyQuestions = (): boolean => {
    try {
      const storedDate = localStorage.getItem(LS_DAILY_DATE_KEY);
      if (storedDate !== today) {
        localStorage.removeItem(LS_DAILY_QS_KEY);
        localStorage.removeItem(LS_DAILY_DATE_KEY);
        return false;
      }
      const raw = localStorage.getItem(LS_DAILY_QS_KEY);
      if (!raw) return false;
      const questions = JSON.parse(raw);
      if (!Array.isArray(questions) || questions.length === 0) return false;
      setDailyQuestions(questions);
      setDailyIdx(0);
      setDailySelected(null);
      setDailyShowResult(false);
      return true;
    } catch { return false; }
  };

  const fetchDailyQuestion = async () => {
    setDailyLoading(true);
    try {
      // Gather previous questions to exclude repetition
      let excludePrevious: string[] = [];
      try {
        const prevRaw = localStorage.getItem(LS_DAILY_PREV_KEY);
        if (prevRaw) {
          const prev = JSON.parse(prevRaw);
          if (Array.isArray(prev.questions)) {
            excludePrevious = prev.questions.slice(0, 5).map((q: DailyQ) => q.question);
          }
        }
      } catch {}

      const res = await fetch(`${API_URL}/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "investing", difficulty: "beginner", count: 3, exclude_previous: excludePrevious }),
      });
      const d = await res.json();
      if (Array.isArray(d.questions) && d.questions.length > 0) {
        const questions = d.questions.slice(0, 3) as DailyQ[];
        setDailyQuestions(questions);
        setDailyIdx(0);
        setDailySelected(null);
        setDailyShowResult(false);
        // Cache questions for today (so reload on same day reuses them)
        try {
          localStorage.setItem(LS_DAILY_DATE_KEY, today);
          localStorage.setItem(LS_DAILY_QS_KEY, JSON.stringify(questions));
          // Save as "previous" for tomorrow's exclusion
          localStorage.setItem(LS_DAILY_PREV_KEY, JSON.stringify({ date: today, questions }));
        } catch {}
      }
    } catch {}
    setDailyLoading(false);
  };

  useEffect(() => {
    try { setCompleted(JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]")); } catch {}

    (async () => {
      setProfileReady(false);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (checkLocalDaily()) {
            setDailyCompleted(true);
          } else if (!loadCachedDailyQuestions()) {
            fetchDailyQuestion();
          }
          return;
        }
        setUserId(user.id);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, xp, streak, last_activity_date, last_daily_challenge")
          .eq("id", user.id)
          .single();
        console.log("profile fetch:", { profile, profileError });

        // ── Streak reset: if last activity was more than 1 day ago, streak is broken
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const lastDate  = profile?.last_activity_date ?? null;
        let currentStreak = profile?.streak ?? 0;
        if (lastDate !== null && lastDate !== today && lastDate !== yesterday) {
          currentStreak = 0;
          await supabase.from("profiles").update({ streak: 0, updated_at: new Date().toISOString() }).eq("id", user.id);
        }
        if (currentStreak === 0 && lastDate === today) {
          currentStreak = 1;
        }

        // Set all profile display values before clearing the loading skeleton
        setDisplayName(profile?.display_name || user.email?.split("@")[0] || "");
        setAvatarUrl(profile?.avatar_url || null);
        setXp(profile?.xp ?? 0);
        setStreak(currentStreak);

        if (profile) {
          try {
            const lp = JSON.parse(localStorage.getItem("corvo_lesson_progress") || "{}");
            setLessonProgress(lp);
            const gameAwarded = JSON.parse(localStorage.getItem("corvo_game_xp_awarded") || "[]");
            setGameXpAwarded(gameAwarded);
          } catch {}
          // Daily challenge: check completion, then cached questions, then fetch fresh
          if (profile.last_daily_challenge === today || checkLocalDaily()) {
            setDailyCompleted(true);
          } else if (!loadCachedDailyQuestions()) {
            fetchDailyQuestion();
          }
        } else {
          if (checkLocalDaily()) {
            setDailyCompleted(true);
          } else if (!loadCachedDailyQuestions()) {
            fetchDailyQuestion();
          }
        }

        const { data: ls } = await supabase.from("learn_scores").select("total_points").eq("user_id", user.id).single();
        if (ls) {
          setLearnPoints(ls.total_points ?? 0);
          const profileXp = profile?.xp ?? 0;
          const learnXp = ls.total_points ?? 0;
          if (learnXp > profileXp) {
            setXp(learnXp);
            await supabase.from("profiles").update({ xp: learnXp, updated_at: new Date().toISOString() }).eq("id", user.id);
          }
        }
      } finally {
        setProfileReady(true);
      }
    })();
  }, []);

  const markComplete = (lessonId: string) => {
    setCompleted(prev => {
      if (prev.includes(lessonId)) return prev;
      const next = [...prev, lessonId];
      try { localStorage.setItem(COMPLETED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const awardXP = useCallback(async (amount: number) => {
    if (amount <= 0) return;
    setXpToast(amount);

    if (!userId) {
      setXp(prev => {
        const prevLevel = getLevel(prev);
        const newXpVal = prev + amount;
        const newLevel = getLevel(newXpVal);
        if (newLevel.name !== prevLevel.name) setLevelUpInfo({ name: newLevel.name, color: newLevel.color });
        return newXpVal;
      });
      return;
    }

    const today     = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const [{ data: profile }, { data: ls }] = await Promise.all([
      supabase.from("profiles").select("xp, streak, last_activity_date").eq("id", userId).single(),
      supabase.from("learn_scores").select("total_points").eq("user_id", userId).single(),
    ]);

    const prevXp     = profile?.xp ?? 0;
    const prevStreak = profile?.streak ?? 0;
    const lastDate   = profile?.last_activity_date ?? null;
    const prevPts    = ls?.total_points ?? 0;

    let newStreak = prevStreak;
    let dailyBonus = 0;
    if (lastDate === today) {
      newStreak = prevStreak;
    } else if (lastDate === yesterday) {
      newStreak = prevStreak + 1; dailyBonus = 10;
    } else {
      newStreak = 1; dailyBonus = 10;
    }

    const newXp  = prevXp + amount + dailyBonus;
    const newPts = prevPts + amount;
    setXp(newXp);
    const prevLevel = getLevel(prevXp);
    const newLevel  = getLevel(newXp);
    if (newLevel.name !== prevLevel.name) setLevelUpInfo({ name: newLevel.name, color: newLevel.color });
    setStreak(newStreak);
    setLearnPoints(newPts);

    await Promise.all([
      supabase.from("profiles").upsert({
        id: userId, xp: newXp, streak: newStreak,
        last_activity_date: today, updated_at: new Date().toISOString(),
      }, { onConflict: "id" }),
      supabase.from("learn_scores").upsert(
        { user_id: userId, display_name: displayName || "", total_points: newPts, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      ),
    ]);
  }, [userId, displayName]);

  const handleGameXP = useCallback(async (gameId: string, amount: number) => {
    if (gameXpAwarded.includes(gameId)) {
      setGameAlreadyAwardedMsg(true);
      setTimeout(() => setGameAlreadyAwardedMsg(false), 3500);
      return;
    }
    await awardXP(amount);
    const updated = [...gameXpAwarded, gameId];
    setGameXpAwarded(updated);
    try { localStorage.setItem("corvo_game_xp_awarded", JSON.stringify(updated)); } catch {}
  }, [gameXpAwarded, awardXP, userId]);

  const handleLessonXP = async (amount: number, lessonId: string, updatedProgress: number[]) => {
    const newProgress = { ...lessonProgress, [lessonId]: updatedProgress };
    setLessonProgress(newProgress);
    try { localStorage.setItem("corvo_lesson_progress", JSON.stringify(newProgress)); } catch {}

    const lesson = LESSONS.find(l => l.id === lessonId);
    if (lesson && updatedProgress.length >= lesson.quiz.length) {
      markComplete(lessonId);
      posthog.capture("learn_lesson_completed", { lesson: lesson.title, xp_earned: amount });
    }

    if (amount > 0) awardXP(amount);
  };

  const submitDailyChallenge = async (optionIdx: number) => {
    const q = dailyQuestions[dailyIdx];
    if (!q) return;
    setDailySelected(optionIdx);
    setDailyShowResult(true);
    const correct = optionIdx === q.correct;
    setDailyFlash(correct ? "correct" : "wrong");
    setTimeout(() => setDailyFlash(null), 700);
    if (correct) {
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({ particleCount: 45, spread: 55, origin: { y: 0.45 }, scalar: 0.85, colors: [AMBER, GREEN, "#ffffff"] });
      } catch {}
      await awardXP(25);
    }
  };

  const advanceDailyQuestion = async () => {
    const nextIdx = dailyIdx + 1;
    if (nextIdx < dailyQuestions.length) {
      setDailyIdx(nextIdx);
      setDailySelected(null);
      setDailyShowResult(false);
    } else {
      // All 3 done, mark complete
      setDailyCompleted(true);
      try { localStorage.setItem(LS_DAILY_DONE_KEY, JSON.stringify({ date: today })); } catch {}
      if (userId) {
        await supabase.from("profiles").update({ last_daily_challenge: today }).eq("id", userId);
      }
    }
  };

  const masteredLessons = LESSONS.filter(l => (lessonProgress[l.id]?.length ?? 0) >= l.quiz.length);
  const challengeUnlocked = masteredLessons.length >= 2;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}>
      <AnimStyles />
      <LearnHeader xp={xp} streak={streak} displayName={displayName} avatarUrl={avatarUrl} loading={!profileReady} />

      <div className="c-learn-content" style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 24px" }}>
        <AnimatePresence mode="wait">

          {/* ── Home ── */}
          {activeSection === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>

              {/* Daily Challenge */}
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  border: `0.5px solid ${dailyCompleted ? "rgba(76,175,125,0.3)" : `${AMBER}55`}`,
                  borderRadius: 16, background: dailyCompleted ? "rgba(76,175,125,0.04)" : `${AMBER}0a`,
                  padding: "24px 28px", position: "relative", overflow: "hidden",
                }}>
                  <motion.div
                    initial={false}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    style={{ position: "absolute", top: 0, left: 0, width: "60%", height: "100%", opacity: 0.15, background: "linear-gradient(to right, #c9a84c, transparent)", pointerEvents: "none", zIndex: 1 }}
                  />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: dailyQuestions.length > 0 && !dailyCompleted ? 16 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: dailyCompleted ? "rgba(76,175,125,0.15)" : `${AMBER}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <CalendarCheck size={18} color={dailyCompleted ? GREEN : AMBER} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 1 }}>Daily Challenge</p>
                        <p style={{ fontSize: 11, color: "var(--text3)" }}>
                          {dailyCompleted
                            ? <span style={{ color: GREEN }}>Completed · Next in {midnightCountdown}</span>
                            : dailyLoading ? "Loading questions…"
                            : "3 questions · +25 XP each · Resets at midnight UTC"}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: dailyCompleted ? "rgba(76,175,125,0.15)" : `${AMBER}18`, color: dailyCompleted ? GREEN : AMBER }}>
                      {dailyCompleted ? "Done" : "+25 XP each"}
                    </span>
                  </div>

                  {/* Questions */}
                  {!dailyCompleted && dailyQuestions.length > 0 && (() => {
                    const q = dailyQuestions[dailyIdx];
                    return (
                      <div className={dailyFlash === "correct" ? "anim-flash-green" : dailyFlash === "wrong" ? "anim-flash-red" : ""} style={{ borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 10, color: "var(--text3)", letterSpacing: 1 }}>Question {dailyIdx + 1} of {dailyQuestions.length}</span>
                          <div style={{ display: "flex", gap: 4 }}>
                            {dailyQuestions.map((_, i) => (
                              <div key={i} style={{ width: 28, height: 4, borderRadius: 3, background: i < dailyIdx ? GREEN : i === dailyIdx ? AMBER : "var(--border)" }} />
                            ))}
                          </div>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 12, lineHeight: 1.5 }}>{q.question}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          {q.options.map((opt, i) => {
                            const isSelected = dailySelected === i;
                            const isCorrect = i === q.correct;
                            let bg = "var(--bg2)";
                            let border = "var(--border)";
                            let color = "var(--text2)";
                            if (dailyShowResult) {
                              if (isCorrect) { bg = "rgba(76,175,125,0.12)"; border = "rgba(76,175,125,0.4)"; color = GREEN; }
                              else if (isSelected && !isCorrect) { bg = "rgba(224,92,92,0.1)"; border = "rgba(224,92,92,0.4)"; color = RED; }
                            }
                            const isWrongSelected = dailyShowResult && isSelected && !isCorrect;
                            return (
                              <button key={i} onClick={() => { if (!dailyShowResult) submitDailyChallenge(i); }}
                                disabled={dailyShowResult}
                                className={isWrongSelected ? "anim-shake" : ""}
                                style={{ textAlign: "left", padding: "10px 14px", borderRadius: 10, border: `0.5px solid ${border}`, background: bg, color, fontSize: 13, cursor: dailyShowResult ? "default" : "pointer", transition: "background 0.2s, border-color 0.2s, color 0.2s", display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, width: 16, flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {dailyShowResult && (
                          <div style={{ marginTop: 12 }}>
                            {q.explanation && (
                              <div style={{ padding: "10px 14px", background: "var(--bg2)", borderRadius: 10, border: "0.5px solid var(--border)", marginBottom: 10 }}>
                                <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>{q.explanation}</p>
                              </div>
                            )}
                            <button onClick={advanceDailyQuestion}
                              style={{ width: "100%", padding: "10px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                              {dailyIdx + 1 < dailyQuestions.length ? `Next Question (${dailyIdx + 2}/${dailyQuestions.length})` : "Finish"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {!dailyCompleted && dailyQuestions.length === 0 && !dailyLoading && (
                    <div style={{ marginTop: 12, textAlign: "center" }}>
                      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>Could not load today's challenge. Check your connection.</p>
                      <button onClick={fetchDailyQuestion} style={{ padding: "8px 16px", fontSize: 12, borderRadius: 8, border: `0.5px solid ${AMBER}44`, background: `${AMBER}0d`, color: AMBER, cursor: "pointer" }}>
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Challenge Mode */}
              <div style={{ marginBottom: 40 }}>
                <motion.button
                  initial={false}
                  whileHover={challengeUnlocked ? { scale: 1.01 } : {}}
                  whileTap={challengeUnlocked ? { scale: 0.99 } : {}}
                  onClick={() => { if (challengeUnlocked) setActiveSection("challenge"); }}
                  disabled={!challengeUnlocked}
                  style={{
                    width: "100%", padding: "22px 28px",
                    background: challengeUnlocked ? `${AMBER}0e` : "var(--bg2)",
                    border: `0.5px solid ${challengeUnlocked ? `${AMBER}55` : "var(--border)"}`,
                    borderRadius: 16, cursor: challengeUnlocked ? "pointer" : "not-allowed",
                    textAlign: "left", opacity: challengeUnlocked ? 1 : 0.6,
                  }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: challengeUnlocked ? `${AMBER}22` : "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Swords size={20} color={challengeUnlocked ? AMBER : "var(--text3)"} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: challengeUnlocked ? "var(--text)" : "var(--text3)", marginBottom: 2 }}>Challenge Mode</p>
                        <p style={{ fontSize: 12, color: "var(--text3)" }}>
                          {challengeUnlocked
                            ? "10 timed questions · speed bonus · score on leaderboard"
                            : `Master ${2 - masteredLessons.length} more lesson${2 - masteredLessons.length !== 1 ? "s" : ""} to unlock`}
                        </p>
                      </div>
                    </div>
                    {challengeUnlocked
                      ? <ChevronRight size={16} color={AMBER} />
                      : <motion.div initial={false} animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 2, repeat: Infinity }}><Lock size={14} color="var(--text3)" /></motion.div>}
                  </div>
                </motion.button>
              </div>

              {/* Arcade Games */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Gamepad2 size={16} color={AMBER} />
                <p style={{ fontSize: 10, letterSpacing: 2.5, color: AMBER, textTransform: "uppercase" }}>Financial Arcade</p>
              </div>
              <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, marginBottom: 10 }}>Learn by doing</h2>
              <div style={{ height: 1, background: "linear-gradient(to right, var(--accent)44, transparent)", marginBottom: 18, marginTop: -10 }} />
              <motion.div
                className="c-arcade-grid"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 40 }}
                initial={false} animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
                {ARCADE_GAMES.map((g, idx) => {
                  const GIcon = g.Icon;
                  const isLastOdd = idx === ARCADE_GAMES.length - 1 && ARCADE_GAMES.length % 2 !== 0;
                  return (
                    <motion.button
                      initial={false}
                      variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                      whileHover={{ y: -3, boxShadow: `0 8px 32px ${g.color}22` }}
                      whileTap={{ scale: 0.97 }}
                      key={g.id} onClick={() => { setActiveGame(g.id); setActiveSection("game"); }}
                      style={{ padding: "20px 22px", background: "var(--card-bg)", border: `0.5px solid ${g.color}33`, borderRadius: 14, cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden", gridColumn: isLastOdd ? "1 / -1" : undefined }}>
                      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${g.color}15, transparent)`, borderRadius: "0 14px 0 80px", pointerEvents: "none" }} />
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${g.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <GIcon size={16} color={g.color} strokeWidth={1.5} />
                        </div>
                        <div style={{ display: "flex", gap: 5 }}>
                          <span style={{ fontSize: 10, padding: "3px 9px", background: `${g.color}18`, color: g.color, borderRadius: 5, fontWeight: 700, fontFamily: "Space Mono, monospace" }}>+{g.xp} XP</span>
                          <span style={{ fontSize: 9, padding: "2px 7px", background: "var(--bg3)", color: "var(--text3)", borderRadius: 5 }}>{g.difficulty}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>{g.title}</p>
                      <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{g.desc}</p>
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Lessons */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <GraduationCap size={16} color={AMBER} />
                <p style={{ fontSize: 10, letterSpacing: 2.5, color: AMBER, textTransform: "uppercase" }}>Lessons</p>
              </div>
              <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, marginBottom: 10 }}>Core concepts</h2>
              <div style={{ height: 1, background: "linear-gradient(to right, var(--accent)44, transparent)", marginBottom: 18, marginTop: -10 }} />
              <motion.div
                className="c-lesson-grid"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
                initial={false} animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
                {LESSONS.map((l, idx) => {
                  const prog = lessonProgress[l.id] ?? [];
                  const isMastered = prog.length >= l.quiz.length;
                  const isStarted  = prog.length > 0 && !isMastered;
                  const isLocked   = idx > 0 && !completed.includes(LESSONS[idx - 1].id) && (lessonProgress[LESSONS[idx - 1].id]?.length ?? 0) < LESSONS[idx - 1].quiz.length;
                  const borderColor = isMastered ? "rgba(167,139,250,0.35)" : isStarted ? "rgba(76,175,125,0.3)" : "var(--border)";
                  return (
                    <motion.div key={l.id}
                      initial={false}
                      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      <button
                        onClick={() => { if (!isLocked) { setActiveLesson(l); setActiveSection("lesson"); posthog.capture("learn_lesson_started", { lesson: l.title }); } }}
                        disabled={isLocked}
                        style={{ padding: "20px", background: "var(--card-bg)", border: `0.5px solid ${borderColor}`, borderLeft: `2px solid ${isMastered ? "rgba(167,139,250,0.6)" : isStarted ? "rgba(76,175,125,0.5)" : isLocked ? "transparent" : "rgba(201,168,76,0.4)"}`, borderRadius: isMastered ? "14px 14px 0 0" : 14, cursor: isLocked ? "not-allowed" : "pointer", textAlign: "left", transition: "all 0.15s", opacity: isLocked ? 0.55 : 1 }}
                        onMouseEnter={e => { if (!isLocked) { e.currentTarget.style.borderColor = `${AMBER}44`; e.currentTarget.style.background = "var(--bg2)"; } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.background = "var(--card-bg)"; }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ position: "relative", display: "inline-flex" }}>
                            <LessonIconComponent iconKey={l.iconKey} size={20} color={isLocked ? "var(--text3)" : AMBER} />
                            <span style={{ position: "absolute", top: -6, left: -6, width: 16, height: 16, borderRadius: "50%", background: isLocked ? "var(--bg3)" : `${AMBER}22`, border: `0.5px solid ${isLocked ? "var(--border)" : `${AMBER}55`}`, fontSize: 9, fontWeight: 700, color: isLocked ? "var(--text3)" : AMBER, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Space Mono, monospace" }}>{idx + 1}</span>
                          </div>
                          {isLocked
                            ? <Lock size={14} color="var(--text3)" />
                            : isMastered
                              ? <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: "2px 7px", borderRadius: 20, background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>Mastered</span>
                              : isStarted
                                ? <span style={{ fontSize: 9, padding: "2px 7px", background: "rgba(76,175,125,0.1)", color: GREEN, borderRadius: 6 }}>{prog.length}/{l.quiz.length}</span>
                                : <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", background: `${AMBER}18`, color: AMBER, borderRadius: 6 }}>+{l.xpReward} XP</span>
                          }
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{l.title}</p>
                        <p style={{ fontSize: 11, color: "var(--text3)" }}>{l.time} read</p>
                        {isLocked && <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 5 }}>Complete "{LESSONS[idx - 1].title}" first</p>}
                        {isStarted && (
                          <div style={{ height: 2, background: "var(--border)", borderRadius: 1, marginTop: 10 }}>
                            <div style={{ width: `${(prog.length / l.quiz.length) * 100}%`, height: "100%", background: GREEN, borderRadius: 1, transition: "width 0.4s ease" }} />
                          </div>
                        )}
                      </button>
                      {(isMastered || prog.length > 0) && (
                        <button
                          onClick={() => { setActivePracticeLesson(l); setActiveSection("ai-practice"); }}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", background: `${AMBER}0d`, border: `0.5px solid ${AMBER}44`, borderTop: "none", borderRadius: "0 0 14px 14px", cursor: "pointer", transition: "all 0.15s", color: AMBER, fontSize: 12, fontWeight: 500 }}
                          onMouseEnter={e => { e.currentTarget.style.background = `${AMBER}1a`; }}
                          onMouseLeave={e => { e.currentTarget.style.background = `${AMBER}0d`; }}>
                          <BrainCircuit size={13} color={AMBER} strokeWidth={1.5} /> AI Practice
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>

              <LevelsReference currentXp={xp} />
              <Leaderboard myPoints={xp} />
            </motion.div>
          )}

          {/* ── Game ── */}
          {activeSection === "game" && (
            <motion.div key="game" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <motion.button initial={false} whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveSection("home")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", marginBottom: 22, padding: 0 }}><ChevronLeft size={14} /> Back to Learn</motion.button>
              {(() => {
                const meta = ARCADE_GAMES.find(g => g.id === activeGame);
                if (!meta) return null;
                const GIcon = meta.Icon;
                return (
                  <div style={{ background: "var(--card-bg)", border: `0.5px solid ${meta.color}33`, borderRadius: 18, padding: "26px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${meta.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <GIcon size={20} color={meta.color} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)" }}>{meta.title}</h2>
                        <p style={{ fontSize: 11, color: "var(--text3)" }}>+{meta.xp} XP · {meta.difficulty}</p>
                      </div>
                    </div>
                    {gameAlreadyAwardedMsg && (
                      <div style={{ background: "var(--accent)18", border: "0.5px solid var(--accent)55", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--accent)" }}>
                        You&apos;ve already earned XP for this game. Play again for practice!
                      </div>
                    )}
                    {activeGame === "sharpe-game"    && <SharpGame onXP={n => handleGameXP("sharpe-game", n)} />}
                    {activeGame === "crash-sim"      && <CrashSimulator onXP={n => handleGameXP("crash-sim", n)} />}
                    {activeGame === "options-game"   && <OptionsGame onXP={n => handleGameXP("options-game", n)} />}
                    {activeGame === "inflation-game" && <InflationGame onXP={n => handleGameXP("inflation-game", n)} />}
                    {activeGame === "fed-game"       && <FedGame onXP={n => handleGameXP("fed-game", n)} />}
                    {activeGame === "builder-game"   && <BuilderChallenge onXP={n => handleGameXP("builder-game", n)} />}
                    {activeGame === "valuation-game" && <ValuationShowdown onXP={n => handleGameXP("valuation-game", n)} />}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* ── Lesson ── */}
          {activeSection === "lesson" && activeLesson && (
            <motion.div key="lesson" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 18, padding: "26px" }}>
                <LessonView
                  lesson={activeLesson}
                  onBack={() => setActiveSection("home")}
                  onXP={(amount, updatedProg) => handleLessonXP(amount, activeLesson.id, updatedProg)}
                  progress={lessonProgress[activeLesson.id] ?? []}
                  onAIPractice={() => { setActivePracticeLesson(activeLesson); setActiveSection("ai-practice"); }}
                />
              </div>
            </motion.div>
          )}

          {/* ── AI Practice ── */}
          {activeSection === "ai-practice" && activePracticeLesson && (
            <motion.div key="ai-practice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <motion.button initial={false} whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveSection("home")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", marginBottom: 22, padding: 0 }}><ChevronLeft size={14} /> Back to Learn</motion.button>
              <div style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 18, padding: "26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                  <div style={{ width: 42, height: 42, border: `0.5px solid ${AMBER}55`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${AMBER}12`, flexShrink: 0 }}>
                    <BrainCircuit size={20} color={AMBER} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: "var(--text)" }}>AI Practice</h2>
                    <p style={{ fontSize: 11, color: "var(--text3)" }}>{activePracticeLesson.title} · {getAIDifficulty(xp)} difficulty · 5 questions</p>
                  </div>
                </div>
                <AIPracticeSession lesson={activePracticeLesson} xp={xp} onBack={() => setActiveSection("home")} />
              </div>
            </motion.div>
          )}

          {/* ── Challenge ── */}
          {activeSection === "challenge" && (
            <motion.div key="challenge" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <motion.button initial={false} whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveSection("home")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", marginBottom: 22, padding: 0 }}><ChevronLeft size={14} /> Back to Learn</motion.button>
              <div style={{ background: "var(--card-bg)", border: `0.5px solid ${AMBER}55`, borderRadius: 18, padding: "26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                  <div style={{ width: 42, height: 42, border: `0.5px solid ${AMBER}55`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${AMBER}12`, flexShrink: 0 }}>
                    <Swords size={20} color={AMBER} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: "var(--text)" }}>Challenge Mode</h2>
                    <p style={{ fontSize: 11, color: "var(--text3)" }}>10 questions · 60s timer · speed bonus · leaderboard score</p>
                  </div>
                </div>
                <ChallengeMode
                  masteredLessons={masteredLessons}
                  xp={xp}
                  userId={userId}
                  displayName={displayName}
                  onBack={() => setActiveSection("home")}
                  onPointsAwarded={(pts) => {
                    setLearnPoints(p => p + pts);
                    if (pts > 0) setXpToast(pts);
                  }}
                />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* XP Toast */}
      <AnimatePresence>
        {xpToast !== null && <XPToast amount={xpToast} onDone={() => setXpToast(null)} />}
      </AnimatePresence>

      {/* Level-Up Modal */}
      <AnimatePresence>
        {levelUpInfo && (
          <LevelUpModal
            levelName={levelUpInfo.name}
            color={levelUpInfo.color}
            onDone={() => setLevelUpInfo(null)}
          />
        )}
      </AnimatePresence>
      <FeedbackButton rightOffset={80} />
    </div>
  );
}

// ── Lesson View ───────────────────────────────────────────────────────────────
function LessonView({ lesson, onBack, onXP, progress, onAIPractice }: {
  lesson: Lesson;
  onBack: () => void;
  onXP: (amount: number, updatedProgress: number[]) => void;
  progress: number[];
  onAIPractice?: () => void;
}) {
  const isMastered = progress.length >= lesson.quiz.length;
  const [mode, setMode] = useState<"read" | "quiz">("read");
  const [qi, setQi] = useState(-1);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [quizResults, setQuizResults] = useState<(boolean | null)[]>(() => new Array(lesson.quiz.length).fill(null));
  const [quizDone, setQuizDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [updatedProgressForDone, setUpdatedProgressForDone] = useState<number[]>([]);
  const [wrongShake, setWrongShake] = useState<number | null>(null);

  const enterQuiz = () => {
    setMode("quiz"); setQi(-1); setSelected(null); setAnswered(false);
    setQuizResults(new Array(lesson.quiz.length).fill(null));
    setQuizDone(false); setXpEarned(0);
  };

  const q = qi >= 0 ? lesson.quiz[qi] : null;

  const answer = (idx: number) => {
    if (answered || selected !== null) return;
    const correct = idx === q!.correct;
    setSelected(idx); setAnswered(true);
    setQuizResults(prev => { const n = [...prev]; n[qi] = correct; return n; });
    if (!correct) {
      setWrongShake(idx);
      setTimeout(() => setWrongShake(null), 550);
    }
  };

  const nextQ = () => {
    if (qi === -1) { setQi(0); return; }
    const isLast = qi >= lesson.quiz.length - 1;
    if (isLast) {
      const finalResults = quizResults.map((r, i) => i === qi ? (selected === q!.correct) : r);
      const correctIndices = finalResults.reduce<number[]>((acc, r, i) => r === true ? [...acc, i] : acc, []);
      const newlyCorrect = correctIndices.filter(i => !progress.includes(i));
      const combined = [...new Set([...progress, ...correctIndices])];
      const xp = newlyCorrect.length > 0
        ? Math.max(1, Math.round(newlyCorrect.length / lesson.quiz.length * lesson.xpReward))
        : 0;
      setXpEarned(xp);
      setUpdatedProgressForDone(combined);
      setQuizDone(true);
      onXP(xp, combined);
    } else {
      setQi(i => i + 1); setSelected(null); setAnswered(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <motion.button initial={false} whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }} onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", marginBottom: 22, padding: 0 }}>
        <ChevronLeft size={14} /> Back to lessons
      </motion.button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <div style={{ width: 42, height: 42, border: `0.5px solid ${AMBER}55`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${AMBER}12`, flexShrink: 0 }}>
          <LessonIconComponent iconKey={lesson.iconKey} size={20} color={AMBER} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: "var(--text)" }}>{lesson.title}</h2>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>{lesson.time} read · +{lesson.xpReward} XP on quiz completion</span>
        </div>
        {isMastered
          ? <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", borderRadius: 20, background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "0.5px solid rgba(167,139,250,0.3)" }}>Mastered</span>
          : progress.length > 0
            ? <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", borderRadius: 20, background: "rgba(76,175,125,0.12)", color: GREEN, border: "0.5px solid rgba(76,175,125,0.3)" }}>{progress.length}/{lesson.quiz.length} correct</span>
            : null
        }
      </div>

      <AnimatePresence mode="wait">
        {mode === "read" && (
          <motion.div key="read" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
              {lesson.content.map((block, i) => {
                if (block.type === "text") return <p key={i} style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.75 }}>{block.text}</p>;
                if (block.type === "formula") return (
                  <div key={i} style={{ background: `${AMBER}12`, border: `0.5px solid ${AMBER}44`, borderRadius: 10, padding: "12px 16px" }}>
                    <p style={{ fontFamily: "Space Mono, monospace", fontSize: 13, color: AMBER }}>{block.text}</p>
                  </div>
                );
                if (block.type === "list") return (
                  <ul key={i} style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 0, listStyle: "none" }}>
                    {(block.items || []).map((item, j) => (
                      <li key={j} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
                        <span style={{ color: AMBER, flexShrink: 0, marginTop: 2 }}>▸</span>{item}
                      </li>
                    ))}
                  </ul>
                );
                return null;
              })}
            </div>
            <button onClick={enterQuiz}
              style={{ width: "100%", padding: "12px", background: AMBER, border: "none", borderRadius: 10, color: "#0a0e14", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5 }}>
              Take Quiz · +{lesson.xpReward} XP
            </button>
            {isMastered && onAIPractice && (
              <button onClick={onAIPractice}
                style={{ marginTop: 8, width: "100%", padding: "11px", background: `${AMBER}12`, border: `0.5px solid ${AMBER}44`, borderRadius: 10, color: AMBER, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <BrainCircuit size={14} strokeWidth={1.5} /> AI Generate Questions
              </button>
            )}
          </motion.div>
        )}

        {mode === "quiz" && !quizDone && qi === -1 && (
          <motion.div key="example" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 10, letterSpacing: 2, color: AMBER, textTransform: "uppercase" }}>Worked Example</span>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>{lesson.quiz.length} questions ahead</span>
            </div>
            <div style={{ background: `${AMBER}0a`, border: `0.5px solid ${AMBER}33`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
              <p style={{ fontSize: 9, letterSpacing: 2, color: AMBER, textTransform: "uppercase", marginBottom: 8 }}>Problem</p>
              <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, marginBottom: 16 }}>{lesson.example.problem}</p>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8 }}>Step-by-step</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {lesson.example.steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: `${AMBER}22`, color: AMBER, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontFamily: "Space Mono, monospace" }}>{i + 1}</span>
                    <p style={{ fontFamily: "Space Mono, monospace", fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{step}</p>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 12 }}>
                <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 5 }}>Answer</p>
                <p style={{ fontSize: 13, color: AMBER, fontWeight: 500 }}>{lesson.example.answer}</p>
              </div>
            </div>
            <button onClick={nextQ}
              style={{ width: "100%", padding: "11px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Got it
            </button>
          </motion.div>
        )}

        {mode === "quiz" && !quizDone && qi >= 0 && q && (
          <motion.div key={`q${qi}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 10, letterSpacing: 2, color: AMBER, textTransform: "uppercase" }}>Question {qi + 1} of {lesson.quiz.length}</span>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>{quizResults.filter(r => r === true).length} correct</span>
            </div>
            <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", lineHeight: 1.5, marginBottom: 18 }}>{q.q}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {q.options.map((opt, oi) => {
                const isSelected = selected === oi;
                const isCorrect = oi === q.correct;
                let bg = "var(--bg2)"; let border = "var(--border)"; let color = "var(--text2)";
                if (answered) {
                  if (isCorrect) { bg = "rgba(76,175,125,0.1)"; border = "rgba(76,175,125,0.4)"; color = GREEN; }
                  else if (isSelected && !isCorrect) { bg = "rgba(224,92,92,0.08)"; border = "rgba(224,92,92,0.4)"; color = RED; }
                }
                return (
                  <button key={oi} onClick={() => answer(oi)}
                    className={wrongShake === oi ? "anim-shake" : ""}
                    style={{ padding: "12px 16px", background: bg, border: `0.5px solid ${border}`, borderRadius: 10, color, fontSize: 13, textAlign: "left", cursor: answered ? "default" : "pointer", pointerEvents: answered ? "none" : "auto", transition: "background 0.2s, border-color 0.2s, color 0.2s", fontWeight: isSelected || (answered && isCorrect) ? 500 : 400 }}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onClick={nextQ}
                style={{ width: "100%", padding: "11px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {qi >= lesson.quiz.length - 1 ? "Finish" : "Next"}
              </motion.button>
            )}
          </motion.div>
        )}

        {mode === "quiz" && quizDone && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              {updatedProgressForDone.length >= lesson.quiz.length ? (
                <motion.div
                  initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.05 }}
                  style={{ filter: "drop-shadow(0 0 8px rgba(76,175,125,0.5))" }}
                >
                  <CheckCircle2 size={52} color={GREEN} />
                </motion.div>
              ) : (
                <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
                  <BookOpen size={52} color="var(--text3)" />
                </motion.div>
              )}
            </div>
            {updatedProgressForDone.length >= lesson.quiz.length ? (
              <>
                <p style={{ fontSize: 20, fontWeight: 600, color: "#a78bfa", marginBottom: 6 }}>Lesson Mastered</p>
                <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>All questions answered correctly. No more XP available from this lesson.</p>
                {onAIPractice && (
                  <button onClick={onAIPractice}
                    style={{ marginBottom: 12, padding: "10px 22px", background: `${AMBER}12`, border: `0.5px solid ${AMBER}44`, borderRadius: 9, color: AMBER, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <BrainCircuit size={14} strokeWidth={1.5} /> AI Generate Questions
                  </button>
                )}
              </>
            ) : (
              <>
                <p style={{ fontSize: 22, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>
                  {updatedProgressForDone.length} / {lesson.quiz.length} mastered
                </p>
                {xpEarned > 0
                  ? <p style={{ fontSize: 13, color: GREEN, marginBottom: 20 }}>+{xpEarned} XP for {updatedProgressForDone.filter(i => !progress.includes(i)).length} newly correct answer{updatedProgressForDone.filter(i => !progress.includes(i)).length !== 1 ? "s" : ""}!</p>
                  : <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>No new questions answered correctly. No XP awarded.</p>
                }
              </>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {updatedProgressForDone.length < lesson.quiz.length && (
                <button onClick={enterQuiz}
                  style={{ padding: "10px 20px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 9, color: "var(--text2)", fontSize: 13, cursor: "pointer" }}>
                  Retry wrong ones
                </button>
              )}
              <button onClick={onBack}
                style={{ padding: "10px 20px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Back to Learn
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
