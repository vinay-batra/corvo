"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

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

  return (
    <>
      {/* Floating bubble */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open AI chat"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: open ? "#a88a38" : "#c9a84c",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(201,168,76,0.35), 0 2px 8px rgba(0,0,0,0.4)",
          transition: "background 0.2s, transform 0.2s",
          transform: open ? "scale(0.95)" : "scale(1)",
          fontFamily: "Space Mono, monospace",
          fontSize: 18,
          fontWeight: 700,
          color: "#0a0e14",
          letterSpacing: -1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = open ? "scale(0.95)" : "scale(1)")}
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0e14" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a0e14" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            bottom: 84,
            right: 24,
            zIndex: 1001,
            width: 340,
            maxWidth: "calc(100vw - 48px)",
            background: "var(--card-bg)",
            border: "1px solid rgba(201,168,76,0.2)",
            borderRadius: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Space Mono, monospace",
                fontSize: 11,
                fontWeight: 700,
                color: "#c9a84c",
                letterSpacing: -0.5,
                flexShrink: 0,
              }}
            >
              C
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>Corvo AI</p>
              <p style={{ fontSize: 10, color: "var(--text3)", margin: 0 }}>Ask anything about investing</p>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overscrollBehavior: "none",
              padding: "16px 16px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 220,
              maxHeight: 320,
            }}
          >
            {messages.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginTop: 40, lineHeight: 1.6 }}>
                Ask about Corvo features, investing concepts, or your portfolio strategy.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "9px 13px",
                    borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                    background:
                      msg.role === "user"
                        ? "#c9a84c"
                        : "var(--bg3)",
                    border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: msg.role === "user" ? "#0a0e14" : "var(--text)",
                    fontWeight: msg.role === "user" ? 500 : 300,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "9px 16px",
                    borderRadius: "12px 12px 12px 3px",
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    fontSize: 18,
                    color: "var(--text3)",
                    letterSpacing: 2,
                  }}
                >
                  ...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "10px 12px 12px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                padding: "9px 12px",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--text)",
                fontSize: 13,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(201,168,76,0.35)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: loading || !input.trim() ? "rgba(201,168,76,0.25)" : "#c9a84c",
                border: "none",
                cursor: loading || !input.trim() ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0e14" strokeWidth="2.5">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
