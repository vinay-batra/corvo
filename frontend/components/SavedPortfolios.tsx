"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const C = { amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)", border: "rgba(255,255,255,0.06)", cream: "#e8e0cc", cream2: "rgba(232,224,204,0.5)", cream3: "rgba(232,224,204,0.25)" };
interface Asset { ticker: string; weight: number; }
interface Portfolio { id: string; name: string; assets: Asset[]; period: string; }

export default function SavedPortfolios({ assets, data, onLoad }: { assets: Asset[]; data: any; onLoad: (a: Asset[]) => void }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)); fetchPortfolios(); }, []);

  const fetchPortfolios = async () => {
    const { data } = await supabase.from("portfolios").select("*").order("created_at", { ascending: false });
    if (data) setPortfolios(data as Portfolio[]);
  };

  const save = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    await supabase.from("portfolios").insert({ name: name.trim(), assets, user_id: user.id });
    setName(""); setShowSave(false); fetchPortfolios(); setSaving(false);
  };

  const remove = async (id: string) => { await supabase.from("portfolios").delete().eq("id", id); fetchPortfolios(); };

  if (!user) return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 8, letterSpacing: 2.5, color: C.cream3, textTransform: "uppercase" }}>Saved</span>
        <button onClick={() => setShowSave(s => !s)} style={{ fontSize: 9, letterSpacing: 1, color: C.amber, background: "none", border: "none", cursor: "pointer" }}>+ Save</button>
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