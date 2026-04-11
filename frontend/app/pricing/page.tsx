"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
      {/* Ambient glow for Pro */}
      {isPro && (
        <div style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(201,168,76,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
      )}

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

      {isPro && (
        <p style={{ fontSize: 11, color: "rgba(201,168,76,0.6)", marginBottom: 6, fontStyle: "italic" }}>
          Early bird pricing TBD
        </p>
      )}

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

export default function PricingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { ref: faqRef, visible: faqVisible } = useReveal(0.05);
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
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 58,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 56px",
        background: navSolid ? "rgba(10,14,20,0.92)" : "rgba(10,14,20,0.6)",
        backdropFilter: "blur(16px)",
        borderBottom: navSolid ? "1px solid rgba(201,168,76,0.07)" : "1px solid rgba(255,255,255,0.03)",
        transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <img src="/corvo-logo.svg" width={28} height={28} alt="Corvo" />
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "#e8e0cc" }}>CORVO</span>
        </Link>
        <div className="nav-links" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/pricing" style={{ padding: "7px 16px", fontSize: 12, color: "#c9a84c", textDecoration: "none", letterSpacing: 0.3 }}>Pricing</Link>
          <Link href="/learn" style={{ padding: "7px 16px", fontSize: 12, color: "rgba(232,224,204,0.4)", textDecoration: "none", letterSpacing: 0.3 }}>Learn</Link>
          <Link href="/auth" style={{ padding: "7px 16px", fontSize: 12, color: "rgba(232,224,204,0.4)", textDecoration: "none", letterSpacing: 0.3 }}>Log in</Link>
          <Link href="/auth" style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: "#c9a84c", borderRadius: 8, color: "#0a0e14", textDecoration: "none" }}>Get Started</Link>
        </div>
      </nav>

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
            letterSpacing: -2.5,
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

          <p style={{
            fontSize: 14,
            color: "rgba(232,224,204,0.35)",
            lineHeight: 1.8,
            maxWidth: 440,
            margin: "0 auto",
          }}>
            No credit card. No trial period. Bloomberg-quality analytics, free.
          </p>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 24px 100px" }}>
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

      {/* FAQ */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 24px 100px" }}>
        <div
          ref={faqRef}
          style={{
            maxWidth: 680,
            margin: "0 auto",
            opacity: faqVisible ? 1 : 0,
            transform: faqVisible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>
            FAQ
          </p>
          <h2 style={{
            fontFamily: "Space Mono,monospace",
            fontSize: "clamp(20px,3vw,30px)",
            fontWeight: 700,
            letterSpacing: -1,
            color: "#e8e0cc",
            textAlign: "center",
            marginBottom: 48,
          }}>
            Questions about pricing
          </h2>

          {FAQS.map(({ q, a }) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* TRUST BADGE */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 24px 120px", textAlign: "center" }}>
        <div
          ref={trustRef}
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            opacity: trustVisible ? 1 : 0,
            transform: trustVisible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
            transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(201,168,76,0.05)",
            border: "1px solid rgba(201,168,76,0.15)",
            borderRadius: 16,
            padding: "18px 32px",
          }}>
            <span style={{ fontSize: 22 }}>🔒</span>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#e8e0cc", marginBottom: 2 }}>
                100% free during beta
              </p>
              <p style={{ fontSize: 12, color: "rgba(232,224,204,0.4)" }}>
                No credit card required · Cancel anytime · Your data is yours
              </p>
            </div>
          </div>

          <Link
            href="/auth"
            style={{
              marginTop: 8,
              padding: "13px 36px",
              borderRadius: 12,
              fontSize: 14,
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
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "26px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/corvo-logo.svg" width={16} height={13} alt="Corvo" style={{ opacity: 0.5 }} />
            <span style={{ fontFamily: "Space Mono,monospace", fontSize: 10, fontWeight: 700, letterSpacing: 3, color: "rgba(232,224,204,0.2)" }}>CORVO</span>
          </div>
          <p style={{ fontSize: 11, color: "rgba(232,224,204,0.18)" }}>© 2026 Corvo. All rights reserved.</p>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <Link href="/pricing" style={{ fontSize: 11, color: "rgba(201,168,76,0.5)", textDecoration: "none" }}>Pricing</Link>
            <Link href="/privacy" style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", textDecoration: "none" }}>Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
