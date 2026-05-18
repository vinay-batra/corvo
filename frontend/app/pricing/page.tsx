"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { RESOLVED_API_URL } from "../../lib/api";

const API_URL = RESOLVED_API_URL;

/* ─── Reveal hook ─── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.95 && rect.bottom > 0;
    if (inView) {
      let rafA = 0, rafB = 0;
      rafA = requestAnimationFrame(() => { rafB = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(rafA); cancelAnimationFrame(rafB); };
    }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function ScrollReveal({ children, delay = 0, from = "up", distance = 30, style = {} }: { children: React.ReactNode; delay?: number; from?: "up"|"left"|"right"; distance?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useReveal(0.1);
  const transform = from === "left" ? `translateX(-${distance}px)` : from === "right" ? `translateX(${distance}px)` : `translateY(${distance}px)`;
  return (
    <div ref={ref} style={{ ...style, opacity: visible ? 1 : 0, transform: visible ? "none" : transform, transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>
      {children}
    </div>
  );
}

function AnimatedHeading({ text, accentText, style = {} }: { text: string; accentText?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let rafA = 0, rafB = 0;
    rafA = requestAnimationFrame(() => { rafB = requestAnimationFrame(() => setVisible(true)); });
    return () => { cancelAnimationFrame(rafA); cancelAnimationFrame(rafB); };
  }, []);
  const blackWords = text.split(" ").filter(Boolean);
  const goldWords = accentText ? accentText.split(" ").filter(Boolean) : [];
  const allWords = [...blackWords, ...goldWords];
  const offsets: number[] = [];
  let acc = 0;
  allWords.forEach(w => { offsets.push(acc); acc += w.length; });
  return (
    <h1 ref={ref} style={style}>
      {allWords.map((word, wi) => {
        const isAccent = wi >= blackWords.length;
        return (
          <span key={wi} style={{
            display: "inline-block",
            marginRight: "0.3em",
            color: isAccent ? "var(--accent)" : "var(--text)",
            textShadow: isAccent ? "0 0 60px rgba(var(--accent-rgb),0.35)" : "none",
          }}>
            {word.split("").map((char, ci) => {
              const delay = (offsets[wi] + ci) * 0.03;
              return (
                <span key={ci} style={{
                  display: "inline-block",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(-40px)",
                  transition: `opacity 0.6s cubic-bezier(0.215,0.61,0.355,1) ${delay}s, transform 0.6s cubic-bezier(0.215,0.61,0.355,1) ${delay}s`,
                  willChange: "transform, opacity",
                }}>{char}</span>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
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
      }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </span>
      <span style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.6 }}>{text}</span>
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
        borderBottom: "1px solid var(--bg3)",
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
        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>{q}</span>
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
        overflow: "clip",
        maxHeight: open ? 200 : 0,
        transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8, paddingBottom: 20 }}>{a}</p>
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
        <span style={{ color: "#5cb88a", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          You&apos;re on the waitlist!
        </span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="your@email.com"
          style={{
            flex: 1,
            minWidth: 200,
            padding: "11px 16px",
            background: "var(--bg3)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            color: "var(--text)",
            fontSize: 13,
            outline: "none",
          }}
          onFocus={e => (e.target.style.borderColor = "rgba(201,168,76,0.4)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
        <button
          onClick={submit}
          disabled={status === "loading"}
          style={{
            padding: "11px 22px",
            background: "#c9a84c",
            border: "none",
            borderRadius: 9,
            color: "var(--bg)",
            fontSize: 12,
            fontWeight: 700,
            cursor: status === "loading" ? "wait" : "pointer",
            letterSpacing: 0.3,
            flexShrink: 0,
            transition: "filter 0.15s",
          }}
          onMouseEnter={e => { if (status !== "loading") (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = "none"; }}
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

type PlanId = "lite" | "pro" | "max";

interface PricingPlan {
  id: PlanId;
  badge: string;
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  trialNote?: string;
  preLaunchNote?: string;
  ctaLabel: string;
  ctaKind: "signup" | "waitlist";
  featuresHeader: string;
  features: string[];
  highlight?: boolean;
}

const LITE_FEATURES = [
  "Full portfolio analysis: Sharpe, CAGR, volatility, max drawdown",
  "Monte Carlo simulation with 1-30 year horizon, fan chart + Student-t fat tails",
  "Daily Signal - one AI recommendation tailored to your portfolio",
  "AI Health Score with the three-beat advisor breakdown",
  "15 AI chat messages per day (earn more via referrals)",
  "Goal Tracker with on-track / off-track projections",
  "Capital gains estimator and dividend calendar",
  "Earnings calendar and insider activity tracking",
  "Per-holding account type tagging (Roth / 401k / HSA / 529)",
  "Correlation heatmap, drawdown chart, sector exposure breakdown",
  "What-If portfolio testing (try changes side-by-side before committing)",
  "Morning brief + weekly digest emails",
  "CSV import from Fidelity, Schwab, Robinhood",
  "Screenshot import (AI-parsed portfolio extraction)",
  "PWA install with push notifications and price alerts",
];

const PRO_EXTRAS = [
  "Unlimited AI chat messages (no daily caps)",
  "Brokerage sync via Plaid (auto-update holdings)",
  "SMS price alerts",
  "Tax-loss harvesting suggestions with wash-sale-safe replacement tickers",
  "Multiple saved portfolios with side-by-side comparison",
  "Custom benchmarks (any ticker, not just SPY / QQQ / DIA)",
  "Options chain analysis with Greeks (delta, gamma, theta, vega)",
  "Intraday price refresh (every 15 min vs end-of-day on Lite)",
  "Backtesting on saved portfolios (historical what-if)",
  "Custom PDF reports with your branding",
  "Priority email support",
  "Early access to new features",
];

const MAX_EXTRAS = [
  "Multi-account aggregation: spouse, custodial, all your wrappers in one net-worth view",
  "Real-time streaming prices",
  "API access for custom workflows and Google Sheets / Excel pulls",
  "Quarterly portfolio review delivered as a polished PDF",
  "Year-end tax-loss harvesting + capital-gains report formatted for your CPA",
  "Concierge TLH execution plan (we tell you exactly what to sell and when)",
  "Custom alerts on any metric (Sharpe < X, drawdown > Y, allocation drift > Z%)",
  "Factor model decomposition (Fama-French five-factor + momentum)",
  "Quarterly 30-minute 1:1 portfolio strategy call with the Corvo team",
  "White-glove onboarding call to import your full book",
  "Direct line to the founder for product feedback",
  "First access to every new feature, ahead of Pro",
];

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "lite",
    badge: "Free Forever",
    name: "Lite",
    price: "$0",
    priceSuffix: "/month",
    tagline: "Everything a self-directed investor needs to manage and analyze their portfolio.",
    ctaLabel: "Get Started Free →",
    ctaKind: "signup",
    featuresHeader: "What's included",
    features: LITE_FEATURES,
  },
  {
    id: "pro",
    badge: "Coming Soon",
    name: "Pro",
    price: "$9",
    priceSuffix: "/month",
    tagline: "For the engaged investor who wants hands-off brokerage sync and the full AI advisor.",
    trialNote: "Launching soon - 14-day free trial at launch. Cancel anytime.",
    preLaunchNote: "Waitlist members lock in $9/month forever.",
    ctaLabel: "Join Waitlist",
    ctaKind: "waitlist",
    featuresHeader: "Everything in Lite, plus",
    features: PRO_EXTRAS,
    highlight: true,
  },
  {
    id: "max",
    badge: "Coming Soon",
    name: "Max",
    price: "$29",
    priceSuffix: "/month",
    tagline: "For serious portfolios: family aggregation, real-time data, dedicated support.",
    preLaunchNote: "Waitlist members lock in $29/month forever.",
    ctaLabel: "Join Waitlist",
    ctaKind: "waitlist",
    featuresHeader: "Everything in Pro, plus",
    features: MAX_EXTRAS,
  },
];

const FAQS = [
  {
    q: "Is Corvo really free?",
    a: "Yes. The Lite plan is free forever, not a beta promo. No credit card, no trial period, no hidden fees. Full access to portfolio analysis, AI chat (with daily limits), Monte Carlo, health scores, morning briefings - all of it - just by signing up. Pro and Max are paid tiers with extras (unlimited chat, Plaid brokerage sync, multi-account aggregation, real-time data), but Lite stays.",
  },
  {
    q: "How is the 14-day Pro free trial structured?",
    a: "When Pro launches, every new signup starts with 14 days of full access at no cost. No credit card required up front. At the end of the trial you decide whether to convert to $9/month or fall back to Lite, which always stays free. No surprise charges, no auto-trap.",
  },
  {
    q: "What's the difference between Pro and Max?",
    a: "Pro is for the self-directed investor who wants hands-off brokerage sync, unlimited AI chat, SMS alerts, options Greeks, and tax-loss harvesting suggestions. Max is for households with multiple accounts (spouse + custodial + retirement wrappers in one net-worth view), real-time streaming prices, factor model decomposition, quarterly 1:1 strategy calls, and year-end CPA-ready reports. Most users will be happiest on Pro; Max is built for the small minority running serious money across multiple wrappers.",
  },
  {
    q: "When will Pro and Max launch, and how much will they cost?",
    a: "Pricing is shown above: Pro $9/month, Max $29/month. Both are pre-launch right now. Everyone on the waitlist gets founding-member pricing locked in at signup - that price stays yours forever, even if we raise rates after launch.",
  },
  {
    q: "Will my Lite account be grandfathered in?",
    a: "Current Lite users retain access to every feature available today even after Pro / Max launch. Features added exclusively for paid tiers will require an upgrade, but nothing on the Lite plan today gets pulled away.",
  },
  {
    q: "What payment methods will you accept?",
    a: "All major credit cards via Stripe. Monthly billing only, no long-term contracts, cancel anytime from settings.",
  },
  {
    q: "Is there a student or non-profit discount?",
    a: "We plan to offer discounts for students and non-profits. Join the waitlist and mention your situation; we'll reach out when it's ready.",
  },
];

/* ─── Pricing Card ─── */
function PricingCard({
  plan,
  delay,
}: {
  plan: PricingPlan;
  delay: number;
}) {
  const { ref, visible } = useReveal(0.1);
  const highlighted = !!plan.highlight;

  return (
    <div
      ref={ref}
      className={`pricing-card-wrap${highlighted ? " pricing-card-wrap-highlight" : ""}`}
      style={{
        position: "relative",
        flex: "1 1 300px",
        maxWidth: 360,
        // The highlighted middle card lifts ~12px and scales 1.04 to anchor
        // the eye via Rule of 3: with three cards side-by-side and the
        // middle one visually elevated, users gravitate to it as the
        // "obvious choice." On mobile the lift collapses (CSS override).
        transform: highlighted ? "translateY(-12px) scale(1.04)" : undefined,
        zIndex: highlighted ? 2 : 1,
      }}
    >
      {/* Gold glow halo behind card - stronger on the highlighted middle tier */}
      <div aria-hidden style={{
        position: "absolute",
        inset: -40,
        borderRadius: 36,
        background: highlighted
          ? "radial-gradient(ellipse 75% 65% at 50% 55%, rgba(201,168,76,0.38), rgba(201,168,76,0.10) 50%, transparent 78%)"
          : "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(201,168,76,0.18), rgba(201,168,76,0.04) 45%, transparent 75%)",
        filter: "blur(40px)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* MOST POPULAR floating badge - only on the highlighted tier. Sits
          above the card and lifts the eye via Rule of 3 anchoring. The
          in-card status pill (Coming Soon / Free Forever) still renders
          below so users see launch status, not just the floating award. */}
      {highlighted && (
        <div aria-hidden style={{
          position: "absolute",
          top: -14,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "5px 14px",
          background: "linear-gradient(180deg, #d4b863 0%, #c9a84c 60%, #a8893a 100%)",
          color: "#0a0e14",
          fontSize: 9,
          letterSpacing: "0.24em",
          fontWeight: 700,
          fontFamily: "Space Mono, monospace",
          textTransform: "uppercase",
          borderRadius: 100,
          boxShadow: "0 6px 18px rgba(201,168,76,0.45), 0 0 0 0.5px rgba(201,168,76,0.65)",
          whiteSpace: "nowrap",
          zIndex: 3,
        }}>
          Most Popular
        </div>
      )}

    <div
      className={`pricing-card pricing-card-${plan.id}`}
      style={{
        width: "100%",
        background: highlighted
          ? "linear-gradient(180deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.02) 60%, transparent 100%), var(--card-bg)"
          : "var(--card-bg)",
        border: highlighted
          ? "1px solid rgba(201,168,76,0.5)"
          : "0.5px solid var(--border)",
        borderRadius: 20,
        padding: "28px 26px 30px",
        position: "relative",
        zIndex: 1,
        overflow: "visible",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}s, box-shadow 0.3s, border-color 0.3s`,
        boxShadow: highlighted
          ? "0 1px 3px rgba(0,0,0,0.06), 0 22px 60px rgba(201,168,76,0.16), 0 0 0 0.5px rgba(201,168,76,0.28)"
          : "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), 0 0 0 0.5px var(--border)",
      }}
    >
      {/* Header: in-card status pill. Always renders so users see launch
          status for every tier (Free Forever / Coming Soon / Coming Soon).
          On the highlighted card it sits below the floating MOST POPULAR
          badge, so the card communicates both "this is the recommended
          pick" and "it's pre-launch" at the same time. */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span style={{
          fontSize: 9,
          letterSpacing: "0.22em",
          fontWeight: 700,
          color: plan.id === "lite" ? "var(--text3)" : "#c9a84c",
          background: plan.id === "lite" ? "var(--bg3)" : "rgba(201,168,76,0.10)",
          border: plan.id === "lite" ? "0.5px solid var(--border)" : "0.5px solid rgba(201,168,76,0.3)",
          borderRadius: 100,
          padding: "4px 10px",
          textTransform: "uppercase",
          fontFamily: "Space Mono, monospace",
        }}>
          {plan.badge}
        </span>
      </div>

      {/* Plan name */}
      <h3 style={{
        fontFamily: "Space Mono, monospace",
        fontSize: 25, fontWeight: 700,
        letterSpacing: -1,
        color: "var(--text)",
        marginBottom: 12,
        lineHeight: 1.1,
      }}>
        {plan.name}
      </h3>

      {/* Price block */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
        <span style={{
          fontFamily: "Space Mono, monospace",
          fontSize: 48, fontWeight: 700,
          letterSpacing: -2.5,
          color: plan.id === "lite" ? "var(--text)" : "#c9a84c",
          lineHeight: 1,
        }}>
          {plan.price}
        </span>
        {plan.priceSuffix && (
          <span style={{ fontSize: 14, color: "var(--text3)", fontFamily: "Space Mono, monospace", letterSpacing: 0.3 }}>{plan.priceSuffix}</span>
        )}
      </div>

      <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: (plan.trialNote || plan.preLaunchNote) ? 10 : 24, lineHeight: 1.55, maxWidth: 320 }}>
        {plan.tagline}
      </p>

      {/* 14-day free trial line - only when set (lives on Pro).
          Endowment-effect framing: users mentally "own" the tier for 14
          days, so giving it up feels like a loss. */}
      {plan.trialNote && (
        <p style={{ fontSize: 12, color: "#c9a84c", fontWeight: 600, marginBottom: 8, letterSpacing: 0.1, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {plan.trialNote}
        </p>
      )}

      {/* Pre-launch founding-member note - on both paid tiers. Loss-aversion
          framing: if you don't join the waitlist now, you pay full price
          later. Strong waitlist conversion driver. */}
      {plan.preLaunchNote && (
        <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 22, fontStyle: "italic", lineHeight: 1.5 }}>
          {plan.preLaunchNote}
        </p>
      )}

      {/* CTA */}
      {plan.ctaKind === "waitlist" ? (
        <WaitlistCapture />
      ) : (
        <Link
          href="/auth?mode=signup"
          style={{
            display: "block",
            textAlign: "center",
            padding: "14px 0",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            background: "var(--accent)",
            color: "var(--bg)",
            textDecoration: "none",
            letterSpacing: 0.3,
            transition: "filter 0.2s, transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 4px 14px rgba(201,168,76,0.25)",
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.08)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(201,168,76,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(201,168,76,0.25)"; }}
        >
          {plan.ctaLabel}
        </Link>
      )}

      {/* Divider */}
      <div style={{ height: "0.5px", background: "var(--border)", margin: "24px 0 18px" }} />

      {/* Features heading */}
      <p style={{ fontSize: 9, letterSpacing: "0.22em", color: plan.id === "lite" ? "var(--text3)" : "#c9a84c", textTransform: "uppercase", marginBottom: 16, fontFamily: "Space Mono, monospace", fontWeight: 700 }}>
        {plan.featuresHeader}
      </p>

      {/* Feature list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {plan.features.map((f, i) => (
          <FeatureItem key={f} text={f} delay={delay + 0.08 + i * 0.04} />
        ))}
      </div>
    </div>
    </div>
  );
}

/* ─── Founding Member Section ─── */
function FoundingMemberSection() {
  const { ref, visible } = useReveal(0.1);
  return (
    <section className="pricing-section" style={{ position: "relative", zIndex: 1, padding: "80px 24px 120px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)", padding: "44px 40px", textAlign: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "rgba(201,168,76,0.1)", border: "0.5px solid rgba(201,168,76,0.25)", borderRadius: 20, marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block", animation: "pdot 2s infinite" }} />
              <span style={{ fontSize: 10, letterSpacing: 2, color: "#c9a84c", textTransform: "uppercase" }}>Limited Spots</span>
            </div>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3.5vw,34px)", fontWeight: 700, color: "var(--text)", letterSpacing: -1.5, marginBottom: 14, lineHeight: 1.2 }}>
              Be a founding member
            </h2>
            <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8, maxWidth: 480, margin: "0 auto 12px", fontWeight: 300 }}>
              Pro and Max are coming soon. Founding members lock in <strong style={{ color: "#c9a84c", fontWeight: 600 }}>their launch price forever</strong>. Join the waitlist now before pricing moves up.
            </p>
            <p style={{ fontSize: 12, color: "rgba(201,168,76,0.55)", marginBottom: 32 }}>
              127 people already on the waitlist
            </p>
            <div style={{ maxWidth: 440, margin: "0 auto" }}>
              <WaitlistCapture />
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 16 }}>
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
  { id: "ai-chat", label: "Unlimited AI Chat", desc: "No daily message caps, ever", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
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
      } catch {
        // Fetch failed - votes will show as 0, loading state still clears below
      }
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

    // Optimistic update - toggle
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
    <section className="pricing-section" style={{ position: "relative", zIndex: 1, padding: "80px 24px 140px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, color: "var(--text)", letterSpacing: -1.5, marginBottom: 10 }}>
              Shape what we build next
            </h2>
            <p style={{ fontSize: 14, color: "var(--text3)", fontWeight: 300 }}>
              Most requested features get built first. Vote for what matters to you.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 14 }}>
            {sorted.map((f, i) => {
              const voteCount = votes[f.id] ?? 0;
              const hasVoted = voted[f.id] ?? false;
              return (
                <div key={f.id} style={{ background: "var(--bg3)", border: `0.5px solid ${hasVoted ? "rgba(201,168,76,0.3)" : "var(--bg3)"}`, borderRadius: 14, padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 12, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)", transition: `opacity 0.6s ease ${i * 0.07}s, transform 0.6s ease ${i * 0.07}s`, position: "relative", overflow: "clip" }}>
                  {hasVoted && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(201,168,76,0.08)", border: "0.5px solid rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#c9a84c", flexShrink: 0 }}>
                        {f.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{f.label}</p>
                        <p style={{ fontSize: 11, color: "var(--text3)" }}>{f.desc}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleVote(f.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: hasVoted ? "rgba(201,168,76,0.1)" : "var(--bg3)", border: `0.5px solid ${hasVoted ? "rgba(201,168,76,0.3)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", transition: "all 0.2s", alignSelf: "flex-start" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = hasVoted ? "rgba(201,168,76,0.06)" : "rgba(201,168,76,0.08)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = hasVoted ? "rgba(201,168,76,0.1)" : "var(--bg3)"; }}
                  >
                    <span style={{ fontSize: 13, color: hasVoted ? "#c9a84c" : "var(--text3)" }}>{hasVoted ? "▲" : "△"}</span>
                    <span style={{ fontFamily: "Space Mono,monospace", fontSize: 12, fontWeight: 700, color: hasVoted ? "#c9a84c" : "var(--text3)" }}>{loading ? "…" : voteCount}</span>
                    <span style={{ fontSize: 11, color: hasVoted ? "rgba(201,168,76,0.7)" : "var(--text3)" }}>{hasVoted ? "voted" : "upvote"}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--text3)", marginTop: 24 }}>
            {loading ? "Loading votes…" : "Votes are shared across all users. Results directly inform our roadmap."}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ minHeight: "100vh", background: "transparent", color: "var(--text)", fontFamily: "Inter,system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes heroFadeIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeinUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pdot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .pricing-card:hover {
          transform: translateY(-6px) !important;
        }
        .pricing-card-lite:hover {
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 20px 50px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(201,168,76,0.18) !important;
          border-color: rgba(201,168,76,0.25) !important;
        }
        .pricing-card-pro:hover {
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 24px 60px rgba(201,168,76,0.18), 0 0 0 0.5px rgba(201,168,76,0.35) !important;
          border-color: rgba(201,168,76,0.65) !important;
        }
        .pricing-card-max:hover {
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 20px 50px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(201,168,76,0.18) !important;
          border-color: rgba(201,168,76,0.25) !important;
        }
        @media (max-width: 900px) {
          /* Below 900px the 3-card row gets cramped. Drop the highlight lift
             + scale so all three cards sit on a single visual baseline (and
             eventually stack at 768). */
          .pricing-card-wrap-highlight { transform: none !important; }
        }
        @media (max-width: 768px) {
          .pricing-cards { flex-direction: column !important; align-items: stretch !important; gap: 40px !important; }
          .pricing-cards > * { width: 100% !important; max-width: 100% !important; flex: none !important; transform: none !important; }
          .nav-links { display: none !important; }
          .pricing-section { padding: 56px 20px 80px !important; }
          .pricing-section-inner { padding: 0 !important; }
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
          overflow: "clip",
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

        <ScrollReveal from="up" delay={0} style={{ position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            border: "1px solid rgba(201,168,76,0.4)",
            borderRadius: 24,
            marginBottom: 28,
            background: "rgba(201,168,76,0.08)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block", animation: "pdot 2s infinite" }} />
            <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase" }}>Pricing</span>
          </div>

          <AnimatedHeading text="Free forever," accentText="for everyone." style={{ fontFamily: "Space Mono, monospace", fontSize: "clamp(32px,4.4vw,60px)", fontWeight: 700, color: "var(--text)", letterSpacing: -1.5, lineHeight: 1.12, marginBottom: 16 }} />

          <p style={{
            fontSize: "clamp(15px,2vw,18px)",
            color: "#c9a84c",
            fontWeight: 500,
            marginBottom: 12,
            letterSpacing: 0.2,
          }}>
            Lite stays free. Two paid tiers coming soon.
          </p>
        </ScrollReveal>
      </section>

      {/* PRICING CARDS */}
      <section className="pricing-section" style={{ position: "relative", zIndex: 1, padding: "40px 24px 140px" }}>
        <div
          className="pricing-cards"
          style={{
            display: "flex",
            gap: 24,
            maxWidth: 1200,
            margin: "0 auto",
            justifyContent: "center",
            alignItems: "stretch",
            flexWrap: "wrap",
          }}
        >
          {PRICING_PLANS.map((plan, i) => (
            <PricingCard key={plan.id} plan={plan} delay={i * 0.1} />
          ))}
        </div>
      </section>

      {/* FEATURE VOTING */}
      <FeatureVoteSection />

      {/* FOUNDING MEMBER */}
      <FoundingMemberSection />

      {/* FOOTER */}
      <PublicFooter />
    </div>
  );
}
