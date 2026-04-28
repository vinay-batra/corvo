"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AMBER = "var(--accent)";
const GREEN = "#4caf7d";
const RED = "#e05c5c";

interface PriceTarget {
  id: string;
  user_id: string;
  ticker: string;
  target_price: number;
  direction: "above" | "below";
  notes: string;
  triggered: boolean;
  triggered_at: string | null;
  created_at: string;
  current_price?: number | null;
}

function ProgressBar({ current, target, direction }: { current: number; target: number; direction: "above" | "below" }) {
  // For "above": 0% = far below target, 100% = at/above target
  // For "below": 0% = far above target, 100% = at/below target
  let pct = 0;
  if (direction === "above") {
    // Assume we start tracking from 70% of target (arbitrary lower bound for visual)
    const low = target * 0.7;
    pct = Math.max(0, Math.min(100, ((current - low) / (target - low)) * 100));
  } else {
    // For below, start from 130% of target as high bound
    const high = target * 1.3;
    pct = Math.max(0, Math.min(100, ((high - current) / (high - target)) * 100));
  }
  const reached = direction === "above" ? current >= target : current <= target;
  const barColor = reached ? GREEN : AMBER;

  return (
    <div style={{ height: 4, background: "var(--bg3)", borderRadius: 2, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 0.5s ease" }} />
    </div>
  );
}

function pctToTarget(current: number, target: number, direction: "above" | "below"): string {
  if (!current || !target) return "-";
  const pct = ((target - current) / current) * 100;
  const abs = Math.abs(pct);
  const sign = direction === "above" ? "+" : "";
  if (abs < 0.01) return "at target";
  return `${sign}${pct.toFixed(1)}% to target`;
}

export default function PriceTargetTracker({ assets }: { assets: { ticker: string; weight: number }[] }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [targets, setTargets] = useState<PriceTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newTicker, setNewTicker] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDirection, setNewDirection] = useState<"above" | "below">("above");
  const [formError, setFormError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDirection, setEditDirection] = useState<"above" | "below">("above");

  const loadTargets = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/price-targets/${uid}`);
      if (!res.ok) throw new Error("Failed to load targets");
      const data = await res.json();
      setTargets(data);
    } catch (e: any) {
      setError(e.message || "Failed to load price targets");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      loadTargets(data.user.id);
    });
  }, [loadTargets]);

  const handleAdd = async () => {
    setFormError(null);
    if (!newTicker.trim()) { setFormError("Enter a ticker"); return; }
    const price = parseFloat(newPrice);
    if (!newPrice || isNaN(price) || price <= 0) { setFormError("Enter a valid price"); return; }
    if (!userId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/price-targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, ticker: newTicker.trim().toUpperCase(), target_price: price, direction: newDirection }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed to create"); }
      setNewTicker(""); setNewPrice(""); setNewDirection("above");
      await loadTargets(userId);
    } catch (e: any) {
      setFormError(e.message || "Failed to create target");
    }
    setSubmitting(false);
  };

  const handleDelete = async (targetId: string) => {
    if (!userId) return;
    try {
      await fetch(`${API_URL}/price-targets/${targetId}?user_id=${userId}`, { method: "DELETE" });
      setTargets(prev => prev.filter(t => t.id !== targetId));
    } catch {}
  };

  const handleEditSave = async (targetId: string) => {
    if (!userId) return;
    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) return;
    try {
      await fetch(
        `${API_URL}/price-targets/${targetId}?user_id=${userId}&target_price=${price}&direction=${editDirection}`,
        { method: "PATCH" }
      );
      setTargets(prev => prev.map(t => t.id === targetId ? { ...t, target_price: price, direction: editDirection } : t));
      setEditingId(null);
    } catch {}
  };

  const active = targets.filter(t => !t.triggered);
  const triggered = targets.filter(t => t.triggered);

  const tickerSuggestions = assets.map(a => a.ticker);

  return (
    <div>
      <style>{`
        @keyframes ptPulse{0%,100%{opacity:0.4}50%{opacity:1}}
        .pt-row:hover{background:var(--bg3)!important}
        .pt-input:focus{outline:none;border-color:var(--accent)!important;box-shadow:0 0 0 2px rgba(184,134,11,0.15)!important}
        .pt-btn-ghost:hover{background:var(--bg3)!important;color:var(--text)!important}
        .pt-select{background:var(--bg3);border:0.5px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--font-body);font-size:12px;padding:6px 10px;outline:none;cursor:pointer}
        .pt-select:focus{border-color:var(--accent)!important}
      `}</style>

      {/* ── Add new target ── */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px 16px", background: "var(--card-bg)", marginBottom: 16 }}>
        <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Set Price Target</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Ticker */}
          <div style={{ flex: "1 1 80px", minWidth: 80 }}>
            <label style={{ display: "block", fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>Ticker</label>
            <input
              className="pt-input"
              list="pt-ticker-list"
              value={newTicker}
              onChange={e => setNewTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              style={{ width: "100%", padding: "7px 10px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700 }}
            />
            <datalist id="pt-ticker-list">
              {tickerSuggestions.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          {/* Direction */}
          <div style={{ flex: "0 0 100px" }}>
            <label style={{ display: "block", fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>Direction</label>
            <select
              className="pt-select"
              value={newDirection}
              onChange={e => setNewDirection(e.target.value as "above" | "below")}
              style={{ width: "100%" }}
            >
              <option value="above">Rises above</option>
              <option value="below">Falls below</option>
            </select>
          </div>
          {/* Target price */}
          <div style={{ flex: "1 1 100px", minWidth: 100 }}>
            <label style={{ display: "block", fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>Target Price ($)</label>
            <input
              className="pt-input"
              type="number"
              step="0.01"
              min="0.01"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
              placeholder="0.00"
              style={{ width: "100%", padding: "7px 10px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 12, fontFamily: "var(--font-mono)" }}
            />
          </div>
          {/* Submit */}
          <button
            onClick={handleAdd}
            disabled={submitting}
            style={{ padding: "7px 16px", fontSize: 11, fontWeight: 600, borderRadius: 6, background: submitting ? "var(--bg3)" : AMBER, border: "none", color: submitting ? "var(--text3)" : "var(--bg)", cursor: submitting ? "default" : "pointer", transition: "all 0.15s", whiteSpace: "nowrap", letterSpacing: 0.5, alignSelf: "flex-end" }}
          >
            {submitting ? "Adding..." : "Add Target"}
          </button>
        </div>
        {formError && <p style={{ fontSize: 11, color: RED, marginTop: 8 }}>{formError}</p>}
      </div>

      {/* ── Active targets ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 56, background: "var(--bg3)", borderRadius: 8, animation: "ptPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      ) : error ? (
        <p style={{ fontSize: 12, color: RED }}>{error}</p>
      ) : active.length === 0 && triggered.length === 0 ? (
        <div style={{ padding: "32px 16px", textAlign: "center", border: "0.5px solid var(--border)", borderRadius: 10, background: "var(--card-bg)" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>No price targets yet</p>
          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
            Set a target price above to get an alert when a holding reaches it.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>Active Targets</p>
              <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                {active.map((t, i) => {
                  const isEditing = editingId === t.id;
                  const hasCurrent = t.current_price != null;
                  const reached = hasCurrent && (t.direction === "above" ? t.current_price! >= t.target_price : t.current_price! <= t.target_price);
                  const pctStr = hasCurrent ? pctToTarget(t.current_price!, t.target_price, t.direction) : "-";

                  return (
                    <div
                      key={t.id}
                      className="pt-row"
                      style={{ padding: "12px 14px", borderBottom: i < active.length - 1 ? "0.5px solid var(--border)" : "none", background: "var(--card-bg)", transition: "background 0.1s" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        {/* Ticker + direction */}
                        <div style={{ flex: "0 0 auto", minWidth: 80 }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: AMBER }}>{t.ticker}</div>
                          <div style={{ fontSize: 10, color: t.direction === "above" ? GREEN : RED, marginTop: 2 }}>
                            {t.direction === "above" ? "rises above" : "falls below"}
                          </div>
                        </div>

                        {/* Target price */}
                        {isEditing ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <select
                              className="pt-select"
                              value={editDirection}
                              onChange={e => setEditDirection(e.target.value as "above" | "below")}
                            >
                              <option value="above">Rises above</option>
                              <option value="below">Falls below</option>
                            </select>
                            <input
                              className="pt-input"
                              type="number"
                              step="0.01"
                              value={editPrice}
                              onChange={e => setEditPrice(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") handleEditSave(t.id); if (e.key === "Escape") setEditingId(null); }}
                              style={{ width: 90, padding: "5px 8px", background: "var(--bg3)", border: "0.5px solid var(--accent)", borderRadius: 5, color: "var(--text)", fontSize: 12, fontFamily: "var(--font-mono)", outline: "none" }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditSave(t.id)}
                              style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 5, background: AMBER, border: "none", color: "var(--bg)", cursor: "pointer" }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              style={{ padding: "5px 10px", fontSize: 11, borderRadius: 5, background: "var(--bg3)", border: "0.5px solid var(--border)", color: "var(--text3)", cursor: "pointer" }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ flex: "0 0 auto" }}>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                              ${t.target_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>target</div>
                          </div>
                        )}

                        {/* Current price + progress bar */}
                        {!isEditing && (
                          <div style={{ flex: 1, minWidth: 120 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <ProgressBar current={t.current_price ?? 0} target={t.target_price} direction={t.direction} />
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: hasCurrent ? "var(--text2)" : "var(--text3)", whiteSpace: "nowrap" }}>
                                {hasCurrent ? `$${t.current_price!.toFixed(2)}` : "loading"}
                              </span>
                            </div>
                            <div style={{ fontSize: 10, color: reached ? GREEN : "var(--text3)" }}>
                              {reached ? "Target reached" : pctStr}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        {!isEditing && (
                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                            <button
                              className="pt-btn-ghost"
                              onClick={() => { setEditingId(t.id); setEditPrice(String(t.target_price)); setEditDirection(t.direction); }}
                              title="Edit target"
                              style={{ width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}
                            >
                              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
                                <path d="M11 2l3 3-8 8H3v-3L11 2z"/>
                              </svg>
                            </button>
                            <button
                              className="pt-btn-ghost"
                              onClick={() => handleDelete(t.id)}
                              title="Delete target"
                              style={{ width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Triggered targets ── */}
          {triggered.length > 0 && (
            <div>
              <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>Triggered</p>
              <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden", opacity: 0.7 }}>
                {triggered.map((t, i) => (
                  <div
                    key={t.id}
                    style={{ padding: "10px 14px", borderBottom: i < triggered.length - 1 ? "0.5px solid var(--border)" : "none", background: "var(--card-bg)", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: AMBER, flex: "0 0 60px" }}>{t.ticker}</div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>
                        {t.direction === "above" ? "Rose above" : "Fell below"}{" "}
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--text2)" }}>${t.target_price.toFixed(2)}</span>
                      </span>
                      {t.triggered_at && (
                        <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 8 }}>
                          {new Date(t.triggered_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(t.id)}
                      title="Dismiss"
                      style={{ width: 22, height: 22, borderRadius: 5, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
