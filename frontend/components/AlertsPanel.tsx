"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Alert {
  id: string;
  type: "price" | "portfolio";
  ticker?: string;
  condition: "drops" | "rises";
  threshold: number;
  createdAt: string;
}

const STORAGE_KEY = "corvo_alerts";

function loadAlerts(): Alert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAlerts(alerts: Alert[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts)); } catch {}
}

export function getAlertCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw).length : 0;
  } catch { return 0; }
}

export default function AlertsPanel({ onClose, assets }: { onClose: () => void; assets?: { ticker: string; weight: number }[] }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tab, setTab] = useState<"price" | "portfolio">("price");
  const [ticker, setTicker] = useState("");
  const [condition, setCondition] = useState<"drops" | "rises">("drops");
  const [threshold, setThreshold] = useState("10");

  useEffect(() => { setAlerts(loadAlerts()); }, []);

  const addAlert = () => {
    const t = parseFloat(threshold);
    if (isNaN(t) || t <= 0) return;
    if (tab === "price" && !ticker.trim()) return;
    const newAlert: Alert = {
      id: Date.now().toString(),
      type: tab,
      ticker: tab === "price" ? ticker.trim().toUpperCase() : undefined,
      condition,
      threshold: t,
      createdAt: new Date().toISOString(),
    };
    const updated = [newAlert, ...alerts];
    setAlerts(updated);
    saveAlerts(updated);
    setTicker("");
    setThreshold("10");
  };

  const removeAlert = (id: string) => {
    const updated = alerts.filter(a => a.id !== id);
    setAlerts(updated);
    saveAlerts(updated);
  };

  const formatAlert = (a: Alert) => {
    if (a.type === "price") return `${a.ticker} ${a.condition} ${a.threshold}%`;
    return `Portfolio ${a.condition} ${a.threshold}%`;
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300 }}
      />
      {/* Panel */}
      <motion.div
        initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 320,
          background: "var(--bg2)", borderLeft: "0.5px solid var(--border)",
          zIndex: 301, display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 18px 14px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>Alerts</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Price &amp; Portfolio Alerts</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Type tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
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
              <input
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                placeholder="e.g. AAPL"
                style={{ width: "100%", padding: "8px 10px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none", fontFamily: "var(--font-mono)" }}
              />
              {assets && assets.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {assets.filter(a => a.ticker).map(a => (
                    <button key={a.ticker} onClick={() => setTicker(a.ticker)} style={{ padding: "3px 8px", fontSize: 10, borderRadius: 4, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text2)", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
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
              <select
                value={condition}
                onChange={e => setCondition(e.target.value as "drops" | "rises")}
                style={{ width: "100%", padding: "8px 10px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none", cursor: "pointer" }}
              >
                <option value="drops">Drops by</option>
                <option value="rises">Rises by</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Threshold %</label>
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                min="0.1"
                max="100"
                step="0.5"
                style={{ width: "100%", padding: "8px 10px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 12, outline: "none", fontFamily: "var(--font-mono)" }}
              />
            </div>
          </div>

          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10, padding: "8px 10px", background: "var(--bg3)", borderRadius: 7, lineHeight: 1.55 }}>
            {tab === "price"
              ? `Notify me if ${ticker || "this ticker"} ${condition} more than ${threshold || "?"}%`
              : `Notify me if my portfolio ${condition} more than ${threshold || "?"}%`
            }
          </div>

          <button
            onClick={addAlert}
            style={{ width: "100%", padding: "9px", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 1.5, textTransform: "uppercase", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: 8, cursor: "pointer", transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
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
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: "0.5px solid var(--border)", borderRadius: 9, marginBottom: 6, background: "var(--card-bg)" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: a.type === "price" ? "rgba(201,168,76,0.15)" : "rgba(92,184,92,0.15)", color: a.type === "price" ? "#c9a84c" : "#5cb85c", letterSpacing: 1, textTransform: "uppercase" as const }}>
                          {a.type}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text)", fontFamily: "var(--font-mono)" }}>{formatAlert(a)}</p>
                    </div>
                    <button
                      onClick={() => removeAlert(a.id)}
                      style={{ width: 22, height: 22, borderRadius: 5, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div style={{ padding: "10px 18px", borderTop: "0.5px solid var(--border)", flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: "var(--text3)", textAlign: "center", lineHeight: 1.5 }}>
            Alerts are stored locally. Push notifications coming soon.
          </p>
        </div>
      </motion.div>
    </>
  );
}
