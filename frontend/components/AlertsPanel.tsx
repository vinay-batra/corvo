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
          <div style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, border: "1.5px solid rgba(201,168,76,0.3)", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
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
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#c9a84c" }}>{r.ticker}</span>
                  <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 8 }}>{r.name}</span>
                </div>
                <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, background: "rgba(201,168,76,0.12)", color: "#c9a84c", letterSpacing: 0.5 }}>
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

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data }) => {
        const uid = data.user?.id ?? null;
        setUserId(uid);
        fetchAlerts(uid);
      })
      .catch(() => fetchAlerts(null));
  }, []);

  const fetchAlerts = async (uid: string | null) => {
    if (uid) {
      const { data, error } = await supabase
        .from("price_alerts")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (!error && data) {
        const mapped: Alert[] = data.map((r: any) => ({
          id: r.id, type: r.type, ticker: r.ticker,
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

    posthog.capture("alert_created", { alert_type: tab, condition });

    const newAlert: Alert = {
      id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
      type: tab,
      ticker: tab === "price" ? ticker.trim().toUpperCase() : undefined,
      condition,
      threshold: t,
      createdAt: new Date().toISOString(),
    };

    if (userId) {
      const { data, error } = await supabase
        .from("price_alerts")
        .insert({ user_id: userId, type: newAlert.type, ticker: newAlert.ticker ?? null, condition: newAlert.condition, threshold: newAlert.threshold })
        .select().single();
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
    return `Portfolio ${a.condition} ${a.threshold}%`;
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
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Type tabs */}
        <div style={{ display: "flex", borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
          {(["price", "portfolio"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", fontSize: 11, fontWeight: tab === t ? 600 : 400, color: tab === t ? "var(--text)" : "var(--text3)", background: "transparent", border: "none", borderBottom: tab === t ? "1.5px solid var(--text)" : "1.5px solid transparent", cursor: "pointer", textTransform: "uppercase", letterSpacing: 1, transition: "all 0.15s", marginBottom: -1 }}>
              {t === "price" ? "Price Alert" : "Portfolio Alert"}
            </button>
          ))}
        </div>

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
                      style={{ padding: "3px 8px", fontSize: 10, borderRadius: 4, border: `0.5px solid ${ticker === a.ticker ? "rgba(201,168,76,0.5)" : "var(--border)"}`, background: ticker === a.ticker ? "rgba(201,168,76,0.1)" : "transparent", color: ticker === a.ticker ? "#c9a84c" : "var(--text2)", cursor: "pointer", fontFamily: "var(--font-mono)", transition: "all 0.1s" }}>
                      {a.ticker}
                    </button>
                  ))}
                </div>
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

          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10, padding: "8px 10px", background: "var(--bg3)", borderRadius: 7, lineHeight: 1.55 }}>
            {tab === "price"
              ? `Notify me if ${ticker || "this ticker"} ${condition} more than ${threshold || "?"}%`
              : `Notify me if my portfolio ${condition} more than ${threshold || "?"}%`}
          </div>

          <button onClick={addAlert}
            style={{ width: "100%", padding: "9px", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 1.5, textTransform: "uppercase", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: 8, cursor: "pointer", transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            + Set Alert
          </button>
        </div>

        {/* Alert list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 32 }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>🔔</div>
              <p style={{ fontSize: 12, color: "var(--text3)" }}>No alerts set yet</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {alerts.map(a => (
                <motion.div key={a.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: "0.5px solid var(--border)", borderRadius: 9, marginBottom: 6, background: "var(--card-bg)" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: a.type === "price" ? "rgba(201,168,76,0.15)" : "rgba(92,184,92,0.15)", color: a.type === "price" ? "#c9a84c" : "#5cb85c", letterSpacing: 1, textTransform: "uppercase" as const }}>
                          {a.type}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text)", fontFamily: "var(--font-mono)" }}>{formatAlert(a)}</p>
                    </div>
                    <button onClick={() => removeAlert(a.id)}
                      style={{ width: 22, height: 22, borderRadius: 5, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
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
