"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { posthog } from "../lib/posthog";
import {
  X, Copy, Check, Download, Plus, Trash2,
  MessageSquare, Menu, Info, Zap, Pencil,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PANEL_SLIDE_OFFSET = 500; // px used only for slide-in/out animation

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

const SUGGESTION_SETS: string[][] = [
  [
    "What stocks pair well with my current holdings?",
    "How can I hedge against a market downturn?",
    "What is my biggest risk right now?",
    "How do dividends affect my total return?",
  ],
  [
    "Should I rebalance my portfolio right now?",
    "Which of my holdings has the best risk-adjusted return?",
    "Am I overexposed to any single sector?",
    "What's my portfolio's correlation to the S&P 500?",
  ],
  [
    "What would happen if interest rates rise 1%?",
    "How much cash should I keep in reserve?",
    "Which holdings should I consider trimming?",
    "Explain my Sharpe ratio in plain English.",
  ],
];

// ── Markdown renderer ─────────────────────────────────────────────────────────

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  const parseInline = (text: string): React.ReactNode =>
    text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, pi) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={pi} style={{ color: "var(--text)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={pi} style={{ fontFamily: "monospace", fontSize: 11, color: "var(--accent)", background: "var(--bg2)", padding: "1px 5px", borderRadius: 4 }}>{part.slice(1, -1)}</code>;
      return part;
    });

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) { code.push(lines[i]); i++; }
      elements.push(
        <pre key={i} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", overflowX: "auto", margin: "6px 0" }}>
          <code style={{ fontFamily: "monospace", fontSize: 11, color: "var(--accent)", whiteSpace: "pre" }}>{code.join("\n")}</code>
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
        <div key={i} style={{ overflowX: "auto", margin: "6px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead><tr>{headers.map((h, hi) => <th key={hi} style={{ padding: "5px 8px", textAlign: "left", color: "var(--accent)", fontSize: 9, letterSpacing: 1, borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri} style={{ background: ri % 2 === 0 ? "var(--bg3)" : "var(--bg2)" }}>{row.map((cell, ci) => <td key={ci} style={{ padding: "5px 8px", color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      elements.push(<p key={i} style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--accent)", textTransform: "uppercase", fontWeight: 700, marginTop: 8, marginBottom: 4 }}>{line.replace(/^#{1,3}\s+/, "")}</p>);
      i++; continue;
    }
    if (/^\*\*[^*]+\*\*:?$/.test(line)) {
      elements.push(<p key={i} style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--accent)", textTransform: "uppercase", fontWeight: 700, marginTop: 8, marginBottom: 4 }}>{line.replace(/\*\*/g, "")}</p>);
      i++; continue;
    }
    if (/^[-•*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const text = line.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
      elements.push(
        <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", margin: "3px 0" }}>
          <span style={{ color: "var(--accent)", fontSize: 9, marginTop: 5, flexShrink: 0 }}>▸</span>
          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, margin: 0 }}>{parseInline(text)}</p>
        </div>
      );
      i++; continue;
    }
    if (!line.trim()) { i++; continue; }
    elements.push(<p key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, margin: "2px 0" }}>{parseInline(line)}</p>);
    i++;
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>{elements}</div>;
}

function TypingDots() {
  return (
    <>
      <style>{`@keyframes typingDot{0%,60%,100%{opacity:.2;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}`}</style>
      <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 2px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text3)", animation: `typingDot 1.4s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </>
  );
}

function CorvoAvatar({ size = 22 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--bg3)", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <img src="/corvo-logo.svg" width={size * 0.58} height={size * 0.58} alt="" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AiChat({
  data,
  assets,
  goals: goalsProp,
  initialMessage,
  pageContext,
  currentPage,
  extraContext,
  onClose,
}: {
  data?: any;
  assets?: any[];
  goals?: any;
  initialMessage?: string;
  pageContext?: string;
  currentPage?: string;
  extraContext?: string;
  onClose?: () => void;
}) {
  // Use refs for values used inside async functions to avoid stale closures
  const userIdRef      = useRef<string | null>(null);
  const currentConvRef = useRef<string | null>(null);

  // Auth
  const [userId, setUserId]           = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState("");

  // Full user context string sent on every request
  const [userContextStr, setUserContextStr] = useState("");
  const [lifeEventsRef] = useState<{ current: any[] }>({ current: [] });

  // Chat
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Limits
  const [messagesUsed, setMessagesUsed]   = useState(0);
  const [messagesLimit, setMessagesLimit] = useState(15);
  const [limitReached, setLimitReached]   = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // History
  const [conversations, setConversations]   = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId]   = useState<string | null>(null);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  // Rename
  const [editingConvId, setEditingConvId]   = useState<string | null>(null);
  const [editingTitle, setEditingTitle]     = useState("");

  // UI
  const [copiedMsgIdx, setCopiedMsgIdx]     = useState<number | null>(null);
  const [portfolioCtxOn, setPortfolioCtxOn] = useState(true);
  const [suggestionSet, setSuggestionSet]   = useState(0);
  const [isMobile, setIsMobile]             = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const renameRef  = useRef<HTMLInputElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);

  // Mobile detection — useLayoutEffect runs before paint, eliminating the SSR flash
  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Keep refs in sync
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { currentConvRef.current = currentConvId; }, [currentConvId]);

  // Goals
  const goals = goalsProp || (() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("corvo_goals");
    if (!raw || raw === "skipped") return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();

  // Portfolio context: ALWAYS use live assets for tickers/weights so the AI
  // never operates on a stale portfolio from a previous analysis.
  const liveTickers = assets?.map((a: any) => a.ticker).filter(Boolean) || [];
  const liveTotal = assets?.reduce((s: number, a: any) => s + (a.weight ?? 0), 0) || 1;
  const liveWeights = assets?.map((a: any) => (a.weight ?? 0) / liveTotal) || [];

  // Reset suggestions when portfolio tickers change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSuggestionSet(Math.floor(Math.random() * 4)); }, [liveTickers.join(",")]);

  const portfolioContext = portfolioCtxOn ? {
    // Live holdings: always current
    tickers: liveTickers,
    weights: liveWeights,
    // Analysis metrics from last run (may lag behind current holdings, clearly labelled)
    portfolio_return:     data?.portfolio_return,
    portfolio_volatility: data?.portfolio_volatility,
    max_drawdown:         data?.max_drawdown,
    sharpe_ratio:         data?.sharpe_ratio,
    period:               data?.period,
    health_score:         data?.health_score,
    benchmark_return:     data?.benchmark_return,
    portfolio_value:      data?.portfolio_value,
    individual_returns:   data?.individual_returns,
    beta:                 data?.beta,
    user_goals: goals ? {
      age: goals.age, salary: goals.salary, invested: goals.invested,
      monthly_contribution: goals.monthlyContribution, retirement_age: goals.retirementAge,
      risk_tolerance: goals.riskTolerance, goal: goals.goal,
    } : null,
  } : {};

  // ── Effects ──

  useEffect(() => {
    // Close on Escape
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    // Close when clicking outside the panel (limit modal check prevents double-close)
    const handler = (e: MouseEvent) => {
      if (showLimitModal) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, showLimitModal]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: ud }) => {
      if (!ud.user) return;
      const uid = ud.user.id;
      setUserId(uid);
      userIdRef.current = uid;
      setReferralLink(`https://corvo.capital/app?ref=${uid.replace(/-/g, "").slice(0, 8)}`);
      fetch(`${API_URL}/chat/usage?user_id=${uid}`)
        .then(r => r.json())
        .then(d => { setMessagesUsed(d.messages_used || 0); setMessagesLimit(d.messages_limit || 15); })
        .catch(() => {});
      loadConversations(uid);

      // Fetch all user context data in parallel for richer AI responses
      const meta = ud.user.user_metadata || {};
      const { data: { session: ctxSession } } = await supabase.auth.getSession();
      const ctxToken = ctxSession?.access_token ?? "";
      const [profileRes, portfoliosRes, emailPrefsRes, alertsRes, targetsRes] = await Promise.allSettled([
        supabase.from("profiles").select("display_name,life_events").eq("id", uid).single(),
        supabase.from("portfolios").select("name,tickers").eq("user_id", uid).order("updated_at", { ascending: false }),
        supabase.from("email_preferences").select("morning_briefing,week_in_review,monthly_summary,price_alerts").eq("user_id", uid).single(),
        supabase.from("price_alerts").select("ticker,type,condition,threshold").eq("user_id", uid).eq("triggered", false),
        fetch(`${API_URL}/price-targets/${uid}`, ctxToken ? { headers: { "Authorization": `Bearer ${ctxToken}` } } : {}).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      const displayName =
        (profileRes.status === "fulfilled" ? profileRes.value.data?.display_name : null) ||
        ud.user.user_metadata?.full_name ||
        ud.user.user_metadata?.name ||
        ud.user.email?.split("@")[0] ||
        "";

      const fetchedLifeEvents: any[] =
        profileRes.status === "fulfilled"
          ? (profileRes.value.data?.life_events || [])
          : [];
      lifeEventsRef.current = fetchedLifeEvents;

      const savedPortfolios: { name: string; tickers: string[] }[] =
        portfoliosRes.status === "fulfilled" ? (portfoliosRes.value.data || []) : [];

      const emailPrefs: Record<string, boolean> =
        emailPrefsRes.status === "fulfilled" ? (emailPrefsRes.value.data || {}) : {};

      const alerts: any[] =
        alertsRes.status === "fulfilled" ? (alertsRes.value.data || []) : [];

      const targets: any[] =
        targetsRes.status === "fulfilled" ? targetsRes.value : [];

      const lines: string[] = [];

      if (displayName) lines.push(`USER: ${displayName}`);

      const pageLabel = currentPage || pageContext || "portfolio dashboard";
      lines.push(`CURRENT PAGE: ${pageLabel}`);

      // Onboarding profile
      const profileParts: string[] = [];
      if (meta.investor_type) profileParts.push(`investor type: ${meta.investor_type}`);
      if (meta.primary_goals?.length) profileParts.push(`goals: ${(meta.primary_goals as string[]).join(", ")}`);
      if (meta.age_range) profileParts.push(`age range: ${meta.age_range}`);
      if (meta.income_range) profileParts.push(`income range: ${meta.income_range}`);
      if (meta.risk_tolerance) profileParts.push(`risk tolerance: ${meta.risk_tolerance}`);
      if (meta.investment_horizon) profileParts.push(`investment horizon: ${meta.investment_horizon}`);
      if (meta.referral_source) profileParts.push(`heard about Corvo via: ${meta.referral_source}`);
      if (profileParts.length) lines.push(`PROFILE: ${profileParts.join("; ")}`);

      if (savedPortfolios.length) {
        const pfLines = savedPortfolios
          .slice(0, 5)
          .map((p: any) => `${p.name || "Unnamed"} (${(p.tickers as string[] || []).join(", ")})`);
        lines.push(`SAVED PORTFOLIOS: ${pfLines.join(" | ")}`);
      }

      const enabledEmails = Object.entries(emailPrefs)
        .filter(([, v]) => v === true)
        .map(([k]) => k.replace(/_/g, " "));
      if (Object.keys(emailPrefs).length) {
        lines.push(`EMAIL SUBSCRIPTIONS: ${enabledEmails.length ? enabledEmails.join(", ") : "none"}`);
      }

      if (alerts.length) {
        const alertLines = alerts.slice(0, 10).map((a: any) =>
          a.type === "price" ? `${a.ticker} ${a.condition} $${a.threshold}` : `portfolio ${a.condition} ${a.threshold}%`
        );
        lines.push(`ACTIVE PRICE ALERTS: ${alertLines.join("; ")}`);
      }

      if (targets.length) {
        const tgtLines = targets.slice(0, 10).map((t: any) =>
          `${t.ticker} target $${t.target_price} (${t.direction})`
        );
        lines.push(`PRICE TARGETS: ${tgtLines.join("; ")}`);
      }

      const activeLifeEvents = fetchedLifeEvents.filter((e: any) => e.type && e.type !== "nothing_major");
      if (activeLifeEvents.length > 0) {
        const eventLabels: Record<string, string> = {
          buying_home: "Buying a home",
          getting_married: "Getting married",
          having_baby: "Having a baby",
          starting_business: "Starting a business",
          changing_jobs: "Changing jobs",
          retiring_soon: "Retiring soon",
          paying_off_debt: "Paying off debt",
          building_emergency_fund: "Building an emergency fund",
          sending_kids_to_college: "Sending kids to college",
        };
        const timelineLabels: Record<string, string> = {
          within_1_year: "within 1 year",
          "1_2_years": "in 1-2 years",
          "2_5_years": "in 2-5 years",
          "5_plus_years": "in 5+ years",
        };
        const parts = activeLifeEvents.map((e: any) => {
          const label = eventLabels[e.type] || e.type.replace(/_/g, " ");
          const tl = timelineLabels[e.timeline] ? ` (${timelineLabels[e.timeline]})` : "";
          return label + tl;
        });
        lines.push(`LIFE EVENTS: ${parts.join("; ")}`);
      }

      setUserContextStr(lines.join("\n"));
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (editingConvId) renameRef.current?.focus();
  }, [editingConvId]);

  // Auto-send an initial message when the chat is opened from a panel (e.g. "Continue in AI chat")
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current) {
      initialMessageSentRef.current = true;
      const timer = setTimeout(() => send(initialMessage), 150);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Conversation management ──

  async function loadConversations(uid: string) {
    try {
      const { data: convs, error } = await supabase
        .from("ai_chat_history")
        .select("id, title, messages, created_at, updated_at")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false })
        .limit(30);
      if (error) { console.error("[AiChat] load error:", error.message); return; }
      if (convs) setConversations(convs as Conversation[]);
    } catch (e) { console.error("[AiChat] load exception:", e); }
  }

  // Saves using refs so it's always current even inside async send
  async function saveConversation(allMessages: Message[], firstMsg: string): Promise<string | null> {
    const uid    = userIdRef.current;
    const convId = currentConvRef.current;
    if (!uid) return null;
    try {
      if (convId) {
        const { error } = await supabase.from("ai_chat_history")
          .update({ messages: allMessages, updated_at: new Date().toISOString() })
          .eq("id", convId);
        if (error) { console.error("[AiChat] update error:", error.message); return convId; }
        setConversations(prev => prev.map(c =>
          c.id === convId ? { ...c, messages: allMessages, updated_at: new Date().toISOString() } : c
        ));
        return convId;
      } else {
        const { data: conv, error } = await supabase.from("ai_chat_history")
          .insert({ user_id: uid, title: firstMsg.slice(0, 60), messages: allMessages })
          .select()
          .single();
        if (error) { console.error("[AiChat] insert error:", error.message); return null; }
        if (conv) {
          const newConv = conv as Conversation;
          setConversations(prev => [newConv, ...prev]);
          setCurrentConvId(newConv.id);
          currentConvRef.current = newConv.id;
          return newConv.id;
        }
      }
    } catch (e) { console.error("[AiChat] save exception:", e); }
    return null;
  }

  async function deleteConversation(convId: string) {
    setDeletingId(convId);
    try {
      await supabase.from("ai_chat_history").delete().eq("id", convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (currentConvRef.current === convId) {
        setCurrentConvId(null);
        currentConvRef.current = null;
        setMessages([]);
      }
    } catch {}
    setDeletingId(null);
  }

  async function renameConversation(convId: string, newTitle: string) {
    const title = newTitle.trim() || "Untitled";
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c));
    setEditingConvId(null);
    try {
      await supabase.from("ai_chat_history").update({ title }).eq("id", convId);
    } catch {}
  }

  function loadConversation(conv: Conversation) {
    setCurrentConvId(conv.id);
    currentConvRef.current = conv.id;
    setMessages((conv.messages || []).map(m => ({ ...m, timestamp: m.timestamp || Date.now() })));
    setLimitReached(false);
    setSidebarOpen(false);
  }

  function startNewChat() {
    setCurrentConvId(null);
    currentConvRef.current = null;
    setMessages([]);
    setLimitReached(false);
    setInput("");
    setSidebarOpen(false);
    inputRef.current?.focus();
  }

  // ── Send ──

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    posthog.capture("chat_message_sent");
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

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

      const { data: { session: chatSession } } = await supabase.auth.getSession();
      const chatToken = chatSession?.access_token ?? "";
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(chatToken ? { "Authorization": `Bearer ${chatToken}` } : {}),
        },
        body: JSON.stringify({
          message: msg,
          history: messages,
          portfolio_context: portfolioContext,
          market_context,
          user_id: userIdRef.current,
          page_context: pageContext || "",
          user_context: userContextStr + (extraContext ? "\n" + extraContext : ""),
          life_events: lifeEventsRef.current,
        }),
      });

      if (res.status === 429) {
        setLimitReached(true);
        setMessages(nextHistory);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      if (!res.body) throw new Error("No response body");

      // Stream the response progressively
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      let msgAdded = false;
      const aiMsgTimestamp = Date.now();
      let finalMessages: Message[] = nextHistory;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.chunk) {
              accumulatedText += data.chunk;
              const snapshot = accumulatedText;
              if (!msgAdded) {
                msgAdded = true;
                setMessages([...nextHistory, { role: "assistant", content: snapshot, timestamp: aiMsgTimestamp }]);
              } else {
                setMessages(prev => {
                  const arr = [...prev];
                  arr[arr.length - 1] = { ...arr[arr.length - 1], content: snapshot };
                  return arr;
                });
              }
            }

            if (data.done) {
              if (data.messages_used !== undefined) setMessagesUsed(data.messages_used);
              if (data.messages_limit !== undefined) setMessagesLimit(data.messages_limit);
            }

            if (data.error) throw new Error(data.error);
          } catch (parseErr: any) {
            if (parseErr?.message && !parseErr.message.includes("JSON")) throw parseErr;
          }
        }
      }

      if (!msgAdded) {
        setLoading(false);
        setMessages([...nextHistory, { role: "assistant", content: accumulatedText || "Something went wrong. Please try again.", timestamp: aiMsgTimestamp }]);
      }

      finalMessages = [...nextHistory, { role: "assistant", content: accumulatedText, timestamp: aiMsgTimestamp }];
      await saveConversation(finalMessages, msg);
      setLoading(false);

    } catch (e: any) {
      setLoading(false);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content) return prev;
        return [...prev.filter(m => m.role !== "assistant" || m.content), { role: "assistant", content: `Error: ${e.message || "Request failed."}`, timestamp: Date.now() }];
      });
    }
  };

  // ── Utilities ──

  const copyMsg = async (content: string, idx: number) => {
    try { await navigator.clipboard.writeText(content); } catch { return; }
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

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

  const pct         = messagesLimit > 0 ? messagesUsed / messagesLimit : 0;
  const remaining   = Math.max(0, messagesLimit - messagesUsed);
  const limitColor  = pct > 0.8 ? "var(--red)" : pct > 0.6 ? "#f59e0b" : "var(--accent)";
  const hasText     = input.trim().length > 0;

  // ── Render ──
  return (
    <>
      <style>{`
        .cv-chip:hover{border-color:rgba(184,134,11,.4)!important;background:rgba(184,134,11,.07)!important;color:var(--text)!important}
        .cv-conv:hover{background:rgba(255,255,255,.04)!important}
        .cv-icon-btn:hover{background:var(--bg3)!important;color:var(--text)!important}
        .cv-input:focus{outline:none;border-color:var(--accent)!important;box-shadow:0 0 0 2px rgba(184,134,11,.15)!important}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Semi-transparent backdrop */}
      <motion.div
        // initial={false} is required — do not remove
        initial={false}
        animate={{ opacity: 0.35 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 1001, background: "rgba(0,0,0,1)" }}
      />

      {/* Slide-in panel */}
      <motion.div
        ref={panelRef}
        // initial={false} is required — do not remove
        initial={false}
        animate={{ x: 0 }}
        exit={{ x: PANEL_SLIDE_OFFSET }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        style={{
          position: "fixed", right: 0, top: 0, bottom: 0,
          width: isMobile ? "100%" : "25vw",
          minWidth: isMobile ? 0 : 360,
          zIndex: 1002,
          display: "flex", flexDirection: "column",
          background: "var(--bg)",
          borderLeft: isMobile ? "none" : "0.5px solid var(--border)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* History sidebar: fixed, slides out to the LEFT of the AI panel */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <>
              <div
                onClick={() => setSidebarOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 1001, background: "transparent" }}
              />
              <motion.div
                // initial={false} is required — do not remove
                initial={false}
                animate={{ x: 0 }}
                exit={{ x: isMobile ? "100%" : 240 }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
                style={{
                  position: "fixed", top: 0, bottom: 0,
                  right: isMobile ? 0 : "max(25vw, 360px)",
                  width: isMobile ? "100%" : 240,
                  zIndex: 1003,
                  background: "var(--bg)",
                  borderRight: isMobile ? "none" : "0.5px solid var(--border)",
                  borderLeft: isMobile ? "0.5px solid var(--border)" : "none",
                  boxShadow: isMobile ? "none" : "-4px 0 28px rgba(0,0,0,0.35)",
                  display: "flex", flexDirection: "column",
                }}
              >
                {/* Mobile header with close button */}
                {isMobile && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", height: 52, borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", letterSpacing: 0.5 }}>Chat History</span>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      aria-label="Close history"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: "transparent", border: "none", cursor: "pointer", color: "var(--text3)", borderRadius: 8 }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
                {/* New chat button */}
                <div style={{ padding: "12px 10px", borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
                  <button
                    onClick={startNewChat}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(184,134,11,.08)", border: "0.5px solid rgba(184,134,11,.25)", borderRadius: 8, color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(184,134,11,.15)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(184,134,11,.08)"; }}
                  >
                    <Plus size={12} /> New Chat
                  </button>
                </div>

                {/* Conversation list */}
                <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "none", padding: "4px 0" }}>
                  {conversations.length === 0 ? (
                    <div style={{ padding: "20px 14px", textAlign: "center" }}>
                      <MessageSquare size={20} style={{ color: "var(--text3)", margin: "0 auto 8px" }} />
                      <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>No saved chats yet</p>
                    </div>
                  ) : (
                    groupByDate(conversations).map(({ label, items }) => (
                      <div key={label}>
                        <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", padding: "7px 12px 3px" }}>{label}</p>
                        {items.map(conv => (
                          <div
                            key={conv.id}
                            className="cv-conv"
                            onClick={() => editingConvId !== conv.id && loadConversation(conv)}
                            style={{
                              padding: "6px 10px",
                              cursor: "pointer",
                              background: currentConvId === conv.id ? "rgba(184,134,11,.08)" : "transparent",
                              borderLeft: `2px solid ${currentConvId === conv.id ? "var(--accent)" : "transparent"}`,
                              display: "flex", alignItems: "center", gap: 5,
                              transition: "all .12s",
                            }}
                          >
                            {editingConvId === conv.id ? (
                              <input
                                id="conversation-rename"
                                name="title"
                                ref={renameRef}
                                value={editingTitle}
                                onChange={e => setEditingTitle(e.target.value)}
                                onBlur={() => renameConversation(conv.id, editingTitle)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") renameConversation(conv.id, editingTitle);
                                  if (e.key === "Escape") setEditingConvId(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                style={{
                                  flex: 1, background: "var(--bg3)", border: "1px solid var(--accent)",
                                  borderRadius: 4, padding: "2px 6px", fontSize: 12,
                                  color: "var(--text)", fontFamily: "var(--font-body)",
                                }}
                              />
                            ) : (
                              <span
                                style={{ fontSize: 12, color: currentConvId === conv.id ? "var(--text)" : "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
                              >
                                {conv.title || "Untitled"}
                              </span>
                            )}
                            {editingConvId !== conv.id && (
                              <>
                                <button
                                  onClick={e => { e.stopPropagation(); setEditingConvId(conv.id); setEditingTitle(conv.title || ""); }}
                                  title="Rename"
                                  style={{ opacity: 0.4, transition: "opacity .15s, color .15s", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 4, flexShrink: 0, display: "flex" }}
                                  onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--accent)"; }}
                                  onMouseLeave={e => { e.currentTarget.style.opacity = "0.4"; e.currentTarget.style.color = "var(--text3)"; }}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  className="cv-del"
                                  onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                                  title="Delete"
                                  style={{ opacity: 0.4, transition: "opacity .15s, color .15s", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 4, flexShrink: 0, display: "flex" }}
                                  onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--red)"; }}
                                  onMouseLeave={e => { e.currentTarget.style.opacity = "0.4"; e.currentTarget.style.color = "var(--text3)"; }}
                                >
                                  {deletingId === conv.id
                                    ? <div style={{ width: 12, height: 12, border: "1.5px solid var(--text3)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                                    : <Trash2 size={14} />
                                  }
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <div style={{ height: 48, flexShrink: 0, borderTop: "2px solid var(--accent)", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", padding: "14px 16px", gap: 8, background: "var(--bg)" }}>
          <button className="cv-icon-btn" onClick={() => setSidebarOpen(v => !v)} title="Chat history"
            style={{ width: 28, height: 28, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", flexShrink: 0, transition: "all .15s" }}>
            <Menu size={13} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: 0.5 }}>Corvo AI</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {messages.length > 0 && (
              <button className="cv-icon-btn" onClick={exportChat} title="Export chat"
                style={{ width: 28, height: 28, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", flexShrink: 0, transition: "all .15s" }}>
                <Download size={12} />
              </button>
            )}
            <button className="cv-icon-btn" onClick={onClose} title="Close (Esc)"
              style={{ width: 28, height: 28, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", flexShrink: 0, transition: "all .15s" }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── Context bar ── */}
        <div style={{ borderBottom: "0.5px solid var(--border)", padding: "6px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, background: "var(--bg)" }}>
          <span style={{ fontSize: 11, color: "var(--text3)", display: "flex", alignItems: "center", gap: 5, border: "0.5px solid var(--border)", borderRadius: 5, padding: "3px 8px", userSelect: "none" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: portfolioCtxOn ? "#5cb88a" : "var(--border)", flexShrink: 0, transition: "background .2s" }} />
            Context
          </span>
          {/* Toggle switch */}
          <button
            onClick={() => setPortfolioCtxOn(v => !v)}
            title={portfolioCtxOn ? "Disable portfolio context" : "Enable portfolio context"}
            style={{ position: "relative", width: 28, height: 16, borderRadius: 8, border: "none", cursor: "pointer", padding: 0, background: portfolioCtxOn ? "#5cb88a" : "var(--border)", transition: "background .2s", flexShrink: 0 }}
          >
            <span style={{ position: "absolute", top: 2, left: portfolioCtxOn ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
          </button>
        </div>

        {/* ── Message limit bar ── */}
        {userId && (
          <div style={{ padding: "4px 12px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 7, flexShrink: 0, background: "var(--bg)" }}>
            <div style={{ flex: 1, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, pct * 100)}%`, background: limitColor, borderRadius: 2, transition: "width .4s ease, background .3s" }} />
            </div>
            <span style={{ fontSize: 9, color: pct > 0.8 ? limitColor : "var(--text3)", fontWeight: 600, letterSpacing: 0.2, flexShrink: 0, whiteSpace: "nowrap" }}>
              {remaining}/{messagesLimit} left
            </span>
            <button
              onClick={() => setShowLimitModal(true)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text3)", display: "flex", alignItems: "center" }}
            >
              <Info size={11} />
            </button>
          </div>
        )}

        {/* ── Messages ── */}
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "none", minHeight: 0 }}>
          {messages.length === 0 ? (
            /* Empty state */
            <div style={{ padding: "28px 14px 20px" }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--bg3)", border: "1px solid rgba(201,168,76,.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 4px 16px rgba(201,168,76,.08)" }}>
                  <img src="/corvo-logo.svg" width={30} height={30} alt="Corvo" />
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                  {!portfolioCtxOn
                    ? "Context is off. Enable it above for personalized recommendations."
                    : data
                    ? "What's on the agenda today?"
                    : "What's on your mind? I can help with portfolio analysis, market questions, or investing strategy."}
                </p>
                <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
                  {goals?.age
                    ? `${goals.age}yo · ${goals.riskTolerance?.replace("_time", "") ?? ""} risk`
                    : "Analyze risks, get rebalancing advice, and more."}
                </p>
              </div>

              {/* Suggestions: 2x2 grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 6 }}>
                {SUGGESTION_SETS[suggestionSet].map((s, i) => (
                  <motion.button
                    key={`${s}-${i}-${suggestionSet}`}
                    className="cv-chip"
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => send(s)}
                    style={{ padding: "9px 12px", background: "var(--card-bg)", border: "0.5px solid var(--border)", borderRadius: 9, color: "var(--text2)", fontSize: 12, cursor: "pointer", transition: "all .15s", textAlign: "left", lineHeight: 1.4, fontFamily: "var(--font-body)" }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button
                  onClick={() => setSuggestionSet(s => (s + 1) % SUGGESTION_SETS.length)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text3)", display: "flex", alignItems: "center", gap: 4, padding: "2px 4px", borderRadius: 4, transition: "color .15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text2)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
                >
                  ↻ Refresh suggestions
                </button>
              </div>

            </div>
          ) : (
            /* Message thread */
            <div style={{ padding: "12px 12px", display: "flex", flexDirection: "column", gap: 14 }}>
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}
                  >
                    {m.role === "assistant" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <CorvoAvatar size={20} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)" }}>Corvo AI</span>
                        <span style={{ fontSize: 9, color: "var(--text3)" }}>{formatTime(m.timestamp)}</span>
                      </div>
                    )}
                    <div style={{
                      maxWidth: isMobile ? "92%" : "88%",
                      padding: "12px 16px",
                      borderRadius: m.role === "user" ? "16px 16px 3px 16px" : "3px 16px 16px 16px",
                      background: m.role === "user" ? "rgba(201,168,76,0.15)" : "var(--card-bg)",
                      border: m.role === "user" ? "1px solid rgba(201,168,76,0.3)" : "1px solid var(--border)",
                      boxShadow: m.role === "user" ? "0 1px 8px rgba(184,134,11,.15)" : "0 1px 6px rgba(0,0,0,0.12)",
                      color: m.role === "assistant" ? "var(--text)" : undefined,
                    }}>
                      {m.role === "user"
                        ? <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, margin: 0 }}>{m.content}</p>
                        : <MessageContent content={m.content} />
                      }
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                      {m.role === "user" && <span style={{ fontSize: 9, color: "var(--text3)" }}>{formatTime(m.timestamp)}</span>}
                      {m.role === "assistant" && (
                        <button
                          onClick={() => copyMsg(m.content, i)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: copiedMsgIdx === i ? "#5cb88a" : "var(--text3)", padding: "2px 4px", borderRadius: 3, display: "flex", alignItems: "center", gap: 3, fontSize: 9, transition: "color .15s" }}
                          onMouseEnter={e => { if (copiedMsgIdx !== i) e.currentTarget.style.color = "var(--text2)"; }}
                          onMouseLeave={e => { if (copiedMsgIdx !== i) e.currentTarget.style.color = "var(--text3)"; }}
                        >
                          {copiedMsgIdx === i ? <Check size={10} /> : <Copy size={10} />}
                          <span>{copiedMsgIdx === i ? "Copied" : "Copy"}</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <motion.div
                  // initial={false} is required — do not remove
                  initial={false} animate={{ opacity: 1, y: 0 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <CorvoAvatar size={20} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)" }}>Corvo AI</span>
                  </div>
                  <div style={{ padding: "8px 13px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "3px 16px 16px 16px" }}>
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input area ── */}
        <div style={{ flexShrink: 0, borderTop: "0.5px solid var(--border)", padding: "10px 12px", background: "var(--bg)" }}>
          {limitReached ? (
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ opacity: 1, y: 0 }}
              style={{ background: "rgba(184,134,11,.07)", border: "0.5px solid rgba(184,134,11,.22)", borderRadius: 10, padding: "12px 14px" }}>
<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Zap size={13} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Daily limit reached</span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6, marginBottom: 10 }}>
                You've used all {messagesLimit} messages today. Invite a friend to unlock +5 more.
              </p>
              {referralLink && (
                <button
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(referralLink); setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2500); } catch {}
                  }}
                  style={{ width: "100%", padding: "8px", fontSize: 11, fontWeight: 600, borderRadius: 7, border: "none", background: referralCopied ? "#5cb88a" : "var(--accent)", color: "#ffffff", cursor: "pointer", transition: "background .2s" }}>
                  {referralCopied ? "Copied!" : "Copy Referral Link"}
                </button>
              )}
            </motion.div>
          ) : (
            <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
              <textarea
                id="ai-chat-input"
                name="message"
                ref={inputRef}
                className="cv-input"
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px";
                }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Ask about your portfolio…"
                rows={1}
                style={{
                  flex: 1, minHeight: 40, maxHeight: 110, padding: "10px 12px",
                  background: "var(--card-bg)",
                  border: `1px solid ${inputFocused ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 10, color: "var(--text)", fontSize: 12,
                  resize: "none", lineHeight: 1.5,
                  transition: "border-color .15s, box-shadow .15s",
                  boxShadow: inputFocused ? "0 0 0 2px rgba(184,134,11,.15)" : "none",
                  fontFamily: "var(--font-body)",
                }}
              />
              <button
                onClick={() => send()}
                disabled={!hasText || loading}
                style={{
                  height: 40, padding: "0 14px",
                  background: hasText && !loading ? "var(--accent)" : "transparent",
                  border: `1px solid ${hasText && !loading ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 10, color: hasText && !loading ? "#ffffff" : "var(--text3)",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  cursor: hasText && !loading ? "pointer" : "default",
                  transition: "all .15s", fontFamily: "var(--font-mono)", flexShrink: 0,
                }}>
                {loading ? "…" : "SEND"}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Limit info modal ── */}
      <AnimatePresence initial={false}>
        {showLimitModal && (
          <>
            <motion.div
              // initial={false} is required — do not remove
              initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLimitModal(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1010, backdropFilter: "blur(4px)" }}
            />
            <motion.div
              // initial={false} is required — do not remove
              initial={false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              style={{
                position: "fixed", top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
                width: "min(360px, calc(100vw - 32px))",
                background: "var(--card-bg)",
                border: "0.5px solid var(--border2)",
                borderRadius: 14, padding: "22px 24px",
                zIndex: 1011,
                boxShadow: "0 20px 60px rgba(0,0,0,.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap size={15} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Message Limits</span>
                </div>
                <button onClick={() => setShowLimitModal(false)}
                  style={{ width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)" }}>
                  <X size={12} />
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg3)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, pct * 100)}%`, background: limitColor, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: limitColor, whiteSpace: "nowrap" }}>{remaining}/{messagesLimit}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7, marginBottom: 16 }}>
                <strong style={{ color: "var(--text)" }}>Base limit:</strong> {messagesLimit} messages/day<br />
                <strong style={{ color: "var(--text)" }}>How to get more:</strong> Invite friends using your referral link. Each referral adds +5 messages per day (up to +25 bonus).<br />
                <strong style={{ color: "var(--text)" }}>Resets:</strong> Midnight UTC daily.
              </p>
              {referralLink && (
                <button
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(referralLink); setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2000); } catch {}
                  }}
                  style={{ width: "100%", padding: "9px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", background: referralCopied ? "#5cb88a" : "var(--accent)", color: "#ffffff", cursor: "pointer", transition: "background .2s" }}>
                  {referralCopied ? "Referral link copied!" : "Copy My Referral Link"}
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
