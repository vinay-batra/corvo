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
    if (typeof window === "undefined") return;
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
  try { if (typeof window === "undefined") return []; return JSON.parse(localStorage.getItem(HISTORY_KEY_PREFIX + portfolioId) || "[]"); } catch { return []; }
}

function loadLocal(): Portfolio[] {
  try { if (typeof window === "undefined") return []; const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveLocal(portfolios: Portfolio[]) {
  try {
    if (typeof window === "undefined") return;
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 10, letterSpacing: 2.5, color: C.amber, textTransform: "uppercase", fontWeight: 700, fontFamily: "Space Mono, monospace" }}>Saved</span>
        <button id="tour-save-btn" data-save-trigger onClick={() => setShowSave(s => !s)}
          style={{ fontSize: 10.5, letterSpacing: 1.2, color: C.amber, background: "rgba(201,168,76,0.07)", border: "0.5px solid rgba(201,168,76,0.25)", borderRadius: 6, cursor: "pointer", padding: "3px 9px", fontWeight: 700, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.14)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.07)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)"; }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Save
        </button>
      </div>
      <AnimatePresence initial={false}>
        {showSave && (
          <motion.div
            initial={false} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 5 }}>
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && save()}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="Portfolio name..."
                autoFocus
                style={{ flex: 1, padding: "6px 9px", background: "rgba(255,255,255,0.04)", border: `1px solid ${focused ? "rgba(201,168,76,0.4)" : C.border}`, borderRadius: 7, color: C.cream, fontSize: 11, fontFamily: "Inter,sans-serif", outline: "none", transition: "border-color 0.15s" }} />
              <button onClick={save} disabled={saving || savedOk}
                style={{ padding: "6px 10px", background: savedOk ? "rgba(92,184,138,0.15)" : C.amber2, border: `1px solid ${savedOk ? "rgba(92,184,138,0.4)" : "rgba(201,168,76,0.3)"}`, borderRadius: 7, color: savedOk ? "#5cb88a" : C.amber, fontSize: 10, cursor: "pointer", fontWeight: 700, transition: "all 0.2s", minWidth: 32 }}>
                {saving ? "..." : savedOk ? "OK" : "OK"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {portfolios.length === 0 ? (
        <p style={{ fontSize: 11, color: C.cream3, textAlign: "center", padding: "10px 0", letterSpacing: 0.1 }}>No saved portfolios</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {portfolios.map(p => (
            <motion.div key={p.id} initial={false} animate={{ opacity: 1 }}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 11px", background: "var(--bg2)", borderRadius: 10, border: `0.5px solid ${C.border}`, borderLeft: `2px solid transparent`, cursor: "pointer", transition: "all 0.15s", position: "relative" }}
              onClick={() => onLoad(p.assets)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)"; e.currentTarget.style.borderLeftColor = "var(--accent)"; e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.transform = "translateX(1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.borderLeftColor = "transparent"; e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.transform = "translateX(0)"; }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.cream2, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: -0.1 }}>{p.name}</p>
                <p style={{ fontSize: 10, color: C.cream3, margin: 0, fontFamily: "Space Mono, monospace", letterSpacing: 0.2 }}>
                  {p.assets.slice(0, 3).map((a: Asset) => a.ticker).join(" · ")}
                  {p.assets.length > 3 ? ` +${p.assets.length - 3}` : ""}
                </p>
              </div>
              <button onClick={e => { e.stopPropagation(); setDeleteConfirm(p.id); }}
                style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: "3px 5px", lineHeight: 1, flexShrink: 0, transition: "all 0.12s", borderRadius: 4, display: "flex" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "rgba(224,92,92,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.background = "transparent"; }}
                title="Delete portfolio">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal - Corvo-styled */}
      <AnimatePresence initial={false}>
        {deleteConfirm && (
          <motion.div
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={() => setDeleteConfirm(null)}>
            <motion.div
              initial={false} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "var(--card-bg)",
                border: "0.5px solid var(--border2)",
                borderTop: "2px solid var(--red)",
                borderRadius: 14,
                padding: "24px 24px 20px",
                maxWidth: 320, width: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(224,92,92,0.12)", border: "0.5px solid rgba(224,92,92,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: -0.2 }}>Delete portfolio?</p>
                  <p style={{ fontSize: 10, color: "var(--text3)", margin: 0, letterSpacing: 0.5 }}>This cannot be undone</p>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginBottom: 20 }}>
                This permanently deletes the portfolio and all its tracked history from Corvo.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setDeleteConfirm(null)}
                  style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text3)", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}>
                  Cancel
                </button>
                <button onClick={() => { remove(deleteConfirm); setDeleteConfirm(null); }}
                  style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "var(--red)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: 0.2, transition: "opacity 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
