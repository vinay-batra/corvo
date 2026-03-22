"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "Is my portfolio right for my goals?",
  "Am I taking too much risk?",
  "What should I change based on my age?",
  "How do I beat the S&P 500?",
  "Suggest ETFs to diversify this portfolio",
  "What happens if the market drops 30%?",
];

// Render assistant message with markdown-like formatting
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n").filter(l => l.trim() !== "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((line, i) => {
        // Bold headers: **text** or ##text
        const isBold = line.startsWith("**") && line.includes("**:");
        const isBullet = line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/);
        const isHeader = line.startsWith("##") || (line.startsWith("**") && line.endsWith("**"));

        // Clean up markdown syntax
        let text = line
          .replace(/\*\*/g, "")
          .replace(/^##\s*/, "")
          .replace(/^[-•*]\s+/, "")
          .replace(/^\d+\.\s+/, "")
          .trim();

        if (!text) return null;

        if (isHeader || isBold) {
          return (
            <p key={i} style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--green)", textTransform: "uppercase", fontWeight: 700, marginTop: i > 0 ? 8 : 0 }}>
              {text}
            </p>
          );
        }

        if (isBullet) {
          return (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: "var(--green)", fontSize: 10, marginTop: 3, flexShrink: 0 }}>▸</span>
              <p style={{ fontSize: 13, color: "rgba(240,244,248,0.85)", lineHeight: 1.6 }}>{text}</p>
            </div>
          );
        }

        return (
          <p key={i} style={{ fontSize: 13, color: "rgba(240,244,248,0.85)", lineHeight: 1.65 }}>{text}</p>
        );
      })}
    </div>
  );
}

export default function AiChat({ portfolioContext }: { portfolioContext: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load goals from localStorage
  const goals = (() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("alphai_goals");
    if (!raw || raw === "skipped") return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setError("");
    const userMsg: Message = { role: "user", content: msg };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);
    try {
      const context = {
        ...portfolioContext,
        user_goals: goals ? {
          age: goals.age,
          salary: goals.salary,
          invested: goals.invested,
          monthly_contribution: goals.monthlyContribution,
          retirement_age: goals.retirementAge,
          risk_tolerance: goals.riskTolerance,
          goal: goals.goal,
        } : null,
      };
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages, portfolio_context: context }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      setMessages([...nextHistory, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setError(e.message || "Request failed");
      setMessages([...nextHistory, { role: "assistant", content: `Error: ${e.message || "Request failed. Check your backend is running."}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", maxWidth: 780, margin: "0 auto" }}>

      {/* Goals context banner */}
      {goals && goals.age && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 16, padding: "10px 16px", background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
        >
          <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--cyan-dim)", textTransform: "uppercase" }}>Your Profile</span>
          {[
            goals.age && `Age ${goals.age}`,
            goals.riskTolerance && goals.riskTolerance.replace("_time", ""),
            goals.goal,
            goals.invested && `$${Number(goals.invested).toLocaleString()} invested`,
          ].filter(Boolean).map((item, i) => (
            <span key={i} style={{ fontSize: 11, color: "rgba(240,244,248,0.5)", background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)" }}>{item}</span>
          ))}
        </motion.div>
      )}

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
        {messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 900, color: "var(--green)", letterSpacing: 4, textShadow: "0 0 30px rgba(0,255,160,0.3)", marginBottom: 8 }}>
              ALPHA<span style={{ color: "rgba(255,255,255,0.2)" }}>i</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 40, letterSpacing: 1 }}>
              {goals?.age ? `Hi! I know you're ${goals.age} with a ${goals.riskTolerance?.replace("_time", "")} risk profile. Ask me anything.` : "Ask anything about your portfolio"}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} onClick={() => send(s)}
                  style={{ padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--border-mid)", borderRadius: 10, color: "rgba(255,255,255,0.78)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,255,160,0.3)"; e.currentTarget.style.color = "var(--green)"; e.currentTarget.style.background = "var(--green-glow)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-mid)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--bg-card)"; }}
                >{s}</motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
            <AnimatePresence>
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                  style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
                >
                  {m.role === "assistant" && (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,255,160,0.1)", border: "1px solid rgba(0,255,160,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10, marginTop: 2, fontFamily: "var(--font-display)", fontSize: 9, color: "var(--green)" }}>Ai</div>
                  )}
                  <div style={{
                    maxWidth: "74%", padding: "14px 18px",
                    borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    background: m.role === "user" ? "rgba(0,255,160,0.07)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${m.role === "user" ? "rgba(0,255,160,0.18)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                    {m.role === "user" ? (
                      <p style={{ fontSize: 13, color: "var(--green)", lineHeight: 1.5 }}>{m.content}</p>
                    ) : (
                      <MessageContent content={m.content} />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,255,160,0.1)", border: "1px solid rgba(0,255,160,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 9, color: "var(--green)" }}>Ai</div>
                <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px 14px 14px 2px", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", opacity: 0.5, animation: `pulse-dot 1.2s infinite ${i * 0.2}s` }} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border-dim)" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about your portfolio..."
          style={{ flex: 1, padding: "13px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#f0f4f8", fontSize: 13, fontFamily: "var(--font-body)", outline: "none", transition: "border-color 0.2s" }}
          onFocus={e => e.target.style.borderColor = "rgba(0,255,160,0.4)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          style={{ padding: "13px 22px", background: input.trim() && !loading ? "rgba(0,255,160,0.1)" : "transparent", border: `1px solid ${input.trim() && !loading ? "rgba(0,255,160,0.4)" : "var(--border-dim)"}`, borderRadius: 10, color: input.trim() && !loading ? "var(--green)" : "var(--text-muted)", fontSize: 12, letterSpacing: 2, fontFamily: "var(--font-display)", cursor: input.trim() && !loading ? "pointer" : "default", transition: "all 0.2s" }}
        >SEND</button>
      </div>
    </div>
  );
}
