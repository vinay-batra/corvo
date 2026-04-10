"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StockDetail from "./StockDetail";
import InfoModal from "./InfoModal";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { supabase } from "../lib/supabase";
import { posthog } from "../lib/posthog";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const STORAGE_KEY = "corvo_watchlist";
const LISTS_KEY = "corvo_watchlist_lists";
const ALERTS_KEY = "corvo_watchlist_alerts";

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
          style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${value === k ? "rgba(201,168,76,0.5)" : "var(--border)"}`, background: value === k ? "rgba(201,168,76,0.1)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}>
          <ListIcon iconKey={k} size={12} color={value === k ? "#c9a84c" : "var(--text3)"} />
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
      className="c-modal-backdrop-mobile"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
        className="c-modal-sheet"
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
  const [alertFor, setAlertFor] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifGranted, setNotifGranted] = useState(false);
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
  const { requestPermission, isGranted, notify } = usePushNotifications();
  const alertCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Initialize lists and items — from Supabase if logged in, localStorage otherwise
  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;
      setUserId(uid);
      userIdRef.current = uid;
      setNotifGranted(isGranted());

      if (uid) {
        // ── Logged-in: load from Supabase ──────────────────────────────
        const [{ data: dbLists }, { data: dbItems }] = await Promise.all([
          supabase.from("watchlist_lists").select("*").eq("user_id", uid).order("created_at", { ascending: true }),
          supabase.from("watchlist_items").select("*").eq("user_id", uid).order("added_at", { ascending: true }),
        ]);

        let loadedLists: WatchList[] = (dbLists ?? []).map((r: any) => ({
          id: r.id, name: r.name, icon: r.icon ?? "📈", tickers: [],
        }));
        const loadedItems: WatchItem[] = (dbItems ?? []).map((r: any) => ({
          ticker: r.ticker, addedAt: r.added_at, listId: r.list_id,
        }));

        // New user: create a default list in Supabase
        if (loadedLists.length === 0) {
          const defaultId = crypto.randomUUID();
          await supabase.from("watchlist_lists").insert({ id: defaultId, user_id: uid, name: "My Watchlist", icon: "📈" });
          loadedLists = [{ id: defaultId, name: "My Watchlist", icon: "📈", tickers: [] }];
        }

        setLists(loadedLists);
        setItems(loadedItems);
        setActiveListId(loadedLists[0].id);

        // Alerts from Supabase
        const { data: alertRows } = await supabase.from("price_alerts").select("*").eq("user_id", uid);
        if (alertRows && alertRows.length > 0) {
          const mapped: Alert[] = alertRows.map((r: any) => ({
            ticker: r.ticker, targetPrice: r.target_price, direction: r.direction, triggered: r.triggered ?? false,
          }));
          setAlerts(mapped);
          try { localStorage.setItem(ALERTS_KEY, JSON.stringify(mapped)); } catch {}
        } else {
          try { const ar = localStorage.getItem(ALERTS_KEY); if (ar) setAlerts(JSON.parse(ar)); } catch {}
        }
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
          const defaultList: WatchList = { id: genId(), name: "My Watchlist", icon: "📈", tickers: [] };
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

        try { const ar = localStorage.getItem(ALERTS_KEY); if (ar) setAlerts(JSON.parse(ar)); } catch {}
      }
    })();
  }, []);

  // Alert checking
  useEffect(() => {
    const checkAlerts = () => {
      setAlerts(current => {
        if (!current.length) return current;
        let changed = false;
        const next = current.map(a => {
          if (a.triggered) return a;
          const priceData = stockData[a.ticker];
          if (!priceData?.price) return a;
          if (a.targetPrice == null || !a.direction) return a;
          const triggered =
            (a.direction === "above" && priceData.price >= a.targetPrice) ||
            (a.direction === "below" && priceData.price <= a.targetPrice);
          if (triggered) {
            try { notify(`${a.ticker} Price Alert`, `${a.ticker} crossed $${a.targetPrice.toFixed(2)} (now $${priceData.price?.toFixed(2) ?? "?"})`, `alert-${a.ticker}-${a.targetPrice}`); } catch {}
            changed = true;
            return { ...a, triggered: true };
          }
          return a;
        });
        if (changed) {
          try { localStorage.setItem(ALERTS_KEY, JSON.stringify(next)); } catch {}
          const uid = userIdRef.current;
          if (uid) {
            next.filter(a => a.triggered).forEach(a => {
              supabase.from("price_alerts").update({ triggered: true }).eq("user_id", uid).eq("ticker", a.ticker).eq("target_price", a.targetPrice).then(() => {});
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
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const map: Record<string, StockData> = {};
      ((d.results ?? []) as StockData[]).forEach(s => { if (s?.ticker) map[s.ticker] = s; });
      setStockData(prev => ({ ...prev, ...map }));
    } catch {
      // silently ignore — watchlist will show stale or empty prices
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

  const saveAlerts = async (list: Alert[]) => {
    setAlerts(list);
    try { localStorage.setItem(ALERTS_KEY, JSON.stringify(list)); } catch {}
    if (list.length > 0 && !isGranted()) requestPermission().then(ok => setNotifGranted(ok));
    if (userId) {
      await supabase.from("price_alerts").delete().eq("user_id", userId);
      if (list.length > 0) {
        await supabase.from("price_alerts").insert(
          list.map(a => ({ user_id: userId, ticker: a.ticker, target_price: a.targetPrice, direction: a.direction, triggered: a.triggered ?? false }))
        );
      }
    }
  };

  const add = async (directTicker?: string) => {
    const ticker = (directTicker ?? searchQuery).trim().toUpperCase();
    if (!ticker || !activeListId) return;
    if (activeItems.find(i => i.ticker === ticker)) { setError(`${ticker} is already in this list`); return; }
    setError("");
    // Dropdown selections bypass validation — ticker is already confirmed via search API or local list
    if (!directTicker) {
      setValidating(true);
      try {
        const r = await fetch(`${API_URL}/stock/${encodeURIComponent(ticker)}`);
        const d = await r.json();
        if (!d || !d.price || d.price === 0) { setError(`"${ticker}" not found — check the symbol and try again`); setValidating(false); return; }
      } catch {
        setError(`"${ticker}" not found — check the symbol and try again`); setValidating(false); return;
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
              <div style={{ background: "var(--bg3)", border: "0.5px solid rgba(201,168,76,0.4)", borderRadius: 9, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <ListIcon iconKey={editIcon} size={14} color="#c9a84c" />
                  <input
                    autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); saveRename(); } if (e.key === "Escape") setEditingListId(null); }}
                    style={{ flex: 1, padding: 0, background: "transparent", border: "none", color: "var(--text)", fontSize: 13, fontWeight: 500, outline: "none" }}
                  />
                  <button onClick={saveRename} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#5cb88a", padding: 0, lineHeight: 1 }}>✓</button>
                  <button onClick={() => setEditingListId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--text3)", padding: 0, lineHeight: 1 }}>✕</button>
                </div>
                <IconPicker value={editIcon} onChange={setEditIcon} />
              </div>
            ) : (
              /* Switcher trigger + rename button */
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  className="switcher-trigger"
                  onClick={() => setSwitcherOpen(o => !o)}
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", background: "var(--bg3)", border: `0.5px solid ${switcherOpen ? "rgba(201,168,76,0.3)" : "var(--border2)"}`, borderRadius: 9, cursor: "pointer", transition: "border-color 0.15s" }}>
                  <ListIcon iconKey={activeList?.icon || "folder"} size={13} color="var(--text3)" />
                  <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeList?.name ?? "Watchlist"}
                  </span>
                  {activeItems.length > 0 && (
                    <span style={{ fontSize: 10, color: "var(--text3)", flexShrink: 0 }}>{activeItems.length} {activeItems.length === 1 ? "asset" : "assets"}</span>
                  )}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, color: "var(--text3)", transform: switcherOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                    <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  onClick={() => { if (activeList) startRename(activeList.id, activeList.name, activeList.icon); }}
                  title="Rename list"
                  style={{ height: 36, padding: "0 10px", display: "flex", alignItems: "center", gap: 5, background: "var(--bg3)", border: "0.5px solid var(--border2)", borderRadius: 9, cursor: "pointer", color: "var(--text3)", fontSize: 11, flexShrink: 0, transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text3)"; }}>
                  <PencilIcon size={11} /> <span style={{ letterSpacing: 0.2 }}>Rename</span>
                </button>
              </div>
            )}

            {/* Dropdown */}
            <AnimatePresence>
              {switcherOpen && editingListId !== activeListId && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 10, overflow: "hidden", zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}>
                  {lists.map(list => {
                    const count = items.filter(i => i.listId === list.id).length;
                    const isActive = list.id === activeListId;
                    return (
                      <div key={list.id}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", background: isActive ? "rgba(201,168,76,0.05)" : "transparent", transition: "background 0.1s", borderBottom: "0.5px solid var(--border)" }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg3)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isActive ? "rgba(201,168,76,0.05)" : "transparent"; }}
                        onClick={() => { setActiveListId(list.id); setSwitcherOpen(false); }}>
                        <ListIcon iconKey={list.icon || "folder"} size={12} color={isActive ? "#c9a84c" : "var(--text3)"} />
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
                              ✕
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
                        <button onClick={createList} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#5cb88a", padding: 0, lineHeight: 1 }}>✓</button>
                        <button onClick={() => { setCreatingList(false); setNewListName(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--text3)", padding: 0, lineHeight: 1 }}>✕</button>
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
            {searchBusy && <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 11, height: 11, border: "1.5px solid rgba(201,168,76,0.25)", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}

            <AnimatePresence>
              {searchOpen && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }}
                  style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 10, overflow: "hidden", zIndex: 300, boxShadow: "0 6px 20px rgba(0,0,0,0.5)" }}>
                  {searchResults.map((r, i) => (
                    <div key={r.ticker}
                      onMouseDown={e => { e.preventDefault(); add(r.ticker); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", cursor: "pointer", borderBottom: i < searchResults.length - 1 ? "0.5px solid var(--border)" : "none", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#c9a84c" }}>{r.ticker}</span>
                        <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 8 }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, background: "rgba(201,168,76,0.12)", color: "#c9a84c", letterSpacing: 0.5, flexShrink: 0 }}>
                        {TICKER_TYPE_LABELS[r.type] || r.type}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => { add(); setSearchOpen(false); }} disabled={validating}
            style={{ padding: "9px 18px", background: "var(--text)", border: "none", borderRadius: 8, color: "var(--bg)", fontSize: 12, fontWeight: 600, cursor: validating ? "default" : "pointer", flexShrink: 0, opacity: validating ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
            {validating ? <><div style={{ width: 10, height: 10, border: "1.5px solid rgba(0,0,0,0.2)", borderTopColor: "var(--bg)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Checking</> : "+ Add"}
          </button>
          {activeItems.length > 0 && (
            <button onClick={() => fetchData(activeItems.map(i => i.ticker))}
              style={{ padding: "9px 14px", background: "transparent", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text3)", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
              ↻
            </button>
          )}
        </div>
        {error && <p style={{ fontSize: 11, color: "#e05c5c", marginTop: 8 }}>{error}</p>}
      </div>

      {/* Stock cards */}
      {activeItems.length === 0 ? (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "48px 24px", background: "var(--card-bg)", textAlign: "center" }}>
          <div style={{ marginBottom: 10, opacity: 0.3 }}><ListIcon iconKey={activeList?.icon || "folder"} size={32} color="var(--text)" /></div>
          <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 6 }}>{activeList?.name ?? "Watchlist"} is empty</p>
          <p style={{ fontSize: 12, color: "var(--text3)" }}>Add tickers above to track them here</p>
        </div>
      ) : (
        <motion.div
          className="c-watchlist-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}
          initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
          <AnimatePresence>
            {activeItems.map(item => {
              const s = stockData[item.ticker];
              const pos = (s?.change_pct ?? 0) >= 0;
              const hasAlert = alerts.some(a => a.ticker === item.ticker);
              return (
                <motion.div key={item.ticker}
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelected(item.ticker)}
                  style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px", background: "var(--card-bg)", cursor: "pointer", transition: "border-color 0.15s, background 0.15s", position: "relative" }}
                  whileHover={{ borderColor: "var(--border2)", backgroundColor: "var(--bg3)" }}>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                      {s?.price != null && s.price > 0 ? (
                        <>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5 }}>${s.price.toFixed(2)}</div>
                          {s.change_pct != null && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: pos ? "#5cb88a" : "#e05c5c", marginTop: 2 }}>
                              {pos ? "+" : ""}{s.change_pct.toFixed(2)}%
                            </div>
                          )}
                        </>
                      ) : s && !loadingAll ? (
                        <div style={{ fontSize: 11, color: "#e05c5c" }}>Ticker not found</div>
                      ) : (
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>{loadingAll ? "Loading…" : "—"}</div>
                      )}
                    </div>
                    {s?.sparkline && s.sparkline.length > 1 && <span className="c-sparkline-hide"><Sparkline data={s.sparkline} positive={pos} /></span>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Notifications prompt */}
      {!notifGranted && (
        <div className="c-notif-prompt" style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "12px 16px", background: "var(--card-bg)", marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text2)" }}>Get browser alerts when price targets are hit</span>
          <button onClick={async () => { const ok = await requestPermission(); setNotifGranted(ok); }}
            style={{ padding: "6px 14px", fontSize: 11, borderRadius: 8, border: "0.5px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.08)", color: "#c9a84c", cursor: "pointer", flexShrink: 0, marginLeft: 12, minHeight: 44 }}>
            Enable Notifications
          </button>
        </div>
      )}

      {/* Active alerts */}
      {alerts.length > 0 && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 18px", background: "var(--card-bg)", marginTop: 12 }}>
          <p style={{ fontSize: 9, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase", marginBottom: 12 }}>Active Alerts</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alerts.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg3)", borderRadius: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)", fontWeight: 700 }}>{a.ticker}</span>
                <span style={{ fontSize: 11, color: "var(--text2)" }}>Price {a.direction ?? "—"} ${a.targetPrice != null ? a.targetPrice.toFixed(2) : "—"}</span>
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
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .switcher-trigger:hover .pencil-reveal { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
