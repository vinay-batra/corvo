"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ACCENT_COLORS = ["var(--green)","var(--cyan)","var(--purple)","#f59e0b","#f472b6","#34d399","#60a5fa","#a78bfa","#fb7185","#fbbf24"];
const TYPE_LABELS: Record<string, string> = { EQUITY: "Stock", ETF: "ETF", CRYPTOCURRENCY: "Crypto", MUTUALFUND: "Fund", INDEX: "Index" };

interface Asset { ticker: string; weight: number; }
interface SearchResult { ticker: string; name: string; exchange: string; type: string; }
interface Props { assets: Asset[]; setAssets: (a: Asset[]) => void; }

export default function PortfolioBuilder({ assets, setAssets }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [query, setQuery] = useState<Record<number, string>>({});
  const [searchResults, setSearchResults] = useState<Record<number, SearchResult[]>>({});
  const [searching, setSearching] = useState<Record<number, boolean>>({});
  const [tickerNames, setTickerNames] = useState<Record<string, string>>({});
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const blurTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const searchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const liveSearch = useCallback(async (i: number, q: string) => {
    if (!q || q.length < 1) { setSearchResults(prev => ({ ...prev, [i]: [] })); return; }
    clearTimeout(searchTimers.current[i]);
    searchTimers.current[i] = setTimeout(async () => {
      setSearching(prev => ({ ...prev, [i]: true }));
      try {
        const res = await fetch(`${API_URL}/search-ticker?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(prev => ({ ...prev, [i]: data.results || [] }));
        const names: Record<string, string> = {};
        (data.results || []).forEach((r: SearchResult) => { names[r.ticker] = r.name; });
        setTickerNames(prev => ({ ...prev, ...names }));
      } catch { setSearchResults(prev => ({ ...prev, [i]: [] })); }
      setSearching(prev => ({ ...prev, [i]: false }));
    }, 300);
  }, []);

  const updateWeight = (i: number, val: number) => {
    const next = [...assets]; next[i] = { ...next[i], weight: val }; setAssets(next);
  };
  const updateTicker = (i: number, val: string) => {
    setQuery(prev => ({ ...prev, [i]: val }));
    const next = [...assets]; next[i] = { ...next[i], ticker: val.toUpperCase() }; setAssets(next);
    liveSearch(i, val);
  };
  const selectTicker = (i: number, result: SearchResult) => {
    setQuery(prev => ({ ...prev, [i]: result.ticker }));
    setSearchResults(prev => ({ ...prev, [i]: [] }));
    const next = [...assets]; next[i] = { ...next[i], ticker: result.ticker }; setAssets(next);
    setActiveIndex(null);
    setTickerNames(prev => ({ ...prev, [result.ticker]: result.name }));
  };
  const remove = (i: number) => setAssets(assets.filter((_, idx) => idx !== i));
  const add = () => setAssets([...assets, { ticker: "", weight: 0.05 }]);
  const equalizeWeights = () => {
    if (!assets.length) return;
    const w = parseFloat((1 / assets.length).toFixed(4));
    setAssets(assets.map(a => ({ ...a, weight: w })));
  };

  const handleImageImport = async (file: File) => {
    setImportLoading(true); setImportError("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${API_URL}/parse-portfolio-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64, media_type: file.type || "image/jpeg" }),
      });
      const data = await res.json();
      if (data.assets?.length > 0) { setAssets(data.assets.slice(0, 20)); }
      else { setImportError("No holdings found — try a clearer screenshot."); }
    } catch { setImportError("Import failed. Try again."); }
    setImportLoading(false);
  };

  const totalWeight = assets.reduce((s, a) => s + a.weight, 0);
  const isBalanced = Math.abs(totalWeight - 1) < 0.01;

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-green)", borderRadius: 12, padding: "20px", position: "relative", overflow: "visible" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--green), transparent)", opacity: 0.6 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--text-muted)", textTransform: "uppercase" }}>Assets</p>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={() => fileRef.current?.click()} disabled={importLoading}
            style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 6, padding: "3px 8px", fontSize: 9, color: "var(--cyan)", cursor: "pointer", letterSpacing: 1, fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: 4 }}>
            {importLoading ? "⟳" : "📷"} IMPORT
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.[0]) handleImageImport(e.target.files[0]); e.target.value = ""; }} />
          <span onClick={!isBalanced ? equalizeWeights : undefined}
            title={!isBalanced ? "Click to equalize" : ""}
            style={{ fontSize: 9, fontFamily: "var(--font-display)", letterSpacing: 1, color: isBalanced ? "var(--green)" : "var(--cyan)", background: isBalanced ? "rgba(0,255,160,0.08)" : "rgba(0,212,255,0.08)", border: `1px solid ${isBalanced ? "rgba(0,255,160,0.2)" : "rgba(0,212,255,0.2)"}`, padding: "2px 7px", borderRadius: 4, cursor: isBalanced ? "default" : "pointer" }}>
            {(totalWeight * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {importError && <p style={{ fontSize: 10, color: "var(--red)", marginBottom: 10, textAlign: "center" }}>{importError}</p>}

      <AnimatePresence>
        {assets.map((a, i) => {
          const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
          const results = searchResults[i] || [];
          const name = tickerNames[a.ticker] || "";
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8, height: 0, marginBottom: 0 }} transition={{ duration: 0.2 }}
              style={{ marginBottom: 12, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                <div style={{ position: "relative", zIndex: activeIndex === i ? 60 : 1, flex: 1 }}>
                  <input
                    value={query[i] ?? a.ticker}
                    onFocus={() => setActiveIndex(i)}
                    onBlur={() => { blurTimers.current[i] = setTimeout(() => { setActiveIndex(prev => prev === i ? null : prev); setSearchResults(prev => ({ ...prev, [i]: [] })); }, 200); }}
                    onChange={e => updateTicker(i, e.target.value)}
                    placeholder="Search any ticker..."
                    style={{ width: "100%", padding: "6px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${activeIndex === i ? color : "var(--border-dim)"}`, borderRadius: 7, color, fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: 1, outline: "none", transition: "all 0.2s" }}
                  />
                  {searching[i] && (
                    <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, border: "1.5px solid var(--border-mid)", borderTopColor: color, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  )}
                  <AnimatePresence>
                    {activeIndex === i && results.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0a1222", border: "1px solid rgba(0,255,160,0.15)", borderRadius: 10, zIndex: 100, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.8)" }}>
                        {results.map((r, idx) => (
                          <div key={idx}
                            onMouseDown={e => { e.preventDefault(); clearTimeout(blurTimers.current[i]); selectTicker(i, r); }}
                            style={{ padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: idx < results.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,255,160,0.06)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <div>
                              <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--green)", letterSpacing: 1 }}>{r.ticker}</div>
                              <div style={{ fontSize: 10, color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 8, color: "var(--text-muted)" }}>{r.exchange}</div>
                              <div style={{ fontSize: 8, background: "rgba(0,212,255,0.1)", color: "var(--cyan)", padding: "1px 5px", borderRadius: 3 }}>{TYPE_LABELS[r.type] || r.type}</div>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <input type="number" min="0" max="100" step="1"
                  value={Math.round(a.weight * 100)}
                  onChange={e => updateWeight(i, Math.max(0, Math.min(100, Number(e.target.value))) / 100)}
                  style={{ width: 40, padding: "5px 4px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-dim)", borderRadius: 5, color: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-display)", outline: "none", textAlign: "center" }} />
                <span style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0 }}>%</span>
                <button onClick={() => remove(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,77,109,0.35)", fontSize: 13, padding: "0 2px", lineHeight: 1, transition: "color 0.2s", flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#ff4d6d")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,77,109,0.35)")}>✕</button>
              </div>
              {name && <div style={{ paddingLeft: 13, marginTop: 3, fontSize: 9, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>}
              <div style={{ paddingLeft: 13, marginTop: 4 }}>
                <input type="range" min="0" max="1" step="0.01" value={a.weight}
                  onChange={e => updateWeight(i, parseFloat(e.target.value))}
                  style={{ width: "100%", appearance: "none" as any, height: 2, background: `linear-gradient(90deg, ${color} ${a.weight * 100}%, rgba(255,255,255,0.08) ${a.weight * 100}%)`, borderRadius: 2, outline: "none", cursor: "pointer" }} />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={add} disabled={assets.length >= 20}
          style={{ flex: 1, padding: "8px", background: "transparent", border: "1px dashed rgba(0,255,160,0.18)", borderRadius: 8, color: "rgba(0,255,160,0.45)", fontSize: 10, letterSpacing: 2, fontFamily: "var(--font-body)", cursor: assets.length >= 20 ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: assets.length >= 20 ? 0.4 : 1 }}
          onMouseEnter={e => { if (assets.length < 20) { e.currentTarget.style.borderColor = "rgba(0,255,160,0.5)"; e.currentTarget.style.color = "var(--green)"; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,255,160,0.18)"; e.currentTarget.style.color = "rgba(0,255,160,0.45)"; }}>
          + ADD ASSET
        </button>
        {!isBalanced && assets.length > 0 && (
          <button onClick={equalizeWeights}
            style={{ padding: "8px 12px", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 8, color: "var(--cyan)", fontSize: 9, letterSpacing: 1, fontFamily: "var(--font-display)", cursor: "pointer" }}>
            EQUALIZE
          </button>
        )}
      </div>
    </div>
  );
}
