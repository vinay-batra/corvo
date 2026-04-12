"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { posthog } from "../lib/posthog";
import {
  X, Copy, Check, Download, RefreshCw, Plus, Trash2,
  MessageSquare, ToggleLeft, ToggleRight, Menu, Info, Zap,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function groupByDate(convs: Conversation[]): { label: string; items: Conversation[] }[] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const map: Record<string, Conversation[]> = {};
  for (const c of convs) {
    const d = new Date(c.updated_at).toDateString();
    const label = d === today ? "Today" : d === yesterday ? "Yesterday"
      : new Date(c.updated_at).toLocaleDateString([], { month: "short", day: "numeric" });
    if (!map[label]) map[label] = [];
    map[label].push(c);
  }
  return Object.entries(map).map(([label, items]) => ({ label, items }));
}

function generateSuggestions(data: any, assets: any[], goals: any): string[] {
  const tickers: string[] = data?.tickers || assets?.map((a: any) => a.ticker) || [];
  const sharpe: number | undefined = data?.sharpe_ratio;
  const drawdown: number = Math.abs(data?.max_drawdown || 0);
  const ret: number | undefined = data?.portfolio_return;

  const contextual: string[] = [];

  if (sharpe !== undefined && sharpe < 0.5)
    contextual.push("My Sharpe ratio is low — how can I improve risk-adjusted returns?");
  else if (sharpe !== undefined && sharpe > 1.5)
    contextual.push("My Sharpe ratio looks strong — how do I maintain this?");

  if (drawdown > 0.2)
    contextual.push(`I've had a ${(drawdown * 100).toFixed(0)}% max drawdown — how do I protect against that?`);

  if (tickers.length > 1)
    contextual.push(`Am I too concentrated in ${tickers.slice(0, 2).join(" and ")}?`);

  if (ret !== undefined && ret < 0)
    contextual.push("My portfolio is down — should I hold or change strategy?");
  else if (ret !== undefined && ret > 0.3)
    contextual.push("My returns are strong — should I lock in some profits?");

  if (goals?.goal === "retirement") contextual.push("Am I saving enough to retire comfortably?");
  else if (goals?.goal === "income") contextual.push("How can I add more income-generating assets?");

  const base = [
    "What's my biggest risk right now?",
    "Should I rebalance my portfolio?",
    "How would a market crash affect me?",
    "What's the best way to diversify from here?",
    "How do I reduce my portfolio volatility?",
    "What tax-loss harvesting opportunities do I have?",
  ];

  return [...new Set([...contextual, ...base])].slice(0, 6);
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  const parseInline = (text: string): React.ReactNode =>
    text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, pi) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={pi} style={{ color: "#fff", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={pi} style={{ fontFamily: "monospace", fontSize: 11, color: "#c9a84c", background: "#0d1117", padding: "1px 5px", borderRadius: 4 }}>{part.slice(1, -1)}</code>;
      return part;
    });

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) { code.push(lines[i]); i++; }
      elements.push(
        <pre key={i} style={{ background: "#0d1117", border: "1px solid #1e2a38", borderRadius: 8, padding: "12px 14px", overflowX: "auto", margin: "6px 0" }}>
          <code style={{ fontFamily: "monospace", fontSize: 11, color: "#c9a84c", whiteSpace: "pre" }}>{code.join("\n")}</code>
        </pre>
      );
      i++; continue;
    }
    if (line.includes("|") && lines[i + 1]?.includes("---")) {
      const headers = line.split("|").map(c => c.trim()).filter(Boolean);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) { rows.push(lines[i].split("|").map(c => c.trim()).filter(Boolean)); i++; }
      elements.push(
        <div key={i} style={{ overflowX: "auto", margin: "8px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>{headers.map((h, hi) => <th key={hi} style={{ padding: "6px 10px", textAlign: "left", color: "#c9a84c", fontSize: 10, letterSpacing: 1, borderBottom: "1px solid #333", background: "#0d1117" }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri} style={{ background: ri % 2 === 0 ? "#111" : "#0a0a0a" }}>{row.map((cell, ci) => <td key={ci} style={{ padding: "6px 10px", color: "#e8e0cc", borderBottom: "1px solid #1e1e1e" }}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      elements.push(<p key={i} style={{ fontSize: 10, letterSpacing: 1.5, color: "#c9a84c", textTransform: "uppercase", fontWeight: 700, marginTop: 8, marginBottom: 4 }}>{line.replace(/^#{1,3}\s+/, "")}</p>);
      i++; continue;
    }
    if (/^\*\*[^*]+\*\*:?$/.test(line)) {
      elements.push(<p key={i} style={{ fontSize: 10, letterSpacing: 1.5, color: "#c9a84c", textTransform: "uppercase", fontWeight: 700, marginTop: 8, marginBottom: 4 }}>{line.replace(/\*\*/g, "")}</p>);
      i++; continue;
    }
    if (/^[-•*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const text = line.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "3px 0" }}>
          <span style={{ color: "#c9a84c", fontSize: 9, marginTop: 5, flexShrink: 0 }}>▸</span>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, margin: 0 }}>{parseInline(text)}</p>
        </div>
      );
      i++; continue;
    }
    if (!line.trim()) { i++; continue; }
    elements.push(<p key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, margin: "3px 0" }}>{parseInline(line)}</p>);
    i++;
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{elements}</div>;
}

// ── Typing dots ───────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <>
      <style>{`@keyframes typingDot{0%,60%,100%{opacity:.2;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}`}</style>
      <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 2px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", animation: `typingDot 1.4s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </>
  );
}

// ── Corvo avatar ──────────────────────────────────────────────────────────────

function CorvoAvatar({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #1e1e1e, #0d0d0d)",
      border: "1px solid rgba(201,168,76,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <img src="/corvo-logo.svg" width={size * 0.58} height={size * 0.58} alt="" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AiChat({
  data,
  assets,
  goals: goalsProp,
  onClose,
}: {
  data?: any;
  assets?: any[];
  goals?: any;
  onClose?: () => void;
}) {
  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState("");

  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Limits
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [messagesLimit, setMessagesLimit] = useState(15);
  const [limitReached, setLimitReached] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [showLimitTooltip, setShowLimitTooltip] = useState(false);

  // History
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // UI
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [portfolioCtxOn, setPortfolioCtxOn] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sugSeed, setSugSeed] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Goals ──
  const goals = goalsProp || (() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("corvo_goals");
    if (!raw || raw === "skipped") return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();

  // ── Portfolio context ──
  const portfolioContext = portfolioCtxOn ? (data ? {
    tickers:              data.tickers || assets?.map((a: any) => a.ticker) || [],
    weights:              data.weights || assets?.map((a: any) => a.weight / 100) || [],
    portfolio_return:     data.portfolio_return,
    portfolio_volatility: data.portfolio_volatility,
    max_drawdown:         data.max_drawdown,
    sharpe_ratio:         data.sharpe_ratio,
    period:               data.period,
    health_score:         data.health_score,
    benchmark_return:     data.benchmark_return,
    user_goals: goals ? {
      age: goals.age, salary: goals.salary, invested: goals.invested,
      monthly_contribution: goals.monthlyContribution, retirement_age: goals.retirementAge,
      risk_tolerance: goals.riskTolerance, goal: goals.goal,
    } : null,
  } : {
    tickers:   assets?.map((a: any) => a.ticker) || [],
    user_goals: goals ? {
      age: goals.age, salary: goals.salary, invested: goals.invested,
      monthly_contribution: goals.monthlyContribution, retirement_age: goals.retirementAge,
      risk_tolerance: goals.riskTolerance, goal: goals.goal,
    } : null,
  }) : {};

  // ── Effects ──

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: ud }) => {
      if (!ud.user) return;
      const uid = ud.user.id;
      setUserId(uid);
      setReferralLink(`https://corvo.capital/app?ref=${uid.replace(/-/g, "").slice(0, 8)}`);
      fetch(`${API_URL}/chat/usage?user_id=${uid}`)
        .then(r => r.json())
        .then(d => { setMessagesUsed(d.messages_used || 0); setMessagesLimit(d.messages_limit || 15); })
        .catch(() => {});
      loadConversations(uid);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const all = generateSuggestions(data, assets || [], goals);
    const rotated = sugSeed === 0 ? all : [...all.slice(sugSeed % all.length), ...all.slice(0, sugSeed % all.length)];
    setSuggestions([...new Set(rotated)].slice(0, 6));
  }, [data, assets, sugSeed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Conversation management ──

  async function loadConversations(uid: string) {
    try {
      const { data: convs } = await supabase
        .from("ai_chat_history")
        .select("id, title, messages, created_at, updated_at")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false })
        .limit(30);
      if (convs) setConversations(convs as Conversation[]);
    } catch {}
  }

  async function saveConversation(allMessages: Message[], convId: string | null, firstMsg: string): Promise<string | null> {
    if (!userId) return null;
    try {
      if (convId) {
        await supabase.from("ai_chat_history")
          .update({ messages: allMessages, updated_at: new Date().toISOString() })
          .eq("id", convId);
        setConversations(prev => prev.map(c =>
          c.id === convId ? { ...c, messages: allMessages, updated_at: new Date().toISOString() } : c
        ));
        return convId;
      } else {
        const { data: conv } = await supabase.from("ai_chat_history")
          .insert({ user_id: userId, title: firstMsg.slice(0, 60), messages: allMessages })
          .select()
          .single();
        if (conv) {
          setConversations(prev => [conv as Conversation, ...prev]);
          return (conv as Conversation).id;
        }
      }
    } catch {}
    return null;
  }

  async function deleteConversation(convId: string) {
    setDeletingId(convId);
    try {
      await supabase.from("ai_chat_history").delete().eq("id", convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (currentConvId === convId) { setCurrentConvId(null); setMessages([]); }
    } catch {}
    setDeletingId(null);
  }

  function loadConversation(conv: Conversation) {
    setCurrentConvId(conv.id);
    setMessages((conv.messages || []).map(m => ({ ...m, timestamp: m.timestamp || Date.now() })));
    setLimitReached(false);
    if (isMobile) setSidebarOpen(false);
  }

  function startNewChat() {
    setCurrentConvId(null);
    setMessages([]);
    setLimitReached(false);
    setInput("");
    if (isMobile) setSidebarOpen(false);
    inputRef.current?.focus();
  }

  // ── Send ──

  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    posthog.capture("chat_message_sent");
    setInput("");
    if (inputRef.current) { inputRef.current.style.height = "auto"; }

    const userMsg: Message = { role: "user", content: msg, timestamp: Date.now() };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);

    try {
      const tickers: string[] = (portfolioCtxOn && (portfolioContext as any).tickers) || [];
      let market_context = "";
      if (tickers.length > 0) {
        const results = await Promise.all(
          tickers.slice(0, 8).map(async (t: string) => {
            try {
              const r = await fetch(`${API_URL}/stock/${encodeURIComponent(t)}`);
              if (!r.ok) return null;
              const d = await r.json();
              const pct = d.change_pct != null ? `${d.change_pct >= 0 ? "+" : ""}${d.change_pct.toFixed(2)}%` : "N/A";
              return `${t}: $${d.price?.toFixed(2) ?? "N/A"} (${pct})`;
            } catch { return null; }
          })
        );
        const lines = results.filter(Boolean);
        if (lines.length > 0) market_context = `Current prices: ${lines.join(", ")}`;
      }

      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: messages,
          portfolio_context: portfolioContext,
          market_context,
          user_id: userId,
        }),
      });

      if (res.status === 429) {
        setLimitReached(true);
        setMessages(nextHistory);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();

      const aiMsg: Message = { role: "assistant", content: d.reply, timestamp: Date.now() };
      const full = [...nextHistory, aiMsg];
      setMessages(full);

      if (d.messages_used !== undefined) setMessagesUsed(d.messages_used);
      if (d.messages_limit !== undefined) setMessagesLimit(d.messages_limit);

      const savedId = await saveConversation(full, currentConvId, msg);
      if (savedId && !currentConvId) setCurrentConvId(savedId);

    } catch (e: any) {
      setMessages([...nextHistory, { role: "assistant", content: `Error: ${e.message || "Request failed."}`, timestamp: Date.now() }]);
    }
    setLoading(false);
  }, [input, loading, messages, portfolioContext, portfolioCtxOn, currentConvId, userId]);

  // ── Copy message ──
  const copyMsg = async (content: string, idx: number) => {
    try { await navigator.clipboard.writeText(content); } catch { return; }
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  // ── Export ──
  const exportChat = () => {
    if (!messages.length) return;
    const header = `Corvo AI Chat Export\n${"=".repeat(40)}\nExported: ${new Date().toLocaleString()}\n${"=".repeat(40)}\n\n`;
    const body = messages.map(m =>
      `[${new Date(m.timestamp).toLocaleString()}] ${m.role === "user" ? "You" : "Corvo AI"}:\n${m.content}`
    ).join("\n\n---\n\n");
    const blob = new Blob([header + body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `corvo-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    posthog.capture("chat_exported");
  };

  // ── Derived ──
  const ctxItems: string[] = [];
  if (portfolioCtxOn) {
    const t: string[] = data?.tickers || assets?.map((a: any) => a.ticker) || [];
    if (t.length > 0) ctxItems.push(`${t.length} holding${t.length !== 1 ? "s" : ""}`);
    if (data?.sharpe_ratio !== undefined) ctxItems.push(`Sharpe ${data.sharpe_ratio.toFixed(2)}`);
    if (data?.health_score !== undefined) ctxItems.push(`Health ${data.health_score}/100`);
    if (goals?.age) ctxItems.push(`Age ${goals.age}`);
    if (goals?.goal) ctxItems.push(goals.goal.replace(/_/g, " "));
  }

  const pct = messagesLimit > 0 ? messagesUsed / messagesLimit : 0;
  const remaining = Math.max(0, messagesLimit - messagesUsed);
  const limitColor = pct > 0.8 ? "#ff6b6b" : pct > 0.6 ? "#f59e0b" : "#c9a84c";
  const hasText = input.trim().length > 0;

  // ── Render ──
  return (
    <div style={{ display: "flex", height: "100%", background: "var(--bg)", fontFamily: "var(--font-body)", position: "relative", overflow: "hidden" }}>
      <style>{`
        .cv-chip:hover{border-color:rgba(201,168,76,.4)!important;background:rgba(201,168,76,.08)!important;color:var(--text)!important}
        .cv-conv:hover{background:rgba(201,168,76,.06)!important}
        .cv-conv:hover .cv-del{opacity:1!important}
        .cv-icon-btn:hover{background:var(--bg3)!important;color:var(--text)!important}
        .cv-input:focus{outline:none;border-color:#c9a84c!important;box-shadow:0 0 0 2px rgba(201,168,76,.15)!important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideR{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideL{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? (isMobile ? 0 : 240) : 0,
        flexShrink: 0,
        overflow: "hidden",
        borderRight: sidebarOpen && !isMobile ? "0.5px solid var(--border)" : "none",
        transition: "width 0.2s ease",
        display: "flex", flexDirection: "column",
        background: "var(--bg)",
      }}>
        <div style={{ width: 240, display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Sidebar header */}
          <div style={{ padding: "12px 10px 10px", borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
            <button
              onClick={startNewChat}
              style={{
                width: "100%", padding: "9px 12px",
                background: "rgba(201,168,76,.1)",
                border: "0.5px solid rgba(201,168,76,.3)",
                borderRadius: 8, color: "#c9a84c",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,.1)"; }}
            >
              <Plus size={13} /> New Chat
            </button>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
            {conversations.length === 0 ? (
              <div style={{ padding: "24px 14px", textAlign: "center" }}>
                <MessageSquare size={22} style={{ color: "var(--text3)", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>No saved conversations yet</p>
              </div>
            ) : (
              groupByDate(conversations).map(({ label, items }) => (
                <div key={label}>
                  <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", padding: "8px 12px 3px" }}>{label}</p>
                  {items.map(conv => (
                    <div
                      key={conv.id}
                      className="cv-conv"
                      onClick={() => loadConversation(conv)}
                      style={{
                        padding: "7px 12px",
                        cursor: "pointer",
                        background: currentConvId === conv.id ? "rgba(201,168,76,.08)" : "transparent",
                        borderLeft: `2px solid ${currentConvId === conv.id ? "#c9a84c" : "transparent"}`,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "all 0.12s", gap: 6,
                      }}
                    >
                      <span style={{
                        fontSize: 12,
                        color: currentConvId === conv.id ? "var(--text)" : "var(--text2)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                        lineHeight: 1.4,
                      }}>
                        {conv.title || "Untitled"}
                      </span>
                      <button
                        className="cv-del"
                        onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                        style={{
                          opacity: 0, transition: "opacity 0.15s, color 0.15s",
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--text3)", padding: 2, borderRadius: 4, flexShrink: 0,
                          display: "flex", alignItems: "center",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = "#ff6b6b"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; }}
                      >
                        {deletingId === conv.id
                          ? <div style={{ width: 11, height: 11, border: "1.5px solid var(--text3)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                          : <Trash2 size={11} />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9 }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 240, zIndex: 10, display: "flex", flexDirection: "column", background: "var(--bg)", borderRight: "0.5px solid var(--border)" }}>
            <div style={{ padding: "12px 10px 10px", borderBottom: "0.5px solid var(--border)" }}>
              <button onClick={startNewChat} style={{ width: "100%", padding: "9px 12px", background: "rgba(201,168,76,.1)", border: "0.5px solid rgba(201,168,76,.3)", borderRadius: 8, color: "#c9a84c", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={13} /> New Chat
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
              {conversations.length === 0 ? (
                <div style={{ padding: "24px 14px", textAlign: "center" }}>
                  <MessageSquare size={22} style={{ color: "var(--text3)", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 11, color: "var(--text3)" }}>No saved conversations yet</p>
                </div>
              ) : (
                groupByDate(conversations).map(({ label, items }) => (
                  <div key={label}>
                    <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", padding: "8px 12px 3px" }}>{label}</p>
                    {items.map(conv => (
                      <div key={conv.id} className="cv-conv" onClick={() => loadConversation(conv)}
                        style={{ padding: "7px 12px", cursor: "pointer", background: currentConvId === conv.id ? "rgba(201,168,76,.08)" : "transparent", borderLeft: `2px solid ${currentConvId === conv.id ? "#c9a84c" : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all .12s" }}>
                        <span style={{ fontSize: 12, color: currentConvId === conv.id ? "var(--text)" : "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{conv.title || "Untitled"}</span>
                        <button className="cv-del" onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                          style={{ opacity: 0, transition: "opacity .15s", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 2, flexShrink: 0, display: "flex" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#ff6b6b"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>

        {/* Header */}
        <div style={{
          height: 52, flexShrink: 0,
          borderBottom: "0.5px solid var(--border)",
          display: "flex", alignItems: "center",
          paddingInline: 14, gap: 8,
          background: "var(--bg)",
        }}>
          {/* Sidebar toggle */}
          <button
            className="cv-icon-btn"
            onClick={() => setSidebarOpen(v => !v)}
            title="Toggle history"
            style={{ width: 30, height: 30, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", flexShrink: 0, transition: "all .15s" }}
          >
            <Menu size={14} />
          </button>

          {/* Title + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: 0.2 }}>Corvo AI</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#c9a84c", background: "rgba(201,168,76,.1)", border: "0.5px solid rgba(201,168,76,.25)", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" }}>
              Powered by Claude
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5cb88a", boxShadow: "0 0 5px #5cb88a" }} />
              <span style={{ fontSize: 10, color: "var(--text3)" }}>Online</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {messages.length > 0 && (
              <button
                className="cv-icon-btn"
                onClick={exportChat}
                title="Export conversation as text"
                style={{ height: 30, padding: "0 10px", borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text2)", fontSize: 11, display: "flex", alignItems: "center", gap: 5, transition: "all .15s", flexShrink: 0 }}
              >
                <Download size={12} />
                <span>Export</span>
              </button>
            )}
            {onClose && (
              <button
                className="cv-icon-btn"
                onClick={onClose}
                title="Close"
                style={{ width: 30, height: 30, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", transition: "all .15s", flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Context bar */}
        <div style={{
          borderBottom: "0.5px solid var(--border)",
          padding: "6px 14px",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
          background: "var(--bg)", flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, flexWrap: "wrap", minWidth: 0 }}>
            <span style={{ fontSize: 9, letterSpacing: 2, fontWeight: 600, textTransform: "uppercase", color: portfolioCtxOn ? "#5cb88a" : "var(--text3)", whiteSpace: "nowrap" }}>
              {portfolioCtxOn ? "● Context loaded" : "○ No context"}
            </span>
            {portfolioCtxOn && ctxItems.map((item, i) => (
              <span key={i} style={{ fontSize: 10, color: "var(--text3)", background: "var(--bg3)", padding: "1px 6px", borderRadius: 4, border: "0.5px solid var(--border)", whiteSpace: "nowrap" }}>
                {item}
              </span>
            ))}
            {!portfolioCtxOn && (
              <span style={{ fontSize: 10, color: "var(--text3)" }}>AI answering general questions only</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "var(--text3)" }}>Portfolio context</span>
            <button
              onClick={() => setPortfolioCtxOn(v => !v)}
              title={portfolioCtxOn ? "Disable portfolio context" : "Enable portfolio context"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: portfolioCtxOn ? "#c9a84c" : "var(--text3)", display: "flex", alignItems: "center" }}
            >
              {portfolioCtxOn ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
          </div>
        </div>

        {/* Message limit bar */}
        {userId && (
          <div style={{
            padding: "5px 14px",
            borderBottom: "0.5px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
            background: "var(--bg)",
          }}>
            <div style={{ flex: 1, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, pct * 100)}%`,
                background: limitColor,
                borderRadius: 2,
                transition: "width .4s ease, background .3s",
              }} />
            </div>
            <span style={{ fontSize: 10, color: pct > 0.8 ? limitColor : "var(--text3)", fontWeight: 600, letterSpacing: 0.2, flexShrink: 0, whiteSpace: "nowrap" }}>
              {remaining} of {messagesLimit} messages remaining today
            </span>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onMouseEnter={() => setShowLimitTooltip(true)}
                onMouseLeave={() => setShowLimitTooltip(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text3)", display: "flex", alignItems: "center" }}
              >
                <Info size={12} />
              </button>
              {showLimitTooltip && (
                <div style={{
                  position: "absolute", right: 0, bottom: 20, zIndex: 50,
                  width: 210, padding: "10px 12px",
                  background: "var(--card-bg)", border: "0.5px solid var(--border)",
                  borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.35)",
                  fontSize: 11, color: "var(--text2)", lineHeight: 1.6,
                }}>
                  <strong style={{ color: "var(--text)", display: "block", marginBottom: 4 }}>How to get more messages</strong>
                  Invite friends using your referral link and earn +5 messages per referral (up to 25 bonus).
                  Your daily limit resets at midnight UTC.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {messages.length === 0 ? (

            /* ── Empty state ── */
            <div style={{ padding: "36px 20px 24px", maxWidth: 620, margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{
                  width: 68, height: 68, borderRadius: "50%",
                  background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)",
                  border: "1px solid rgba(201,168,76,.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px",
                  boxShadow: "0 4px 20px rgba(201,168,76,.08)",
                }}>
                  <img src="/corvo-logo.svg" width={38} height={38} alt="Corvo" />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: -0.3 }}>
                  {goals?.age ? "Hi — I know your profile." : "Ask me about your portfolio"}
                </h2>
                <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
                  {goals?.age
                    ? `${goals.age}yo, ${goals.riskTolerance?.replace("_time", "") ?? ""} risk${goals.goal ? `, goal: ${goals.goal.replace(/_/g, " ")}` : ""}. What would you like to know?`
                    : "I analyze risks, suggest rebalancing, stress-test scenarios, and give personalized advice."}
                </p>
              </div>

              {/* Suggestion chips — 2-column grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {suggestions.map((s, i) => (
                  <motion.button
                    key={`${s}-${i}`}
                    className="cv-chip"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => send(s)}
                    style={{
                      padding: "10px 13px",
                      background: "var(--card-bg)",
                      border: "0.5px solid var(--border)",
                      borderRadius: 10, color: "var(--text2)",
                      fontSize: 12, cursor: "pointer",
                      transition: "all .15s", textAlign: "left",
                      lineHeight: 1.4, fontFamily: "var(--font-body)",
                    }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>

              {/* Refresh suggestions */}
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => setSugSeed(v => v + 2)}
                  style={{
                    background: "none", border: "0.5px solid var(--border)",
                    borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                    color: "var(--text3)", fontSize: 11, fontFamily: "var(--font-body)",
                    display: "inline-flex", alignItems: "center", gap: 5,
                    transition: "color .15s, border-color .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--text2)"; e.currentTarget.style.borderColor = "var(--border2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <RefreshCw size={10} />
                  Refresh suggestions
                </button>
              </div>
            </div>

          ) : (

            /* ── Message thread ── */
            <div style={{ padding: "16px", maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: m.role === "user" ? 10 : -10, y: 4 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}
                  >
                    {/* AI label row */}
                    {m.role === "assistant" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                        <CorvoAvatar size={24} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#c9a84c" }}>Corvo AI</span>
                        <span style={{ fontSize: 10, color: "var(--text3)" }}>{formatTime(m.timestamp)}</span>
                      </div>
                    )}

                    {/* Bubble */}
                    <div style={{
                      maxWidth: m.role === "user" ? "70%" : "84%",
                      padding: "12px 16px",
                      borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                      background: m.role === "user" ? "#c9a84c" : "#141414",
                      border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,.07)",
                      boxShadow: m.role === "user" ? "0 2px 10px rgba(201,168,76,.15)" : "0 2px 10px rgba(0,0,0,.25)",
                    }}>
                      {m.role === "user"
                        ? <p style={{ fontSize: 13, color: "#000", lineHeight: 1.55, margin: 0 }}>{m.content}</p>
                        : <MessageContent content={m.content} />
                      }
                    </div>

                    {/* Meta row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                      {m.role === "user" && (
                        <span style={{ fontSize: 10, color: "var(--text3)" }}>{formatTime(m.timestamp)}</span>
                      )}
                      {m.role === "assistant" && (
                        <button
                          onClick={() => copyMsg(m.content, i)}
                          title="Copy message"
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: copiedMsgIdx === i ? "#5cb88a" : "var(--text3)",
                            padding: "2px 5px", borderRadius: 4,
                            display: "flex", alignItems: "center", gap: 4,
                            fontSize: 10, transition: "color .15s",
                          }}
                          onMouseEnter={e => { if (copiedMsgIdx !== i) e.currentTarget.style.color = "var(--text2)"; }}
                          onMouseLeave={e => { if (copiedMsgIdx !== i) e.currentTarget.style.color = "var(--text3)"; }}
                        >
                          {copiedMsgIdx === i ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedMsgIdx === i ? "Copied" : "Copy"}</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {loading && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                    <CorvoAvatar size={24} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#c9a84c" }}>Corvo AI</span>
                  </div>
                  <div style={{ padding: "10px 16px", background: "#141414", border: "1px solid rgba(255,255,255,.07)", borderRadius: "4px 18px 18px 18px" }}>
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input area ── */}
        <div style={{ flexShrink: 0, borderTop: "0.5px solid var(--border)", padding: "12px 14px", background: "var(--bg)" }}>
          {limitReached ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: "rgba(201,168,76,.07)", border: "0.5px solid rgba(201,168,76,.22)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <Zap size={14} style={{ color: "#c9a84c" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Daily limit reached</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.65, marginBottom: 12 }}>
                You've used all {messagesLimit} messages for today. Invite a friend to unlock +5 more per day.
                Your limit resets at midnight UTC.
              </p>
              {referralLink && (
                <button
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(referralLink); setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2500); } catch {}
                  }}
                  style={{
                    width: "100%", padding: "10px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none",
                    background: referralCopied ? "#5cb88a" : "#c9a84c",
                    color: "#0a0e14", cursor: "pointer", transition: "background .2s",
                  }}>
                  {referralCopied ? "✓ Referral link copied!" : "Copy My Referral Link (+5 messages/friend)"}
                </button>
              )}
            </motion.div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                className="cv-input"
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px";
                }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Ask about your portfolio… (Enter to send, Shift+Enter for newline)"
                rows={1}
                style={{
                  flex: 1, minHeight: 44, maxHeight: 130,
                  padding: "12px 14px",
                  background: "var(--card-bg)",
                  border: `1px solid ${inputFocused ? "#c9a84c" : "var(--border)"}`,
                  borderRadius: 12, color: "var(--text)", fontSize: 13,
                  resize: "none", lineHeight: 1.5,
                  transition: "border-color .15s, box-shadow .15s",
                  boxShadow: inputFocused ? "0 0 0 2px rgba(201,168,76,.15)" : "none",
                  fontFamily: "var(--font-body)",
                }}
              />
              <button
                onClick={() => send()}
                disabled={!hasText || loading}
                style={{
                  height: 44, padding: "0 18px",
                  background: hasText && !loading ? "#c9a84c" : "transparent",
                  border: `1px solid ${hasText && !loading ? "#c9a84c" : "var(--border)"}`,
                  borderRadius: 12,
                  color: hasText && !loading ? "#000" : "var(--text3)",
                  fontSize: 12, fontWeight: 700, letterSpacing: 1,
                  cursor: hasText && !loading ? "pointer" : "default",
                  transition: "all .15s", fontFamily: "var(--font-mono)", flexShrink: 0,
                }}>
                {loading ? "…" : "SEND"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
