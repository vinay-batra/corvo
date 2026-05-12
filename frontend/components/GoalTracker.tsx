"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Goal {
  amount: number;
  year: number;
  label: string;
}

interface TrajectoryResult {
  projectedValue: number;
  onTrack: boolean;
  gapDollars: number;
  goalYear: number;
  yearsAheadOrBehind: number;
  yearsRemaining: number;
  requiredCAGR: number;
  alreadyReached: boolean;
}

// ── Math ───────────────────────────────────────────────────────────────────────

function calculateTrajectory(
  currentValue: number,
  cagr: number,
  goal: Goal
): TrajectoryResult {
  const currentYear = new Date().getFullYear();
  const yearsRemaining = goal.year - currentYear;

  if (currentValue >= goal.amount) {
    return { projectedValue: currentValue, onTrack: true, gapDollars: 0, goalYear: currentYear, yearsAheadOrBehind: yearsRemaining, yearsRemaining, requiredCAGR: 0, alreadyReached: true };
  }
  if (yearsRemaining <= 0) {
    return { projectedValue: currentValue, onTrack: false, gapDollars: goal.amount - currentValue, goalYear: currentYear, yearsAheadOrBehind: 0, yearsRemaining: 0, requiredCAGR: 0, alreadyReached: false };
  }

  const projectedValue = cagr > -1
    ? currentValue * Math.pow(1 + cagr, yearsRemaining)
    : currentValue;

  const onTrack = projectedValue >= goal.amount;
  const gapDollars = goal.amount - projectedValue;

  let yearsToGoal = Infinity;
  let goalYear = 9999;
  if (cagr > 0.001 && currentValue > 0) {
    yearsToGoal = Math.log(goal.amount / currentValue) / Math.log(1 + cagr);
    goalYear = Math.round(currentYear + yearsToGoal);
  }

  const yearsAheadOrBehind = isFinite(yearsToGoal) ? yearsRemaining - yearsToGoal : -yearsRemaining;
  const requiredCAGR = goal.amount > currentValue && yearsRemaining > 0
    ? Math.pow(goal.amount / currentValue, 1 / yearsRemaining) - 1
    : 0;

  return { projectedValue, onTrack, gapDollars, goalYear, yearsAheadOrBehind, yearsRemaining, requiredCAGR, alreadyReached: false };
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtFull(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// ── SVG Trajectory Chart ────────────────────────────────────────────────────────

function TrajectoryChart({ currentValue, cagr, goal, result }: {
  currentValue: number; cagr: number; goal: Goal; result: TrajectoryResult;
}) {
  const W = 560, H = 130;
  const PAD = { left: 2, right: 2, top: 16, bottom: 20 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const currentYear = new Date().getFullYear();

  const endYear = Math.max(
    goal.year + 4,
    isFinite(result.goalYear) && result.goalYear < 2200 ? result.goalYear + 4 : goal.year + 8
  );
  const totalYears = endYear - currentYear || 1;

  const projAtEnd = cagr > -1 ? currentValue * Math.pow(1 + cagr, endYear - currentYear) : currentValue;
  const maxVal = Math.max(projAtEnd, goal.amount) * 1.1;
  const minVal = currentValue * 0.88;
  const yRange = maxVal - minVal || 1;

  const xS = (yr: number) => PAD.left + ((yr - currentYear) / totalYears) * cW;
  const yS = (val: number) => PAD.top + cH - ((Math.min(Math.max(val, minVal), maxVal) - minVal) / yRange) * cH;

  // Trajectory points
  const pts: string[] = [];
  for (let y = currentYear; y <= endYear; y++) {
    const val = cagr > -1 ? currentValue * Math.pow(1 + cagr, y - currentYear) : currentValue;
    pts.push(`${xS(y).toFixed(1)},${yS(val).toFixed(1)}`);
  }
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  const fillD = `${pathD} L${xS(endYear).toFixed(1)},${(PAD.top + cH).toFixed(1)} L${PAD.left},${(PAD.top + cH).toFixed(1)} Z`;

  const goalLineY = yS(goal.amount);
  const goalX = xS(goal.year);
  const projAtGoalYear = cagr > -1 ? currentValue * Math.pow(1 + cagr, goal.year - currentYear) : currentValue;
  const projDotY = yS(projAtGoalYear);
  const startDotY = yS(currentValue);
  const lineColor = result.onTrack ? "#4caf7d" : "#e05c5c";

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
      {/* Goal line (dashed amber) */}
      <line x1={PAD.left} y1={goalLineY} x2={W - PAD.right} y2={goalLineY}
        stroke="rgba(201,168,76,0.45)" strokeWidth="1.5" strokeDasharray="6 4" />

      {/* Target year marker (vertical) */}
      <line x1={goalX} y1={PAD.top} x2={goalX} y2={PAD.top + cH}
        stroke="rgba(201,168,76,0.18)" strokeWidth="1" strokeDasharray="4 3" />

      {/* Trajectory fill */}
      <path d={fillD} fill={`${lineColor}0d`} />

      {/* Trajectory line */}
      <path d={pathD} stroke={lineColor} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Gap indicator if behind */}
      {!result.onTrack && goalLineY < projDotY && (
        <line x1={goalX} y1={goalLineY} x2={goalX} y2={projDotY}
          stroke="rgba(224,92,92,0.5)" strokeWidth="2" strokeDasharray="3 2" />
      )}

      {/* Start dot */}
      <circle cx={xS(currentYear)} cy={startDotY} r="9" fill="rgba(76,175,125,0.12)" />
      <circle cx={xS(currentYear)} cy={startDotY} r="4.5" fill="#4caf7d" />

      {/* Projection dot at goal year */}
      <circle cx={goalX} cy={projDotY} r="5" fill={lineColor} />
      <circle cx={goalX} cy={projDotY} r="10" fill={`${lineColor}18`} />

      {/* X labels */}
      <text x={xS(currentYear)} y={H - 1} textAnchor="middle" fontSize="9" fill="var(--text3)" fontFamily="Space Mono, monospace">{currentYear}</text>
      <text x={goalX} y={H - 1} textAnchor="middle" fontSize="9" fill="var(--accent)" fontFamily="Space Mono, monospace">{goal.year}</text>

      {/* Goal amount label */}
      <text x={W - PAD.right - 4} y={goalLineY - 5} textAnchor="end" fontSize="9" fill="var(--accent)" fontFamily="Space Mono, monospace">{fmtShort(goal.amount)}</text>

      {/* Projected value label */}
      <text x={goalX + 10} y={projDotY - 8} fontSize="9" fill={lineColor} fontFamily="Space Mono, monospace">{fmtShort(projAtGoalYear)}</text>

      {/* Current value label */}
      <text x={xS(currentYear) + 10} y={startDotY - 8} fontSize="9" fill="var(--text3)" fontFamily="Space Mono, monospace">{fmtShort(currentValue)}</text>
    </svg>
  );
}

// ── Goal labels ────────────────────────────────────────────────────────────────

const GOAL_LABELS = ["Retirement", "Buy a house", "Education", "Emergency fund", "Wealth building", "Other"] as const;

// ── Setup card ────────────────────────────────────────────────────────────────

function GoalSetupCard({ onSet }: { onSet: (g: Goal) => void }) {
  const currentYear = new Date().getFullYear();
  const [amount, setAmount] = useState("");
  const [year, setYear] = useState(String(currentYear + 20));
  const [label, setLabel] = useState("Retirement");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<"amount" | "year" | null>(null);

  const handleSet = () => {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, ""));
    const yr = parseInt(year);
    if (!amt || amt <= 0) { setError("Enter a target amount."); return; }
    if (!yr || yr <= currentYear) { setError("Target year must be in the future."); return; }
    if (yr > currentYear + 60) { setError("Year must be within 60 years."); return; }
    onSet({ amount: amt, year: yr, label });
  };

  return (
    <motion.div initial={false} animate={{ opacity: 1 }}
      style={{ borderRadius: 14, border: "0.5px solid var(--border)", borderLeft: "3px solid var(--accent)", background: "var(--card-bg)", padding: "22px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(201,168,76,0.1)", border: "0.5px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: -0.3 }}>Set your financial goal</p>
          <p style={{ fontSize: 12, color: "var(--text3)", margin: "2px 0 0" }}>Corvo will track your trajectory and tell you whether you'll make it</p>
        </div>
      </div>

      {/* Goal type pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
        {GOAL_LABELS.map(l => (
          <button key={l} onClick={() => setLabel(l)} style={{
            padding: "5px 13px", borderRadius: 20, fontSize: 11, cursor: "pointer",
            background: label === l ? "rgba(201,168,76,0.12)" : "var(--bg3)",
            border: `0.5px solid ${label === l ? "rgba(201,168,76,0.45)" : "var(--border)"}`,
            color: label === l ? "var(--accent)" : "var(--text3)",
            fontWeight: label === l ? 700 : 400, transition: "all 0.15s",
          }}>
            {l}
          </button>
        ))}
      </div>

      {/* Inputs row */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        {/* Amount */}
        <div style={{ flex: "1 1 180px" }}>
          <label style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase" as const, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 7 }}>
            Target amount
          </label>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "11px 14px", borderRadius: 9,
            border: `0.5px solid ${focused === "amount" ? "rgba(201,168,76,0.5)" : "var(--border2)"}`,
            background: "var(--bg)", transition: "border-color 0.15s",
          }}>
            <span style={{ fontFamily: "Space Mono, monospace", fontSize: 14, color: "var(--text3)" }}>$</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError(""); }}
              onFocus={() => setFocused("amount")}
              onBlur={() => setFocused(null)}
              onKeyDown={e => { if (e.key === "Enter") handleSet(); }}
              placeholder="500,000"
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, fontFamily: "Space Mono, monospace", fontWeight: 700, color: "var(--text)" }}
            />
          </div>
        </div>

        {/* Year */}
        <div style={{ flex: "0 0 110px" }}>
          <label style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase" as const, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 7 }}>
            By year
          </label>
          <input
            type="number"
            value={year}
            onChange={e => { setYear(e.target.value); setError(""); }}
            onFocus={() => setFocused("year")}
            onBlur={() => setFocused(null)}
            onKeyDown={e => { if (e.key === "Enter") handleSet(); }}
            min={currentYear + 1}
            max={currentYear + 60}
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 9,
              border: `0.5px solid ${focused === "year" ? "rgba(201,168,76,0.5)" : "var(--border2)"}`,
              background: "var(--bg)", fontSize: 15,
              fontFamily: "Space Mono, monospace", fontWeight: 700, color: "var(--text)",
              outline: "none", boxSizing: "border-box" as const, transition: "border-color 0.15s",
            }}
          />
        </div>

        {/* CTA */}
        <button
          onClick={handleSet}
          style={{
            flex: "0 0 auto", padding: "11px 22px", borderRadius: 9,
            background: "var(--accent)", border: "none", color: "var(--bg)",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            letterSpacing: 0.3, transition: "opacity 0.15s", whiteSpace: "nowrap" as const,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          Set goal →
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 11, color: "#e05c5c", marginTop: 10, margin: "10px 0 0" }}>{error}</p>
      )}
    </motion.div>
  );
}

// ── Stat block ─────────────────────────────────────────────────────────────────

function StatBlock({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div>
      <span style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase" as const, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</span>
      <span style={{ fontSize: 26, fontWeight: 700, color: color || "var(--text)", fontFamily: "Space Mono, monospace", letterSpacing: -1, display: "block", lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: "var(--text3)", display: "block", marginTop: 4 }}>{sub}</span>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  data: any;
  portfolioValue?: number;
  onAskAi?: (message: string) => void;
}

export default function GoalTracker({ data, portfolioValue, onAskAi }: Props) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [editing, setEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("corvo_goal");
      if (stored) setGoal(JSON.parse(stored));
    } catch {}
  }, []);

  const saveGoal = (g: Goal) => {
    setGoal(g);
    setEditing(false);
    try { localStorage.setItem("corvo_goal", JSON.stringify(g)); } catch {}
  };

  const currentValue = portfolioValue || 10000;
  // Recent CAGR from the user's portfolio. Whatever the analysis returned -
  // could be a hot 1Y run (25%+) or a flat year. Used as the *observed* rate,
  // not the *assumed* rate, because compounding a one-year tailwind across
  // a 20-year horizon produces fantasyland numbers.
  const observedCagr = data?.annualized_return ?? data?.portfolio_return ?? 0;
  // Assumption used in the projection: clamp the observed CAGR to the band of
  // long-run equity returns. Floor at 4% (roughly money-market) so a single
  // flat year doesn't project the portfolio to zero growth; cap at 10% (just
  // above the historical S&P 500 real return average) so a hot recent run
  // doesn't oversell what we can actually promise. The card shows both
  // numbers and a "based on X% assumed CAGR" note so the user can see the
  // assumption rather than be surprised by it.
  const projectionCagr = Math.max(0.04, Math.min(observedCagr, 0.10));
  const dampened = observedCagr > projectionCagr || observedCagr < projectionCagr - 0.0001;

  const result = useMemo(() => {
    if (!goal || !data) return null;
    return calculateTrajectory(currentValue, projectionCagr, goal);
  }, [goal, data, currentValue, projectionCagr]);

  if (!data || !mounted) return null;

  if (!goal || editing) {
    return (
      <div style={{ marginBottom: 20 }}>
        {editing && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={() => setEditing(false)} style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
          </div>
        )}
        <GoalSetupCard onSet={saveGoal} />
      </div>
    );
  }

  if (!result) return null;

  const trackColor = result.alreadyReached || result.onTrack ? "#4caf7d" : "#e05c5c";
  const ahead = result.yearsAheadOrBehind;
  const absYears = Math.abs(ahead);

  const statusLine = result.alreadyReached
    ? "You have already reached this goal."
    : result.onTrack
    ? `You will reach your goal ${absYears >= 0.5 ? `${absYears.toFixed(0)} yr${absYears >= 2 ? "s" : ""} early in ${result.goalYear}` : "right on schedule"}.`
    : `You will fall short by ${absYears.toFixed(0)} year${absYears >= 2 ? "s" : ""} at your current rate.`;

  const handleAskAi = () => {
    if (!onAskAi) return;
    const msg = result.onTrack
      ? `My goal is to reach ${fmtFull(goal.amount)} by ${goal.year} for ${goal.label}. Assuming a long-run ${(projectionCagr * 100).toFixed(1)}% CAGR I'm on track to hit it ${ahead.toFixed(0)} years early. What can I do to make sure I stay on track and potentially accelerate it further?`
      : `My goal is to reach ${fmtFull(goal.amount)} by ${goal.year} for ${goal.label}. Assuming a long-run ${(projectionCagr * 100).toFixed(1)}% CAGR I'll fall short. I need ${(result.requiredCAGR * 100).toFixed(1)}% CAGR to hit my goal on time. What specific portfolio changes would help me close this gap?`;
    onAskAi(msg);
  };

  return (
    <motion.div initial={false} animate={{ opacity: 1 }} style={{ marginBottom: 20 }}>
      <div style={{
        borderRadius: 14,
        border: "0.5px solid var(--border)",
        borderLeft: `3px solid ${trackColor}`,
        background: "var(--card-bg)",
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Corner glow */}
        <div style={{ position: "absolute", top: 0, right: 0, width: 140, height: 140, background: `radial-gradient(circle at top right, ${trackColor}12 0%, transparent 70%)`, pointerEvents: "none", borderRadius: "0 14px 0 0" }} />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 12 }}>
          <div>
            <span style={{ fontSize: 8, letterSpacing: 2.5, textTransform: "uppercase" as const, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 5 }}>
              {goal.label}
            </span>
            <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: -0.4, lineHeight: 1.2 }}>
              {fmtFull(goal.amount)} by {goal.year}
            </p>
          </div>
          <button
            onClick={() => setEditing(true)}
            style={{ padding: "5px 12px", fontSize: 11, borderRadius: 7, border: "0.5px solid var(--border)", background: "var(--bg3)", color: "var(--text3)", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--border2)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            Edit goal
          </button>
        </div>

        {/* ── Key stats: 2-column layout, projected value + status ────────── */}
        <div style={{ display: "flex", gap: 32, marginBottom: 20, flexWrap: "wrap" }}>
          <StatBlock
            label="Projected by target date"
            value={fmtShort(result.projectedValue)}
            sub={result.onTrack
              ? `Meets ${fmtShort(goal.amount)} target`
              : `${fmtShort(Math.abs(result.gapDollars))} short of ${fmtShort(goal.amount)}`}
            color={trackColor}
          />
          <div style={{ width: "0.5px", background: "var(--border)", alignSelf: "stretch" }} />
          <div>
            <span style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase" as const, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 5 }}>Status</span>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: trackColor, flexShrink: 0, boxShadow: `0 0 6px ${trackColor}88` }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: trackColor }}>{result.onTrack || result.alreadyReached ? "On Track" : "Behind"}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "5px 0 0", lineHeight: 1.5, maxWidth: 320 }}>
              {statusLine}
              {!result.alreadyReached && (
                <> Needs {(result.requiredCAGR * 100).toFixed(1)}% CAGR to land exactly on {goal.year}.</>
              )}
            </p>
          </div>
        </div>

        {/* Projection assumption note: surface the dampened CAGR so the user
            can see the math rather than have it hidden. Without this the
            projection feels like a black-box promise. */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text3)", marginBottom: 20, flexWrap: "wrap" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>
            Projection assumes <strong style={{ color: "var(--text2)" }}>{(projectionCagr * 100).toFixed(1)}% CAGR</strong>
            {dampened && (
              <> (capped from your recent <span style={{ fontFamily: "Space Mono, monospace" }}>{(observedCagr * 100).toFixed(1)}%</span> - long-horizon estimates use 4-10% so a single hot or cold year doesn't dominate the math)</>
            )}
            {!dampened && (
              <> - matches your observed return, within the 4-10% long-horizon band</>
            )}
          </span>
        </div>

        {/* ── Trajectory chart ──────────────────────────────────────────────── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase" as const, color: "var(--text3)", fontWeight: 600 }}>
              Trajectory
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 16, height: 2.5, borderRadius: 1, background: trackColor }} />
                <span style={{ fontSize: 9, color: "var(--text3)" }}>Your trajectory</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="16" height="4" viewBox="0 0 16 4"><line x1="0" y1="2" x2="16" y2="2" stroke="rgba(201,168,76,0.6)" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
                <span style={{ fontSize: 9, color: "var(--text3)" }}>Goal</span>
              </div>
            </div>
          </div>
          <TrajectoryChart currentValue={currentValue} cagr={projectionCagr} goal={goal} result={result} />
        </div>

        {/* ── Gap closer / celebration ─────────────────────────────────────── */}
        <div style={{ marginTop: 20 }}>
          {!result.alreadyReached && !result.onTrack && (
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(224,92,92,0.06)", border: "0.5px solid rgba(224,92,92,0.2)", marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#e05c5c", margin: "0 0 5px", letterSpacing: 0.2 }}>
                To close the gap
              </p>
              <p style={{ fontSize: 12.5, color: "var(--text2)", margin: 0, lineHeight: 1.65 }}>
                You need <strong style={{ color: "var(--text)" }}>{(result.requiredCAGR * 100).toFixed(1)}% annualized returns</strong> to reach {fmtFull(goal.amount)} by {goal.year}. Improving your Sharpe ratio and reducing concentration risk are the two levers most likely to lift long-term returns.
              </p>
            </div>
          )}

          {/* Ask AI CTA */}
          <button
            onClick={handleAskAi}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "11px 16px", borderRadius: 9, border: "0.5px solid var(--border2)",
              background: "var(--bg2)", color: "var(--text2)", fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s", letterSpacing: 0.2,
              justifyContent: "center",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text2)"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Ask Corvo AI how to {result.onTrack ? "stay on track" : "close this gap"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
