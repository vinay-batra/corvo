"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

// ── Constants ────────────────────────────────────────────────────────────────
const AMBER = "#c9a84c";
const GREEN = "#4caf7d";
const RED   = "#e05c5c";

const LEVELS = [
  { min: 0,    max: 99,   name: "Beginner",  color: "#9b9b98" },
  { min: 100,  max: 299,  name: "Investor",  color: "#4a9eff" },
  { min: 300,  max: 599,  name: "Analyst",   color: AMBER },
  { min: 600,  max: 999,  name: "Expert",    color: "#a78bfa" },
  { min: 1000, max: Infinity, name: "Master", color: "#f97316" },
];

function getLevel(xp: number) { return LEVELS.findLast(l => xp >= l.min) ?? LEVELS[0]; }
function getNextLevel(xp: number) { return LEVELS.find(l => l.min > xp) ?? null; }
function getProgressPct(xp: number) {
  const cur = getLevel(xp); const nxt = getNextLevel(xp);
  if (!nxt) return 100;
  return Math.min(100, ((xp - cur.min) / (nxt.min - cur.min)) * 100);
}

// ── SVG Icons ────────────────────────────────────────────────────────────────
function FlameIcon({ size = 16, active = true }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 20 24" fill="none">
      <path d="M10 2C10 2 15 8 15 13C15 16.31 12.76 18 10 18C7.24 18 5 16.31 5 13C5 10 6.5 7.5 6.5 7.5C6.5 7.5 7 10 9 10C9 10 7.5 6 10 2Z"
        fill={active ? "#f97316" : "var(--text3)"} />
      <path d="M10 13C10 13 11.8 12 11.8 13.8C11.8 14.9 11 15.5 10 15.5C9 15.5 8.2 14.9 8.2 13.8C8.2 12.8 10 13 10 13Z"
        fill={active ? "#fbbf24" : "var(--text3)"} />
    </svg>
  );
}
function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function StarIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={AMBER} stroke="none">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  );
}
function CheckCircleIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}
function BookOpenIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
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
        boxShadow: "0 8px 32px rgba(201,168,76,0.45)", zIndex: 2000,
        display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}>
      <StarIcon size={14} /> +{amount} XP
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

function LearnHeader({ xp, streak, displayName, avatarUrl }: { xp: number; streak: number; displayName: string; avatarUrl: string | null }) {
  const lvl = getLevel(xp); const nxt = getNextLevel(xp); const pct = getProgressPct(xp);
  return (
    <div style={{ background: "var(--bg2)", borderBottom: "0.5px solid var(--border)" }}>
      {/* Nav */}
      <nav style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", borderBottom: "0.5px solid var(--border)" }}>
        <Link href="/app" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/corvo-logo.svg" width={24} height={20} alt="Corvo" />
          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 700, letterSpacing: 4, color: "var(--text)" }}>CORVO</span>
        </Link>
        <span style={{ fontSize: 9, letterSpacing: 2.5, color: AMBER, textTransform: "uppercase" }}>Learn & Practice</span>
        <Link href="/app" style={{ fontSize: 12, color: "var(--text3)", textDecoration: "none" }}>← Analyzer</Link>
      </nav>

      {/* XP / streak bar */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "14px 28px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {/* Avatar */}
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "0.5px solid var(--border2)", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${AMBER}22`, border: `0.5px solid ${AMBER}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: AMBER, flexShrink: 0 }}>
            {(displayName || "?")[0]?.toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <LevelBadge xp={xp} />
            <span style={{ fontSize: 11, color: "var(--text2)" }}>
              {xp} XP{nxt ? <span style={{ color: "var(--text3)" }}> · {nxt.min - xp} to {nxt.name}</span> : " · Max level!"}
            </span>
          </div>
          <div style={{ height: 5, background: "var(--track)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ height: "100%", background: lvl.color, borderRadius: 3 }} />
          </div>
        </div>

        {/* Streak */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, background: streak > 0 ? "rgba(249,115,22,0.1)" : "var(--bg3)", border: `0.5px solid ${streak > 0 ? "rgba(249,115,22,0.3)" : "var(--border)"}`, flexShrink: 0 }}>
          <FlameIcon size={14} active={streak > 0} />
          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: streak > 0 ? "#f97316" : "var(--text3)" }}>{streak}</span>
          <span style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 0.5 }}>day{streak !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}

// ── Game 1: Guess the Sharpe Ratio ───────────────────────────────────────────
const SHARPE_ROUNDS = [
  { portfolio: "AAPL 50% + MSFT 50%", ret: 18.2, vol: 22.1, answer: 0.64, hint: "Two big tech stocks — correlated, decent return." },
  { portfolio: "SPY 100%",             ret: 10.8, vol: 15.3, answer: 0.44, hint: "The S&P 500 index — diversified, moderate volatility." },
  { portfolio: "BTC 50% + ETH 50%",   ret: 42.1, vol: 68.4, answer: 0.56, hint: "Crypto — high returns, extremely volatile." },
  { portfolio: "GLD 50% + TLT 50%",   ret: 5.2,  vol: 12.8, answer: 0.09, hint: "Gold + bonds — defensive, low return." },
  { portfolio: "TSLA 40% + NVDA 60%", ret: 31.4, vol: 54.2, answer: 0.51, hint: "High-growth tech — big swings both ways." },
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
    if (round >= SHARPE_ROUNDS.length - 1) {
      setDone(true);
      return;
    }
    setRound(r => r + 1); setGuess(""); setSubmitted(false);
  };

  const finalScore = history.length === SHARPE_ROUNDS.length
    ? history.filter(h => h.correct).length
    : score;

  useEffect(() => {
    if (done && !xpAwarded && finalScore >= 3) {
      onXP(20); setXpAwarded(true);
    }
  }, [done]);

  const reset = () => { setRound(0); setGuess(""); setSubmitted(false); setScore(0); setDone(false); setHistory([]); setXpAwarded(false); };

  if (done) return (
    <div style={{ textAlign: "center", padding: "28px 0" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{finalScore >= 4 ? "🎯" : finalScore >= 2 ? "📈" : "📚"}</div>
      <p style={{ fontSize: 22, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>{finalScore} / {SHARPE_ROUNDS.length}</p>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 22, lineHeight: 1.6 }}>
        {finalScore >= 4 ? "Excellent! Great intuition for risk-adjusted returns." : finalScore >= 2 ? "Good effort! Keep practicing." : "Sharpe intuition takes time — keep at it."}
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
            <p style={{ fontSize: 14, fontWeight: 500, color: isClose ? GREEN : RED, marginBottom: 5 }}>{isClose ? "✓ Correct!" : "✗ Not quite"}</p>
            <p style={{ fontSize: 12, color: "var(--text3)" }}>
              Answer: <span style={{ fontFamily: "Space Mono, monospace", color: AMBER }}>{current.answer.toFixed(2)}</span>
              {" · "}({current.ret} − 4) ÷ {current.vol} = {current.answer.toFixed(2)}
            </p>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>{current.hint}</p>
          </div>
          <button onClick={next} style={{ width: "100%", padding: "11px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {round >= SHARPE_ROUNDS.length - 1 ? "See Results →" : "Next Round →"}
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

  return (
    <div>
      <div style={{ background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
        <p style={{ fontSize: 9, letterSpacing: 2, color: AMBER, textTransform: "uppercase", marginBottom: 5 }}>Challenge</p>
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>{current.goal}</p>
        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>{current.desc}</p>
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>Select 3 assets ({selected.length}/3):</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {current.assets.map(a => (
          <button key={a} onClick={() => toggle(a)}
            style={{ padding: "7px 14px", fontSize: 12, fontFamily: "Space Mono, monospace", fontWeight: 700, borderRadius: 8, cursor: selected.length >= 3 && !selected.includes(a) ? "not-allowed" : "pointer", opacity: selected.length >= 3 && !selected.includes(a) ? 0.4 : 1, background: selected.includes(a) ? `${AMBER}18` : "var(--bg2)", border: `0.5px solid ${selected.includes(a) ? `${AMBER}88` : "var(--border)"}`, color: selected.includes(a) ? AMBER : "var(--text2)", transition: "all 0.15s" }}>
            {a}
          </button>
        ))}
      </div>
      {!submitted ? (
        <button onClick={handleSubmit} disabled={selected.length < 3}
          style={{ width: "100%", padding: "11px", background: selected.length >= 3 ? AMBER : "transparent", border: `0.5px solid var(--border)`, borderRadius: 9, color: selected.length >= 3 ? "#0a0e14" : "var(--text3)", fontSize: 13, fontWeight: 600, cursor: selected.length >= 3 ? "pointer" : "not-allowed" }}>
          Check Answer
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ background: score >= 2 ? "rgba(76,175,125,0.08)" : "rgba(224,92,92,0.08)", border: `0.5px solid ${score >= 2 ? "rgba(76,175,125,0.35)" : "rgba(224,92,92,0.35)"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: score >= 2 ? GREEN : RED, marginBottom: 5 }}>
              {score === 3 ? "Perfect!" : score === 2 ? "Close!" : "Not quite"} — {score}/3 correct
            </p>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 5 }}>Best answer: <span style={{ color: AMBER }}>{current.correct.join(", ")}</span></p>
            <p style={{ fontSize: 11, color: "var(--text3)" }}>{current.hint}</p>
          </div>
          {score >= 2 && !xpAwarded ? null : score >= 2 && <p style={{ fontSize: 11, color: AMBER, marginBottom: 10 }}>+20 XP earned!</p>}
          {challenge < CHALLENGES.length - 1 ? (
            <button onClick={() => { setChallenge(c => c + 1); setSelected([]); setSubmitted(false); setXpAwarded(false); }}
              style={{ width: "100%", padding: "11px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Next Challenge →</button>
          ) : (
            <button onClick={() => { setChallenge(0); setSelected([]); setSubmitted(false); setXpAwarded(false); }}
              style={{ width: "100%", padding: "11px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 9, color: "var(--text2)", fontSize: 13, cursor: "pointer" }}>Start Over</button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── Lessons & Quizzes ─────────────────────────────────────────────────────────
const LESSONS = [
  {
    id: "sharpe", title: "What is Sharpe Ratio?", icon: "◎", time: "3 min",
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
      answer: "Sharpe = 0.40 — acceptable, but there's room to improve.",
    },
    quiz: [
      { q: "What does a Sharpe ratio of exactly 0 mean?", options: ["Great risk-adjusted return", "No return above the risk-free rate", "Maximum possible volatility", "Perfect diversification"], correct: 1 },
      { q: "Portfolio returns 15%, volatility 20%, risk-free rate 4%. What's the Sharpe?", options: ["0.55", "0.75", "0.35", "1.10"], correct: 0 },
      { q: "Which Sharpe ratio indicates the best performance?", options: ["0.3", "0.8", "1.5", "-0.2"], correct: 2 },
    ],
  },
  {
    id: "drawdown", title: "Max Drawdown Explained", icon: "◬", time: "3 min",
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
    id: "diversification", title: "Diversification vs Correlation", icon: "◈", time: "4 min",
    xpReward: 50,
    content: [
      { type: "text", text: "Holding many stocks doesn't automatically mean you're diversified. True diversification requires assets that don't move together — measured by correlation." },
      { type: "formula", text: "Correlation ranges from −1 (perfect inverse) to +1 (perfect positive)" },
      { type: "list", items: ["AAPL vs MSFT: ~0.85 (highly correlated)", "SPY vs GLD: ~0.05 (near zero — good diversifier)", "SPY vs TLT: ~−0.30 (negative — bonds often rise when stocks fall)", "BTC vs stocks: ~0.40 (mild, increasing over time)"] },
      { type: "text", text: "The ideal portfolio combines assets with low or negative correlations — the free lunch of investing." },
    ],
    example: {
      problem: "You hold AAPL and want to add a second asset. Which one diversifies your portfolio better?",
      steps: [
        "AAPL vs MSFT correlation: +0.85 — both drop heavily in tech selloffs",
        "AAPL vs GLD correlation:  +0.03 — gold is nearly uncorrelated with tech",
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
    id: "montecarlo", title: "Monte Carlo Simulation", icon: "◷", time: "3 min",
    xpReward: 50,
    content: [
      { type: "text", text: "Monte Carlo simulation runs thousands of possible future scenarios using historical return data. Corvo runs 300 paths." },
      { type: "list", items: ["Uses historical mean return and volatility", "Randomly samples returns based on a statistical distribution", "Runs each scenario forward over time", "The spread of outcomes shows your uncertainty range"] },
      { type: "text", text: "The wider the cone, the more uncertain your future. A volatile portfolio has a huge range — you might be up 300% or down 60%." },
      { type: "text", text: "Use the 10th percentile (bottom of the cone) as a stress-test: can you afford that outcome?" },
    ],
    example: {
      problem: "Two portfolios: A has 15% mean return, 40% volatility. B has 8% mean return, 12% volatility. Which has the wider Monte Carlo cone?",
      steps: [
        "Monte Carlo samples random returns using each portfolio's mean and volatility",
        "Portfolio A: high volatility (40%) → a wide spread of outcomes over time",
        "Portfolio B: low volatility (12%) → a narrow, more predictable cone",
      ],
      answer: "Portfolio A has the wider cone — higher volatility means more uncertainty about future value.",
    },
    quiz: [
      { q: "What does a wider cone in a Monte Carlo simulation indicate?", options: ["Lower returns", "More uncertainty about future outcomes", "Better expected performance", "Lower risk"], correct: 1 },
      { q: "What inputs does Monte Carlo use to generate scenarios?", options: ["Expert predictions", "Historical mean return and volatility", "Future earnings forecasts", "Economic indicators"], correct: 1 },
      { q: "Which percentile should you use as a portfolio stress-test?", options: ["90th", "50th", "10th", "75th"], correct: 2 },
    ],
  },
];

type Lesson = typeof LESSONS[0];

// progress = array of question indices previously answered correctly (from DB)
function LessonView({ lesson, onBack, onXP, progress }: {
  lesson: Lesson;
  onBack: () => void;
  onXP: (amount: number, updatedProgress: number[]) => void;
  progress: number[];
}) {
  const isMastered = progress.length >= lesson.quiz.length;
  const [mode, setMode] = useState<"read" | "quiz">("read");
  // qi = -1 means "show worked example" (non-skippable), qi >= 0 = question index
  const [qi, setQi] = useState(-1);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  // Track per-question correctness for this run
  const [quizResults, setQuizResults] = useState<(boolean | null)[]>(() =>
    new Array(lesson.quiz.length).fill(null)
  );
  const [quizDone, setQuizDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [updatedProgressForDone, setUpdatedProgressForDone] = useState<number[]>([]);

  const enterQuiz = () => {
    setMode("quiz"); setQi(-1); setSelected(null); setAnswered(false);
    setQuizResults(new Array(lesson.quiz.length).fill(null));
    setQuizDone(false); setXpEarned(0);
  };

  const q = qi >= 0 ? lesson.quiz[qi] : null;

  const answer = (idx: number) => {
    if (answered || selected !== null) return; // hard lock once selected
    const correct = idx === q!.correct;
    setSelected(idx);
    setAnswered(true);
    setQuizResults(prev => { const n = [...prev]; n[qi] = correct; return n; });
  };

  const nextQ = () => {
    if (qi === -1) { setQi(0); return; } // advance past example

    const isLast = qi >= lesson.quiz.length - 1;
    if (isLast) {
      // Build final results including current question
      const finalResults = quizResults.map((r, i) => i === qi ? (selected === q!.correct) : r);
      const correctIndices = finalResults.reduce<number[]>((acc, r, i) => r === true ? [...acc, i] : acc, []);
      const newlyCorrect = correctIndices.filter(i => !progress.includes(i));
      const combined = [...new Set([...progress, ...correctIndices])];
      // Partial XP: proportional to newly answered correctly
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
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", marginBottom: 22, padding: 0 }}>
        ← Back to lessons
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <div style={{ width: 42, height: 42, border: `0.5px solid ${AMBER}55`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: AMBER, background: `${AMBER}12`, flexShrink: 0 }}>
          {lesson.icon}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: "var(--text)" }}>{lesson.title}</h2>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>{lesson.time} read · +{lesson.xpReward} XP on quiz completion</span>
        </div>
        {isMastered
          ? <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", borderRadius: 20, background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "0.5px solid rgba(167,139,250,0.3)" }}>★ Mastered</span>
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
              Take Quiz → +{lesson.xpReward} XP
            </button>
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
              Got it →
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
                    style={{ padding: "12px 16px", background: bg, border: `0.5px solid ${border}`, borderRadius: 10, color, fontSize: 13, textAlign: "left", cursor: answered ? "default" : "pointer", pointerEvents: answered ? "none" : "auto", transition: "all 0.15s", fontWeight: isSelected || (answered && isCorrect) ? 500 : 400 }}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onClick={nextQ}
                style={{ width: "100%", padding: "11px", background: AMBER, border: "none", borderRadius: 9, color: "#0a0e14", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {qi >= lesson.quiz.length - 1 ? "Finish →" : "Next →"}
              </motion.button>
            )}
          </motion.div>
        )}

        {mode === "quiz" && quizDone && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              {updatedProgressForDone.length >= lesson.quiz.length ? <CheckCircleIcon size={52} /> : <BookOpenIcon size={52} />}
            </div>
            {updatedProgressForDone.length >= lesson.quiz.length ? (
              <>
                <p style={{ fontSize: 20, fontWeight: 600, color: "#a78bfa", marginBottom: 6 }}>★ Lesson Mastered</p>
                <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>All questions answered correctly. No more XP available from this lesson.</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 22, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>
                  {updatedProgressForDone.length} / {lesson.quiz.length} mastered
                </p>
                {xpEarned > 0
                  ? <p style={{ fontSize: 13, color: GREEN, marginBottom: 20 }}>+{xpEarned} XP for {updatedProgressForDone.filter(i => !progress.includes(i)).length} newly correct answer{updatedProgressForDone.filter(i => !progress.includes(i)).length !== 1 ? "s" : ""}!</p>
                  : <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>No new questions answered correctly — no XP awarded.</p>
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

// ── Leaderboard ───────────────────────────────────────────────────────────────
interface LeaderEntry { display_name: string; total_points: number; rank: number; }

function Leaderboard({ myPoints }: { myPoints: number }) {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    (async () => {
      // Use a direct REST call with the anon key to bypass client-side auth state;
      // requires a public SELECT policy on learn_scores (see SQL output in comments).
      const { data, error } = await supabase
        .from("learn_scores")
        .select("display_name,total_points")
        .order("total_points", { ascending: false })
        .limit(10);
      if (error) console.error("Leaderboard error:", error.message, error.code);
      if (!error && data) setEntries(data.map((r: any, i: number) => ({ ...r, rank: i + 1 })));
      setLoading(false);
    })();
  }, []);

  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "22px 24px", marginTop: 40 }}>
      <p style={{ fontSize: 10, letterSpacing: 2.5, color: AMBER, textTransform: "uppercase", marginBottom: 6 }}>Global Leaderboard</p>
      <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, marginBottom: 18 }}>Top learners</h2>
      {loading ? (
        <p style={{ fontSize: 12, color: "var(--text3)" }}>Loading...</p>
      ) : entries.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text3)" }}>No scores yet — be the first!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {entries.map(e => {
            const isMe = user && (user?.user_metadata?.display_name === e.display_name || user?.email?.split("@")[0] === e.display_name);
            return (
              <div key={e.rank} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: isMe ? `${AMBER}12` : "var(--bg2)", border: `0.5px solid ${isMe ? `${AMBER}44` : "var(--border)"}`, borderRadius: 10 }}>
                <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, color: e.rank <= 3 ? AMBER : "var(--text3)", width: 20, flexShrink: 0 }}>
                  {e.rank <= 3 ? medals[e.rank - 1] : `#${e.rank}`}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: isMe ? AMBER : "var(--text2)" }}>{e.display_name}{isMe ? " (you)" : ""}</span>
                <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: AMBER }}>{e.total_points}</span>
                <span style={{ fontSize: 9, color: "var(--text3)" }}>pts</span>
              </div>
            );
          })}
        </div>
      )}
      {!user && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>Log in to earn XP and appear on the leaderboard</p>
          <Link href="/auth" style={{ padding: "8px 20px", background: AMBER, borderRadius: 9, color: "#0a0e14", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Log in →</Link>
        </div>
      )}
      {user && myPoints > 0 && (
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 14, textAlign: "center" }}>Your score: {myPoints} pts · {getLevel(myPoints).name}</p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const GAMES = [
  { id: "sharpe-game",   title: "Guess the Sharpe",     icon: "◎", desc: "Given return and volatility, calculate the Sharpe ratio.",            xp: 20, difficulty: "Medium" },
  { id: "builder-game",  title: "Portfolio Challenge",   icon: "◈", desc: "Pick assets to hit a specific goal — maximize Sharpe or diversify.", xp: 20, difficulty: "Easy"   },
];

const COMPLETED_KEY = "corvo_completed_lessons";

export default function LearnPage() {
  const [activeSection, setActiveSection] = useState<"home" | "game" | "lesson">("home");
  const [activeGame, setActiveGame]       = useState<string | null>(null);
  const [activeLesson, setActiveLesson]   = useState<Lesson | null>(null);

  const [xp, setXp]               = useState(0);
  const [streak, setStreak]       = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [lessonProgress, setLessonProgress] = useState<Record<string, number[]>>({});
  const [xpToast, setXpToast]     = useState<number | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [learnPoints, setLearnPoints] = useState(0);

  useEffect(() => {
    // Load completed lessons from localStorage
    try { setCompleted(JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]")); } catch {}

    // Load user XP/streak from Supabase
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, xp, streak, last_activity_date, lessons_completed, lesson_progress")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || user.email?.split("@")[0] || "");
        setAvatarUrl(profile.avatar_url || null);
        // Hydrate XP and streak from DB (authoritative)
        setXp(profile.xp ?? 0);
        setStreak(profile.streak ?? 0);
        // Completed lessons — DB wins over localStorage
        if (Array.isArray(profile.lessons_completed) && profile.lessons_completed.length > 0) {
          setCompleted(profile.lessons_completed);
          try { localStorage.setItem(COMPLETED_KEY, JSON.stringify(profile.lessons_completed)); } catch {}
        }
        // lesson_progress (per-question correct indices)
        if (profile.lesson_progress && typeof profile.lesson_progress === "object") {
          setLessonProgress(profile.lesson_progress as Record<string, number[]>);
        }
      }

      // Load learn_scores for leaderboard
      const { data: ls } = await supabase.from("learn_scores").select("total_points").eq("user_id", user.id).single();
      if (ls) setLearnPoints(ls.total_points ?? 0);
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
      setXp(prev => prev + amount);
      return;
    }

    const today     = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Always read fresh from DB to avoid stale closures
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
    setStreak(newStreak);
    setLearnPoints(newPts);

    await Promise.all([
      supabase.from("profiles").upsert({
        id: userId, xp: newXp, streak: newStreak,
        last_activity_date: today, updated_at: new Date().toISOString(),
      }),
      supabase.from("learn_scores").upsert(
        { user_id: userId, display_name: displayName || "", total_points: newPts, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      ),
    ]);
  }, [userId, displayName]);

  const handleLessonXP = async (amount: number, lessonId: string, updatedProgress: number[]) => {
    // Update local lesson_progress state
    const newProgress = { ...lessonProgress, [lessonId]: updatedProgress };
    setLessonProgress(newProgress);

    // If all questions now correct, mark lesson as completed
    const lesson = LESSONS.find(l => l.id === lessonId);
    if (lesson && updatedProgress.length >= lesson.quiz.length) {
      markComplete(lessonId);
    }

    // Persist to DB
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("lessons_completed, lesson_progress")
        .eq("id", userId)
        .single();

      const dbCompleted: string[] = profile?.lessons_completed || [];
      const dbProgress: Record<string, number[]> = (profile?.lesson_progress as Record<string, number[]>) || {};
      const allCorrect = lesson && updatedProgress.length >= lesson.quiz.length;

      await supabase.from("profiles").upsert({
        id: userId,
        lesson_progress: { ...dbProgress, [lessonId]: updatedProgress },
        ...(allCorrect && !dbCompleted.includes(lessonId)
          ? { lessons_completed: [...dbCompleted, lessonId] }
          : {}),
        updated_at: new Date().toISOString(),
      });
    }

    if (amount > 0) awardXP(amount);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <LearnHeader xp={xp} streak={streak} displayName={displayName} avatarUrl={avatarUrl} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px" }}>
        <AnimatePresence mode="wait">
          {/* ── Home ── */}
          {activeSection === "home" && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Games */}
              <p style={{ fontSize: 10, letterSpacing: 2.5, color: AMBER, textTransform: "uppercase", marginBottom: 10 }}>Interactive Games</p>
              <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, marginBottom: 18 }}>Learn by doing</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 40 }}>
                {GAMES.map(g => (
                  <button key={g.id} onClick={() => { setActiveGame(g.id); setActiveSection("game"); }}
                    style={{ padding: "16px 20px", background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 14, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${AMBER}55`; e.currentTarget.style.background = "var(--bg2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card-bg)"; }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18, color: AMBER }}>{g.icon}</span>
                        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>{g.title}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, padding: "3px 8px", background: `${AMBER}18`, color: AMBER, borderRadius: 6, fontWeight: 700 }}>+{g.xp} XP</span>
                        <span style={{ fontSize: 10, padding: "3px 8px", background: "var(--bg3)", color: "var(--text3)", borderRadius: 6 }}>{g.difficulty}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text3)", paddingLeft: 28 }}>{g.desc}</p>
                  </button>
                ))}
              </div>

              {/* Lessons */}
              <p style={{ fontSize: 10, letterSpacing: 2.5, color: AMBER, textTransform: "uppercase", marginBottom: 10 }}>Lessons</p>
              <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, marginBottom: 18 }}>Core concepts</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {LESSONS.map((l, idx) => {
                  const prog = lessonProgress[l.id] ?? [];
                  const isMastered = prog.length >= l.quiz.length;
                  const isStarted  = prog.length > 0 && !isMastered;
                  const isLocked   = idx > 0 && !completed.includes(LESSONS[idx - 1].id) && (lessonProgress[LESSONS[idx - 1].id]?.length ?? 0) < LESSONS[idx - 1].quiz.length;
                  const borderColor = isMastered ? "rgba(167,139,250,0.35)" : isStarted ? "rgba(76,175,125,0.3)" : "var(--border)";
                  return (
                    <button key={l.id}
                      onClick={() => { if (!isLocked) { setActiveLesson(l); setActiveSection("lesson"); } }}
                      disabled={isLocked}
                      style={{ padding: "18px", background: "var(--card-bg)", border: `0.5px solid ${borderColor}`, borderRadius: 14, cursor: isLocked ? "not-allowed" : "pointer", textAlign: "left", transition: "all 0.15s", opacity: isLocked ? 0.55 : 1 }}
                      onMouseEnter={e => { if (!isLocked) { e.currentTarget.style.borderColor = `${AMBER}44`; e.currentTarget.style.background = "var(--bg2)"; } }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.background = "var(--card-bg)"; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <span style={{ fontSize: 20, color: isLocked ? "var(--text3)" : AMBER }}>{l.icon}</span>
                        {isLocked
                          ? <LockIcon />
                          : isMastered
                            ? <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: "2px 7px", borderRadius: 20, background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>★ Mastered</span>
                            : isStarted
                              ? <span style={{ fontSize: 9, padding: "2px 7px", background: "rgba(76,175,125,0.1)", color: GREEN, borderRadius: 6 }}>{prog.length}/{l.quiz.length}</span>
                              : <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", background: `${AMBER}18`, color: AMBER, borderRadius: 6 }}>+{l.xpReward} XP</span>
                        }
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 3 }}>{l.title}</p>
                      <p style={{ fontSize: 11, color: "var(--text3)" }}>{l.time} read</p>
                      {isLocked && <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 5 }}>Complete "{LESSONS[idx - 1].title}" first</p>}
                    </button>
                  );
                })}
              </div>

              <Leaderboard myPoints={learnPoints} />
            </motion.div>
          )}

          {/* ── Game ── */}
          {activeSection === "game" && (
            <motion.div key="game" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setActiveSection("home")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", marginBottom: 22, padding: 0 }}>← Back</button>
              <div style={{ background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 18, padding: "26px" }}>
                {activeGame === "sharpe-game" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                      <span style={{ fontSize: 22, color: AMBER }}>◎</span>
                      <div>
                        <h2 style={{ fontSize: 18, fontWeight: 500, color: "var(--text)" }}>Guess the Sharpe Ratio</h2>
                        <p style={{ fontSize: 12, color: "var(--text3)" }}>5 rounds · ±0.15 margin · +20 XP for 3+ correct</p>
                      </div>
                    </div>
                    <SharpGame onXP={n => awardXP(n)} />
                  </>
                )}
                {activeGame === "builder-game" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                      <span style={{ fontSize: 22, color: AMBER }}>◈</span>
                      <div>
                        <h2 style={{ fontSize: 18, fontWeight: 500, color: "var(--text)" }}>Portfolio Challenge</h2>
                        <p style={{ fontSize: 12, color: "var(--text3)" }}>Pick the best assets for each goal · +20 XP</p>
                      </div>
                    </div>
                    <BuilderChallenge onXP={n => awardXP(n)} />
                  </>
                )}
              </div>
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
    </div>
  );
}
