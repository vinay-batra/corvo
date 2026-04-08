"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

const POINTS_KEY = "corvo_learn_points";
const LEVELS = [
  { pts: 0,   name: "Beginner" },
  { pts: 50,  name: "Analyst" },
  { pts: 100, name: "Portfolio Manager" },
  { pts: 150, name: "Fund Manager" },
  { pts: 200, name: "CIO" },
];
function getLevel(pts: number) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) { if (pts >= l.pts) lvl = l; }
  return lvl;
}
function getNextLevel(pts: number) {
  return LEVELS.find(l => l.pts > pts) || null;
}

const C = {
  amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", amber3: "rgba(201,168,76,0.06)",
  border: "rgba(255,255,255,0.07)", cream: "#e8e0cc",
  cream2: "rgba(232,224,204,0.5)", cream3: "rgba(232,224,204,0.25)",
  navy: "#0a0e14", navy3: "#111620", navy4: "#161c26",
  red: "#e05c5c", green: "#4caf7d",
};

// ── GAME 1: Guess the Sharpe Ratio ───────────────────────────────────────────
const SHARPE_ROUNDS = [
  { portfolio: "AAPL 50% + MSFT 50%", ret: 18.2, vol: 22.1, answer: 0.64, hint: "Two big tech stocks — correlated, decent return." },
  { portfolio: "SPY 100%", ret: 10.8, vol: 15.3, answer: 0.44, hint: "The S&P 500 index — diversified, moderate volatility." },
  { portfolio: "BTC 50% + ETH 50%", ret: 42.1, vol: 68.4, answer: 0.56, hint: "Crypto portfolio — high returns, extremely volatile." },
  { portfolio: "GLD 50% + TLT 50%", ret: 5.2, vol: 12.8, answer: 0.09, hint: "Gold + bonds — defensive, low correlation, low return." },
  { portfolio: "TSLA 40% + NVDA 60%", ret: 31.4, vol: 54.2, answer: 0.51, hint: "High-growth tech — big swings in both directions." },
];

function SharpGame({ onPoints }: { onPoints: (n: number) => void }) {
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<{ correct: boolean; guess: number; answer: number }[]>([]);

  const current = SHARPE_ROUNDS[round];
  const numGuess = parseFloat(guess);
  const isClose = Math.abs(numGuess - current.answer) <= 0.15;

  const submit = () => {
    if (!guess || isNaN(numGuess)) return;
    const correct = isClose;
    if (correct) { setScore(s => s + 1); onPoints(10); }
    setHistory(h => [...h, { correct, guess: numGuess, answer: current.answer }]);
    setSubmitted(true);
  };

  const next = () => {
    if (round >= SHARPE_ROUNDS.length - 1) { setDone(true); return; }
    setRound(r => r + 1);
    setGuess("");
    setSubmitted(false);
  };

  const reset = () => { setRound(0); setGuess(""); setSubmitted(false); setScore(0); setDone(false); setHistory([]); };

  if (done) return (
    <div style={{ textAlign: "center", padding: "32px 0" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{score >= 4 ? "🎯" : score >= 2 ? "📈" : "📚"}</div>
      <p style={{ fontSize: 24, fontWeight: 500, color: C.cream, marginBottom: 8 }}>{score} / {SHARPE_ROUNDS.length} correct</p>
      <p style={{ fontSize: 14, color: C.cream3, marginBottom: 24 }}>
        {score >= 4 ? "Excellent! You have great intuition for risk-adjusted returns." : score >= 2 ? "Good effort! Keep practicing to sharpen your instincts." : "Keep learning — Sharpe ratio intuition takes time to build."}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {history.map((h, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: `1px solid ${h.correct ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"}` }}>
            <span style={{ fontSize: 12, color: C.cream3 }}>{SHARPE_ROUNDS[i].portfolio}</span>
            <span style={{ fontSize: 12, fontFamily: "Space Mono, monospace", color: h.correct ? C.green : C.red }}>
              Your guess: {h.guess.toFixed(2)} · Answer: {h.answer.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <button onClick={reset} style={{ padding: "11px 28px", background: C.amber, border: "none", borderRadius: 10, color: C.navy, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Play Again</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, color: C.amber, textTransform: "uppercase" }}>Round {round + 1} of {SHARPE_ROUNDS.length}</span>
        <span style={{ fontSize: 12, color: C.cream3 }}>Score: {score}</span>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
        <p style={{ fontSize: 11, letterSpacing: 1.5, color: C.cream3, textTransform: "uppercase", marginBottom: 8 }}>Portfolio</p>
        <p style={{ fontSize: 16, fontWeight: 500, color: C.cream, marginBottom: 16 }}>{current.portfolio}</p>
        <div style={{ display: "flex", gap: 24 }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: 2, color: C.cream3, textTransform: "uppercase", marginBottom: 4 }}>Annual Return</p>
            <p style={{ fontFamily: "Space Mono, monospace", fontSize: 20, color: C.amber }}>{current.ret}%</p>
          </div>
          <div>
            <p style={{ fontSize: 9, letterSpacing: 2, color: C.cream3, textTransform: "uppercase", marginBottom: 4 }}>Volatility</p>
            <p style={{ fontFamily: "Space Mono, monospace", fontSize: 20, color: C.cream }}>{current.vol}%</p>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: C.cream3, marginBottom: 12 }}>What's the Sharpe ratio? (±0.15 counts as correct)</p>

      {!submitted ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" step="0.01" value={guess} onChange={e => setGuess(e.target.value)}
            placeholder="e.g. 0.65" onKeyDown={e => e.key === "Enter" && submit()}
            style={{ flex: 1, padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 9, color: C.cream, fontSize: 14, fontFamily: "Space Mono, monospace", outline: "none" }} />
          <button onClick={submit} disabled={!guess || isNaN(numGuess)}
            style={{ padding: "11px 24px", background: C.amber, border: "none", borderRadius: 9, color: C.navy, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Submit
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ background: isClose ? "rgba(76,175,125,0.08)" : "rgba(224,92,92,0.08)", border: `1px solid ${isClose ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"}`, borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: isClose ? C.green : C.red, marginBottom: 6 }}>
              {isClose ? "✓ Correct!" : "✗ Not quite"}
            </p>
            <p style={{ fontSize: 13, color: C.cream3 }}>
              Answer: <span style={{ fontFamily: "Space Mono, monospace", color: C.amber }}>{current.answer.toFixed(2)}</span>
              {" · "}Formula: (Return − Risk-free rate) ÷ Volatility = ({current.ret} − 4) ÷ {current.vol} = {current.answer.toFixed(2)}
            </p>
            <p style={{ fontSize: 12, color: C.cream3, marginTop: 8 }}>{current.hint}</p>
          </div>
          <button onClick={next} style={{ width: "100%", padding: "11px", background: C.amber, border: "none", borderRadius: 9, color: C.navy, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {round >= SHARPE_ROUNDS.length - 1 ? "See Results →" : "Next Round →"}
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ── GAME 2: Portfolio Builder Challenge ──────────────────────────────────────
const CHALLENGES = [
  { goal: "Maximize diversification", target: "correlation", desc: "Build a portfolio where no two assets are highly correlated (avoid all tech stocks).", assets: ["AAPL", "GOOGL", "GLD", "TLT", "VNQ", "BTC", "OIL"], correct: ["GLD", "TLT", "VNQ"], hint: "Gold, bonds, and real estate tend to move independently of each other." },
  { goal: "Best Sharpe ratio", target: "sharpe", desc: "Pick 3 assets from the list to maximize your risk-adjusted return.", assets: ["SPY", "QQQ", "GLD", "TLT", "VIG", "SCHD", "BND"], correct: ["SPY", "VIG", "SCHD"], hint: "Dividend ETFs tend to have lower volatility, improving the Sharpe ratio." },
];

function BuilderChallenge({ onPoints }: { onPoints: (n: number) => void }) {
  const [challenge, setChallenge] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const current = CHALLENGES[challenge];

  const toggle = (asset: string) => {
    if (selected.includes(asset)) { setSelected(s => s.filter(a => a !== asset)); return; }
    if (selected.length >= 3) return;
    setSelected(s => [...s, asset]);
  };

  const score = selected.filter(s => current.correct.includes(s)).length;

  const handleSubmit = () => {
    if (score >= 2 && !awarded) { onPoints(15); setAwarded(true); }
    setSubmitted(true);
  };

  return (
    <div>
      <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
        <p style={{ fontSize: 9, letterSpacing: 2, color: C.amber, textTransform: "uppercase", marginBottom: 6 }}>Challenge</p>
        <p style={{ fontSize: 16, fontWeight: 500, color: C.cream, marginBottom: 8 }}>{current.goal}</p>
        <p style={{ fontSize: 13, color: C.cream3, lineHeight: 1.6 }}>{current.desc}</p>
      </div>

      <p style={{ fontSize: 12, color: C.cream3, marginBottom: 12 }}>Select 3 assets ({selected.length}/3 chosen):</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {current.assets.map(a => (
          <button key={a} onClick={() => toggle(a)}
            style={{ padding: "8px 16px", fontSize: 13, fontFamily: "Space Mono, monospace", fontWeight: 700, borderRadius: 8, cursor: selected.length >= 3 && !selected.includes(a) ? "not-allowed" : "pointer", opacity: selected.length >= 3 && !selected.includes(a) ? 0.4 : 1, background: selected.includes(a) ? C.amber2 : "rgba(255,255,255,0.03)", border: `1px solid ${selected.includes(a) ? "rgba(201,168,76,0.5)" : C.border}`, color: selected.includes(a) ? C.amber : C.cream2, transition: "all 0.15s" }}>
            {a}
          </button>
        ))}
      </div>

      {!submitted ? (
        <button onClick={handleSubmit} disabled={selected.length < 3}
          style={{ width: "100%", padding: "11px", background: selected.length >= 3 ? C.amber : "transparent", border: `1px solid ${C.border}`, borderRadius: 9, color: selected.length >= 3 ? C.navy : C.cream3, fontSize: 13, fontWeight: 600, cursor: selected.length >= 3 ? "pointer" : "not-allowed" }}>
          Check Answer
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ background: score >= 2 ? "rgba(76,175,125,0.08)" : "rgba(224,92,92,0.08)", border: `1px solid ${score >= 2 ? "rgba(76,175,125,0.3)" : "rgba(224,92,92,0.3)"}`, borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: score >= 2 ? C.green : C.red, marginBottom: 6 }}>
              {score === 3 ? "Perfect!" : score === 2 ? "Close!" : "Not quite"}  {score}/3 correct picks
            </p>
            <p style={{ fontSize: 13, color: C.cream3, marginBottom: 6 }}>Best answer: <span style={{ color: C.amber }}>{current.correct.join(", ")}</span></p>
            <p style={{ fontSize: 12, color: C.cream3 }}>{current.hint}</p>
          </div>
          {challenge < CHALLENGES.length - 1 ? (
            <button onClick={() => { setChallenge(c => c + 1); setSelected([]); setSubmitted(false); setAwarded(false); }}
              style={{ width: "100%", padding: "11px", background: C.amber, border: "none", borderRadius: 9, color: C.navy, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Next Challenge →
            </button>
          ) : (
            <button onClick={() => { setChallenge(0); setSelected([]); setSubmitted(false); setAwarded(false); }}
              style={{ width: "100%", padding: "11px", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 9, color: C.cream2, fontSize: 13, cursor: "pointer" }}>
              Start Over
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── LESSONS ──────────────────────────────────────────────────────────────────
const LESSONS = [
  {
    id: "sharpe", title: "What is Sharpe Ratio?", icon: "◎", time: "3 min",
    content: [
      { type: "text", text: "The Sharpe ratio measures how much return you're getting per unit of risk. It was invented by Nobel laureate William Sharpe in 1966." },
      { type: "formula", text: "Sharpe = (Portfolio Return − Risk-Free Rate) ÷ Volatility" },
      { type: "text", text: "A higher Sharpe ratio is better. Here's a rough guide:" },
      { type: "list", items: ["Below 0: You're not being compensated for the risk", "0–1: Acceptable, but room for improvement", "1–2: Good risk-adjusted return", "Above 2: Excellent (rare outside of specific strategies)"] },
      { type: "text", text: "The risk-free rate is typically the 3-month US Treasury yield (~4–5% currently). So a portfolio returning 12% with 20% volatility has a Sharpe of (12 − 4) ÷ 20 = 0.40." },
    ],
  },
  {
    id: "drawdown", title: "Max Drawdown Explained", icon: "◬", time: "3 min",
    content: [
      { type: "text", text: "Max drawdown measures the largest peak-to-trough decline in portfolio value before a new peak is reached. It tells you the worst-case loss scenario in a given period." },
      { type: "formula", text: "Max Drawdown = (Trough Value − Peak Value) ÷ Peak Value" },
      { type: "text", text: "Why it matters more than volatility:" },
      { type: "list", items: ["Volatility treats upswings and downswings equally", "Drawdown only captures losing periods", "A -50% drawdown requires a +100% return just to break even", "Many investors panic-sell at the trough, locking in losses"] },
      { type: "text", text: "A max drawdown under 20% is generally considered manageable for long-term investors. Crypto portfolios often see 60–80% drawdowns." },
    ],
  },
  {
    id: "diversification", title: "Diversification vs Correlation", icon: "◈", time: "4 min",
    content: [
      { type: "text", text: "Holding many stocks doesn't automatically mean you're diversified. True diversification requires assets that don't move together — measured by correlation." },
      { type: "formula", text: "Correlation ranges from −1 (perfect inverse) to +1 (perfect positive)" },
      { type: "list", items: ["AAPL vs MSFT: ~0.85 (highly correlated — both drop in tech selloffs)", "SPY vs GLD: ~0.05 (near zero — gold is a good diversifier)", "SPY vs TLT: ~−0.30 (negative — bonds often rise when stocks fall)", "BTC vs stocks: ~0.40 (mild correlation, increasing over time)"] },
      { type: "text", text: "The ideal portfolio combines assets with low or negative correlations. This reduces overall volatility without sacrificing expected return — the free lunch of investing." },
    ],
  },
  {
    id: "montecarlo", title: "Monte Carlo Simulation", icon: "◷", time: "3 min",
    content: [
      { type: "text", text: "Monte Carlo simulation runs thousands of possible future scenarios for your portfolio using historical return data. Corvo runs 300 paths." },
      { type: "text", text: "Here's how it works:" },
      { type: "list", items: ["Uses your portfolio's historical mean return and volatility", "Randomly samples returns based on a statistical distribution", "Runs each scenario forward over time (1, 5, 10+ years)", "The spread of outcomes shows your uncertainty range"] },
      { type: "text", text: "The key insight: the wider the cone, the more uncertain your future. A volatile portfolio has a huge range — you might be up 300% or down 60%. A stable portfolio has a tighter cone." },
      { type: "text", text: "Use the 10th percentile (bottom of the cone) as a stress-test: can you afford that outcome?" },
    ],
  },
];

function LessonView({ lesson, onBack }: { lesson: typeof LESSONS[0]; onBack: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.cream3, background: "none", border: "none", cursor: "pointer", marginBottom: 24, padding: 0 }}>
        ← Back to lessons
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: C.amber, background: C.amber2 }}>{lesson.icon}</div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: C.cream }}>{lesson.title}</h2>
          <span style={{ fontSize: 11, color: C.cream3 }}>{lesson.time} read</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {lesson.content.map((block, i) => {
          if (block.type === "text") return <p key={i} style={{ fontSize: 14, color: C.cream2, lineHeight: 1.75 }}>{block.text}</p>;
          if (block.type === "formula") return (
            <div key={i} style={{ background: C.amber2, border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 10, padding: "12px 16px" }}>
              <p style={{ fontFamily: "Space Mono, monospace", fontSize: 13, color: C.amber }}>{block.text}</p>
            </div>
          );
          if (block.type === "list") return (
            <ul key={i} style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 0, listStyle: "none" }}>
              {(block.items || []).map((item, j) => (
                <li key={j} style={{ display: "flex", gap: 10, fontSize: 13, color: C.cream2, lineHeight: 1.6 }}>
                  <span style={{ color: C.amber, flexShrink: 0, marginTop: 2 }}>▸</span>
                  {item}
                </li>
              ))}
            </ul>
          );
          return null;
        })}
      </div>
    </motion.div>
  );
}

// ── LEADERBOARD ──────────────────────────────────────────────────────────────
interface LeaderEntry { display_name: string; total_points: number; rank: number; }

function Leaderboard({ myPoints }: { myPoints: number }) {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("learn_scores")
        .select("display_name, total_points")
        .order("total_points", { ascending: false })
        .limit(10);
      if (!error && data) {
        setEntries(data.map((r: any, i: number) => ({ ...r, rank: i + 1 })));
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px", marginTop: 40 }}>
      <p style={{ fontSize: 10, letterSpacing: 2.5, color: C.amber, textTransform: "uppercase", marginBottom: 8 }}>Global Leaderboard</p>
      <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 20, fontWeight: 700, color: C.cream, letterSpacing: -0.5, marginBottom: 20 }}>Top learners</h2>

      {!user ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: 13, color: C.cream3, marginBottom: 12 }}>Log in to appear on the leaderboard</p>
          <Link href="/auth" style={{ padding: "9px 22px", background: C.amber, borderRadius: 9, color: C.navy, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
            Log in →
          </Link>
        </div>
      ) : loading ? (
        <p style={{ fontSize: 12, color: C.cream3 }}>Loading...</p>
      ) : entries.length === 0 ? (
        <p style={{ fontSize: 12, color: C.cream3 }}>No scores yet — be the first!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map((e) => {
            const isMe = user?.user_metadata?.display_name === e.display_name || (user?.email?.split("@")[0] === e.display_name);
            return (
              <div key={e.rank} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: isMe ? C.amber2 : "rgba(255,255,255,0.02)", border: `1px solid ${isMe ? "rgba(201,168,76,0.35)" : C.border}`, borderRadius: 10 }}>
                <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, color: e.rank <= 3 ? C.amber : C.cream3, width: 20, flexShrink: 0 }}>
                  {e.rank <= 3 ? ["🥇", "🥈", "🥉"][e.rank - 1] : `#${e.rank}`}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: isMe ? C.amber : C.cream2 }}>{e.display_name}{isMe ? " (you)" : ""}</span>
                <span style={{ fontFamily: "Space Mono, monospace", fontSize: 14, fontWeight: 700, color: C.amber }}>{e.total_points}</span>
                <span style={{ fontSize: 9, color: C.cream3 }}>pts</span>
              </div>
            );
          })}
        </div>
      )}
      {user && myPoints > 0 && (
        <p style={{ fontSize: 11, color: C.cream3, marginTop: 14, textAlign: "center" }}>Your score: {myPoints} pts · {getLevel(myPoints).name}</p>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const GAMES = [
  { id: "sharpe-game", title: "Guess the Sharpe", icon: "🎯", desc: "Given return and volatility, can you calculate the Sharpe ratio?", difficulty: "Medium" },
  { id: "builder-game", title: "Portfolio Challenge", icon: "🏗️", desc: "Pick assets to hit a specific goal — maximize Sharpe or minimize correlation.", difficulty: "Easy" },
];

export default function LearnPage() {
  const [activeSection, setActiveSection] = useState<"home" | "game" | "lesson">("home");
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<typeof LESSONS[0] | null>(null);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    try { setPoints(parseInt(localStorage.getItem(POINTS_KEY) || "0", 10) || 0); } catch {}
  }, []);

  const addPoints = (n: number) => {
    setPoints(p => {
      const next = p + n;
      try { localStorage.setItem(POINTS_KEY, String(next)); } catch {}
      // Upsert to Supabase leaderboard if logged in
      supabase.auth.getUser().then(({ data }) => {
        const user = data.user;
        if (!user) return;
        const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Anonymous";
        supabase.from("learn_scores").upsert(
          { user_id: user.id, display_name: displayName, total_points: next, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        ).then(() => {});
      });
      return next;
    });
  };

  const level = getLevel(points);
  const nextLevel = getNextLevel(points);
  const progressPct = nextLevel ? Math.min(100, ((points - level.pts) / (nextLevel.pts - level.pts)) * 100) : 100;

  return (
    <div style={{ minHeight: "100vh", background: C.navy, color: C.cream, fontFamily: "Inter, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap'); *{margin:0;padding:0;box-sizing:border-box}`}</style>

      {/* Nav */}
      <nav style={{ height: 56, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
        <Link href="/app" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="11" height="11" viewBox="0 0 18 18" fill="none">
              <ellipse cx="9" cy="11" rx="4" ry="5" fill={C.navy} opacity="0.92"/>
              <circle cx="9" cy="5.5" r="3" fill={C.navy} opacity="0.92"/>
            </svg>
          </div>
          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, fontWeight: 700, letterSpacing: 4, color: C.cream }}>CORVO</span>
        </Link>
        <span style={{ fontSize: 10, letterSpacing: 2.5, color: C.amber, textTransform: "uppercase" }}>Learn & Practice</span>
        <Link href="/app" style={{ fontSize: 12, color: C.cream3, textDecoration: "none" }}>← Back to analyzer</Link>
      </nav>

      {/* Score tracker */}
      <div style={{ background: "rgba(201,168,76,0.05)", borderBottom: `1px solid rgba(201,168,76,0.12)`, padding: "14px 32px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, letterSpacing: 2, color: C.amber, textTransform: "uppercase" }}>Level</span>
            <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: C.amber }}>{level.name}</span>
          </div>
          <div style={{ flex: 1, minWidth: 120, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: C.amber, borderRadius: 2, transition: "width 0.5s ease" }} />
          </div>
          <span style={{ fontSize: 11, color: C.cream3, whiteSpace: "nowrap" }}>
            {points} pts{nextLevel ? ` · ${nextLevel.pts - points} to ${nextLevel.name}` : " · Max level!"}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        <AnimatePresence mode="wait">
          {activeSection === "home" && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ marginBottom: 40 }}>
                <p style={{ fontSize: 10, letterSpacing: 2.5, color: C.amber, textTransform: "uppercase", marginBottom: 12 }}>Interactive Games</p>
                <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 28, fontWeight: 700, color: C.cream, letterSpacing: -1, marginBottom: 20 }}>Learn by doing</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {GAMES.map(g => (
                    <button key={g.id} onClick={() => { setActiveGame(g.id); setActiveSection("game"); }}
                      style={{ padding: "18px 20px", background: C.amber3, border: `1px solid ${C.border}`, borderRadius: 14, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{g.icon}</span>
                          <span style={{ fontSize: 16, fontWeight: 500, color: C.cream }}>{g.title}</span>
                        </div>
                        <span style={{ fontSize: 10, padding: "3px 8px", background: C.amber2, color: C.amber, borderRadius: 6 }}>{g.difficulty}</span>
                      </div>
                      <p style={{ fontSize: 13, color: C.cream3, paddingLeft: 30 }}>{g.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: 10, letterSpacing: 2.5, color: C.amber, textTransform: "uppercase", marginBottom: 12 }}>Lessons</p>
                <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 28, fontWeight: 700, color: C.cream, letterSpacing: -1, marginBottom: 20 }}>Core concepts</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {LESSONS.map(l => (
                    <button key={l.id} onClick={() => { setActiveLesson(l); setActiveSection("lesson"); }}
                      style={{ padding: "18px 18px", background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 14, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                      <div style={{ fontSize: 22, color: C.amber, marginBottom: 10 }}>{l.icon}</div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: C.cream, marginBottom: 4 }}>{l.title}</p>
                      <p style={{ fontSize: 11, color: C.cream3 }}>{l.time} read</p>
                    </button>
                  ))}
                </div>
              </div>
              <Leaderboard myPoints={points} />
            </motion.div>
          )}

          {activeSection === "game" && (
            <motion.div key="game" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setActiveSection("home")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.cream3, background: "none", border: "none", cursor: "pointer", marginBottom: 24, padding: 0 }}>← Back</button>
              <div style={{ background: C.navy3, border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px" }}>
                {activeGame === "sharpe-game" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                      <span style={{ fontSize: 24 }}>🎯</span>
                      <div>
                        <h2 style={{ fontSize: 20, fontWeight: 500, color: C.cream }}>Guess the Sharpe Ratio</h2>
                        <p style={{ fontSize: 12, color: C.cream3 }}>5 rounds · ±0.15 margin of error</p>
                      </div>
                    </div>
                    <SharpGame onPoints={addPoints} />
                  </>
                )}
                {activeGame === "builder-game" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                      <span style={{ fontSize: 24 }}>🏗️</span>
                      <div>
                        <h2 style={{ fontSize: 20, fontWeight: 500, color: C.cream }}>Portfolio Challenge</h2>
                        <p style={{ fontSize: 12, color: C.cream3 }}>Pick the best assets for each goal</p>
                      </div>
                    </div>
                    <BuilderChallenge onPoints={addPoints} />
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === "lesson" && activeLesson && (
            <motion.div key="lesson" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ background: C.navy3, border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px" }}>
                <LessonView lesson={activeLesson} onBack={() => setActiveSection("home")} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
