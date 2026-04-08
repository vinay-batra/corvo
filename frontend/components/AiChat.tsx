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

// Corvo raven logo — circular dark container with raven img
function CorvoLogo({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)",
      border: "1px solid rgba(201,168,76,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    }}>
      <img src="/corvo-logo.svg" width={28} height={28} alt="Corvo" style={{ objectFit: "contain" }} />
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
        const text = line.replace(/\*\*/g, "").replace(/^##\s*/, "").replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
        if (!text) return null;
        if (isHeader || isBold) {
          return (
            <p key={i} style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--text)", textTransform: "uppercase", fontWeight: 700, marginTop: i > 0 ? 8 : 0 }}>
              {text}
            </p>
          );
        }
        if (isBullet) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: "var(--text2)", fontSize: 10, marginTop: 4, flexShrink: 0 }}>▸</span>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{text}</p>
            </div>
          );
        }
        return <p key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }}>{text}</p>;
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

  const goals = goalsProp || (() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("corvo_goals");
    if (!raw || raw === "skipped") return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();

  const portfolioContext = data ? {
    tickers: data.tickers || assets?.map((a: any) => a.ticker) || [],
    weights: data.weights || assets?.map((a: any) => a.weight / 100) || [],
    portfolio_return: data.portfolio_return,
    portfolio_volatility: data.portfolio_volatility,
    max_drawdown: data.max_drawdown,
    sharpe_ratio: data.sharpe_ratio,
    period: data.period,
    user_goals: goals ? {
      age: goals.age, salary: goals.salary, invested: goals.invested,
      monthly_contribution: goals.monthlyContribution, retirement_age: goals.retirementAge,
      risk_tolerance: goals.riskTolerance, goal: goals.goal,
    } : null,
  } : {
    tickers: assets?.map((a: any) => a.ticker) || [],
    user_goals: goals ? {
      age: goals.age, salary: goals.salary, invested: goals.invested,
      monthly_contribution: goals.monthlyContribution, retirement_age: goals.retirementAge,
      risk_tolerance: goals.riskTolerance, goal: goals.goal,
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
      // Fetch real-time prices for portfolio tickers before each message
      const tickers: string[] = portfolioContext.tickers || [];
      let market_context = "";
      if (tickers.length > 0) {
        try {
          const priceResults = await Promise.all(
            tickers.slice(0, 8).map(async (ticker: string) => {
              try {
                const r = await fetch(`${API_URL}/stock/${encodeURIComponent(ticker)}`);
                if (!r.ok) return null;
                const d = await r.json();
                return `${ticker}: $${d.price?.toFixed(2) ?? "N/A"} (${d.change_pct != null ? (d.change_pct >= 0 ? "+" : "") + d.change_pct.toFixed(2) + "%" : "N/A"})`;
              } catch { return null; }
            })
          );
          const lines = priceResults.filter(Boolean);
          if (lines.length > 0) {
            market_context = `Current prices — ${lines.join(", ")}`;
          }
        } catch {}
      }

      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages, portfolio_context: portfolioContext, market_context }),
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
          background: "var(--bg3)", border: "0.5px solid var(--border)",
          borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Profile</span>
          {[
            goals.age && `Age ${goals.age}`,
            goals.riskTolerance?.replace("_time", ""),
            goals.goal,
            goals.invested && `$${Number(goals.invested).toLocaleString()} invested`,
          ].filter(Boolean).map((item, i) => (
            <span key={i} style={{ fontSize: 11, color: "var(--text2)", background: "var(--card-bg)", padding: "2px 8px", borderRadius: 4, border: "0.5px solid var(--border)" }}>{item}</span>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 12, minHeight: 0 }}>
        {messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center", paddingTop: 48 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <CorvoLogo size={52} />
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: 3, marginBottom: 6 }}>
              CORVO AI
            </div>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 32 }}>
              {goals?.age
                ? `Hi! I know you're ${goals.age} with a ${goals.riskTolerance?.replace("_time", "")} risk profile. Ask me anything.`
                : "Ask anything about your portfolio"}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  onClick={() => send(s)}
                  style={{ padding: "9px 14px", background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text2)", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text2)"; }}
                >{s}</motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
            <AnimatePresence>
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                  style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
                  {m.role === "assistant" && <CorvoLogo size={28} />}
                  <div style={{
                    maxWidth: "74%", padding: "12px 16px",
                    borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: m.role === "user" ? "var(--text)" : "var(--card-bg)",
                    border: m.role === "user" ? "none" : "0.5px solid var(--border)",
                  }}>
                    {m.role === "user"
                      ? <p style={{ fontSize: 13, color: "var(--bg)", lineHeight: 1.5 }}>{m.content}</p>
                      : <MessageContent content={m.content} />
                    }
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <CorvoLogo size={28} />
                <div style={{ padding: "12px 16px", background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: "12px 12px 12px 2px", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text2)", opacity: 0.5, animation: `pulse 1.2s infinite ${i * 0.2}s` }} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "0.5px solid var(--border)", flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about your portfolio..."
          style={{ flex: 1, padding: "11px 14px", background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none", transition: "border-color 0.15s" }}
          onFocus={e => e.target.style.borderColor = "var(--border2)"}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{ padding: "11px 18px", background: input.trim() && !loading ? "var(--text)" : "transparent", border: "0.5px solid", borderColor: input.trim() && !loading ? "var(--text)" : "var(--border)", borderRadius: 8, color: input.trim() && !loading ? "var(--bg)" : "var(--text3)", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, cursor: input.trim() && !loading ? "pointer" : "default", transition: "all 0.15s", fontFamily: "var(--font-mono)" }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
