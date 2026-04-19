"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ─── Reveal hook ─── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Animated checkmark feature row ─── */
function FeatureItem({ text, delay }: { text: string; delay: number }) {
  const { ref, visible } = useReveal(0.05);
  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-12px)",
        transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
      }}
    >
      <span style={{
        flexShrink: 0,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "rgba(201,168,76,0.12)",
        border: "1px solid rgba(201,168,76,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        color: "#c9a84c",
        marginTop: 1,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.6)",
        transition: `opacity 0.4s ease ${delay + 0.05}s, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay + 0.05}s`,
      }}>✓</span>
      <span style={{ fontSize: 13.5, color: "rgba(232,224,204,0.7)", lineHeight: 1.6 }}>{text}</span>
    </div>
  );
}

/* ─── FAQ Item ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const { ref, visible } = useReveal(0.1);
  return (
    <div
      ref={ref}
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "20px 0",
          textAlign: "left",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: "#e8e0cc" }}>{q}</span>
        <span style={{
          fontSize: 18,
          color: "#c9a84c",
          flexShrink: 0,
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 0.25s ease",
          lineHeight: 1,
        }}>+</span>
      </button>
      <div style={{
        overflow: "hidden",
        maxHeight: open ? 200 : 0,
        transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <p style={{ fontSize: 14, color: "rgba(232,224,204,0.45)", lineHeight: 1.8, paddingBottom: 20 }}>{a}</p>
      </div>
    </div>
  );
}

/* ─── Waitlist email capture ─── */
function WaitlistCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const submit = async () => {
    if (!email.trim() || status !== "idle") return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/notify-me`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) setStatus("done");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(92,184,138,0.08)",
        border: "1px solid rgba(92,184,138,0.25)",
        borderRadius: 10,
        padding: "12px 20px",
      }}>
        <span style={{ color: "#5cb88a", fontSize: 13, fontWeight: 500 }}>✓ You&apos;re on the waitlist!</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="your@email.com"
          style={{
            flex: 1,
            minWidth: 200,
            padding: "11px 16px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 9,
            color: "#e8e0cc",
            fontSize: 13,
            outline: "none",
          }}
          onFocus={e => (e.target.style.borderColor = "rgba(201,168,76,0.4)")}
          onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
        />
        <button
          onClick={submit}
          disabled={status === "loading"}
          style={{
            padding: "11px 22px",
            background: "#c9a84c",
            border: "none",
            borderRadius: 9,
            color: "#0a0e14",
            fontSize: 12,
            fontWeight: 700,
            cursor: status === "loading" ? "wait" : "pointer",
            letterSpacing: 0.3,
            flexShrink: 0,
          }}
        >
          {status === "loading" ? "..." : "Join Waitlist"}
        </button>
      </div>
      {status === "error" && (
        <p style={{ fontSize: 11, color: "#e05c5c", marginTop: 8, textAlign: "center" }}>
          Something went wrong. Try again.
        </p>
      )}
    </div>
  );
}

const FREE_FEATURES = [
  "Portfolio analysis (Sharpe, Monte Carlo, drawdown)",
  "AI insights and health score",
  "15 AI chat messages per day",
  "Watchlist with price alerts",
  "CSV brokerage import",
  "Learn page with XP system",
  "Weekly digest email",
  "Up to 5 saved portfolios",
];

const PRO_EXTRAS = [
  "Unlimited AI chat",
  "Tax loss harvesting suggestions",
  "Options chain viewer",
  "Advanced Monte Carlo scenarios",
  "Priority support",
  "Unlimited saved portfolios",
  "PDF report exports (unlimited)",
];

const FAQS = [
  {
    q: "Is Corvo really free?",
    a: "Yes, 100% free during the beta period. No credit card required, no trial period, no hidden fees. You get full access to all current features just by signing up.",
  },
  {
    q: "When will Pro launch, and how much will it cost?",
    a: "We're still working out the exact pricing. We'll offer early-bird pricing to everyone on the waitlist, typically 30–50% off the regular rate, locked in forever.",
  },
  {
    q: "Will my free account be grandfathered in?",
    a: "Current beta users will retain access to all features available today even after Pro launches. Features added exclusively for Pro will require an upgrade.",
  },
  {
    q: "What payment methods will you accept?",
    a: "We plan to accept all major credit cards via Stripe. No long-term contracts, cancel anytime.",
  },
  {
    q: "Is there a student or non-profit discount?",
    a: "We plan to offer discounts for students and non-profits. Join the waitlist and mention your situation; we'll reach out when it's ready.",
  },
];

/* ─── Pricing Card ─── */
function PricingCard({
  isPro,
  delay,
}: {
  isPro: boolean;
  delay: number;
}) {
  const { ref, visible } = useReveal(0.1);

  return (
    <div
      ref={ref}
      style={{
        flex: "1 1 340px",
        maxWidth: 420,
        background: isPro
          ? "rgba(201,168,76,0.04)"
          : "rgba(255,255,255,0.018)",
        border: isPro
          ? "1px solid rgba(201,168,76,0.35)"
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20,
        padding: "36px 32px 40px",
        position: "relative",
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
        animation: isPro && visible ? "amberPulse 3s ease-in-out infinite" : undefined,
      }}
    >
      {/* Pill label */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontSize: 10,
          letterSpacing: 2,
          fontWeight: 700,
          color: "#c9a84c",
          background: "rgba(201,168,76,0.12)",
          border: "1px solid rgba(201,168,76,0.25)",
          borderRadius: 20,
          padding: "4px 11px",
          textTransform: "uppercase",
        }}>
          {isPro ? "Coming Soon" : "Beta"}
        </span>
      </div>

      {/* Plan name */}
      <p style={{ fontFamily: "Space Mono,monospace", fontSize: 13, letterSpacing: 3, color: "rgba(232,224,204,0.4)", textTransform: "uppercase", marginBottom: 10 }}>
        {isPro ? "Pro" : "Free"}
      </p>

      {/* Price */}
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontFamily: "Space Mono,monospace", fontSize: 44, fontWeight: 700, letterSpacing: -2, color: isPro ? "#c9a84c" : "#e8e0cc" }}>
          {isPro ? "$X" : "$0"}
        </span>
        <span style={{ fontSize: 14, color: "rgba(232,224,204,0.35)", marginLeft: 4 }}>/mo</span>
      </div>

      <p style={{ fontSize: 13.5, color: "rgba(232,224,204,0.45)", marginBottom: 28, lineHeight: 1.6 }}>
        {isPro ? "For serious investors" : "Everything you need to get started"}
      </p>

      {/* CTA */}
      {isPro ? (
        <WaitlistCapture />
      ) : (
        <Link
          href="/auth"
          style={{
            display: "block",
            textAlign: "center",
            padding: "13px 0",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            background: "#c9a84c",
            color: "#0a0e14",
            textDecoration: "none",
            letterSpacing: 0.3,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          Get Started Free →
        </Link>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "28px 0" }} />

      {/* Features heading */}
      <p style={{ fontSize: 10, letterSpacing: 2, color: "rgba(232,224,204,0.3)", textTransform: "uppercase", marginBottom: 18 }}>
        {isPro ? "Everything in Free, plus" : "What's included"}
      </p>

      {/* Feature list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(isPro ? PRO_EXTRAS : FREE_FEATURES).map((f, i) => (
          <FeatureItem key={f} text={f} delay={delay + 0.08 + i * 0.05} />
        ))}
      </div>
    </div>
  );
}

/* ─── Founding Member Section ─── */
function FoundingMemberSection() {
  const { ref, visible } = useReveal(0.1);
  return (
    <section style={{ position: "relative", zIndex: 1, padding: "0 24px 80px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 20, padding: "44px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* Glow */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 20, marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block", animation: "pdot 2s infinite" }} />
              <span style={{ fontSize: 10, letterSpacing: 2, color: "#c9a84c", textTransform: "uppercase" }}>Limited Spots</span>
            </div>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3.5vw,34px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5, marginBottom: 14, lineHeight: 1.2 }}>
              Be a founding member
            </h2>
            <p style={{ fontSize: 14, color: "rgba(232,224,204,0.45)", lineHeight: 1.8, maxWidth: 480, margin: "0 auto 12px", fontWeight: 300 }}>
              Pro is coming soon. Founding members lock in <strong style={{ color: "#c9a84c", fontWeight: 600 }}>50% off forever</strong>. Join the waitlist now before the price is set.
            </p>
            <p style={{ fontSize: 12, color: "rgba(201,168,76,0.55)", marginBottom: 32 }}>
              127 people already on the waitlist
            </p>
            <div style={{ maxWidth: 440, margin: "0 auto" }}>
              <WaitlistCapture />
            </div>
            <p style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", marginTop: 16 }}>
              No spam. Founding pricing is locked at signup, forever.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Feature Vote Section ─── */
const FEATURE_DEFS = [
  { id: "ai-chat", label: "Unlimited AI Chat", desc: "No daily message caps, ever", icon: "✦" },
  { id: "options", label: "Options Chain", desc: "Live options flow & Greeks", icon: "◈" },
  { id: "tax-docs", label: "Tax Documents", desc: "Automated gain/loss PDF reports", icon: "◎" },
  { id: "mobile", label: "Mobile App", desc: "Native iOS & Android apps", icon: "◷" },
  { id: "brokerage", label: "Brokerage Connect", desc: "Auto-sync holdings from brokers", icon: "⊞" },
  { id: "social", label: "Social Sharing", desc: "Share portfolio insights & wins", icon: "◬" },
];

// Map feature id → Supabase feature_name
const FEATURE_NAME_MAP: Record<string, string> = {
  "ai-chat": "Unlimited AI Chat",
  "options": "Options Chain",
  "tax-docs": "Tax Documents",
  "mobile": "Mobile App",
  "brokerage": "Brokerage Connect",
  "social": "Social Sharing",
};

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function FeatureVoteSection() {
  const { ref, visible } = useReveal(0.1);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Load real vote counts from Supabase and user's voted state from localStorage
  useEffect(() => {
    async function loadVotes() {
      try {
        const res = await fetch(
          `${SB_URL}/rest/v1/feature_votes?select=feature_name,vote_count`,
          { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } }
        );
        if (res.ok) {
          const rows: { feature_name: string; vote_count: number }[] = await res.json();
          const counts: Record<string, number> = {};
          for (const row of rows) {
            const id = Object.entries(FEATURE_NAME_MAP).find(([, v]) => v === row.feature_name)?.[0];
            if (id) counts[id] = row.vote_count;
          }
          setVotes(counts);
        }
      } catch {}
      try {
        const storedVoted = localStorage.getItem("corvo_feature_voted");
        if (storedVoted) setVoted(JSON.parse(storedVoted));
      } catch {}
      setLoading(false);
    }
    loadVotes();
  }, []);

  const handleVote = async (id: string) => {
    const featureName = FEATURE_NAME_MAP[id];
    if (!featureName) return;
    const alreadyVoted = voted[id] ?? false;

    // Optimistic update — toggle
    const newVotes = { ...votes, [id]: Math.max(0, (votes[id] ?? 0) + (alreadyVoted ? -1 : 1)) };
    const newVoted = { ...voted, [id]: !alreadyVoted };
    setVotes(newVotes);
    setVoted(newVoted);
    try {
      localStorage.setItem("corvo_feature_voted", JSON.stringify(newVoted));
    } catch {}

    // Persist to Supabase via atomic RPC
    try {
      await fetch(`${SB_URL}/rest/v1/rpc/${alreadyVoted ? "decrement_feature_vote" : "increment_feature_vote"}`, {
        method: "POST",
        headers: {
          apikey: SB_ANON,
          Authorization: `Bearer ${SB_ANON}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_feature_name: featureName }),
      });
    } catch {}
  };

  const sorted = [...FEATURE_DEFS].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0));

  return (
    <section style={{ position: "relative", zIndex: 1, padding: "0 24px 100px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1.5, marginBottom: 10 }}>
              Shape what we build next
            </h2>
            <p style={{ fontSize: 14, color: "rgba(232,224,204,0.35)", fontWeight: 300 }}>
              Most requested features get built first. Vote for what matters to you.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {sorted.map((f, i) => {
              const voteCount = votes[f.id] ?? 0;
              const hasVoted = voted[f.id] ?? false;
              return (
                <div key={f.id} style={{ background: "rgba(255,255,255,0.018)", border: `1px solid ${hasVoted ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: 14, padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 12, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)", transition: `opacity 0.6s ease ${i * 0.07}s, transform 0.6s ease ${i * 0.07}s`, position: "relative", overflow: "hidden" }}>
                  {hasVoted && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#c9a84c", flexShrink: 0 }}>
                        {f.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#e8e0cc", marginBottom: 3 }}>{f.label}</p>
                        <p style={{ fontSize: 11, color: "rgba(232,224,204,0.35)" }}>{f.desc}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleVote(f.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: hasVoted ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${hasVoted ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, cursor: "pointer", transition: "all 0.2s", alignSelf: "flex-start" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = hasVoted ? "rgba(201,168,76,0.06)" : "rgba(201,168,76,0.08)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = hasVoted ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.04)"; }}
                  >
                    <span style={{ fontSize: 13, color: hasVoted ? "#c9a84c" : "rgba(232,224,204,0.4)" }}>{hasVoted ? "▲" : "△"}</span>
                    <span style={{ fontFamily: "Space Mono,monospace", fontSize: 12, fontWeight: 700, color: hasVoted ? "#c9a84c" : "rgba(232,224,204,0.4)" }}>{loading ? "…" : voteCount}</span>
                    <span style={{ fontSize: 11, color: hasVoted ? "rgba(201,168,76,0.7)" : "rgba(232,224,204,0.3)" }}>{hasVoted ? "voted" : "upvote"}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(232,224,204,0.2)", marginTop: 24 }}>
            {loading ? "Loading votes…" : "Votes are shared across all users. Results directly inform our roadmap."}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  const { ref: trustRef, visible: trustVisible } = useReveal(0.1);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e8e0cc", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes amberPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); border-color: rgba(201,168,76,0.35); }
          50% { box-shadow: 0 0 28px 4px rgba(201,168,76,0.1); border-color: rgba(201,168,76,0.55); }
        }
        @keyframes heroFadeIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pdot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media (max-width: 700px) {
          .pricing-cards { flex-direction: column !important; align-items: center !important; }
          .pricing-cards > * { width: 100% !important; max-width: 420px !important; }
          .nav-links { display: none !important; }
          .pricing-section { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      {/* NAV */}
      <PublicNav />

      {/* HERO */}
      <section
        ref={heroRef}
        style={{
          position: "relative",
          zIndex: 1,
          paddingTop: 140,
          paddingBottom: 80,
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {/* Background glows */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{
            position: "absolute",
            top: "-20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "60%",
            height: "60%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)",
            filter: "blur(50px)",
          }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, animation: "heroFadeIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            border: "1px solid rgba(201,168,76,0.18)",
            borderRadius: 24,
            marginBottom: 28,
            background: "rgba(201,168,76,0.06)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block", animation: "pdot 2s infinite" }} />
            <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase" }}>Pricing</span>
          </div>

          <h1 style={{
            fontFamily: "Space Mono,monospace",
            fontSize: "clamp(32px,5vw,60px)",
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#e8e0cc",
            marginBottom: 20,
          }}>
            Simple, transparent pricing
          </h1>

          <p style={{
            fontSize: "clamp(15px,2vw,18px)",
            color: "#c9a84c",
            fontWeight: 500,
            marginBottom: 12,
            letterSpacing: 0.2,
          }}>
            Free during beta. Pro coming soon.
          </p>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 24px 80px" }}>
        <div
          className="pricing-cards"
          style={{
            display: "flex",
            gap: 24,
            maxWidth: 880,
            margin: "0 auto",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <PricingCard isPro={false} delay={0} />
          <PricingCard isPro={true} delay={0.12} />
        </div>
      </section>

      {/* FOUNDING MEMBER */}
      <FoundingMemberSection />

      {/* FEATURE VOTING */}
      <FeatureVoteSection />

      {/* FOOTER CTA */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 24px 72px" }}>
        <div ref={trustRef} className="flex justify-center py-12" style={{ opacity: trustVisible ? 1 : 0, transform: trustVisible ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center gap-4 w-fit">
            <p style={{ fontSize: 20, fontWeight: 700, color: "#e8e0cc" }}>Ready to analyze your portfolio?</p>
            <p style={{ fontSize: 13, color: "rgba(232,224,204,0.4)" }}>Monte Carlo, Sharpe ratio, AI chat, and more. Free.</p>
            <Link
              href="/auth"
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                background: "#c9a84c",
                color: "#0a0e14",
                textDecoration: "none",
                display: "inline-block",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Start for free →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <PublicFooter />
    </div>
  );
}
