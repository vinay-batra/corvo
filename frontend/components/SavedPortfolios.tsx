"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const LS_KEY = "corvo_saved_portfolios";
const HISTORY_KEY_PREFIX = "corvo_history_";
const C = { amber: "var(--accent)", amber2: "rgba(184,134,11,0.1)", border: "var(--border)", cream: "var(--text)", cream2: "var(--text2)", cream3: "var(--text3)" };
interface Asset { ticker: string; weight: number; }
interface Portfolio { id: string; name: string; assets: Asset[]; period?: string; }

/** Map a Supabase portfolios row → local Portfolio */
function fromDb(row: any): Portfolio {
  const tickers: string[] = row.tickers ?? [];
  const weights: number[] = row.weights ?? [];
  return {
    id: row.id,
    name: row.name,
    assets: tickers.map((t, i) => ({ ticker: t, weight: weights[i] ?? 0 })),
  };
}

/** Map local Portfolio → Supabase row shape */
function toDb(p: Portfolio, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    tickers: p.assets.map(a => a.ticker),
    weights: p.assets.map(a => a.weight),
    updated_at: new Date().toISOString(),
  };
}

function computeHealth(data: any): number {
  const ret = data.portfolio_return ?? 0;
  const vol = data.portfolio_volatility ?? 0.2;
  const sharpe = vol > 0 ? (ret - 0.04) / vol : 0;
  const rS = Math.min(Math.max(((ret + 0.3) / 0.6) * 100, 0), 100);
  const shS = Math.min(Math.max((sharpe / 3) * 100, 0), 100);
  const vS = Math.min(Math.max((1 - vol / 0.6) * 100, 0), 100);
  const dS = Math.min(Math.max((1 + (data.max_drawdown ?? 0) / 0.5) * 100, 0), 100);
  return Math.round(rS * 0.3 + shS * 0.3 + vS * 0.25 + dS * 0.15);
}

export function saveHistorySnapshot(portfolioId: string, data: any) {
  try {
    const key = HISTORY_KEY_PREFIX + portfolioId;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const snapshot = {
      date: new Date().toISOString(),
      return: data.portfolio_return ?? 0,
      volatility: data.portfolio_volatility ?? 0,
      sharpe: data.sharpe_ratio ?? (data.portfolio_volatility > 0 ? ((data.annualized_return ?? data.portfolio_return) - 0.04) / data.portfolio_volatility : 0),
      health: computeHealth(data),
    };
    const today = snapshot.date.slice(0, 10);
    const filtered = existing.filter((s: any) => s.date?.slice(0, 10) !== today);
    localStorage.setItem(key, JSON.stringify([...filtered, snapshot].slice(-30)));
  } catch {}
}

export function loadHistory(portfolioId: string): any[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY_PREFIX + portfolioId) || "[]"); } catch { return []; }
}

function loadLocal(): Portfolio[] {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveLocal(portfolios: Portfolio[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(portfolios));
    // Notify PositionsTab (same page) that portfolios changed
    window.dispatchEvent(new CustomEvent("corvo:portfolio-saved"));
  } catch {}
}

export default function SavedPortfolios({ assets, data, onLoad }: { assets: Asset[]; data: any; onLoad: (a: Asset[]) => void }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [name, setName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [focused, setFocused] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: authData }) => {
      const u = authData.user ?? null;
      setUser(u);
      fetchPortfolios(u);
    }).catch(() => fetchPortfolios(null));
  }, []);

  // Auto-save history snapshot when analysis data arrives
  useEffect(() => {
    if (!data || !portfolios.length) return;
    const currentTickers = assets.map(a => a.ticker).sort().join(",");
    const match = portfolios.find(p =>
      p.assets.map((a: Asset) => a.ticker).sort().join(",") === currentTickers
    );
    if (match) saveHistorySnapshot(match.id, data);
  }, [data]);

  const fetchPortfolios = async (u?: any) => {
    const activeUser = u ?? user;
    if (activeUser) {
      try {
        const { data: remote, error } = await supabase
          .from("portfolios")
          .select("*")
          .eq("user_id", activeUser.id)
          .order("created_at", { ascending: false });
        if (!error && remote) {
          setPortfolios(remote.map(fromDb));
          return;
        }
      } catch {}
    }
    // Logged-out or Supabase unavailable, use localStorage
    setPortfolios(loadLocal());
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const newPortfolio: Portfolio = {
      id: crypto.randomUUID(),
      name: name.trim(),
      assets,
    };

    if (user) {
      try {
        const { error } = await supabase
          .from("portfolios")
          .upsert(toDb(newPortfolio, user.id), { onConflict: "id" });
        if (!error) {
          await fetchPortfolios();
          setSavedOk(true);
          window.dispatchEvent(new CustomEvent("corvo:portfolio-saved"));
          setTimeout(() => { setSavedOk(false); setName(""); setShowSave(false); setSaving(false); }, 1000);
          return;
        }
      } catch {}
    }

    // Fallback: localStorage (saveLocal already dispatches the event)
    const local = loadLocal();
    const updated = [newPortfolio, ...local];
    saveLocal(updated);
    setPortfolios(updated);
    setSavedOk(true);
    setTimeout(() => { setSavedOk(false); setName(""); setShowSave(false); setSaving(false); }, 1000);
  };

  const remove = async (id: string) => {
    if (user) {
      try { await supabase.from("portfolios").delete().eq("id", id).eq("user_id", user.id); } catch {}
      await fetchPortfolios();
    } else {
      const updated = loadLocal().filter(p => p.id !== id);
      saveLocal(updated);
      setPortfolios(updated);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: 3, color: C.cream3, textTransform: "uppercase" }}>Saved</span>
        <button id="tour-save-btn" data-save-trigger onClick={() => setShowSave(s => !s)} style={{ fontSize: 11, letterSpacing: 1, color: C.amber, background: "none", border: "none", cursor: "pointer" }}>+ Save</button>
      </div>
      <AnimatePresence>
        {showSave && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 5 }}>
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && save()}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="Portfolio name..."
                autoFocus
                style={{ flex: 1, padding: "6px 9px", background: "rgba(255,255,255,0.04)", border: `1px solid ${focused ? "rgba(201,168,76,0.4)" : C.border}`, borderRadius: 7, color: C.cream, fontSize: 11, fontFamily: "Inter,sans-serif", outline: "none", transition: "border-color 0.15s" }} />
              <button onClick={save} disabled={saving || savedOk}
                style={{ padding: "6px 10px", background: savedOk ? "rgba(92,184,138,0.15)" : C.amber2, border: `1px solid ${savedOk ? "rgba(92,184,138,0.4)" : "rgba(201,168,76,0.3)"}`, borderRadius: 7, color: savedOk ? "#5cb88a" : C.amber, fontSize: 10, cursor: "pointer", fontWeight: 700, transition: "all 0.2s", minWidth: 32 }}>
                {saving ? "..." : savedOk ? "✓" : "OK"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {portfolios.length === 0 ? (
        <p style={{ fontSize: 11, color: C.cream3, textAlign: "center", padding: "6px 0" }}>No saved portfolios</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {portfolios.map(p => (
            <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.15s" }}
              onClick={() => onLoad(p.assets)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)"; e.currentTarget.style.background = "rgba(201,168,76,0.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, color: C.cream2, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                <p style={{ fontSize: 11, color: C.cream3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.assets.map((a: Asset) => a.ticker).join(", ")}</p>
              </div>
              {deleteConfirm === p.id ? (
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { remove(p.id); setDeleteConfirm(null); }}
                    style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, cursor: "pointer", background: "rgba(224,92,92,0.15)", border: "1px solid rgba(224,92,92,0.4)", color: "#e05c5c" }}>
                    Delete
                  </button>
                  <button onClick={() => setDeleteConfirm(null)}
                    style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text3)" }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); setDeleteConfirm(p.id); }} style={{ background: "none", border: "none", color: "rgba(224,92,92,0.3)", cursor: "pointer", fontSize: 11, padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = "#e05c5c"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(224,92,92,0.3)"}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
