"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import FeedbackButton from "../../components/FeedbackButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
        a: "Corvo runs 8,500 forward simulations of your portfolio's possible outcomes based on each holding's historical volatility and correlation. You'll see a range of projected values, including the best case, median, and worst case, giving you a realistic picture of what to expect over your chosen time horizon.",
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
    category: "Pro",
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
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: "1px solid var(--bg3)",
        borderLeft: hovered ? "2px solid rgba(201,168,76,0.55)" : "2px solid transparent",
        paddingLeft: hovered ? 12 : 12,
        overflow: "hidden",
        transition: "border-left-color 0.2s",
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
            color: open ? "var(--text)" : "var(--text2)",
            lineHeight: 1.5,
            transition: "color 0.2s",
          }}
        >
          {q}
        </span>
        <motion.span
          className="faq-toggle"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background: open ? "rgba(201,168,76,0.12)" : "var(--bg3)",
            border: `1px solid ${open ? "rgba(201,168,76,0.25)" : "var(--bg3)"}`,
            fontSize: 16,
            color: open ? "#c9a84c" : "var(--text3)",
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
                color: "var(--text2)",
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

/* ─── Inline AI Chat ─── */
interface ChatMessage { role: "user" | "assistant"; content: string; }

function FAQAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.content }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div
      id="faq-ai-chat"
      style={{
        marginTop: 48,
        border: "1px solid rgba(201,168,76,0.4)",
        borderRadius: 20,
        overflow: "hidden",
        background: "var(--card-bg)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Space Mono,monospace", fontSize: 12, fontWeight: 700, color: "#c9a84c", flexShrink: 0 }}>
          C
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>Corvo AI</p>
          <p style={{ fontSize: 11, color: "var(--text3)", margin: 0 }}>Ask anything about Corvo or investing</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: 12, minHeight: 180, maxHeight: 360, overflowY: "auto" }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text3)", textAlign: "center", marginTop: 48, lineHeight: 1.7 }}>
            Ask about Sharpe ratio, Monte Carlo simulation, portfolio diversification, or how Corvo works.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "78%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
              background: msg.role === "user" ? "#c9a84c" : "var(--bg3)",
              border: msg.role === "assistant" ? "1px solid var(--bg3)" : "none",
              fontSize: 13,
              lineHeight: 1.65,
              color: msg.role === "user" ? "var(--bg)" : "var(--text2)",
              fontWeight: msg.role === "user" ? 500 : 300,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 16px", borderRadius: "12px 12px 12px 3px", background: "var(--bg3)", border: "1px solid var(--bg3)", fontSize: 18, color: "var(--text3)", letterSpacing: 2 }}>...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about Corvo or investing..."
          style={{ flex: 1, padding: "11px 14px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontSize: 13, outline: "none", transition: "border-color 0.2s" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(201,168,76,0.35)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ padding: "0 18px", height: 42, borderRadius: 10, background: loading || !input.trim() ? "rgba(201,168,76,0.25)" : "#c9a84c", border: "none", cursor: loading || !input.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s, filter 0.15s" }}
          onMouseEnter={e => { if (!loading && input.trim()) (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = "none"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function FaqPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "transparent",
        color: "var(--text)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <style>{`
        @media(max-width:600px){
          .faq-main{padding:72px 16px 64px!important}
          .faq-section{padding:0!important}
          .faq-card{padding:12px 14px!important}
        }
        .faq-toggle{width:24px;height:24px;min-width:24px;min-height:24px;border-radius:6px}
        @media(max-width:768px){
          .faq-toggle{width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;border-radius:8px!important}
        }
      `}</style>
      <PublicNav />

      <main
        className="faq-main"
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "80px 24px 80px",
        }}
      >
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center", marginBottom: 56, position: "relative", overflow: "hidden" }}
        >
          {/* Ambient glow */}
          <div
            style={{
              position: "absolute",
              top: -40,
              left: "50%",
              transform: "translateX(-50%)",
              width: 600,
              height: 260,
              background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)",
              pointerEvents: "none",
              filter: "blur(40px)",
            }}
          />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 24, marginBottom: 28, background: "rgba(201,168,76,0.08)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block" }} />
            <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase" }}>FAQ</span>
          </div>
          <h1
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: -1.5,
              marginBottom: 16,
              lineHeight: 1.15,
              position: "relative",
            }}
          >
            Frequently Asked Questions
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: 15,
            color: "var(--text3)",
            maxWidth: 480,
            margin: "0 auto 56px",
            lineHeight: 1.7,
            fontWeight: 300,
            textAlign: "center",
          }}
        >
          Everything you need to know about Corvo. Can&apos;t find your answer? Chat with our AI below.
        </motion.p>

        {/* Accordion sections */}
        {SECTIONS.map((section, si) => (
          <motion.section
            key={section.category}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 + si * 0.05, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 24 }}
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
                background: "linear-gradient(to right, rgba(201,168,76,0.2), transparent)",
                marginBottom: 8,
              }}
            />
            {section.items.map((item) => (
              <AccordionItem key={item.q} q={item.q} a={item.a} />
            ))}
          </motion.section>
        ))}

        {/* Inline AI Chat */}
        <FAQAIChat />
      </main>

      <PublicFooter />
      <FeedbackButton />
    </div>
  );
}
