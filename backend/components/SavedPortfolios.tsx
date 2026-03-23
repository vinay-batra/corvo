"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, Portfolio } from "../lib/supabase";

interface Props {
  currentAssets: { ticker: string; weight: number }[];
  currentPeriod: string;
  onLoad: (assets: { ticker: string; weight: number }[], period: string) => void;
}

export default function SavedPortfolios({ currentAssets, currentPeriod, onLoad }: Props) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    const { data } = await supabase
      .from("portfolios")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPortfolios(data);
  };

  const save = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    await supabase.from("portfolios").insert({
      name: name.trim(),
      assets: currentAssets,
      period: currentPeriod,
      user_id: user.id,
    });
    setName("");
    setShowSave(false);
    fetchPortfolios();
    setSaving(false);
  };

  const remove = async (id: string) => {
    await supabase.from("portfolios").delete().eq("id", id);
    fetchPortfolios();
  };

  if (!user) return null;

  return (
    <div style={{ padding: "0 16px 20px" }}>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontSize: 9, letterSpacing: 3, color: "rgba(226,232,240,0.22)", textTransform: "uppercase" }}>Saved</p>
          <button onClick={() => setShowSave(!showSave)} style={{
            fontSize: 9, letterSpacing: 2, color: "#00ffa0", background: "none", border: "none",
            cursor: "pointer", fontFamily: "'Orbitron', monospace", textTransform: "uppercase",
          }}>+ Save</button>
        </div>

        <AnimatePresence>
          {showSave && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ marginBottom: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && save()}
                  placeholder="Portfolio name..."
                  style={{ flex: 1, padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,255,160,0.2)", borderRadius: 7, color: "#e2e8f0", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", outline: "none" }}
                />
                <button onClick={save} disabled={saving} style={{
                  padding: "7px 12px", background: "rgba(0,255,160,0.1)", border: "1px solid rgba(0,255,160,0.3)",
                  borderRadius: 7, color: "#00ffa0", fontSize: 10, cursor: "pointer", fontFamily: "'Orbitron', monospace",
                }}>OK</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {portfolios.length === 0 ? (
          <p style={{ fontSize: 11, color: "rgba(226,232,240,0.2)", textAlign: "center", padding: "8px 0" }}>No saved portfolios</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {portfolios.map(p => (
              <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                onClick={() => onLoad(p.assets, p.period)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,255,160,0.2)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)")}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: "rgba(226,232,240,0.7)", marginBottom: 2 }}>{p.name}</p>
                  <p style={{ fontSize: 10, color: "rgba(226,232,240,0.25)" }}>{p.assets.map(a => a.ticker).join(", ")} · {p.period}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); remove(p.id); }} style={{ background: "none", border: "none", color: "rgba(255,77,109,0.3)", cursor: "pointer", fontSize: 12, padding: "0 2px" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#ff4d6d")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,77,109,0.3)")}
                >✕</button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
