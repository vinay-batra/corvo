"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const C = {
  amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", amber3: "rgba(201,168,76,0.06)",
  navy3: "#111620", border: "rgba(255,255,255,0.06)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.65)", cream3: "rgba(232,224,204,0.3)",
};

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "Is my portfolio right for my goals?",
  "Am I taking too much risk?",
  "What should I change based on my age?",
  "How do I beat the S&P 500?",
  "Suggest ETFs to diversify this portfolio",
  "What happens if the market drops 30%?",
];

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n").filter(l => l.trim() !== "");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((line, i) => {
        const isBullet = line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/);
        const isHeader = line.startsWith("##") || (line.startsWith("**") && line.endsWith("**"));
        const isBold = line.startsWith("**") && line.includes("**:");
        let text = line.replace(/\*\*/g,"").replace(/^##\s*/,"").replace(/^[-•*]\s+/,"").replace(/^\d+\.\s+/,"").trim();
        if (!text) return null;
        if (isHeader || isBold) return <p key={i} style={{ fontSize: 10, letterSpacing: 2, color: C.amber, textTransform: "uppercase", fontWeight: 700, marginTop: i > 0 ? 10 : 0 }}>{text}</p>;
        if (isBullet) return (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ color: C.amber, fontSize: 10, marginTop: 4, flexShrink: 0 }}>▸</span>
            <p style={{ fontSize: 13, color: C.cream2, lineHeight: 1.65 }}>{text}</p>
          </div>
        );
        return <p key={i} style={{ fontSize: 13, color: C.cream2, lineHeight: 1.7 }}>{text}</p>;
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0,1,2].map(i => (
        <motion.div key={i} animate={{ opacity: [0.2,1,0.2], y: [0,-3,0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          style={{ width: 5, height: 5, borderRadius: "50%", background: C.amber }} />
      ))}
    </div>
  );
}

export default function AiChat({ portfolioContext }: { portfolioContext: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const goals = (() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("corvo_goals");
    if (!raw || raw === "skipped") return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput(""); setError("");
    const newMessages: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          portfolio_context: {
            ...portfolioContext,
            user_goals: goals ? { age: goals.age, salary: goals.salary, invested: goals.invested, monthly_contribution: goals.monthlyContribution, retirement_age: goals.retirementAge, risk_tolerance: goals.riskTolerance, goal: goals.goal } : null,
          },
        }),
      });
      const data = await res.json();
      setMessages(p => [...p, { role: "assistant", content: data.reply || "Sorry, I couldn't process that." }]);
    } catch { setError("Connection failed. Make sure the backend is running."); }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowX: "hidden", background: C.navy3, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {goals && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: "10px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 8, letterSpacing: 2, color: C.cream3, textTransform: "uppercase" }}>Your Profile</span>
          {[goals.age && `Age ${goals.age}`, goals.riskTolerance, goals.goal, goals.invested && `$${Number(goals.invested).toLocaleString()} invested`].filter(Boolean).map((tag: any, i: number) => (
            <span key={i} style={{ padding: "3px 9px", background: C.amber2, border: "1px solid rgba(201,168,76,0.25)", borderRadius: 20, fontSize: 11, color: C.amber, fontWeight: 500 }}>{tag}</span>
          ))}
        </motion.div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 10px" }}>
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 24, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, border: "1px solid rgba(201,168,76,0.3)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: C.amber2 }}>
              <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
                <path d="M14 28 A8 8 0 1 1 26 28" stroke={C.amber} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <circle cx="20" cy="20" r="3" fill={C.amber}/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 500, color: C.cream, marginBottom: 6 }}>Your AI Portfolio Analyst</p>
              <p style={{ fontSize: 13, color: C.cream3, lineHeight: 1.7 }}>Ask anything about your portfolio in plain English</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 560 }}>
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.07 }}
                  onClick={() => send(s)}
                  style={{ padding: "10px 14px", background: C.amber3, border: "1px solid rgba(201,168,76,0.18)", borderRadius: 10, color: C.cream2, fontSize: 12, cursor: "pointer", textAlign: "left", lineHeight: 1.5, transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.amber2; e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)"; e.currentTarget.style.color = C.amber; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.amber3; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)"; e.currentTarget.style.color = C.cream2; }}>
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              style={{ marginBottom: 16, display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "user" ? (
                <div style={{ maxWidth: "70%", padding: "10px 16px", background: C.amber2, border: "1px solid rgba(201,168,76,0.3)", borderRadius: "12px 12px 4px 12px", color: C.cream, fontSize: 13, lineHeight: 1.6 }}>{m.content}</div>
              ) : (
                <div style={{ display: "flex", gap: 12, maxWidth: "88%", alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, flexShrink: 0, border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: C.amber2, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: C.amber, fontWeight: 700 }}>Ai</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: "4px 12px 12px 12px", padding: "12px 16px" }}>
                    <MessageContent content={m.content} />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, flexShrink: 0, border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: C.amber2 }}>
              <span style={{ fontSize: 10, color: C.amber, fontWeight: 700 }}>Ai</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: "4px 12px 12px 12px", padding: "12px 16px" }}>
              <TypingDots />
            </div>
          </motion.div>
        )}

        {error && <div style={{ padding: "10px 14px", background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.25)", borderRadius: 10, fontSize: 12, color: "#e05c5c", marginBottom: 12 }}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask anything about your portfolio..." rows={1}
            style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${focused ? "rgba(201,168,76,0.4)" : C.border}`, borderRadius: 10, color: C.cream, fontSize: 13, resize: "none", outline: "none", fontFamily: "Inter,sans-serif", lineHeight: 1.5, transition: "border-color 0.15s" }} />
          <button onClick={() => send(input)} disabled={loading || !input.trim()}
            style={{ width: 40, height: 40, borderRadius: 10, background: input.trim() && !loading ? C.amber : "rgba(201,168,76,0.15)", border: "none", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
            {loading
              ? <div style={{ width: 14, height: 14, border: "1.5px solid rgba(10,14,20,0.3)", borderTopColor: "#0a0e14", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              : <span style={{ color: input.trim() ? "#0a0e14" : "rgba(201,168,76,0.4)", fontSize: 16, lineHeight: 1 }}>↑</span>}
          </button>
        </div>
        <p style={{ fontSize: 10, color: C.cream3, marginTop: 6, textAlign: "center" }}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
