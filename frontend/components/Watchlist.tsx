"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StockDetail from "./StockDetail";
import InfoModal from "./InfoModal";
import { supabase } from "../lib/supabase";
import { posthog } from "../lib/posthog";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const STORAGE_KEY = "corvo_watchlist";
const LISTS_KEY = "corvo_watchlist_lists";

const SECTOR_OVERRIDES: Record<string, string> = {
  "SPY": "ETF — Broad Market", "VOO": "ETF — Broad Market", "VTI": "ETF — Broad Market",
  "QQQ": "ETF — Technology", "IWM": "ETF — Small Cap", "ARKK": "ETF — Innovation",
  "GLD": "ETF — Gold", "IAU": "ETF — Gold", "SLV": "ETF — Silver",
  "BND": "ETF — Bonds", "TLT": "ETF — Bonds", "AGG": "ETF — Bonds",
  "SCHD": "ETF — Dividend", "VYM": "ETF — Dividend",
  "BTC-USD": "Crypto", "ETH-USD": "Crypto", "SOL-USD": "Crypto",
  "TSL": "ETF — Leveraged", "TQQQ": "ETF — Leveraged", "SQQQ": "ETF — Leveraged",
  "UVXY": "ETF — Volatility", "VXX": "ETF — Volatility",
};

function PencilIcon({ size = 11, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M11 2l3 3-8 8H3v-3L11 2z" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

// ── List icon set ─────────────────────────────────────────────────────────────
const LIST_ICON_KEYS = ["folder", "star", "chart", "home", "globe", "bolt", "heart", "shield"] as const;
type ListIconKey = typeof LIST_ICON_KEYS[number];

function ListIcon({ iconKey, size = 12, color = "currentColor" }: { iconKey: string; size?: number; color?: string }) {
  const s = { flexShrink: 0 as const };
  switch (iconKey) {
    case "star":
      return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={s}><path d="M8 2l1.8 3.6 4 .6-2.9 2.8.7 4L8 11l-3.6 1.9.7-4L2.2 6.2l4-.6L8 2z" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/></svg>;
    case "chart":
      return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={s}><rect x="1.5" y="8" width="3" height="6" rx="0.8" stroke={color} strokeWidth="1.2"/><rect x="6.5" y="4" width="3" height="10" rx="0.8" stroke={color} strokeWidth="1.2"/><rect x="11.5" y="1.5" width="3" height="12.5" rx="0.8" stroke={color} strokeWidth="1.2"/></svg>;
    case "home":
      return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={s}><path d="M2 7l6-5 6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/><path d="M6 14V9h4v5" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/></svg>;
    case "globe":
      return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={s}><circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.2"/><path d="M8 2c-2 2-2 8 0 12M8 2c2 2 2 8 0 12M2 8h12" stroke={color} strokeWidth="1.2"/></svg>;
    case "bolt":
      return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={s}><path d="M9.5 1.5L4 9h5l-2.5 5.5 7-8H8.5l1-5z" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/></svg>;
    case "heart":
      return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={s}><path d="M8 13.5S2 9.5 2 5.5A3.5 3.5 0 018 3.1 3.5 3.5 0 0114 5.5c0 4-6 8-6 8z" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/></svg>;
    case "shield":
      return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={s}><path d="M8 1.5l5.5 2v4c0 3.5-2.5 5.5-5.5 7-3-1.5-5.5-3.5-5.5-7v-4L8 1.5z" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/></svg>;
    default: // folder
      return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={s}><path d="M1.5 4.5v8c0 .83.67 1.5 1.5 1.5h10c.83 0 1.5-.67 1.5-1.5V6c0-.83-.67-1.5-1.5-1.5H8.5L7 3H3C2.17 3 1.5 3.67 1.5 4.5z" stroke={color} strokeWidth="1.25" fill="none" strokeLinejoin="round"/></svg>;
  }
}

function IconPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {LIST_ICON_KEYS.map(k => (
        <button key={k} onClick={() => onChange(k)}
          style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${value === k ? "var(--accent)" : "var(--border)"}`, background: value === k ? "rgba(184,134,11,0.1)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}>
          <ListIcon iconKey={k} size={12} color={value === k ? "var(--accent)" : "var(--text3)"} />
        </button>
      ))}
    </div>
  );
}

const WATCH_TICKERS: { ticker: string; name: string; type: string }[] = [
  { ticker: "AAPL",    name: "Apple Inc.",               type: "EQUITY" },
  { ticker: "MSFT",    name: "Microsoft Corp.",           type: "EQUITY" },
  { ticker: "NVDA",    name: "NVIDIA Corp.",              type: "EQUITY" },
  { ticker: "GOOGL",   name: "Alphabet Inc.",             type: "EQUITY" },
  { ticker: "AMZN",    name: "Amazon.com Inc.",           type: "EQUITY" },
  { ticker: "META",    name: "Meta Platforms Inc.",       type: "EQUITY" },
  { ticker: "TSLA",    name: "Tesla Inc.",                type: "EQUITY" },
  { ticker: "BRK-B",   name: "Berkshire Hathaway B",     type: "EQUITY" },
  { ticker: "JPM",     name: "JPMorgan Chase & Co.",      type: "EQUITY" },
  { ticker: "V",       name: "Visa Inc.",                 type: "EQUITY" },
  { ticker: "JNJ",     name: "Johnson & Johnson",         type: "EQUITY" },
  { ticker: "NFLX",    name: "Netflix Inc.",              type: "EQUITY" },
  { ticker: "AMD",     name: "Advanced Micro Devices",    type: "EQUITY" },
  { ticker: "INTC",    name: "Intel Corp.",               type: "EQUITY" },
  { ticker: "KO",      name: "Coca-Cola Co.",             type: "EQUITY" },
  { ticker: "PG",      name: "Procter & Gamble Co.",      type: "EQUITY" },
  { ticker: "DIS",     name: "Walt Disney Co.",           type: "EQUITY" },
  { ticker: "BA",      name: "Boeing Co.",                type: "EQUITY" },
  { ticker: "GS",      name: "Goldman Sachs Group",       type: "EQUITY" },
  { ticker: "UBER",    name: "Uber Technologies",         type: "EQUITY" },
  { ticker: "SPY",     name: "SPDR S&P 500 ETF",         type: "ETF" },
  { ticker: "QQQ",     name: "Invesco QQQ Trust",         type: "ETF" },
  { ticker: "IWM",     name: "iShares Russell 2000 ETF",  type: "ETF" },
  { ticker: "VTI",     name: "Vanguard Total Stock Mkt",  type: "ETF" },
  { ticker: "VOO",     name: "Vanguard S&P 500 ETF",      type: "ETF" },
  { ticker: "GLD",     name: "SPDR Gold Shares",          type: "ETF" },
  { ticker: "BND",     name: "Vanguard Total Bond Mkt",   type: "ETF" },
  { ticker: "SCHD",    name: "Schwab US Dividend Equity", type: "ETF" },
  { ticker: "ARKK",    name: "ARK Innovation ETF",        type: "ETF" },
  { ticker: "BTC-USD", name: "Bitcoin",                   type: "CRYPTOCURRENCY" },
  { ticker: "ETH-USD", name: "Ethereum",                  type: "CRYPTOCURRENCY" },
  { ticker: "SOL-USD", name: "Solana",                    type: "CRYPTOCURRENCY" },
];

const TICKER_TYPE_LABELS: Record<string, string> = { EQUITY: "Stock", ETF: "ETF", CRYPTOCURRENCY: "Crypto", MUTUALFUND: "Fund", INDEX: "Index" };

function localTickerSearch(q: string) {
  if (!q) return [];
  const upper = q.toUpperCase();
  return WATCH_TICKERS.filter(t => t.ticker.startsWith(upper) || t.name.toUpperCase().includes(upper)).slice(0, 6);
}

interface WatchList { id: string; name: string; icon: string; tickers: string[] }
interface WatchItem { ticker: string; addedAt: string; listId: string }
interface StockData {
  ticker: string;
  name: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  sparkline: number[];
  sector?: string;
}
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

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export default function Watchlist() {
  const [lists, setLists] = useState<WatchList[]>([]);
  const [activeListId, setActiveListId] = useState<string>("");
  const [items, setItems] = useState<WatchItem[]>([]);
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [loadingAll, setLoadingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ ticker: string; name: string; type: string }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  // Creating a new list
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListIcon, setNewListIcon] = useState<string>("folder");
  // Rename/edit list
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState<string>("folder");
  // List switcher
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const userIdRef = useRef<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Initialize lists and items: from Supabase if logged in, localStorage otherwise
  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;
      setUserId(uid);
      userIdRef.current = uid;

      if (uid) {
        // ── Logged-in: load from Supabase ──────────────────────────────
        const [{ data: dbLists }, { data: dbItems }] = await Promise.all([
          supabase.from("watchlist_lists").select("*").eq("user_id", uid).order("created_at", { ascending: true }),
          supabase.from("watchlist_items").select("*").eq("user_id", uid).order("added_at", { ascending: true }),
        ]);

        let loadedLists: WatchList[] = (dbLists ?? []).map((r: any) => ({
          id: r.id, name: r.name, icon: r.icon ?? "chart", tickers: [],
        }));
        const loadedItems: WatchItem[] = (dbItems ?? []).map((r: any) => ({
          ticker: r.ticker, addedAt: r.added_at, listId: r.list_id,
        }));

        // New user: create a default list in Supabase
        if (loadedLists.length === 0) {
          const defaultId = crypto.randomUUID();
          await supabase.from("watchlist_lists").insert({ id: defaultId, user_id: uid, name: "My Watchlist", icon: "chart" });
          loadedLists = [{ id: defaultId, name: "My Watchlist", icon: "chart", tickers: [] }];
        }

        setLists(loadedLists);
        setItems(loadedItems);
        setActiveListId(loadedLists[0].id);

      } else {
        // ── Logged-out: load from localStorage ────────────────────────
        let loadedLists: WatchList[] = [];
        try { const raw = localStorage.getItem(LISTS_KEY); if (raw) loadedLists = JSON.parse(raw); } catch {}

        let loadedItems: WatchItem[] = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            loadedItems = parsed.map((i: any) => typeof i === "string" ? { ticker: i, addedAt: new Date().toISOString(), listId: "" } : i);
          }
        } catch {}

        if (loadedLists.length === 0) {
          const defaultList: WatchList = { id: genId(), name: "My Watchlist", icon: "chart", tickers: [] };
          loadedLists = [defaultList];
          loadedItems = loadedItems.map(i => ({ ...i, listId: defaultList.id }));
          try { localStorage.setItem(LISTS_KEY, JSON.stringify(loadedLists)); } catch {}
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedItems)); } catch {}
        } else {
          loadedItems = loadedItems.map(i => ({ ...i, listId: i.listId || loadedLists[0].id }));
        }

        setLists(loadedLists);
        setItems(loadedItems);
        setActiveListId(loadedLists[0].id);
      }
    })();
  }, []);

  const fetchData = useCallback(async (tickerList: string[]) => {
    if (!tickerList.length) return;
    setLoadingAll(true);
    try {
      const r = await fetch(`${API_URL}/watchlist-data?tickers=${tickerList.join(",")}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const map: Record<string, StockData> = {};
      ((d.results ?? []) as StockData[]).forEach(s => { if (s?.ticker) map[s.ticker] = s; });
      setStockData(prev => ({ ...prev, ...map }));
    } catch {
      // silently ignore, watchlist will show stale or empty prices
    }
    setLoadingAll(false);
  }, []);

  const activeList = lists.find(l => l.id === activeListId);
  const activeItems = items.filter(i => i.listId === activeListId);

  useEffect(() => {
    const tickers = activeItems.map(i => i.ticker);
    if (tickers.length) fetchData(tickers);
  }, [activeListId, activeItems.map(i => i.ticker).join(",")]);

  const saveLists = (newLists: WatchList[]) => {
    setLists(newLists);
    if (!userId) {
      try { localStorage.setItem(LISTS_KEY, JSON.stringify(newLists)); } catch {}
    }
  };

  const saveItems = (newItems: WatchItem[]) => {
    setItems(newItems);
    if (!userId) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems)); } catch {}
    }
  };

  const add = async (directTicker?: string) => {
    const ticker = (directTicker ?? searchQuery).trim().toUpperCase();
    if (!ticker || !activeListId) return;
    if (activeItems.find(i => i.ticker === ticker)) { setError(`${ticker} is already in this list`); return; }
    setError("");
    // Dropdown selections bypass validation, ticker is already confirmed via search API or local list
    if (!directTicker) {
      setValidating(true);
      try {
        const r = await fetch(`${API_URL}/stock/${encodeURIComponent(ticker)}`);
        const d = await r.json();
        if (!d || !d.price || d.price === 0) { setError(`"${ticker}" not found. Check the symbol and try again`); setValidating(false); return; }
      } catch {
        setError(`"${ticker}" not found. Check the symbol and try again`); setValidating(false); return;
      }
      setValidating(false);
    }
    const newItem: WatchItem = { ticker, addedAt: new Date().toISOString(), listId: activeListId };
    saveItems([...items, newItem]);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    fetchData([ticker]);
    posthog.capture("watchlist_item_added", { ticker });
    if (userId) {
      try {
        await supabase.from("watchlist_items").insert({ user_id: userId, list_id: activeListId, ticker, added_at: newItem.addedAt });
      } catch {}
    }
  };

  const remove = (ticker: string) => {
    saveItems(items.filter(i => !(i.ticker === ticker && i.listId === activeListId)));
    setStockData(prev => { const n = { ...prev }; delete n[ticker]; return n; });
    if (userId) {
      supabase.from("watchlist_items")
        .delete()
        .eq("user_id", userId)
        .eq("list_id", activeListId)
        .eq("ticker", ticker)
        .then(() => {});
    }
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    const newId = userId ? crypto.randomUUID() : genId();
    const newList: WatchList = { id: newId, name: newListName.trim(), icon: newListIcon, tickers: [] };
    saveLists([...lists, newList]);
    setActiveListId(newList.id);
    setCreatingList(false);
    setNewListName("");
    setNewListIcon("folder");
    if (userId) {
      try {
        await supabase.from("watchlist_lists").insert({ id: newList.id, user_id: userId, name: newList.name, icon: newListIcon });
      } catch {}
    }
  };

  const deleteList = async (id: string) => {
    if (lists.length <= 1) return;
    const next = lists.filter(l => l.id !== id);
    saveLists(next);
    saveItems(items.filter(i => i.listId !== id));
    if (activeListId === id) setActiveListId(next[0].id);
    setSwitcherOpen(false);
    if (userId) {
      try {
        await supabase.from("watchlist_lists").delete().eq("id", id).eq("user_id", userId);
      } catch {}
    }
  };

  const startRename = (listId: string, name: string, icon: string) => {
    setActiveListId(listId);
    setEditingListId(listId);
    setEditName(name);
    setEditIcon(icon || "folder");
    setSwitcherOpen(false);
  };

  const saveRename = async () => {
    if (!editName.trim() || !editingListId) return;
    const listId = editingListId;
    const newName = editName.trim();
    const newIcon = editIcon;
    saveLists(lists.map(l => l.id === listId ? { ...l, name: newName, icon: newIcon } : l));
    setEditingListId(null);
    if (userId) {
      try {
        await supabase.from("watchlist_lists").update({ name: newName, icon: newIcon }).eq("id", listId).eq("user_id", userId);
      } catch {}
    }
  };

  // Close switcher + search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false);
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runSearch = useCallback((q: string) => {
    if (!q) { setSearchResults([]); setSearchOpen(false); return; }
    const local = localTickerSearch(q);
    if (local.length > 0) { setSearchResults(local); setSearchOpen(true); }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearchBusy(true);
      try {
        const r = await fetch(`${API_URL}/search-ticker?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        const api = (d.results || []) as { ticker: string; name: string; type: string }[];
        const apiSet = new Set(api.map((x: any) => x.ticker));
        const merged = [...api, ...local.filter(l => !apiSet.has(l.ticker))].slice(0, 6);
        if (merged.length > 0) { setSearchResults(merged); setSearchOpen(true); }
      } catch {}
      setSearchBusy(false);
    }, 300);
  }, []);

  if (selected) return <StockDetail ticker={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      {/* Lists header */}
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "14px 16px", background: "var(--card-bg)", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 2, height: 14, background: "var(--text)", borderRadius: 1 }} />
          <span style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" }}>Watchlist</span>
          <InfoModal title="Watchlist" sections={[{ label: "How it works", text: "Track any stocks you care about. Add tickers, set price alerts, and click any card for the full stock detail view. Create multiple named lists to organize your watchlist." }]} />
        </div>

        {/* List switcher dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div ref={switcherRef} style={{ position: "relative", flex: 1 }}>
            {editingListId === activeListId ? (
              /* Inline rename */
              <div style={{ background: "var(--bg3)", border: "0.5px solid rgba(184,134,11,0.4)", borderRadius: 9, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <ListIcon iconKey={editIcon} size={14} color="var(--accent)" />
                  <input
                    autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); saveRename(); } if (e.key === "Escape") setEditingListId(null); }}
                    style={{ flex: 1, padding: 0, background: "transparent", border: "none", color: "var(--text)", fontSize: 13, fontWeight: 500, outline: "none" }}
                  />
                  <button onClick={saveRename} style={{ background: "var(--accent)", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#0a0e14", padding: "4px 12px", borderRadius: 6, lineHeight: 1, flexShrink: 0 }}>Save</button>
                  <button onClick={() => setEditingListId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 0, display: "flex", alignItems: "center" }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
                <IconPicker value={editIcon} onChange={setEditIcon} />
              </div>
            ) : (
              /* Switcher trigger + rename button */
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  className="switcher-trigger"
                  onClick={() => setSwitcherOpen(o => !o)}
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, padding: "9px 13px", background: "var(--bg3)", border: `0.5px solid ${switcherOpen ? "rgba(184,134,11,0.4)" : "var(--border2)"}`, borderRadius: 9, cursor: "pointer", transition: "border-color 0.15s" }}>
                  <ListIcon iconKey={activeList?.icon || "folder"} size={14} color="var(--accent)" />
                  <span style={{ flex: 1, textAlign: "left", fontSize: 15, fontWeight: 700, color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: -0.2 }}>
                    {activeList?.name ?? "Watchlist"}
                  </span>
                  {activeItems.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", background: "var(--bg2)", padding: "2px 8px", borderRadius: 6, flexShrink: 0 }}>{activeItems.length}</span>
                  )}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, color: "var(--text3)", transform: switcherOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                    <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Dropdown */}
            <AnimatePresence>
              {switcherOpen && editingListId !== activeListId && (
                <motion.div
                  // initial={false} is required — do not remove
                  initial={false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 10, overflow: "hidden", zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}>
                  {lists.map(list => {
                    const count = items.filter(i => i.listId === list.id).length;
                    const isActive = list.id === activeListId;
                    return (
                      <div key={list.id}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", background: isActive ? "rgba(184,134,11,0.05)" : "transparent", transition: "background 0.1s", borderBottom: "0.5px solid var(--border)" }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg3)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isActive ? "rgba(184,134,11,0.05)" : "transparent"; }}
                        onClick={() => { setActiveListId(list.id); setSwitcherOpen(false); }}>
                        <ListIcon iconKey={list.icon || "folder"} size={12} color={isActive ? "var(--accent)" : "var(--text3)"} />
                        <span style={{ flex: 1, fontSize: 12, color: isActive ? "var(--text)" : "var(--text2)", fontWeight: isActive ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{list.name}</span>
                        {count > 0 && <span style={{ fontSize: 10, color: "var(--text3)", flexShrink: 0 }}>{count} {count === 1 ? "asset" : "assets"}</span>}
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <button onClick={e => { e.stopPropagation(); startRename(list.id, list.name, list.icon); }}
                            style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "transparent", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.1s, background 0.1s" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--bg3)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.background = "transparent"; }}>
                            <PencilIcon size={10} />
                          </button>
                          {lists.length > 1 && (
                            <button onClick={e => { e.stopPropagation(); deleteList(list.id); }}
                              style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "transparent", cursor: "pointer", color: "rgba(224,92,92,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, transition: "color 0.1s, background 0.1s" }}
                              onMouseEnter={e => { e.currentTarget.style.color = "#e05c5c"; e.currentTarget.style.background = "rgba(224,92,92,0.06)"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "rgba(224,92,92,0.4)"; e.currentTarget.style.background = "transparent"; }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Create new list */}
                  {creatingList ? (
                    <div style={{ padding: "10px 12px" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <ListIcon iconKey={newListIcon} size={12} color="var(--text3)" />
                        <input
                          autoFocus value={newListName} onChange={e => setNewListName(e.target.value)}
                          onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); createList(); } if (e.key === "Escape") { setCreatingList(false); setNewListName(""); } }}
                          placeholder="List name…"
                          style={{ flex: 1, padding: "2px 0", background: "transparent", border: "none", color: "var(--text)", fontSize: 12, outline: "none" }}
                        />
                        <button onClick={createList} style={{ background: "var(--accent)", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#0a0e14", padding: "4px 12px", borderRadius: 6, lineHeight: 1, flexShrink: 0 }}>Save</button>
                        <button onClick={() => { setCreatingList(false); setNewListName(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 0, display: "flex", alignItems: "center" }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      </div>
                      <IconPicker value={newListIcon} onChange={setNewListIcon} />
                    </div>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); setCreatingList(true); }}
                      style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontSize: 12, color: "var(--text3)", display: "flex", alignItems: "center", gap: 8, transition: "background 0.1s, color 0.1s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--bg3)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.background = "transparent"; }}>
                      <span style={{ fontSize: 15, lineHeight: 1, color: "var(--text3)" }}>+</span> New list
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {loadingAll && <div style={{ width: 12, height: 12, border: "1.5px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />}
        </div>

        {/* Add ticker search */}
        <div style={{ display: "flex", gap: 8, marginBottom: error ? 0 : 0 }}>
          <div ref={searchWrapRef} style={{ flex: 1, position: "relative" }}>
            <input
              value={searchQuery}
              onChange={e => { const v = e.target.value; setSearchQuery(v); setError(""); runSearch(v); }}
              onFocus={() => { if (searchQuery && searchResults.length > 0) setSearchOpen(true); }}
              onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") { add(); setSearchOpen(false); } if (e.key === "Escape") setSearchOpen(false); }}
              placeholder={`Add ticker to ${activeList?.name ?? "list"}…`}
              style={{ width: "100%", padding: "9px 12px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "var(--font-mono)", outline: "none", boxSizing: "border-box" }}
            />
            {searchBusy && <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 11, height: 11, border: "1.5px solid rgba(184,134,11,0.25)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}

            <AnimatePresence>
              {searchOpen && searchResults.length > 0 && (
                <motion.div
                  // initial={false} is required — do not remove
                  initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }}
                  style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 10, overflow: "hidden", zIndex: 300, boxShadow: "0 6px 20px rgba(0,0,0,0.5)" }}>
                  {searchResults.map((r, i) => (
                    <div key={r.ticker}
                      onMouseDown={e => { e.preventDefault(); add(r.ticker); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", cursor: "pointer", borderBottom: i < searchResults.length - 1 ? "0.5px solid var(--border)" : "none", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{r.ticker}</span>
                        <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 8 }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, background: "rgba(184,134,11,0.12)", color: "var(--accent)", letterSpacing: 0.5, flexShrink: 0 }}>
                        {TICKER_TYPE_LABELS[r.type] || r.type}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => { add(); setSearchOpen(false); }} disabled={validating}
            style={{ padding: "9px 18px", background: "var(--accent)", border: "none", borderRadius: 8, color: "#0a0e14", fontSize: 12, fontWeight: 600, cursor: validating ? "default" : "pointer", flexShrink: 0, opacity: validating ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
            {validating ? <><div style={{ width: 10, height: 10, border: "1.5px solid rgba(0,0,0,0.2)", borderTopColor: "var(--bg)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Checking</> : "+ Add"}
          </button>
          {activeItems.length > 0 && (
            <button onClick={() => fetchData(activeItems.map(i => i.ticker))}
              style={{ padding: "9px 12px", background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text2)", fontSize: 11, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(184,134,11,0.4)"; e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text2)"; }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
          )}
        </div>
        {error && <p style={{ fontSize: 11, color: "#e05c5c", marginTop: 8 }}>{error}</p>}
      </div>

      {/* Watchlist table */}
      {activeItems.length === 0 ? (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "48px 24px", background: "var(--card-bg)", textAlign: "center" }}>
          <div style={{ marginBottom: 10, opacity: 0.3 }}><ListIcon iconKey={activeList?.icon || "folder"} size={32} color="var(--text)" /></div>
          <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 6 }}>{activeList?.name ?? "Watchlist"} is empty</p>
          <p style={{ fontSize: 12, color: "var(--text3)" }}>Add tickers above to track them here</p>
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Ticker", "Company", "Price", "Change 1D", "Sparkline", "Sector", "Actions"].map(col => (
                    <th key={col} style={{ padding: "8px 12px", fontSize: 10, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", textAlign: "left", background: "var(--bg2)", borderBottom: "0.5px solid var(--border)", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {activeItems.map((item) => {
                    const s = stockData[item.ticker];
                    const pos = (s?.change_pct ?? 0) >= 0;
                    return (
                      <motion.tr key={item.ticker}
                        initial={false}
                        exit={{ opacity: 0 }}
                        className="pos-row"
                        onClick={() => setSelected(item.ticker)}
                        style={{ cursor: "pointer", borderBottom: "0.5px solid var(--border)", height: 48 }}>
                        {/* Ticker */}
                        <td style={{ padding: "0 12px" }}>
                          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{item.ticker}</span>
                        </td>
                        {/* Company */}
                        <td style={{ padding: "0 12px" }}>
                          <span style={{ fontSize: 12, color: "var(--text2)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{s?.name || "—"}</span>
                        </td>
                        {/* Price */}
                        <td style={{ padding: "0 12px" }}>
                          {s?.price != null && s.price > 0 ? (
                            <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>${s.price.toFixed(2)}</span>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--text3)" }}>{loadingAll ? "…" : "—"}</span>
                          )}
                        </td>
                        {/* Change 1D */}
                        <td style={{ padding: "0 12px" }}>
                          {s?.change_pct != null ? (
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 600, background: pos ? "rgba(76,175,125,0.1)" : "rgba(224,92,92,0.1)", color: pos ? "#4caf7d" : "#e05c5c" }}>
                              {pos ? "+" : ""}{s.change_pct.toFixed(2)}%
                            </span>
                          ) : <span style={{ color: "var(--text3)", fontSize: 11 }}>—</span>}
                        </td>
                        {/* Sparkline */}
                        <td style={{ padding: "0 12px" }}>
                          {s?.sparkline && s.sparkline.length > 1 ? <Sparkline data={s.sparkline} positive={pos} /> : <div style={{ width: 60 }} />}
                        </td>
                        {/* Sector */}
                        <td style={{ padding: "0 12px" }}>
                          {(() => {
                            const sectorLabel = SECTOR_OVERRIDES[item.ticker] ?? s?.sector ?? null;
                            return sectorLabel
                              ? <span style={{ fontSize: 11, color: "var(--text3)", background: "var(--bg3)", padding: "3px 9px", borderRadius: 8, whiteSpace: "nowrap" }}>{sectorLabel}</span>
                              : <span style={{ fontSize: 11, color: "var(--text3)" }}>—</span>;
                          })()}
                        </td>
                        {/* Actions */}
                        <td style={{ padding: "0 12px" }}>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                            <button onClick={e => { e.stopPropagation(); remove(item.ticker); }}
                              style={{ width: 24, height: 24, borderRadius: 6, border: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", transition: "all 0.15s" }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = "#e05c5c"; e.currentTarget.style.color = "#e05c5c"; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text3)"; }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suggested to Watch */}
      {(() => {
        const inList = new Set(activeItems.map(i => i.ticker));
        const suggestions = WATCH_TICKERS.filter(t => !inList.has(t.ticker));
        if (suggestions.length === 0) return null;
        const groups: Record<string, typeof WATCH_TICKERS> = {};
        suggestions.forEach(t => {
          const g = t.type === "CRYPTOCURRENCY" ? "CRYPTO" : t.type;
          if (!groups[g]) groups[g] = [];
          groups[g].push(t);
        });
        const order = ["EQUITY", "ETF", "CRYPTO"];
        return (
          <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginTop: 12 }}>
            <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 14 }}>Suggested to Watch</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {order.filter(g => groups[g]?.length).map(g => (
                <div key={g}>
                  <p style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8 }}>{g}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {groups[g].map(t => (
                      <button key={t.ticker} onClick={() => add(t.ticker)}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "0.5px solid var(--border)", background: "var(--bg3)", color: "var(--text2)", fontSize: 11, fontFamily: "var(--font-mono)", cursor: "pointer", transition: "all 0.15s", fontWeight: 600 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(184,134,11,0.4)"; e.currentTarget.style.color = "var(--accent)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text2)"; }}>
                        + {t.ticker}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .switcher-trigger:hover .pencil-reveal { opacity: 1 !important; }
        .pos-row:hover td { background: rgba(255,255,255,0.025) !important; }
      `}</style>
    </div>
  );
}
