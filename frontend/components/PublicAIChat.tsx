"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Public chat is capped at 5 messages/IP/day server-side (/api/ai-chat). We
// mirror that with a client-side daily counter so the header can show
// "X / 5 today" and we can stop wasting calls once the cap is hit.
const DAILY_LIMIT = 5;
const SUGGESTIONS = [
  "What is a good Sharpe ratio?",
  "How do I diversify my portfolio?",
  "What is dollar-cost averaging?",
];

function todayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
function getUsedToday(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("corvo_pub_chat_usage");
    if (!raw) return 0;
    const o = JSON.parse(raw);
    return o.date === todayET() ? Number(o.count) || 0 : 0;
  } catch { return 0; }
}
function bumpUsedToday(): number {
  const next = getUsedToday() + 1;
  try { localStorage.setItem("corvo_pub_chat_usage", JSON.stringify({ date: todayET(), count: next })); } catch {}
  return next;
}

class ChatErrorBoundary extends React.Component<{ children: React.ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() { return this.state.crashed ? null : this.props.children; }
}

export default function PublicAIChat() {
  return <ChatErrorBoundary><PublicAIChatInner /></ChatErrorBoundary>;
}

function PublicAIChatInner() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [used, setUsed] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const remaining = Math.max(0, DAILY_LIMIT - used);
  const atLimit = remaining <= 0;

  // Watch the global data-theme attribute set by PublicNav's theme toggle.
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.getAttribute("data-theme") === "dark");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => { setUsed(getUsedToday()); }, []);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Hide on /app routes
  if (pathname.startsWith("/app")) return null;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");

    // Local cap: once today's 5 are used, surface the same nudge the server
    // would return without spending a call.
    if (atLimit) {
      setMessages(m => [...m, { role: "user", content: q }, { role: "assistant", content: "You've used all 5 free messages for today. Sign up for free to keep going." }]);
      return;
    }

    const newMessages: Message[] = [...messages, { role: "user", content: q }];
    setMessages(newMessages);
    setLoading(true);
    setUsed(bumpUsedToday());

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const sendCurrent = () => send(input);

  return (
    <>
      {/* Floating AI bubble */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open AI chat"
        className="corvo-ai-chat-btn"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: open
            ? "var(--bg3)"
            : dark
              ? "linear-gradient(155deg, #1a1f2e 0%, #0a0e18 55%, #050810 100%)"
              : "linear-gradient(155deg, #d8b15a 0%, var(--accent) 55%, rgba(184,134,11,0.95) 100%)",
          border: open
            ? "0.5px solid var(--border2)"
            : dark
              ? "0.5px solid rgba(201,168,76,0.45)"
              : "0.5px solid rgba(255,255,255,0.14)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: open
            ? "0 4px 14px rgba(0,0,0,0.18)"
            : dark
              ? "0 10px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3), 0 0 22px rgba(201,168,76,0.22)"
              : "0 10px 32px rgba(184,134,11,0.45), 0 2px 8px rgba(184,134,11,0.25), inset 0 1px 0 rgba(255,255,255,0.22)",
          transition: "background 0.2s, box-shadow 0.2s, transform 0.2s, border 0.2s",
          transform: open ? "scale(0.96)" : "scale(1)",
        }}
        onMouseEnter={(e) => {
          if (open) return;
          e.currentTarget.style.transform = "translateY(-2px) scale(1.04)";
          e.currentTarget.style.boxShadow = dark
            ? "0 14px 40px rgba(0,0,0,0.55), 0 0 0 5px rgba(201,168,76,0.22), 0 0 30px rgba(201,168,76,0.3)"
            : "0 14px 40px rgba(184,134,11,0.6), 0 0 0 5px rgba(201,168,76,0.18), inset 0 1px 0 rgba(255,255,255,0.26)";
        }}
        onMouseLeave={(e) => {
          if (open) return;
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = dark
            ? "0 10px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3), 0 0 22px rgba(201,168,76,0.22)"
            : "0 10px 32px rgba(184,134,11,0.45), 0 2px 8px rgba(184,134,11,0.25), inset 0 1px 0 rgba(255,255,255,0.22)";
        }}
      >
        {open ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <img
            src="/corvo-logo.png?v=2"
            alt=""
            width={34}
            height={34}
            style={{ filter: dark ? "none" : "brightness(0)", pointerEvents: "none", transition: "filter 0.2s" }}
          />
        )}
      </button>

      {/* Chat panel - Lark-style layout */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            bottom: 100,
            right: 24,
            zIndex: 1001,
            width: 380,
            maxWidth: "calc(100vw - 48px)",
            background: "var(--card-bg)",
            border: "1px solid rgba(var(--accent-rgb),0.2)",
            borderRadius: 18,
            boxShadow: dark
              ? "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(var(--accent-rgb),0.06)"
              : "0 16px 48px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(var(--accent-rgb),0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* ── Header: eyebrow · usage counter · close ── */}
          <div
            style={{
              padding: "16px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "var(--accent)" }}>
              Ask Corvo
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "var(--text3)", letterSpacing: 0.3 }}>
                {remaining} / {DAILY_LIMIT} today
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text3)", transition: "color 0.15s, background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overscrollBehavior: "none",
              padding: messages.length === 0 ? "28px 22px 8px" : "16px 16px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 300,
              maxHeight: 380,
            }}
          >
            {messages.length === 0 ? (
              /* Empty state: icon badge · title · subtitle · suggestion chips */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(var(--accent-rgb),0.1)", border: "1px solid rgba(var(--accent-rgb),0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  {/* Trending-up: the domain-relevant glyph (mirrors Lark's music note) */}
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                </div>
                <h3 style={{ fontFamily: "'Space Mono', monospace", fontSize: 19, fontWeight: 700, color: "var(--text)", margin: "0 0 6px", letterSpacing: -0.3 }}>
                  Ask Corvo
                </h3>
                <p style={{ fontSize: 13.5, color: "var(--text3)", margin: "0 0 20px", textAlign: "center", lineHeight: 1.5 }}>
                  Investing questions answered instantly.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={loading}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "13px 16px",
                        background: "var(--bg3)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        color: "var(--text2)",
                        fontSize: 14,
                        cursor: loading ? "default" : "pointer",
                        transition: "background 0.15s, border-color 0.15s, transform 0.15s",
                        fontFamily: "Inter, sans-serif",
                      }}
                      onMouseEnter={e => { if (loading) return; e.currentTarget.style.borderColor = "rgba(var(--accent-rgb),0.4)"; e.currentTarget.style.background = "rgba(var(--accent-rgb),0.05)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg3)"; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div
                    style={{
                      maxWidth: "82%",
                      padding: "10px 14px",
                      borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: msg.role === "user" ? "var(--accent)" : "var(--bg3)",
                      border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                      fontSize: 13.5,
                      lineHeight: 1.6,
                      color: msg.role === "user" ? "var(--bg)" : "var(--text)",
                      fontWeight: msg.role === "user" ? 500 : 300,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "9px 16px", borderRadius: "14px 14px 14px 4px", background: "var(--bg3)", border: "1px solid var(--border)", fontSize: 18, color: "var(--text3)", letterSpacing: 2 }}>
                  ...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div style={{ padding: "12px 14px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center" }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendCurrent()}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={atLimit ? "Daily limit reached - sign up for free" : "Ask an investing question..."}
              disabled={atLimit}
              style={{
                flex: 1,
                padding: "13px 15px",
                background: "var(--bg)",
                border: `1px solid ${inputFocused ? "rgba(var(--accent-rgb),0.5)" : "var(--border)"}`,
                boxShadow: inputFocused ? "0 0 0 3px rgba(var(--accent-rgb),0.1)" : "none",
                borderRadius: 12,
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
                opacity: atLimit ? 0.6 : 1,
              }}
            />
            <button
              onClick={sendCurrent}
              disabled={loading || !input.trim() || atLimit}
              aria-label="Send message"
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: loading || !input.trim() || atLimit ? "var(--bg3)" : "var(--accent)",
                border: `1px solid ${loading || !input.trim() || atLimit ? "var(--border)" : "transparent"}`,
                cursor: loading || !input.trim() || atLimit ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={loading || !input.trim() || atLimit ? "var(--text3)" : "var(--bg)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
