"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const STORAGE_KEY = "corvo_watchlist";

interface WatchItem {
  ticker: string;
  addedAt: string;
  price?: number;
  change?: number;
  changePct?: number;
}

export default function Watchlist() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [input, setInput] = useState("");
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!items.length) return;
    items.forEach(item => {
      if (prices[item.ticker] || loading[item.ticker]) return;
      setLoading(p => ({ ...p, [item.ticker]: true }));
      fetch(`${API_URL}/quote?ticker=${item.ticker}`)
        .then(r => r.json())
        .then(d => setPrices(p => ({ ...p, [item.ticker]: d })))
        .catch(() => {})
        .finally(() => setLoading(p => ({ ...p, [item.ticker]: false })));
    });
  }, [items.map(i => i.ticker).join(",")]);

  const save = (list: WatchItem[]) => {
    setItems(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  const add = () => {
    const ticker = input.trim().toUpperCase();
    if (!ticker) return;
    if (items.find(i => i.ticker === ticker)) { setError(`${ticker} is already on your watchlist`); return; }
    setError("");
    save([...items, { ticker, addedAt: new Date().toISOString() }]);
    setInput("");
  };

  const remove = (ticker: string) => save(items.filter(i => i.ticker !== ticker));

  return (
    <div>
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 }} />
          <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Watchlist</span>
        </div>

        {/* Add ticker */}
        <div style={{ display: "flex", gap: 8, marginBottom: error ? 8 : 16 }}>
          <input
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="e.g. TSLA"
            style={{ flex: 1, padding: "9px 12px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
          />
          <button onClick={add}
            style={{ padding: "9px 18px", background: "var(--text)", border: "none", borderRadius: 8, color: "var(--bg)", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            + Add
          </button>
        </div>
        {error && <p style={{ fontSize: 11, color: "#e05c5c", marginBottom: 12 }}>{error}</p>}

        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text3)" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>◉</div>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 4 }}>Your watchlist is empty</p>
            <p style={{ fontSize: 12 }}>Add tickers above to track them here</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <AnimatePresence>
              {items.map(item => {
                const q = prices[item.ticker];
                const isLoading = loading[item.ticker];
                const changePct = q?.changePct ?? q?.change_pct ?? null;
                const price = q?.price ?? q?.regularMarketPrice ?? null;
                const isPos = changePct >= 0;

                return (
                  <motion.div key={item.ticker}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text)", minWidth: 60 }}>{item.ticker}</span>
                      {isLoading ? (
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>Loading...</span>
                      ) : price != null ? (
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text)" }}>${Number(price).toFixed(2)}</span>
                          {changePct != null && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: isPos ? "#5cb88a" : "#e05c5c", background: isPos ? "rgba(92,184,138,0.1)" : "rgba(224,92,92,0.1)", padding: "2px 7px", borderRadius: 4 }}>
                              {isPos ? "+" : ""}{Number(changePct).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>—</span>
                      )}
                    </div>
                    <button onClick={() => remove(item.ticker)}
                      style={{ width: 26, height: 26, borderRadius: "50%", border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#e05c5c"; e.currentTarget.style.color = "#e05c5c"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text3)"; }}>
                      ✕
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
