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

// Corvo raven logo — minimal geometric bird
function CorvoLogo({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#111", border: "1px solid rgba(0,0,0,0.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 18 18" fill="none">
        {/* Body */}
        <ellipse cx="9" cy="11" rx="4" ry="5" fill="#fff" opacity="0.92"/>
        {/* Head */}
        <circle cx="9" cy="5.5" r="3" fill="#fff" opacity="0.92"/>
        {/* Beak */}
        <path d="M11 5.5 L13.5 6.2 L11 7" fill="#fff" opacity="0.7"/>
        {/* Wing hint */}
        <path d="M5 9 Q3 11 4 14 Q6 12 9 13" fill="#fff" opacity="0.45"/>
        {/* Eye */}
        <circle cx="10.2" cy="5.2" r="0.8" fill="#111"/>
      </svg>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n").filter(l => l.trim() !== "");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((line, i) => {
        const isBold = line.startsWith("**") && line.includes("**:");
        const isBullet = line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/);
        const isHeader = line.startsWith("##") || (line.startsWith("**") && line.endsWith("**"));
        let text = line.replace(/\*\*/g, "").replace(/^##\s*/, "").replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
        if (!text) return null;
        if (isHeader || isBold) {
          return (
            <p key={i} style={{ fontSize: 10, letterSpacing: 1.5, color: "#111", textTransform: "uppercase", fontWeight: 700, marginTop: i > 0 ? 8 : 0 }}>
              {text}
            </p>
          );
        }
        if (isBullet) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: "#111", fontSize: 10, marginTop: 4, flexShrink: 0 }}>▸</span>
              <p style={{ fontSize: 13, color: "#111", lineHeight: 1.6 }}>{text}</p>
            </div>
          );
        }
        return <p key={i} style={{ fontSize: 13, color: "#111", lineHeight: 1.65 }}>{text}</p>;
      })}
    </div>
  );
}

export default function AiChat({ data, assets, goals: goalsProp }: {
  data?: any;
  assets?: any[];
  goals?: any;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load goals from props or localStorage
  const goals = goalsProp || (() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("corvo_goals");
    if (!raw || raw === "skipped") return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();

  // Build portfolio context from data + assets
  const portfolioContext = data ? {
    tickers: data.tickers || assets?.map((a: any) => a.ticker) || [],
    weights: data.weights || assets?.map((a: any) => a.weight / 100) || [],
    portfolio_return: data.portfolio_return,
    portfolio_volatility: data.portfolio_volatility,
    max_drawdown: data.max_drawdown,
    sharpe_ratio: data.sharpe_ratio,
    period: data.period,
    user_goals: goals ? {
      age: goals.age,
      salary: goals.salary,
      invested: goals.invested,
      monthly_contribution: goals.monthlyContribution,
      retirement_age: goals.retirementAge,
      risk_tolerance: goals.riskTolerance,
      goal: goals.goal,
    } : null,
  } : {
    tickers: assets?.map((a: any) => a.ticker) || [],
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: msg };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages, portfolio_context: portfolioContext }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setMessages([...nextHistory, { role: "assistant", content: d.reply }]);
    } catch (e: any) {
      setMessages([...nextHistory, { role: "assistant", content: `Error: ${e.message || "Request failed."}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* Goals banner */}
      {goals?.age && (
        <div style={{
          marginBottom: 12, padding: "8px 14px",
          background: "#f8f8f7", border: "0.5px solid rgba(0,0,0,0.1)",
          borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 9, letterSpacing: 2, color: "#9b9b98", textTransform: "uppercase" }}>Profile</span>
          {[
            goals.age && `Age ${goals.age}`,
            goals.riskTolerance?.replace("_time", ""),
            goals.goal,
            goals.invested && `$${Number(goals.invested).toLocaleString()} invested`,
          ].filter(Boolean).map((item, i) => (
            <span key={i} style={{ fontSize: 11, color: "#6b6b68", background: "#fff", padding: "2px 8px", borderRadius: 4, border: "0.5px solid rgba(0,0,0,0.1)" }}>{item}</span>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 12, minHeight: 0 }}>
        {messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center", paddingTop: 48 }}>
            {/* Corvo logo large */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "#111", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
                  <ellipse cx="9" cy="11" rx="4" ry="5" fill="#fff" opacity="0.92"/>
                  <circle cx="9" cy="5.5" r="3" fill="#fff" opacity="0.92"/>
                  <path d="M11 5.5 L13.5 6.2 L11 7" fill="#fff" opacity="0.7"/>
                  <path d="M5 9 Q3 11 4 14 Q6 12 9 13" fill="#fff" opacity="0.45"/>
                  <circle cx="10.2" cy="5.2" r="0.8" fill="#111"/>
                </svg>
              </div>
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: "#111", letterSpacing: 3, marginBottom: 6 }}>
              CORVO AI
            </div>
            <p style={{ fontSize: 13, color: "#9b9b98", marginBottom: 32 }}>
              {goals?.age
                ? `Hi! I know you're ${goals.age} with a ${goals.riskTolerance?.replace("_time", "")} risk profile. Ask me anything.`
                : "Ask anything about your portfolio"}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  onClick={() => send(s)}
                  style={{ padding: "9px 14px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 8, color: "#6b6b68", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.25)"; e.currentTarget.style.color = "#111"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; e.currentTarget.style.color = "#6b6b68"; }}
                >{s}</motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
            <AnimatePresence>
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                  style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}
                >
                  {m.role === "assistant" && <CorvoLogo size={28} />}
                  <div style={{
                    maxWidth: "74%", padding: "12px 16px",
                    borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: m.role === "user" ? "#111" : "#fff",
                    border: m.role === "user" ? "none" : "0.5px solid rgba(0,0,0,0.1)",
                  }}>
                    {m.role === "user"
                      ? <p style={{ fontSize: 13, color: "#fff", lineHeight: 1.5 }}>{m.content}</p>
                      : <MessageContent content={m.content} />
                    }
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <CorvoLogo size={28} />
                <div style={{ padding: "12px 16px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: "12px 12px 12px 2px", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#111", opacity: 0.4, animation: `pulse 1.2s infinite ${i * 0.2}s` }} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "0.5px solid rgba(0,0,0,0.1)", flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about your portfolio..."
          style={{ flex: 1, padding: "11px 14px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.15)", borderRadius: 8, color: "#111", fontSize: 13, outline: "none", transition: "border-color 0.15s" }}
          onFocus={e => e.target.style.borderColor = "rgba(0,0,0,0.4)"}
          onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.15)"}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{ padding: "11px 18px", background: input.trim() && !loading ? "#111" : "transparent", border: "0.5px solid", borderColor: input.trim() && !loading ? "#111" : "rgba(0,0,0,0.1)", borderRadius: 8, color: input.trim() && !loading ? "#fff" : "#9b9b98", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, cursor: input.trim() && !loading ? "pointer" : "default", transition: "all 0.15s", fontFamily: "'Space Mono', monospace" }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
