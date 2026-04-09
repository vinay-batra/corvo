"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "What's my biggest risk right now?",
  "Should I rebalance?",
  "How would a market crash affect me?",
];

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  const parseInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, pi) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={pi} style={{ color: "#fff", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={pi} style={{ fontFamily: "Space Mono, monospace", fontSize: 11, color: "#c9a84c", background: "#0d1117", padding: "1px 5px", borderRadius: 4 }}>{part.slice(1, -1)}</code>;
      return part;
    });
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} style={{ background: "#0d1117", border: "1px solid #1e2a38", borderRadius: 8, padding: "12px 14px", overflowX: "auto", margin: "6px 0" }}>
          <code style={{ fontFamily: "Space Mono, monospace", fontSize: 11, color: "#c9a84c", whiteSpace: "pre" }}>
            {codeLines.join("\n")}
          </code>
        </pre>
      );
      i++;
      continue;
    }

    // Table
    if (line.includes("|") && lines[i + 1]?.includes("---")) {
      const headerCells = line.split("|").map(c => c.trim()).filter(Boolean);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").map(c => c.trim()).filter(Boolean));
        i++;
      }
      elements.push(
        <div key={i} style={{ overflowX: "auto", margin: "8px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: "#111" }}>
            <thead>
              <tr>
                {headerCells.map((h, hi) => (
                  <th key={hi} style={{ padding: "8px 12px", textAlign: "left", color: "#c9a84c", fontWeight: 600, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid #333", background: "#0d1117" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? "#111" : "#0a0a0a" }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: "8px 12px", color: "#e8e0cc", borderBottom: "1px solid #1e1e1e" }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Heading
    if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ")) {
      const text = line.replace(/^#{1,3}\s+/, "");
      elements.push(
        <p key={i} style={{ fontSize: 10, letterSpacing: 1.5, color: "#c9a84c", textTransform: "uppercase", fontWeight: 700, marginTop: i > 0 ? 10 : 0, marginBottom: 4 }}>
          {text}
        </p>
      );
      i++; continue;
    }

    // Bold-only header (** line **)
    if (line.match(/^\*\*[^*]+\*\*$/) || line.match(/^\*\*[^*]+:\*\*$/)) {
      elements.push(
        <p key={i} style={{ fontSize: 10, letterSpacing: 1.5, color: "#c9a84c", textTransform: "uppercase", fontWeight: 700, marginTop: i > 0 ? 10 : 0, marginBottom: 4 }}>
          {line.replace(/\*\*/g, "")}
        </p>
      );
      i++; continue;
    }

    // Bullet
    if (line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/)) {
      const text = line.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "3px 0" }}>
          <span style={{ color: "#c9a84c", fontSize: 9, marginTop: 5, flexShrink: 0 }}>▸</span>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>{parseInline(text)}</p>
        </div>
      );
      i++; continue;
    }

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Paragraph
    elements.push(
      <p key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, margin: "3px 0" }}>
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{elements}</div>;
}

// ── Typing dots indicator ──────────────────────────────────────────────────────
function TypingDots() {
  return (
    <>
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
      <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "6px 2px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%", background: "#c9a84c",
            animation: `typingDot 1.4s ease-in-out infinite`,
            animationDelay: `${i * 0.18}s`,
          }} />
        ))}
      </div>
    </>
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
  const [limitReached, setLimitReached] = useState(false);
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        const ref = data.user.id.replace(/-/g, "").slice(0, 8);
        setReferralLink(`https://corvo.capital/app?ref=${ref}`);
      }
    });
  }, []);

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
          if (lines.length > 0) market_context = `Current prices — ${lines.join(", ")}`;
        } catch {}
      }

      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages, portfolio_context: portfolioContext, market_context, user_id: userId }),
      });
      if (res.status === 429) {
        setLimitReached(true);
        setMessages(nextHistory);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setMessages([...nextHistory, { role: "assistant", content: d.reply }]);
    } catch (e: any) {
      setMessages([...nextHistory, { role: "assistant", content: `Error: ${e.message || "Request failed."}` }]);
    }
    setLoading(false);
  };

  const hasText = input.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <style>{`
        .ai-input:focus { outline: none; border-color: #c9a84c !important; box-shadow: 0 0 0 2px rgba(201,168,76,0.15); }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* Header bar */}
      <div style={{ height: 40, flexShrink: 0, borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", paddingInline: 14, background: "var(--bg)", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", letterSpacing: 0.3 }}>AI Assistant</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#5cb88a", boxShadow: "0 0 5px #5cb88a" }} />
          <span style={{ fontSize: 10, color: "var(--text3)" }}>Live market data</span>
        </div>
      </div>

      {/* Goals banner */}
      {goals?.age && (
        <div style={{ margin: "0 0 10px", padding: "7px 12px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
          <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Profile</span>
          {[goals.age && `Age ${goals.age}`, goals.riskTolerance?.replace("_time", ""), goals.goal, goals.invested && `$${Number(goals.invested).toLocaleString()} invested`]
            .filter(Boolean).map((item, i) => (
              <span key={i} style={{ fontSize: 11, color: "var(--text2)", background: "var(--card-bg)", padding: "2px 8px", borderRadius: 4, border: "0.5px solid var(--border)" }}>{item}</span>
            ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8, minHeight: 0 }}>
        {messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center", paddingTop: 40, paddingInline: 16 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
                <img src="/corvo-logo.svg" width={32} height={32} alt="Corvo" />
              </div>
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.2px" }}>
              {goals?.age ? `Hi! I know your profile.` : "Ask anything about your portfolio"}
            </p>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 28, lineHeight: 1.6 }}>
              {goals?.age
                ? `Age ${goals.age}, ${goals.riskTolerance?.replace("_time", "")} risk. What do you want to know?`
                : "Analyze risks, get rebalancing advice, stress-test scenarios."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360, margin: "0 auto" }}>
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  onClick={() => send(s)}
                  style={{ padding: "11px 16px", background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 10, color: "var(--text2)", fontSize: 13, cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)"; e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--bg3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text2)"; e.currentTarget.style.background = "var(--card-bg)"; }}>
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4, paddingInline: 2 }}>
            <AnimatePresence>
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "assistant" && (
                    <span style={{ fontSize: 9, color: "#c9a84c", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4, paddingLeft: 2 }}>CORVO</span>
                  )}
                  <div style={{
                    maxWidth: m.role === "user" ? "75%" : "85%",
                    padding: "12px 16px",
                    borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: m.role === "user" ? "#c9a84c" : "#1a1a1a",
                    border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.07)",
                  }}>
                    {m.role === "user"
                      ? <p style={{ fontSize: 13, color: "#000", lineHeight: 1.5 }}>{m.content}</p>
                      : <MessageContent content={m.content} />
                    }
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span style={{ fontSize: 9, color: "#c9a84c", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4, paddingLeft: 2 }}>CORVO</span>
                <div style={{ padding: "10px 16px", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px 18px 18px 4px" }}>
                  <TypingDots />
                </div>
              </motion.div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {limitReached ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderTop: "0.5px solid var(--border)", paddingTop: 14, flexShrink: 0 }}>
          <div style={{ background: "rgba(201,168,76,0.07)", border: "0.5px solid rgba(201,168,76,0.2)", borderRadius: 10, padding: "16px 18px" }}>
            <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, marginBottom: 4 }}>Daily limit reached</p>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, marginBottom: 14 }}>
              {"You've used all 15 messages for today. Invite a friend to unlock +5 more per day."}
            </p>
            {referralLink && (
              <button
                onClick={async () => {
                  try { await navigator.clipboard.writeText(referralLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
                }}
                style={{ width: "100%", padding: "10px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", background: copied ? "#5cb88a" : "#c9a84c", color: "#0a0e14", cursor: "pointer", transition: "background 0.2s" }}>
                {copied ? "✓ Link copied!" : "Invite a Friend — Copy Link"}
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "0.5px solid var(--border)", flexShrink: 0 }}>
          <input
            ref={inputRef}
            className="ai-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Ask about your portfolio..."
            style={{
              flex: 1, height: 48, padding: "0 16px",
              background: "var(--card-bg)",
              border: `1px solid ${inputFocused ? "#c9a84c" : "var(--border)"}`,
              borderRadius: 12,
              color: "var(--text)", fontSize: 13,
              transition: "border-color 0.15s, box-shadow 0.15s",
              boxShadow: inputFocused ? "0 0 0 2px rgba(201,168,76,0.15)" : "none",
            }}
          />
          <button
            onClick={() => send()}
            disabled={!hasText || loading}
            style={{
              height: 48, padding: "0 20px",
              background: hasText && !loading ? "#c9a84c" : "transparent",
              border: `1px solid ${hasText && !loading ? "#c9a84c" : "var(--border)"}`,
              borderRadius: 12,
              color: hasText && !loading ? "#000" : "var(--text3)",
              fontSize: 12, fontWeight: 700, letterSpacing: 1,
              cursor: hasText && !loading ? "pointer" : "default",
              transition: "all 0.15s",
              fontFamily: "var(--font-mono)",
              flexShrink: 0,
            }}>
            {loading ? "…" : "SEND"}
          </button>
        </div>
      )}
    </div>
  );
}
