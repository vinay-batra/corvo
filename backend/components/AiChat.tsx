"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "Why is my Sharpe ratio low?",
  "Should I add bonds to reduce risk?",
  "How does my portfolio compare to the benchmark?",
  "What's my biggest risk right now?",
  "Suggest 2 ETFs to diversify this portfolio.",
  "Is this portfolio too concentrated?",
];

export default function AiChat({ portfolioContext }: { portfolioContext: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages, portfolio_context: portfolioContext }),
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
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
        {messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 900, color: "var(--green)", letterSpacing: 4, textShadow: "0 0 30px rgba(0,255,160,0.3)", marginBottom: 8 }}>
              ALPHA<span style={{ color: "rgba(255,255,255,0.2)" }}>i</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 40, letterSpacing: 1 }}>Ask anything about your portfolio</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} onClick={() => send(s)}
                  style={{ padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--border-mid)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.2s" }}
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
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "assistant" && (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,255,160,0.1)", border: "1px solid rgba(0,255,160,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10, marginTop: 2, fontFamily: "var(--font-display)", fontSize: 9, color: "var(--green)" }}>Ai</div>
                  )}
                  <div style={{ maxWidth: "72%", padding: "12px 16px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: m.role === "user" ? "rgba(0,255,160,0.08)" : "var(--bg-card)", border: `1px solid ${m.role === "user" ? "rgba(0,255,160,0.2)" : "var(--border-dim)"}`, fontSize: 13, lineHeight: 1.7, color: m.role === "user" ? "var(--green)" : "var(--text-primary)" }}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,255,160,0.1)", border: "1px solid rgba(0,255,160,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 9, color: "var(--green)" }}>Ai</div>
                <div style={{ padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: "12px 12px 12px 2px", display: "flex", gap: 4, alignItems: "center" }}>
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
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask about your portfolio..."
          style={{ flex: 1, padding: "13px 18px", background: "var(--bg-card)", border: "1px solid var(--border-mid)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, fontFamily: "var(--font-body)", outline: "none", transition: "border-color 0.2s" }}
          onFocus={e => e.target.style.borderColor = "rgba(0,255,160,0.4)"}
          onBlur={e => e.target.style.borderColor = "var(--border-mid)"}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          style={{ padding: "13px 22px", background: input.trim() && !loading ? "rgba(0,255,160,0.1)" : "transparent", border: `1px solid ${input.trim() && !loading ? "rgba(0,255,160,0.4)" : "var(--border-dim)"}`, borderRadius: 10, color: input.trim() && !loading ? "var(--green)" : "var(--text-muted)", fontSize: 12, letterSpacing: 2, fontFamily: "var(--font-display)", cursor: input.trim() && !loading ? "pointer" : "default", transition: "all 0.2s" }}
        >SEND</button>
      </div>
    </div>
  );
}
