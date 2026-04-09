"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const LS_KEY = "corvo_saved_portfolios";
const HISTORY_KEY_PREFIX = "corvo_history_";
const C = { amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", border: "rgba(255,255,255,0.06)", cream: "#e8e0cc", cream2: "rgba(232,224,204,0.5)", cream3: "rgba(232,224,204,0.25)" };
interface Asset { ticker: string; weight: number; }
interface Portfolio { id: string; name: string; assets: Asset[]; period?: string; }

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
      sharpe: data.portfolio_volatility > 0 ? (data.portfolio_return - 0.04) / data.portfolio_volatility : 0,
      health: computeHealth(data),
    };
    // Keep last 30 snapshots, avoid duplicates on same day
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
  try { localStorage.setItem(LS_KEY, JSON.stringify(portfolios)); } catch {}
}

export default function SavedPortfolios({ assets, data, onLoad }: { assets: Asset[]; data: any; onLoad: (a: Asset[]) => void }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchPortfolios();
  }, []);

  // Auto-save history snapshot when analysis data is available
  useEffect(() => {
    if (!data) return;
    const allLocal = loadLocal();
    // Find a saved portfolio that matches the current assets
    const currentTickers = assets.map(a => a.ticker).sort().join(",");
    const match = allLocal.find(p =>
      p.assets.map((a: Asset) => a.ticker).sort().join(",") === currentTickers
    );
    if (match) saveHistorySnapshot(match.id, data);
  }, [data]);

  const fetchPortfolios = async () => {
    const local = loadLocal();
    try {
      const { data: remote, error } = await supabase.from("portfolios").select("*").order("created_at", { ascending: false });
      if (!error && remote) {
        // Merge: remote first, then any local-only ones (by id not in remote)
        const remoteIds = new Set(remote.map((p: Portfolio) => p.id));
        const localOnly = local.filter(p => !remoteIds.has(p.id));
        setPortfolios([...remote as Portfolio[], ...localOnly]);
        return;
      }
    } catch {}
    // Supabase failed or not logged in — use localStorage only
    setPortfolios(local);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const newPortfolio: Portfolio = {
      id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
      name: name.trim(),
      assets,
    };

    // Try Supabase first if logged in
    if (user) {
      try {
        const { data: inserted, error } = await supabase
          .from("portfolios")
          .insert({ name: newPortfolio.name, assets, user_id: user.id })
          .select()
          .single();
        if (!error && inserted) {
          // Also save to localStorage as backup
          const local = loadLocal();
          saveLocal([inserted as Portfolio, ...local]);
          await fetchPortfolios();
          setName(""); setShowSave(false); setSaving(false);
          return;
        }
      } catch {}
    }

    // Fallback: save to localStorage
    const local = loadLocal();
    const updated = [newPortfolio, ...local];
    saveLocal(updated);
    setPortfolios(updated);
    setName(""); setShowSave(false); setSaving(false);
  };

  const remove = async (id: string) => {
    // Remove from local
    const local = loadLocal().filter(p => p.id !== id);
    saveLocal(local);
    // Try to remove from Supabase too
    if (user) {
      try { await supabase.from("portfolios").delete().eq("id", id); } catch {}
    }
    await fetchPortfolios();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 8, letterSpacing: 2.5, color: C.cream3, textTransform: "uppercase" }}>Saved</span>
        <button data-save-trigger onClick={() => setShowSave(s => !s)} style={{ fontSize: 9, letterSpacing: 1, color: C.amber, background: "none", border: "none", cursor: "pointer" }}>+ Save</button>
      </div>
      <AnimatePresence>
        {showSave && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 5 }}>
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && save()}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="Portfolio name..."
                style={{ flex: 1, padding: "6px 9px", background: "rgba(255,255,255,0.04)", border: `1px solid ${focused ? "rgba(201,168,76,0.4)" : C.border}`, borderRadius: 7, color: C.cream, fontSize: 11, fontFamily: "Inter,sans-serif", outline: "none", transition: "border-color 0.15s" }} />
              <button onClick={save} disabled={saving} style={{ padding: "6px 10px", background: C.amber2, border: "1px solid rgba(201,168,76,0.3)", borderRadius: 7, color: C.amber, fontSize: 10, cursor: "pointer", fontWeight: 600 }}>{saving ? "..." : "OK"}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {portfolios.length === 0 ? (
        <p style={{ fontSize: 10, color: C.cream3, textAlign: "center", padding: "6px 0" }}>No saved portfolios</p>
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
                <p style={{ fontSize: 9, color: C.cream3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.assets.map((a: Asset) => a.ticker).join(", ")}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); remove(p.id); }} style={{ background: "none", border: "none", color: "rgba(224,92,92,0.3)", cursor: "pointer", fontSize: 11, padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = "#e05c5c"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(224,92,92,0.3)"}>✕</button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
