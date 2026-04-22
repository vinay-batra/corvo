"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { posthog } from "../lib/posthog";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Alert {
  id: string;
  type: "price" | "portfolio";
  ticker?: string;
  portfolioId?: string;
  portfolioName?: string;
  condition: "drops" | "rises";
  threshold: number;
  createdAt: string;
}

const LS_KEY = "corvo_alerts";

function loadLocal(): Alert[] {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveLocal(alerts: Alert[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(alerts)); } catch {}
}

export function getAlertCount(): number {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r).length : 0; } catch { return 0; }
}

// ── Ticker search data ────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  EQUITY: "Stock", ETF: "ETF", CRYPTOCURRENCY: "Crypto", MUTUALFUND: "Fund", INDEX: "Index",
};

const COMMON_TICKERS = [
  { ticker: "AAPL",    name: "Apple Inc.",                 type: "EQUITY" },
  { ticker: "MSFT",    name: "Microsoft Corp.",            type: "EQUITY" },
  { ticker: "NVDA",    name: "NVIDIA Corp.",               type: "EQUITY" },
  { ticker: "GOOGL",   name: "Alphabet Inc.",              type: "EQUITY" },
  { ticker: "AMZN",    name: "Amazon.com Inc.",            type: "EQUITY" },
  { ticker: "META",    name: "Meta Platforms Inc.",        type: "EQUITY" },
  { ticker: "TSLA",    name: "Tesla Inc.",                 type: "EQUITY" },
  { ticker: "BRK-B",   name: "Berkshire Hathaway B",      type: "EQUITY" },
  { ticker: "JPM",     name: "JPMorgan Chase & Co.",       type: "EQUITY" },
  { ticker: "V",       name: "Visa Inc.",                  type: "EQUITY" },
  { ticker: "JNJ",     name: "Johnson & Johnson",          type: "EQUITY" },
  { ticker: "NFLX",    name: "Netflix Inc.",               type: "EQUITY" },
  { ticker: "AMD",     name: "Advanced Micro Devices",     type: "EQUITY" },
  { ticker: "INTC",    name: "Intel Corp.",                type: "EQUITY" },
  { ticker: "KO",      name: "Coca-Cola Co.",              type: "EQUITY" },
  { ticker: "PG",      name: "Procter & Gamble Co.",       type: "EQUITY" },
  { ticker: "DIS",     name: "Walt Disney Co.",            type: "EQUITY" },
  { ticker: "BA",      name: "Boeing Co.",                 type: "EQUITY" },
  { ticker: "GS",      name: "Goldman Sachs Group",        type: "EQUITY" },
  { ticker: "UBER",    name: "Uber Technologies",          type: "EQUITY" },
  { ticker: "SPY",     name: "SPDR S&P 500 ETF",          type: "ETF" },
  { ticker: "QQQ",     name: "Invesco QQQ Trust",          type: "ETF" },
  { ticker: "IWM",     name: "iShares Russell 2000 ETF",   type: "ETF" },
  { ticker: "VTI",     name: "Vanguard Total Stock Mkt",   type: "ETF" },
  { ticker: "VOO",     name: "Vanguard S&P 500 ETF",       type: "ETF" },
  { ticker: "GLD",     name: "SPDR Gold Shares",           type: "ETF" },
  { ticker: "BND",     name: "Vanguard Total Bond Mkt",    type: "ETF" },
  { ticker: "SCHD",    name: "Schwab US Dividend Equity",  type: "ETF" },
  { ticker: "ARKK",    name: "ARK Innovation ETF",         type: "ETF" },
  { ticker: "BTC-USD", name: "Bitcoin",                    type: "CRYPTOCURRENCY" },
  { ticker: "ETH-USD", name: "Ethereum",                   type: "CRYPTOCURRENCY" },
  { ticker: "SOL-USD", name: "Solana",                     type: "CRYPTOCURRENCY" },
];

function localSearch(q: string) {
  if (!q) return [];
  const upper = q.toUpperCase();
  return COMMON_TICKERS.filter(t =>
    t.ticker.startsWith(upper) || t.name.toUpperCase().includes(upper)
  ).slice(0, 6);
}

// ── Ticker search input ───────────────────────────────────────────────────────
function TickerSearch({ value, onChange }: { value: string; onChange: (ticker: string) => void }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<{ ticker: string; name: string; type: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const searchT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q: string) => {
    if (!q) { setResults([]); setOpen(false); return; }
    const local = localSearch(q);
    if (local.length > 0) { setResults(local); setOpen(true); }
    if (searchT.current) clearTimeout(searchT.current);
    searchT.current = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`${API_URL}/search-ticker?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        const api = (d.results || []) as { ticker: string; name: string; type: string }[];
        const apiSet = new Set(api.map(x => x.ticker));
        const merged = [...api, ...local.filter(l => !apiSet.has(l.ticker))].slice(0, 6);
        if (merged.length > 0) { setResults(merged); setOpen(true); }
      } catch {}
      setBusy(false);
    }, 300);
  }, []);

  const handleInput = (q: string) => {
    setQuery(q);
    search(q);
  };

  const select = (ticker: string) => {
    setQuery(ticker);
    setOpen(false);
    onChange(ticker);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if (query && results.length > 0) setOpen(true); }}
          placeholder="Search ticker or company…"
          style={{
            width: "100%", padding: "8px 32px 8px 10px",
            background: "var(--bg3)", border: "0.5px solid var(--border)",
            borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none",
            fontFamily: "var(--font-mono)", boxSizing: "border-box",
          }}
        />
        {busy && (
          <div style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, border: "1.5px solid rgba(184,134,11,0.3)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 9, overflow: "hidden", zIndex: 400, boxShadow: "0 6px 20px rgba(0,0,0,0.5)" }}>
            {results.map((r, i) => (
              <div key={r.ticker} onMouseDown={() => select(r.ticker)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", cursor: "pointer", borderBottom: i < results.length - 1 ? "0.5px solid var(--border)" : "none", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{r.ticker}</span>
                  <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 8 }}>{r.name}</span>
                </div>
                <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, background: "rgba(184,134,11,0.1)", color: "var(--accent)", letterSpacing: 0.5 }}>
                  {TYPE_LABELS[r.type] || r.type}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AlertsPanel({ onClose, assets }: { onClose: () => void; assets?: { ticker: string; weight: number }[] }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tab, setTab] = useState<"price" | "portfolio">("price");
  const [ticker, setTicker] = useState("");
  const [condition, setCondition] = useState<"drops" | "rises">("drops");
  const [threshold, setThreshold] = useState("10");
  const [userId, setUserId] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [notifBlocked, setNotifBlocked] = useState(false);
  const [savedPortfolios, setSavedPortfolios] = useState<{ id: string; name: string }[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");

  useEffect(() => {
    supabase.auth.getUser()
      .then(async ({ data }) => {
        const uid = data.user?.id ?? null;
        setUserId(uid);
        fetchAlerts(uid);
        if (uid) {
          const { data: pfData } = await supabase
            .from("portfolios")
            .select("id, name")
            .eq("user_id", uid)
            .order("created_at", { ascending: false });
          if (pfData) setSavedPortfolios(pfData);
        }
      })
      .catch(() => { fetchAlerts(null); });
    if (typeof Notification !== "undefined") {
      setPushEnabled(Notification.permission === "granted");
      setNotifBlocked(Notification.permission === "denied");
    }
  }, []);

  const fetchAlerts = async (uid: string | null) => {
    if (uid) {
      const { data, error } = await supabase
        .from("price_alerts")
        .select("id, user_id, ticker, type, condition, threshold, triggered, created_at, portfolio_id")
        .eq("user_id", uid)
        .eq("triggered", false)
        .order("created_at", { ascending: false });
      if (!error && data) {
        const mapped: Alert[] = data.map((r: any) => ({
          id: r.id, type: r.type, ticker: r.ticker,
          portfolioId: r.portfolio_id,
          condition: r.condition, threshold: r.threshold, createdAt: r.created_at,
        }));
        setAlerts(mapped);
        saveLocal(mapped);
        return;
      }
    }
    setAlerts(loadLocal());
  };

  const addAlert = async () => {
    const t = parseFloat(threshold);
    if (isNaN(t) || t <= 0) return;
    if (tab === "price" && !ticker.trim()) return;
    if (tab === "portfolio" && !selectedPortfolioId) return;

    posthog.capture("alert_created", { alert_type: tab, condition });

    const newAlert: Alert = {
      id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
      type: tab,
      ticker: tab === "price" ? ticker.trim().toUpperCase() : undefined,
      portfolioId: tab === "portfolio" ? selectedPortfolioId : undefined,
      condition,
      threshold: t,
      createdAt: new Date().toISOString(),
    };

    if (userId) {
      const { data, error } = await supabase
        .from("price_alerts")
        .insert({ user_id: userId, type: newAlert.type, ticker: newAlert.ticker ?? null, portfolio_id: newAlert.portfolioId ?? null, condition: newAlert.condition, threshold: newAlert.threshold })
        .select("id, user_id, ticker, type, condition, threshold, triggered, created_at, portfolio_id")
        .single();
      if (!error && data) {
        await fetchAlerts(userId);
        setTicker(""); setThreshold("10");
        return;
      }
    }

    const updated = [newAlert, ...alerts];
    setAlerts(updated);
    saveLocal(updated);
    setTicker(""); setThreshold("10");
  };

  const removeAlert = async (id: string) => {
    if (userId) {
      await supabase.from("price_alerts").delete().eq("id", id).eq("user_id", userId);
      await fetchAlerts(userId);
      return;
    }
    const updated = alerts.filter(a => a.id !== id);
    setAlerts(updated);
    saveLocal(updated);
  };

  const formatAlert = (a: Alert) => {
    if (a.type === "price") return `${a.ticker} ${a.condition} ${a.threshold}%`;
    const pf = savedPortfolios.find(p => p.id === a.portfolioId);
    return `${pf?.name || "Portfolio"} ${a.condition} ${a.threshold}%`;
  };

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300 }}
      />
      <motion.div
        initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 320, background: "var(--bg2)", borderLeft: "0.5px solid var(--border)", zIndex: 301, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 18px 14px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>Alerts</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Price &amp; Portfolio Alerts</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {/* Type tabs */}
        <div style={{ display: "flex", borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
          {(["price", "portfolio"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", fontSize: 11, fontWeight: tab === t ? 600 : 400, color: tab === t ? "var(--text)" : "var(--text3)", background: "transparent", border: "none", borderBottom: tab === t ? "1.5px solid var(--text)" : "1.5px solid transparent", cursor: "pointer", textTransform: "uppercase", letterSpacing: 1, transition: "all 0.15s", marginBottom: -1 }}>
              {t === "price" ? "Price Alert" : "Portfolio Alert"}
            </button>
          ))}
        </div>

        {/* Push notification banner */}
        {pushEnabled === false && (
          <div style={{ margin: "10px 18px 0", padding: "10px 12px", background: "rgba(224,92,92,0.08)", border: "0.5px solid rgba(224,92,92,0.3)", borderRadius: 9, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e05c5c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p style={{ fontSize: 11, color: "#e05c5c", flex: 1, lineHeight: 1.5 }}>
              {notifBlocked
                ? "Notifications are blocked in your browser. Click the lock icon in the address bar to allow them."
                : "Browser notifications are off. Alerts are saved but you won't receive push notifications."}
            </p>
            <button
              onClick={async () => {
                if (notifBlocked) {
                  alert("To enable notifications:\n1. Click the lock/info icon in your browser address bar\n2. Find 'Notifications' and set it to 'Allow'\n3. Refresh the page");
                  return;
                }
                if (Notification.permission === "denied") {
                  alert("Notifications are blocked. Please click the lock icon in your browser address bar and allow notifications for corvo.capital, then refresh the page.");
                  return;
                }
                const p = await Notification.requestPermission();
                setPushEnabled(p === "granted");
                setNotifBlocked(p === "denied");
              }}
              style={{ fontSize: 10, padding: "4px 8px", borderRadius: 5, border: "0.5px solid rgba(224,92,92,0.4)", background: "rgba(224,92,92,0.1)", color: "#e05c5c", cursor: "pointer", whiteSpace: "nowrap" }}>
              {notifBlocked ? "How to fix" : "Enable"}
            </button>
          </div>
        )}
        {pushEnabled === true && (
          <div style={{ margin: "10px 18px 0", padding: "8px 12px", background: "rgba(76,175,125,0.08)", border: "0.5px solid rgba(76,175,125,0.25)", borderRadius: 9, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4caf7d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <p style={{ fontSize: 11, color: "#4caf7d" }}>Push notifications enabled</p>
          </div>
        )}

        {/* Form */}
        <div style={{ padding: "16px 18px", borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
          {tab === "price" && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Ticker</label>
              <TickerSearch value={ticker} onChange={setTicker} />
              {/* Portfolio tickers as quick-pick */}
              {assets && assets.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {assets.filter(a => a.ticker).map(a => (
                    <button key={a.ticker} onClick={() => setTicker(a.ticker)}
                      style={{ padding: "3px 8px", fontSize: 10, borderRadius: 4, border: `0.5px solid ${ticker === a.ticker ? "var(--accent)" : "var(--border)"}`, background: ticker === a.ticker ? "rgba(184,134,11,0.1)" : "transparent", color: ticker === a.ticker ? "var(--accent)" : "var(--text2)", cursor: "pointer", fontFamily: "var(--font-mono)", transition: "all 0.1s" }}>
                      {a.ticker}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === "portfolio" && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Portfolio</label>
              {savedPortfolios.length === 0 ? (
                <div style={{ padding: "10px 12px", background: "var(--bg3)", borderRadius: 7, fontSize: 12, color: "var(--text3)" }}>
                  No saved portfolios. Save a portfolio first from the analyzer.
                </div>
              ) : (
                <select value={selectedPortfolioId} onChange={e => setSelectedPortfolioId(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 7, color: selectedPortfolioId ? "var(--text)" : "var(--text3)", fontSize: 12, outline: "none", cursor: "pointer" }}>
                  <option value="">Select a portfolio...</option>
                  {savedPortfolios.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Condition</label>
              <select value={condition} onChange={e => setCondition(e.target.value as "drops" | "rises")}
                style={{ width: "100%", padding: "8px 10px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none", cursor: "pointer" }}>
                <option value="drops">Drops by</option>
                <option value="rises">Rises by</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Threshold %</label>
              <input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} min="0.1" max="100" step="0.5"
                style={{ width: "100%", padding: "8px 10px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none", fontFamily: "var(--font-mono)" }} />
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 10, padding: "10px 12px", background: "var(--bg3)", borderRadius: 8, lineHeight: 1.55, borderLeft: "2px solid var(--accent)" }}>
            {tab === "price"
              ? `Notify when ${ticker || "ticker"} ${condition} more than ${threshold || "?"}%`
              : `Notify when ${savedPortfolios.find(p => p.id === selectedPortfolioId)?.name || "portfolio"} ${condition} more than ${threshold || "?"}%`}
          </div>

          <button onClick={addAlert}
            style={{ width: "100%", padding: "9px", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 1.5, textTransform: "uppercase", background: "var(--accent)", color: "#0a0e14", border: "none", borderRadius: 8, cursor: "pointer", transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            + Set Alert
          </button>
        </div>

        {/* Alert list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
          {alerts.filter(a => a.type === tab).length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 32 }}>
              <div style={{ marginBottom: 10, display: "flex", justifyContent: "center", opacity: 0.3 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              </div>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>No {tab} alerts yet</p>
              <p style={{ fontSize: 11, color: "var(--text3)" }}>Set a threshold above to get notified</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {alerts.filter(a => a.type === tab).map(a => (
                <motion.div key={a.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", border: "0.5px solid var(--border)", borderRadius: 10, marginBottom: 7, background: "var(--card-bg)", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border2)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: a.condition === "drops" ? "rgba(224,92,92,0.1)" : "rgba(76,175,125,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={a.condition === "drops" ? "#e05c5c" : "#4caf7d"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {a.condition === "drops" ? <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></> : <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>}
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        {a.type === "price" && a.ticker && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{a.ticker}</span>}
                        {a.type === "portfolio" && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{savedPortfolios.find(p => p.id === a.portfolioId)?.name || "Portfolio"}</span>}
                        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: a.type === "price" ? "rgba(184,134,11,0.12)" : "rgba(76,175,125,0.12)", color: a.type === "price" ? "var(--accent)" : "#4caf7d", letterSpacing: 0.5, textTransform: "uppercase" as const }}>{a.type}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text2)" }}>
                        {a.condition === "drops" ? "Drops" : "Rises"} more than <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: a.condition === "drops" ? "#e05c5c" : "#4caf7d" }}>{a.threshold}%</span>
                      </p>
                    </div>
                    <button onClick={() => removeAlert(a.id)}
                      style={{ width: 24, height: 24, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(224,92,92,0.4)"; e.currentTarget.style.color = "#e05c5c"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text3)"; }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div style={{ padding: "10px 18px", borderTop: "0.5px solid var(--border)", flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: "var(--text3)", textAlign: "center", lineHeight: 1.5 }}>
            {userId ? "Alerts synced to your account." : "Sign in to sync alerts across devices."}
          </p>
        </div>
      </motion.div>
    </>
  );
}
