"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StockDetail from "./StockDetail";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { supabase } from "../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const STORAGE_KEY = "corvo_watchlist";
const ALERTS_KEY  = "corvo_alerts";

interface WatchItem { ticker: string; addedAt: string; }
interface StockData {
  ticker: string;
  name: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  sparkline: number[];
}
interface Alert { ticker: string; targetPrice: number; direction: "above" | "below"; triggered?: boolean; }

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return <div style={{ width: 60, height: 28 }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 60, H = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(" ");
  const color = positive ? "#5cb88a" : "#e05c5c";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function AlertModal({ ticker, onSave, onClose }: { ticker: string; onSave: (a: Alert) => void; onClose: () => void }) {
  const [price, setPrice] = useState("");
  const [dir, setDir] = useState<"above" | "below">("above");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
        style={{ background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 16, padding: "24px", width: "100%", maxWidth: 340 }}
        onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 14 }}>Set Price Alert — {ticker}</p>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {(["above", "below"] as const).map(d => (
            <button key={d} onClick={() => setDir(d)}
              style={{ flex: 1, padding: "8px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border2)", background: dir === d ? "var(--text)" : "transparent", color: dir === d ? "var(--bg)" : "var(--text2)", cursor: "pointer", transition: "all 0.15s" }}>
              Price {d}
            </button>
          ))}
        </div>
        <input
          type="number" placeholder="Target price (USD)" value={price}
          onChange={e => setPrice(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none", marginBottom: 14, fontFamily: "var(--font-mono)" }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text3)", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { if (!price) return; onSave({ ticker, targetPrice: parseFloat(price), direction: dir }); onClose(); }}
            style={{ flex: 1, padding: "9px", fontSize: 12, borderRadius: 8, border: "none", background: "var(--text)", color: "var(--bg)", fontWeight: 600, cursor: "pointer" }}>
            Set Alert
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Watchlist() {
  const [items, setItems]           = useState<WatchItem[]>([]);
  const [stockData, setStockData]   = useState<Record<string, StockData>>({});
  const [loadingAll, setLoadingAll] = useState(false);
  const [input, setInput]           = useState("");
  const [error, setError]           = useState("");
  const [selected, setSelected]     = useState<string | null>(null);
  const [alertFor, setAlertFor]     = useState<string | null>(null);
  const [alerts, setAlerts]         = useState<Alert[]>([]);
  const [notifGranted, setNotifGranted] = useState(false);
  const [userId, setUserId]         = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const { requestPermission, isGranted, notify } = usePushNotifications();
  const alertCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setNotifGranted(isGranted());

    // Load alerts: Supabase if logged in, otherwise localStorage
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id ?? null;
      setUserId(uid);
      userIdRef.current = uid;
      if (uid) {
        supabase.from("price_alerts").select("*").eq("user_id", uid).then(({ data: rows }) => {
          if (rows && rows.length > 0) {
            const mapped: Alert[] = rows.map((r: any) => ({
              ticker: r.ticker,
              targetPrice: r.target_price,
              direction: r.direction,
              triggered: r.triggered ?? false,
            }));
            setAlerts(mapped);
            try { localStorage.setItem(ALERTS_KEY, JSON.stringify(mapped)); } catch {}
          } else {
            // Fallback to localStorage if no Supabase rows
            try {
              const ar = localStorage.getItem(ALERTS_KEY);
              if (ar) setAlerts(JSON.parse(ar));
            } catch {}
          }
        });
      } else {
        try {
          const ar = localStorage.getItem(ALERTS_KEY);
          if (ar) setAlerts(JSON.parse(ar));
        } catch {}
      }
    });
  }, []);

  // Check alerts every 5 minutes against current prices
  useEffect(() => {
    const checkAlerts = () => {
      setAlerts(current => {
        if (!current.length) return current;
        let changed = false;
        const next = current.map(a => {
          if (a.triggered) return a;
          const priceData = stockData[a.ticker];
          if (!priceData?.price) return a;
          const triggered =
            (a.direction === "above" && priceData.price >= a.targetPrice) ||
            (a.direction === "below" && priceData.price <= a.targetPrice);
          if (triggered) {
            notify(
              `${a.ticker} Price Alert`,
              `${a.ticker} crossed $${a.targetPrice.toFixed(2)} (now $${priceData.price.toFixed(2)})`,
              `alert-${a.ticker}-${a.targetPrice}`
            );
            changed = true;
            return { ...a, triggered: true };
          }
          return a;
        });
        if (changed) {
          try { localStorage.setItem(ALERTS_KEY, JSON.stringify(next)); } catch {}
          // Update triggered status in Supabase
          const uid = userIdRef.current;
          if (uid) {
            next.filter(a => a.triggered).forEach(a => {
              supabase.from("price_alerts")
                .update({ triggered: true })
                .eq("user_id", uid).eq("ticker", a.ticker).eq("target_price", a.targetPrice)
                .then(() => {});
            });
          }
          return next;
        }
        return current;
      });
    };

    checkAlerts();
    alertCheckRef.current = setInterval(checkAlerts, 5 * 60 * 1000);
    return () => { if (alertCheckRef.current) clearInterval(alertCheckRef.current); };
  }, [stockData]);

  const fetchData = useCallback(async (tickerList: string[]) => {
    if (!tickerList.length) return;
    setLoadingAll(true);
    try {
      const r = await fetch(`${API_URL}/watchlist-data?tickers=${tickerList.join(",")}`);
      const d = await r.json();
      const map: Record<string, StockData> = {};
      (d.results || []).forEach((s: StockData) => { map[s.ticker] = s; });
      setStockData(prev => ({ ...prev, ...map }));
    } catch {}
    setLoadingAll(false);
  }, []);

  useEffect(() => {
    const tickers = items.map(i => i.ticker);
    if (tickers.length) fetchData(tickers);
  }, [items.map(i => i.ticker).join(",")]);

  const save = (list: WatchItem[]) => {
    setItems(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  const saveAlerts = async (list: Alert[]) => {
    setAlerts(list);
    try { localStorage.setItem(ALERTS_KEY, JSON.stringify(list)); } catch {}
    // Auto-request notification permission when first alert is saved
    if (list.length > 0 && !isGranted()) {
      requestPermission().then(ok => setNotifGranted(ok));
    }
    // Persist to Supabase if logged in
    if (userId) {
      // Delete existing alerts for this user and re-insert
      await supabase.from("price_alerts").delete().eq("user_id", userId);
      if (list.length > 0) {
        await supabase.from("price_alerts").insert(
          list.map(a => ({
            user_id: userId,
            ticker: a.ticker,
            target_price: a.targetPrice,
            direction: a.direction,
            triggered: a.triggered ?? false,
          }))
        );
      }
    }
  };

  const add = () => {
    const ticker = input.trim().toUpperCase();
    if (!ticker) return;
    if (items.find(i => i.ticker === ticker)) { setError(`${ticker} is already in your watchlist`); return; }
    setError("");
    const next = [...items, { ticker, addedAt: new Date().toISOString() }];
    save(next);
    setInput("");
    fetchData([ticker]);
  };

  const remove = (ticker: string) => {
    save(items.filter(i => i.ticker !== ticker));
    setStockData(prev => { const n = { ...prev }; delete n[ticker]; return n; });
  };

  if (selected) {
    return <StockDetail ticker={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      {/* Header + add */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 }} />
            <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Watchlist</span>
            {items.length > 0 && <span style={{ fontSize: 9, color: "var(--text3)" }}>· {items.length} stocks</span>}
          </div>
          {loadingAll && <div style={{ width: 12, height: 12, border: "1.5px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: error ? 8 : 0 }}>
          <input
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="Add ticker, e.g. TSLA"
            style={{ flex: 1, padding: "9px 12px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none" }}
          />
          <button onClick={add}
            style={{ padding: "9px 18px", background: "var(--text)", border: "none", borderRadius: 8, color: "var(--bg)", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            + Add
          </button>
          {items.length > 0 && (
            <button onClick={() => fetchData(items.map(i => i.ticker))}
              style={{ padding: "9px 14px", background: "transparent", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text3)", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
              ↻
            </button>
          )}
        </div>
        {error && <p style={{ fontSize: 11, color: "#e05c5c", marginTop: 8 }}>{error}</p>}
      </div>

      {/* Stock cards grid */}
      {items.length === 0 ? (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "48px 24px", background: "var(--card-bg)", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10, color: "var(--text3)" }}>◉</div>
          <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 6 }}>Your watchlist is empty</p>
          <p style={{ fontSize: 12, color: "var(--text3)" }}>Add tickers above to track them here</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          <AnimatePresence>
            {items.map(item => {
              const s = stockData[item.ticker];
              const pos = (s?.change_pct ?? 0) >= 0;
              const hasAlert = alerts.some(a => a.ticker === item.ticker);
              return (
                <motion.div key={item.ticker}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelected(item.ticker)}
                  style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px", background: "var(--card-bg)", cursor: "pointer", transition: "border-color 0.15s, background 0.15s", position: "relative" }}
                  whileHover={{ borderColor: "var(--border2)", backgroundColor: "var(--bg3)" }}>
                  {/* Ticker + remove */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{item.ticker}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s?.name || "—"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <button onClick={e => { e.stopPropagation(); setAlertFor(item.ticker); }}
                        title={hasAlert ? "Alert set" : "Set price alert"}
                        style={{ width: 24, height: 24, borderRadius: 6, border: "0.5px solid var(--border)", background: hasAlert ? "rgba(201,168,76,0.1)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: hasAlert ? "#c9a84c" : "var(--text3)", transition: "all 0.15s" }}>
                        ◎
                      </button>
                      <button onClick={e => { e.stopPropagation(); remove(item.ticker); }}
                        style={{ width: 24, height: 24, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--text3)", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#e05c5c"; e.currentTarget.style.color = "#e05c5c"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text3)"; }}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Price row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                      {s?.price != null ? (
                        <>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5 }}>
                            ${s.price.toFixed(2)}
                          </div>
                          {s.change_pct != null && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: pos ? "#5cb88a" : "#e05c5c", marginTop: 2 }}>
                              {pos ? "+" : ""}{s.change_pct.toFixed(2)}%
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>{loadingAll ? "Loading…" : "—"}</div>
                      )}
                    </div>
                    {s?.sparkline && s.sparkline.length > 1 && (
                      <Sparkline data={s.sparkline} positive={pos} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Notifications enable button */}
      {!notifGranted && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "12px 16px", background: "var(--card-bg)", marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text2)" }}>Get browser alerts when price targets are hit</span>
          <button onClick={async () => { const ok = await requestPermission(); setNotifGranted(ok); }}
            style={{ padding: "6px 14px", fontSize: 11, borderRadius: 8, border: "0.5px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.08)", color: "#c9a84c", cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>
            Enable Notifications
          </button>
        </div>
      )}

      {/* Active alerts list */}
      {alerts.length > 0 && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginTop: 12 }}>
          <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Active Alerts</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alerts.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg3)", borderRadius: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)", fontWeight: 700 }}>{a.ticker}</span>
                <span style={{ fontSize: 11, color: "var(--text2)" }}>Price {a.direction} ${a.targetPrice.toFixed(2)}</span>
                <button onClick={() => saveAlerts(alerts.filter((_, idx) => idx !== i))}
                  style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 12, padding: "0 4px" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#e05c5c"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert modal */}
      <AnimatePresence>
        {alertFor && (
          <AlertModal
            ticker={alertFor}
            onSave={a => saveAlerts([...alerts.filter(x => !(x.ticker === a.ticker && x.direction === a.direction)), a])}
            onClose={() => setAlertFor(null)}
          />
        )}
      </AnimatePresence>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
