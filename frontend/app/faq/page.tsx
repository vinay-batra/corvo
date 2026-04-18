"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

/* ─── Data ─── */
const SECTIONS = [
  {
    category: "General",
    items: [
      {
        q: "What is Corvo?",
        a: "Corvo is an AI-powered portfolio analytics platform built for retail investors. Think institutional-grade insights: Sharpe ratio, drawdown analysis, Monte Carlo simulations, sector exposure, without any price tag. Enter your tickers, get professional-grade analysis in seconds.",
      },
      {
        q: "Is Corvo free?",
        a: "Yes, Corvo is completely free during the beta period. A Pro tier is coming soon with unlimited AI chat, advanced analytics, and priority support. Beta users will get early access and locked-in pricing.",
      },
      {
        q: "Do I need a brokerage account?",
        a: "No brokerage connection required. Just enter your tickers and portfolio weights manually, or import via a CSV file. Corvo never asks for brokerage credentials or account numbers.",
      },
      {
        q: "Is my data safe?",
        a: "Your data is encrypted in transit and at rest, stored securely via Supabase. We never sell your data to third parties, share it with advertisers, or use it to train external models. You can delete your account and all associated data at any time.",
      },
      {
        q: "What brokerages are supported for CSV import?",
        a: "Corvo supports CSV exports from Fidelity, Charles Schwab, and Robinhood out of the box. Any generic CSV with ticker and weight (or share quantity) columns also works.",
      },
    ],
  },
  {
    category: "Features",
    items: [
      {
        q: "How does the AI analysis work?",
        a: "Corvo uses Claude AI to analyze your portfolio's risk profile, diversification, and performance characteristics against market benchmarks. The AI reads your actual holdings and weights, so its insights are specific to your portfolio, not generic market commentary.",
      },
      {
        q: "What is the Sharpe ratio?",
        a: "The Sharpe ratio measures risk-adjusted return: how much return you're earning per unit of risk taken. A Sharpe above 1.0 is generally considered good; above 2.0 is excellent. A negative Sharpe means you'd be better off in a risk-free asset like T-bills.",
      },
      {
        q: "What is Monte Carlo simulation?",
        a: "Corvo runs 300 forward simulations of your portfolio's possible outcomes based on each holding's historical volatility and correlation. You'll see a range of projected values, including the best case, median, and worst case, giving you a realistic picture of what to expect over your chosen time horizon.",
      },
      {
        q: "How accurate are the AI insights?",
        a: "AI insights are educational and informational only, not financial advice. They're based on historical data and statistical models. Markets are unpredictable, and past performance never guarantees future results. Always consult a qualified financial advisor before making investment decisions.",
      },
      {
        q: "How does the Learn page work?",
        a: "The Learn section features interactive investing lessons organized by topic (fundamentals, risk, options, etc.). Complete lessons to earn XP, level up, take daily challenges, and play investing mini-games. It's designed to build real financial literacy, not just throw definitions at you.",
      },
      {
        q: "What is tax loss harvesting?",
        a: "Tax loss harvesting means strategically selling losing positions to realize a capital loss, which offsets taxable gains elsewhere in your portfolio. Corvo identifies harvesting candidates in your portfolio and suggests replacement securities with similar exposure that avoid IRS wash sale rules.",
      },
    ],
  },
  {
    category: "AI Chat",
    items: [
      {
        q: "How many AI chat messages do I get?",
        a: "Free accounts get 15 AI chat messages per day. You can earn up to 40 daily messages by referring friends, with each successful referral adding extra daily quota. Pro subscribers get unlimited messages.",
      },
      {
        q: "Can I ask the AI anything?",
        a: "You can ask anything, but the AI is tuned for portfolio and investing questions. It works best with prompts like \"Is my tech allocation too high?\", \"What's dragging down my Sharpe ratio?\", or \"Should I rebalance before year-end?\" General chat outside finance will still work, but that's not where it shines.",
      },
    ],
  },
  {
    category: "Pro: Coming Soon",
    items: [
      {
        q: "What is Corvo Pro?",
        a: "Corvo Pro is the upcoming paid tier designed for serious investors. It includes unlimited AI chat, advanced analytics (tax loss harvesting, options chain analysis, multi-portfolio tracking), real-time alerts, priority support, and early access to every new feature.",
      },
      {
        q: "When is Pro launching?",
        a: "Soon. We're finishing the final features before launch. Join the waitlist from the homepage to get notified the moment Pro is available, and to lock in early-bird pricing before the public launch.",
      },
    ],
  },
];

/* ─── Accordion item ─── */
function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "20px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: open ? "#e8e0cc" : "rgba(232,224,204,0.75)",
            lineHeight: 1.5,
            transition: "color 0.2s",
          }}
        >
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: 6,
            background: open ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${open ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.06)"}`,
            fontSize: 16,
            color: open ? "#c9a84c" : "rgba(232,224,204,0.35)",
            transition: "background 0.2s, border-color 0.2s, color 0.2s",
          }}
        >
          +
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <p
              style={{
                fontSize: 14,
                color: "rgba(232,224,204,0.55)",
                lineHeight: 1.8,
                paddingBottom: 20,
                fontWeight: 300,
              }}
            >
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main page ─── */
export default function FaqPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q)
      ),
    })).filter((s) => s.items.length > 0);
  }, [query]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0e14",
        color: "#e8e0cc",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Nav */}
      <PublicNav />

      {/* Hero */}
      <section
        style={{
          textAlign: "center",
          padding: "72px 24px 56px",
          position: "relative",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 300,
            background:
              "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
            filter: "blur(40px)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: "relative" }}
        >
          <p
            style={{
              fontSize: 9,
              letterSpacing: 3,
              color: "#c9a84c",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Help Center
          </p>
          <h1
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 700,
              color: "#e8e0cc",
              letterSpacing: -1.5,
              marginBottom: 16,
              lineHeight: 1.15,
            }}
          >
            Frequently Asked Questions
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "rgba(232,224,204,0.4)",
              maxWidth: 480,
              margin: "0 auto 40px",
              lineHeight: 1.7,
              fontWeight: 300,
            }}
          >
            Everything you need to know about Corvo. Can&apos;t find your
            answer? Chat with our AI below.
          </p>

          {/* Search */}
          <div style={{ maxWidth: 480, margin: "0 auto", position: "relative" }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(232,224,204,0.3)"
              strokeWidth="2"
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search questions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "13px 18px 13px 40px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                color: "#e8e0cc",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(201,168,76,0.4)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.08)")
              }
            />
          </div>
        </motion.div>
      </section>

      {/* Loom Video Embed */}
      <motion.section
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 64px" }}
      >
        <p style={{ fontSize: 9, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", textAlign: "center", marginBottom: 14 }}>
          Video Walkthrough
        </p>
        <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, color: "#e8e0cc", letterSpacing: -1, textAlign: "center", marginBottom: 28 }}>
          See Corvo in 2 minutes
        </h2>
        <div style={{
          background: "rgba(8,11,16,0.9)",
          border: "1px solid rgba(201,168,76,0.22)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(201,168,76,0.06), 0 24px 64px rgba(0,0,0,0.5)",
        }}>
          <iframe
            src="https://www.loom.com/embed/9a1f9818afcd45bbb199b71d6e3d2120"
            allowFullScreen
            style={{
              width: "100%",
              height: 400,
              border: "none",
              display: "block",
            }}
            title="Corvo product walkthrough"
          />
        </div>
        <p style={{ fontSize: 11, color: "rgba(232,224,204,0.2)", textAlign: "center", marginTop: 12 }}>
          No sound required · 2 min · No signup needed to watch
        </p>
      </motion.section>

      {/* Content */}
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: "center", padding: "60px 0", color: "rgba(232,224,204,0.3)", fontSize: 14 }}
            >
              No results for &ldquo;{query}&rdquo;. Try a different search term.
            </motion.div>
          ) : (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {filtered.map((section, si) => (
                <motion.section
                  key={section.category}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: si * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  style={{ marginBottom: 56 }}
                >
                  <p
                    style={{
                      fontSize: 9,
                      letterSpacing: 3,
                      color: "#c9a84c",
                      textTransform: "uppercase",
                      marginBottom: 4,
                      fontFamily: "Space Mono, monospace",
                    }}
                  >
                    {section.category}
                  </p>
                  <div
                    style={{
                      height: 1,
                      background:
                        "linear-gradient(to right, rgba(201,168,76,0.2), transparent)",
                      marginBottom: 8,
                    }}
                  />
                  {section.items.map((item) => (
                    <AccordionItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </motion.section>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Still have questions? */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: 16,
            padding: "40px 36px",
            background: "rgba(201,168,76,0.04)",
            border: "1px solid rgba(201,168,76,0.12)",
            borderRadius: 20,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 9,
              letterSpacing: 3,
              color: "#c9a84c",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Still have questions?
          </p>
          <h2
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "clamp(18px, 2.5vw, 24px)",
              fontWeight: 700,
              color: "#e8e0cc",
              letterSpacing: -0.5,
              marginBottom: 12,
            }}
          >
            We&apos;re here to help
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(232,224,204,0.4)",
              lineHeight: 1.7,
              marginBottom: 28,
              maxWidth: 360,
              margin: "0 auto 28px",
              fontWeight: 300,
            }}
          >
            Ask anything about your portfolio, investing concepts, or how Corvo
            works. The AI has answers, or reach us directly.
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Link
              href="/app"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                background: "#c9a84c",
                borderRadius: 10,
                color: "#0a0e14",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: 0.3,
              }}
            >
              Ask our AI →
            </Link>
            <a
              href="mailto:hello@corvo.capital"
              style={{
                fontSize: 12,
                color: "rgba(232,224,204,0.35)",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#c9a84c")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(232,224,204,0.35)")}
            >
              or email us at hello@corvo.capital
            </a>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
