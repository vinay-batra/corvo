"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { importPortfolioCsv } from "../lib/api";
import { posthog } from "../lib/posthog";
import { RESOLVED_API_URL } from "../lib/api";

const API_URL = RESOLVED_API_URL;
const C = { amber: "var(--accent)", cream: "var(--text)", cream3: "var(--text3)", border: "var(--border)", navy4: "var(--bg2)" };
const DOTS = ["#b8860b","rgba(184,134,11,0.7)","rgba(184,134,11,0.5)","rgba(184,134,11,0.35)","rgba(184,134,11,0.25)","rgba(184,134,11,0.6)","rgba(184,134,11,0.45)","rgba(184,134,11,0.55)"];
const TYPE_LABELS: Record<string,string> = { EQUITY:"Stock", ETF:"ETF", CRYPTOCURRENCY:"Crypto", MUTUALFUND:"Fund", INDEX:"Index", CASH:"Cash" };

const CASH_TICKERS = new Set(["CASH", "FDRXX", "SPAXX", "VMFXX", "VUSXX", "SWVXX", "SPRXX", "TTTXX", "VMMXX", "BND", "SGOV", "BIL", "SHV"]);

const COMMON_TICKERS: { ticker: string; name: string; type: string; exchange: string }[] = [
  { ticker:"AAPL",    name:"Apple Inc.",                type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"MSFT",    name:"Microsoft Corp.",           type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"NVDA",    name:"NVIDIA Corp.",              type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"GOOGL",   name:"Alphabet Inc.",             type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"AMZN",    name:"Amazon.com Inc.",           type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"META",    name:"Meta Platforms Inc.",       type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"TSLA",    name:"Tesla Inc.",                type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"BRK-B",   name:"Berkshire Hathaway B",     type:"EQUITY",         exchange:"NYSE" },
  { ticker:"JPM",     name:"JPMorgan Chase & Co.",      type:"EQUITY",         exchange:"NYSE" },
  { ticker:"LLY",     name:"Eli Lilly and Co.",         type:"EQUITY",         exchange:"NYSE" },
  { ticker:"V",       name:"Visa Inc.",                 type:"EQUITY",         exchange:"NYSE" },
  { ticker:"UNH",     name:"UnitedHealth Group",        type:"EQUITY",         exchange:"NYSE" },
  { ticker:"XOM",     name:"Exxon Mobil Corp.",         type:"EQUITY",         exchange:"NYSE" },
  { ticker:"MA",      name:"Mastercard Inc.",           type:"EQUITY",         exchange:"NYSE" },
  { ticker:"AVGO",    name:"Broadcom Inc.",             type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"ORCL",    name:"Oracle Corp.",              type:"EQUITY",         exchange:"NYSE" },
  { ticker:"HD",      name:"Home Depot Inc.",           type:"EQUITY",         exchange:"NYSE" },
  { ticker:"COST",    name:"Costco Wholesale",          type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"WMT",     name:"Walmart Inc.",              type:"EQUITY",         exchange:"NYSE" },
  { ticker:"JNJ",     name:"Johnson & Johnson",         type:"EQUITY",         exchange:"NYSE" },
  { ticker:"BAC",     name:"Bank of America Corp.",     type:"EQUITY",         exchange:"NYSE" },
  { ticker:"NFLX",    name:"Netflix Inc.",              type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"ABBV",    name:"AbbVie Inc.",               type:"EQUITY",         exchange:"NYSE" },
  { ticker:"PG",      name:"Procter & Gamble Co.",      type:"EQUITY",         exchange:"NYSE" },
  { ticker:"KO",      name:"Coca-Cola Co.",             type:"EQUITY",         exchange:"NYSE" },
  { ticker:"CVX",     name:"Chevron Corp.",             type:"EQUITY",         exchange:"NYSE" },
  { ticker:"AMD",     name:"Advanced Micro Devices",    type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"MRK",     name:"Merck & Co.",               type:"EQUITY",         exchange:"NYSE" },
  { ticker:"ADBE",    name:"Adobe Inc.",                type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"QCOM",    name:"Qualcomm Inc.",             type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"CRM",     name:"Salesforce Inc.",           type:"EQUITY",         exchange:"NYSE" },
  { ticker:"TXN",     name:"Texas Instruments",         type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"NKE",     name:"Nike Inc.",                 type:"EQUITY",         exchange:"NYSE" },
  { ticker:"PEP",     name:"PepsiCo Inc.",              type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"TMO",     name:"Thermo Fisher Scientific",  type:"EQUITY",         exchange:"NYSE" },
  { ticker:"INTC",    name:"Intel Corp.",               type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"NOW",     name:"ServiceNow Inc.",           type:"EQUITY",         exchange:"NYSE" },
  { ticker:"INTU",    name:"Intuit Inc.",               type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"AMGN",    name:"Amgen Inc.",                type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"BKNG",    name:"Booking Holdings",          type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"GS",      name:"Goldman Sachs Group",       type:"EQUITY",         exchange:"NYSE" },
  { ticker:"ISRG",    name:"Intuitive Surgical",        type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"LRCX",    name:"Lam Research Corp.",        type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"MU",      name:"Micron Technology",         type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"REGN",    name:"Regeneron Pharmaceuticals", type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"CMG",     name:"Chipotle Mexican Grill",    type:"EQUITY",         exchange:"NYSE" },
  { ticker:"KLAC",    name:"KLA Corp.",                 type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"ADI",     name:"Analog Devices",            type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"GILD",    name:"Gilead Sciences",           type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"ADP",     name:"Automatic Data Processing", type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"PYPL",    name:"PayPal Holdings",           type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"UBER",    name:"Uber Technologies",         type:"EQUITY",         exchange:"NYSE" },
  { ticker:"T",       name:"AT&T Inc.",                 type:"EQUITY",         exchange:"NYSE" },
  { ticker:"VZ",      name:"Verizon Communications",    type:"EQUITY",         exchange:"NYSE" },
  { ticker:"GM",      name:"General Motors Co.",        type:"EQUITY",         exchange:"NYSE" },
  { ticker:"F",       name:"Ford Motor Co.",            type:"EQUITY",         exchange:"NYSE" },
  { ticker:"DIS",     name:"Walt Disney Co.",           type:"EQUITY",         exchange:"NYSE" },
  { ticker:"SBUX",    name:"Starbucks Corp.",           type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"BA",      name:"Boeing Co.",                type:"EQUITY",         exchange:"NYSE" },
  { ticker:"WFC",     name:"Wells Fargo & Co.",         type:"EQUITY",         exchange:"NYSE" },
  { ticker:"SCHW",    name:"Charles Schwab Corp.",      type:"EQUITY",         exchange:"NYSE" },
  { ticker:"MS",      name:"Morgan Stanley",            type:"EQUITY",         exchange:"NYSE" },
  { ticker:"C",       name:"Citigroup Inc.",            type:"EQUITY",         exchange:"NYSE" },
  { ticker:"IBM",     name:"IBM Corp.",                 type:"EQUITY",         exchange:"NYSE" },
  { ticker:"GE",      name:"GE Aerospace",              type:"EQUITY",         exchange:"NYSE" },
  { ticker:"CAT",     name:"Caterpillar Inc.",          type:"EQUITY",         exchange:"NYSE" },
  { ticker:"DE",      name:"Deere & Co.",               type:"EQUITY",         exchange:"NYSE" },
  { ticker:"MMM",     name:"3M Co.",                    type:"EQUITY",         exchange:"NYSE" },
  { ticker:"HON",     name:"Honeywell International",   type:"EQUITY",         exchange:"NASDAQ" },
  { ticker:"RTX",     name:"RTX Corp.",                 type:"EQUITY",         exchange:"NYSE" },
  { ticker:"MO",      name:"Altria Group",              type:"EQUITY",         exchange:"NYSE" },
  { ticker:"PM",      name:"Philip Morris International",type:"EQUITY",        exchange:"NYSE" },
  { ticker:"SO",      name:"Southern Co.",              type:"EQUITY",         exchange:"NYSE" },
  { ticker:"DUK",     name:"Duke Energy Corp.",         type:"EQUITY",         exchange:"NYSE" },
  { ticker:"EOG",     name:"EOG Resources",             type:"EQUITY",         exchange:"NYSE" },
  // ETFs
  { ticker:"SPY",     name:"SPDR S&P 500 ETF",         type:"ETF",            exchange:"NYSE" },
  { ticker:"QQQ",     name:"Invesco QQQ Trust",         type:"ETF",            exchange:"NASDAQ" },
  { ticker:"IWM",     name:"iShares Russell 2000 ETF",  type:"ETF",            exchange:"NYSE" },
  { ticker:"VTI",     name:"Vanguard Total Stock Mkt",  type:"ETF",            exchange:"NYSE" },
  { ticker:"VOO",     name:"Vanguard S&P 500 ETF",      type:"ETF",            exchange:"NYSE" },
  { ticker:"GLD",     name:"SPDR Gold Shares",          type:"ETF",            exchange:"NYSE" },
  { ticker:"SLV",     name:"iShares Silver Trust",      type:"ETF",            exchange:"NYSE" },
  { ticker:"VNQ",     name:"Vanguard Real Estate ETF",  type:"ETF",            exchange:"NYSE" },
  { ticker:"ARKK",    name:"ARK Innovation ETF",        type:"ETF",            exchange:"NYSE" },
  { ticker:"SCHD",    name:"Schwab US Dividend Equity", type:"ETF",            exchange:"NYSE" },
  { ticker:"VIG",     name:"Vanguard Dividend Appreciation",type:"ETF",        exchange:"NYSE" },
  { ticker:"TLT",     name:"iShares 20+ Year Treasury", type:"ETF",            exchange:"NASDAQ" },
  { ticker:"DIA",     name:"SPDR Dow Jones ETF",        type:"ETF",            exchange:"NYSE" },
  // Crypto
  { ticker:"BTC-USD", name:"Bitcoin",                   type:"CRYPTOCURRENCY", exchange:"CCC" },
  { ticker:"ETH-USD", name:"Ethereum",                  type:"CRYPTOCURRENCY", exchange:"CCC" },
  { ticker:"SOL-USD", name:"Solana",                    type:"CRYPTOCURRENCY", exchange:"CCC" },
  { ticker:"BNB-USD", name:"BNB",                       type:"CRYPTOCURRENCY", exchange:"CCC" },
  { ticker:"XRP-USD", name:"XRP",                       type:"CRYPTOCURRENCY", exchange:"CCC" },
  // Cash / Money Market
  { ticker:"CASH",    name:"Cash / Money Market",            type:"CASH",       exchange:"N/A" },
  { ticker:"FDRXX",   name:"Fidelity Gov't Cash Reserves",   type:"CASH",       exchange:"N/A" },
  { ticker:"SPAXX",   name:"Fidelity Gov't Money Market",    type:"CASH",       exchange:"N/A" },
  { ticker:"VMFXX",   name:"Vanguard Federal Money Market",  type:"CASH",       exchange:"N/A" },
  { ticker:"VUSXX",   name:"Vanguard Treasury Money Market", type:"CASH",       exchange:"N/A" },
  { ticker:"SWVXX",   name:"Schwab Value Advantage Money Mkt",type:"CASH",      exchange:"N/A" },
  { ticker:"BND",     name:"Vanguard Total Bond Mkt ETF",    type:"CASH",       exchange:"NASDAQ" },
  { ticker:"SGOV",    name:"iShares 0-3 Month Treasury ETF", type:"CASH",       exchange:"CBOE" },
  { ticker:"BIL",     name:"SPDR 1-3 Month T-Bill ETF",      type:"CASH",       exchange:"NYSE" },
  { ticker:"SHV",     name:"iShares Short Treasury Bond ETF",type:"CASH",       exchange:"NASDAQ" },
];

const BUILDER_PRESETS = [
  { label:"Tech Heavy",   assets:[{ticker:"AAPL",weight:0.25},{ticker:"MSFT",weight:0.25},{ticker:"NVDA",weight:0.25},{ticker:"GOOGL",weight:0.25}] },
  { label:"Diversified",  assets:[{ticker:"SPY", weight:0.40},{ticker:"BND", weight:0.30},{ticker:"GLD", weight:0.15},{ticker:"VNQ",  weight:0.15}] },
  { label:"Crypto Mix",   assets:[{ticker:"BTC-USD",weight:0.60},{ticker:"ETH-USD",weight:0.40}] },
  { label:"Dividend",     assets:[{ticker:"VIG", weight:0.35},{ticker:"SCHD",weight:0.35},{ticker:"JNJ", weight:0.15},{ticker:"KO",   weight:0.15}] },
  { label:"Conservative", assets:[{ticker:"BND", weight:0.50},{ticker:"SGOV",weight:0.20},{ticker:"SPY", weight:0.20},{ticker:"GLD",  weight:0.10}] },
];

function localSearch(q: string): { ticker: string; name: string; type: string; exchange: string }[] {
  if (!q) return [];
  const upper = q.toUpperCase();
  return COMMON_TICKERS.filter(t =>
    t.ticker.startsWith(upper) || t.name.toUpperCase().includes(upper)
  ).slice(0, 8);
}

function WeightInput({ weight, onCommit, inputStyle }: { weight: number; onCommit: (v: number) => void; inputStyle: React.CSSProperties }) {
  const [draft, setDraft] = useState(String(Math.round(weight * 100)));
  useEffect(() => { setDraft(String(Math.round(weight * 100))); }, [weight]);
  return (
    <input
      type="text"
      value={draft}
      onFocus={e => e.target.select()}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        const n = Number(draft);
        if (!isNaN(n) && n >= 0 && n <= 100) onCommit(n / 100);
        else setDraft(String(Math.round(weight * 100)));
      }}
      style={{ ...inputStyle, width: 64, padding: "5px 4px", fontFamily: "Space Mono,monospace", fontWeight: 600, textAlign: "center" }}
    />
  );
}

// Shared input styles
const INPUT_STYLE: React.CSSProperties = {
  background: "var(--input-bg)",
  border: "0.5px solid var(--border2)",
  color: "var(--text)",
  fontSize: 13,
  outline: "none",
  borderRadius: 6,
  padding: "5px 8px",
  width: "100%",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text2)",
  letterSpacing: 1,
  textTransform: "uppercase",
  display: "block",
  marginBottom: 4,
};

interface Asset {
  ticker: string;
  weight: number;
  purchasePrice?: number;
  purchaseDate?: string;
  manualReturn?: number;
}
interface Result { ticker: string; name: string; exchange: string; type: string; }
interface Props {
  assets: Asset[];
  onAssetsChange?: (a: Asset[]) => void;
  setAssets?: (a: Asset[]) => void;
  onAnalyze?: () => void;
  loading?: boolean;
  // Today's portfolio % change (number, not percent fraction - e.g. 0.23 for
  // +0.23%). When provided, the Portfolio Value input shows the LIVE value
  // (base x (1 + pct/100)) instead of the bare base. The user can click to
  // edit; the input snaps to the base on focus, and saves user input as the
  // new base on change.
  todayPct?: number | null;
}

export default function PortfolioBuilder({ assets, onAssetsChange, setAssets, onAnalyze, loading, todayPct }: Props) {
  const update = onAssetsChange || setAssets || (() => {});
  const [dark, setDark] = useState(true);
  const [active, setActive] = useState<number|null>(null);
  const [query, setQuery] = useState<Record<number,string>>({});
  const [results, setResults] = useState<Record<number,Result[]>>({});
  const [searching, setSearching] = useState<Record<number,boolean>>({});
  const [names, setNames] = useState<Record<string,string>>({});
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [presetConfirm, setPresetConfirm] = useState<typeof BUILDER_PRESETS[0]|null>(null);
  const [showUtilMenu, setShowUtilMenu] = useState(false);
  const utilMenuRef = useRef<HTMLDivElement>(null);
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);

  // Portfolio Value - persisted to localStorage. The stored value is the BASE
  // (user-entered cost basis / starting amount). The displayed value adds
  // today's gain so the input shows the live current portfolio value.
  const [portfolioValue, setPortfolioValueState] = useState<string>("50000");
  const [pvFocused, setPvFocused] = useState(false);
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("corvo_portfolio_value") : null;
    if (stored) setPortfolioValueState(stored);
  }, []);
  const handlePortfolioValueChange = (v: string) => {
    setPortfolioValueState(v);
    if (typeof window !== "undefined") {
      localStorage.setItem("corvo_portfolio_value", v);
      window.dispatchEvent(new Event("storage"));
    }
  };
  // Live (today's) value to show in the input when it's not being edited.
  const portfolioBaseNum = parseFloat(portfolioValue) || 0;
  const liveMultiplier = 1 + ((todayPct ?? 0) / 100);
  const portfolioLiveNum = portfolioBaseNum * liveMultiplier;
  const portfolioInputDisplay =
    pvFocused || !todayPct || portfolioBaseNum <= 0
      ? portfolioValue
      : Math.round(portfolioLiveNum).toString();
  const portfolioDeltaDollar = portfolioLiveNum - portfolioBaseNum;

  // Reinvest dividends toggle - persisted to localStorage
  const [reinvestDividends, setReinvestDividendsState] = useState<boolean>(true);
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("corvo_reinvest_dividends") : null;
    if (stored !== null) setReinvestDividendsState(stored !== "false");
  }, []);
  const handleReinvestToggle = () => {
    const next = !reinvestDividends;
    setReinvestDividendsState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("corvo_reinvest_dividends", next ? "true" : "false");
      window.dispatchEvent(new Event("storage"));
    }
  };

  useEffect(() => {
    const check = () => setDark(document.documentElement.dataset.theme !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!showUtilMenu) return;
    const handler = (e: MouseEvent) => { if (utilMenuRef.current && !utilMenuRef.current.contains(e.target as Node)) setShowUtilMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUtilMenu]);

  const [expandedSecondary, setExpandedSecondary] = useState<Set<number>>(new Set());
  const toggleSecondary = (i: number) => setExpandedSecondary(p => { const s = new Set(p); s.has(i) ? s.delete(i) : s.add(i); return s; });
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [csvPreview, setCsvPreview] = useState<{ tickers: string[]; weights: number[]; detected_format: string }|null>(null);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const blurT = useRef<Record<number,ReturnType<typeof setTimeout>>>({});
  const searchT = useRef<Record<number,ReturnType<typeof setTimeout>>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const fetchedNamesRef = useRef<Set<string>>(new Set());

  // Fetch names for any ticker not already known
  useEffect(() => {
    const missing = assets
      .map(a => a.ticker)
      .filter(t => t && !names[t] && !COMMON_TICKERS.find(c => c.ticker === t) && !fetchedNamesRef.current.has(t));
    missing.forEach(async (ticker) => {
      fetchedNamesRef.current.add(ticker);
      try {
        const r = await fetch(`${API_URL}/search-ticker?q=${encodeURIComponent(ticker)}`);
        const d = await r.json();
        const match = (d.results || []).find((x: Result) => x.ticker === ticker);
        if (match) setNames(p => ({ ...p, [ticker]: match.name }));
      } catch {}
    });
  }, [assets]);

  const search = useCallback(async (i: number, q: string) => {
    if (!q) { setResults(p => ({...p,[i]:[]})); return; }
    const upper = q.toUpperCase();
    if (CASH_TICKERS.has(upper)) {
      const local = localSearch(q);
      setResults(p => ({...p,[i]:local}));
      return;
    }
    const local = localSearch(q);
    if (local.length > 0) setResults(p => ({...p,[i]:local}));
    clearTimeout(searchT.current[i]);
    searchT.current[i] = setTimeout(async () => {
      setSearching(p => ({...p,[i]:true}));
      try {
        const res = await fetch(`${API_URL}/search-ticker?q=${encodeURIComponent(q)}`);
        const d = await res.json();
        const apiResults: Result[] = d.results || [];
        const apiTickers = new Set(apiResults.map((r: Result) => r.ticker));
        const merged = [...apiResults, ...local.filter(l => !apiTickers.has(l.ticker))].slice(0, 8);
        setResults(p => ({...p,[i]: merged.length > 0 ? merged : local}));
        const n: Record<string,string> = {};
        merged.forEach((r: Result) => { n[r.ticker]=r.name; });
        setNames(p => ({...p,...n}));
      } catch {
        if (local.length === 0) setResults(p => ({...p,[i]:[]}));
      }
      setSearching(p => ({...p,[i]:false}));
    }, 200);
  }, []);

  const updateWeight = (i: number, v: number) => { const n=[...assets]; n[i]={...n[i],weight:v}; update(n); };
  const updatePurchasePrice = (i: number, v: string) => {
    const n=[...assets]; n[i]={...n[i],purchasePrice:v===''?undefined:parseFloat(v)||undefined}; update(n);
  };
  const updatePurchaseDate = (i: number, v: string) => {
    const n=[...assets]; n[i]={...n[i],purchaseDate:v===''?undefined:v}; update(n);
  };
  const updateManualReturn = (i: number, v: string) => {
    const n=[...assets];
    const parsed = parseFloat(v);
    n[i]={...n[i],manualReturn: v==='' ? undefined : (isNaN(parsed) ? undefined : parsed)};
    update(n);
  };
  const updateTicker = (i: number, v: string) => {
    clearTimeout(blurT.current[i]);
    setActive(i);
    setQuery(p=>({...p,[i]:v}));
    search(i,v);
  };
  const select = (i: number, r: Result) => {
    setQuery(p=>({...p,[i]:r.ticker}));
    setResults(p=>({...p,[i]:[]}));
    const n=[...assets]; n[i]={...n[i],ticker:r.ticker}; update(n);
    setNames(p=>({...p,[r.ticker]:r.name}));
    setActive(null);
  };
  const remove = (i: number) => update(assets.filter((_,idx)=>idx!==i));
  const add = () => update([...assets,{ticker:"",weight:0.05}]);
  const equalize = () => { if(!assets.length)return; const w=parseFloat((1/assets.length).toFixed(4)); update(assets.map(a=>({...a,weight:w}))); };

  const loadPreset = (preset: typeof BUILDER_PRESETS[0]) => {
    if (assets.length > 0) {
      setPresetConfirm(preset);
    } else {
      update(preset.assets);
      setShowPresetsModal(false);
    }
  };

  const handleImport = async (file: File) => {
    setImportLoading(true); setImportError("");
    try {
      const b64 = await new Promise<string>((res,rej)=>{ const r=new FileReader(); r.onload=()=>res((r.result as string).split(",")[1]); r.onerror=rej; r.readAsDataURL(file); });
      const res = await fetch(`${API_URL}/parse-portfolio-image`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({image_base64:b64,media_type:file.type||"image/jpeg"}) });
      const d = await res.json();
      if(d.assets?.length>0) update(d.assets.slice(0,20));
      else setImportError("No holdings found.");
    } catch { setImportError("Import failed."); }
    setImportLoading(false);
  };

  const handleCsvFile = async (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setCsvError("Please upload a .csv file.");
      return;
    }
    setCsvLoading(true); setCsvError(""); setCsvPreview(null);
    try {
      const result = await importPortfolioCsv(file);
      if (result.error) { setCsvError(result.error); }
      else { setCsvPreview(result); }
    } catch { setCsvError("Upload failed. Please try again."); }
    setCsvLoading(false);
  };

  const confirmCsvImport = () => {
    if (!csvPreview) return;
    const newAssets = csvPreview.tickers.map((t, i) => ({ ticker: t, weight: csvPreview.weights[i] }));
    update(newAssets.slice(0, 20));
    posthog.capture("csv_import_used", { ticker_count: newAssets.length, detected_format: csvPreview.detected_format });
    setShowCsvModal(false);
    setCsvPreview(null);
    setCsvError("");
  };

  const total = Math.round(assets.reduce((s,a)=>s+a.weight,0)*10000)/10000;
  const totalPct = Math.round(total*1000)/10;
  const balanced = Math.abs(total-1)<0.01;
  const overweight = total > 1.005;
  const overBy = Math.round((totalPct-100)*10)/10;

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div style={{
        position:"sticky", top:0, zIndex:20,
        background:"var(--bg2)",
        marginLeft:-14, marginRight:-14, marginTop:-12,
        padding:"12px 14px 10px",
        borderBottom:`0.5px solid var(--border)`,
        backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
        boxShadow:"0 1px 0 rgba(201,168,76,0.06)",
      }}>
        {/* Hidden file input for screenshot import */}
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])handleImport(e.target.files[0]);e.target.value="";}} />

        {/* Single header row: Holdings label + count · weight status · ··· menu */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,letterSpacing:2.5,color:C.amber,textTransform:"uppercase",fontWeight:700,fontFamily:"Space Mono,monospace"}}>Holdings</span>
            {assets.filter(a=>a.ticker&&a.weight>0).length > 0 && (
              <span style={{fontSize:10,fontFamily:"Space Mono,monospace",color:C.amber,background:"rgba(201,168,76,0.08)",border:`0.5px solid rgba(201,168,76,0.22)`,borderRadius:5,padding:"1px 6px",fontWeight:700,letterSpacing:0.4}}>
                {assets.filter(a=>a.ticker&&a.weight>0).length}
              </span>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span
              onClick={!balanced && !overweight ? equalize : undefined}
              title={!balanced && !overweight ? "Click to equalize" : ""}
              style={{
                fontSize:10.5,padding:"3px 9px",
                border:`0.5px solid ${overweight?"rgba(224,92,92,0.5)":!balanced?"rgba(201,168,76,0.4)":C.border}`,
                borderRadius:6, cursor:balanced?"default":!overweight?"pointer":"default",
                color:overweight?"var(--red)":!balanced?C.amber:C.cream3,
                background:overweight?"rgba(224,92,92,0.07)":!balanced?"rgba(201,168,76,0.06)":"transparent",
                fontFamily:"Space Mono,monospace", transition:"all 0.15s", flexShrink:0,
                fontWeight:600, letterSpacing:0.3,
              }}>
              {overweight ? `${overBy}% over` : `${totalPct}%`}
            </span>
            {/* ··· overflow menu */}
            <div ref={utilMenuRef} style={{position:"relative"}}>
              <button
                onClick={()=>setShowUtilMenu(!showUtilMenu)}
                style={{background:"none",border:"0.5px solid var(--border)",borderRadius:6,cursor:"pointer",color:C.cream3,padding:"3px 8px",fontSize:14,lineHeight:1,display:"flex",alignItems:"center",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(201,168,76,0.4)";e.currentTarget.style.color=C.amber;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color=C.cream3;}}
                title="Options"
              >···</button>
              {showUtilMenu && (
                <div style={{position:"absolute",right:0,top:"calc(100% + 6px)",background:"var(--card-bg)",border:"0.5px solid var(--border2)",borderRadius:10,zIndex:200,minWidth:170,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",overflow:"hidden"}}>
                  {[
                    { label:"Load preset portfolio", action:()=>{ setShowPresetsModal(true); setShowUtilMenu(false); } },
                    { label:importLoading?"Importing...":"Import from screenshot", action:()=>{ if(!importLoading){ fileRef.current?.click(); setShowUtilMenu(false); } } },
                    { label:"Import from CSV", action:()=>{ setShowCsvModal(true); setCsvPreview(null); setCsvError(""); setShowUtilMenu(false); } },
                    ...(!balanced && assets.length > 0 ? [{ label:"Equalize weights", action:()=>{ equalize(); setShowUtilMenu(false); } }] : []),
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action} style={{display:"block",width:"100%",textAlign:"left",padding:"10px 14px",fontSize:12,color:"var(--text2)",background:"none",border:"none",cursor:"pointer",transition:"background 0.1s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="var(--bg3)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="none";}}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {importError&&<p style={{fontSize:10,color:"var(--red)",margin:"8px 0"}}>{importError}</p>}

      {/* ── Asset list ────────────────────────────────────────────── */}
      <div style={{marginTop:4, paddingTop:12}}>
      <AnimatePresence initial={false}>
        {assets.map((a,i)=>{
          const color=DOTS[i%DOTS.length];
          const res=results[i]||[];
          const isCash = CASH_TICKERS.has(a.ticker);
          const staticEntry = COMMON_TICKERS.find(t => t.ticker === a.ticker);
          const displayName = isCash
            ? (staticEntry?.name || "Cash / Money Market")
            : (names[a.ticker] || staticEntry?.name || "");
          const isExpanded = expandedSecondary.has(i);
          return (
            <motion.div key={`${a.ticker}-${i}`} initial={false} animate={{opacity:1,x:0}} exit={{opacity:0,height:0}} transition={{duration:0.15}} style={{marginBottom:12,position:"relative"}}>

              {/* Main row: dot · ticker · weight · expand · remove */}
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:color,flexShrink:0,marginTop:1,boxShadow:`0 0 6px ${color}`}}/>

                {/* Ticker search */}
                <div style={{position:"relative",flex:1,zIndex:active===i?50:1}}>
                  <input
                    id={`ticker-search-${i}`}
                    name={`ticker-${i}`}
                    value={query[i]??a.ticker}
                    onFocus={()=>setActive(i)}
                    onBlur={()=>{
                      const typed = (query[i] ?? a.ticker).toUpperCase();
                      blurT.current[i]=setTimeout(()=>{
                        setActive(p=>p===i?null:p);
                        setResults(p=>({...p,[i]:[]}));
                        // Accept any non-empty typed ticker - don't require dropdown selection
                        if (typed && typed !== a.ticker) {
                          const n=[...assets]; n[i]={...n[i],ticker:typed}; update(n);
                        }
                      },200);
                    }}
                    onChange={e=>updateTicker(i,e.target.value)}
                    placeholder="Search ticker..."
                    className="accent-input"
                    style={{
                      ...INPUT_STYLE,
                      fontFamily:"Space Mono,monospace",
                      fontWeight:700,
                      letterSpacing:1,
                      border:`0.5px solid ${active===i?"rgba(201,168,76,0.5)":"var(--border2)"}`,
                      transition:"border-color 0.15s",
                    }}
                  />
                  {searching[i]&&<div style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",width:9,height:9,border:"1.5px solid rgba(201,168,76,0.2)",borderTopColor:C.amber,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>}
                  <AnimatePresence initial={false}>
                    {active===i&&(res.length>0||!!searching[i])&&(
                      <motion.div
                        // initial={false} is required - do not remove
                        initial={false} animate={{opacity:1,y:0}} exit={{opacity:0}}
                        style={{position:"absolute",top:"calc(100% + 3px)",left:0,right:0,background:"var(--card-bg)",border:`1px solid var(--border)`,borderRadius:10,zIndex:100,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
                        {res.map((r,idx)=>(
                          <div key={idx} onMouseDown={e=>{e.preventDefault();clearTimeout(blurT.current[i]);select(i,r);}}
                            style={{padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",borderBottom:idx<res.length-1?`1px solid var(--border)`:"none",transition:"background 0.1s"}}
                            onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(201,168,76,0.06)":"rgba(184,134,11,0.05)"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <div>
                              <div style={{fontFamily:"Space Mono,monospace",fontSize:11,color:dark?C.amber:"#8b6914",fontWeight:700}}>{r.ticker}</div>
                              <div style={{fontSize:10,color:C.cream3,maxWidth:"min(140px,40vw)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                            </div>
                            <span style={{fontSize:8,background:"rgba(201,168,76,0.1)",color:C.amber,padding:"2px 6px",borderRadius:3,border:"1px solid rgba(201,168,76,0.2)"}}>{TYPE_LABELS[r.type]||r.type}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Weight % input */}
                <WeightInput weight={a.weight} onCommit={v=>updateWeight(i,v)} inputStyle={INPUT_STYLE} />
                <span style={{fontSize:11,color:C.cream3,flexShrink:0}}>%</span>

                {/* Expand toggle */}
                <button
                  onClick={()=>toggleSecondary(i)}
                  title={isExpanded?"Collapse":"Expand details"}
                  style={{background:"none",border:"none",cursor:"pointer",color:isExpanded?"var(--accent)":"var(--text3)",padding:"0 2px",display:"flex",alignItems:"center",transition:"color 0.15s",flexShrink:0}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {isExpanded
                      ? <polyline points="18 15 12 9 6 15"/>
                      : <polyline points="6 9 12 15 18 9"/>}
                  </svg>
                </button>

                {/* Remove - inline confirm on first click */}
                {pendingRemove === i ? (
                  <button onClick={e=>{ e.stopPropagation(); remove(i); setPendingRemove(null); }}
                    style={{background:"rgba(224,92,92,0.1)",border:"0.5px solid rgba(224,92,92,0.4)",borderRadius:4,cursor:"pointer",color:"var(--red)",padding:"1px 6px",fontSize:9,fontWeight:600,flexShrink:0,whiteSpace:"nowrap",letterSpacing:0.3}}
                    onBlur={()=>setPendingRemove(null)}>
                    Remove?
                  </button>
                ) : (
                  <button onClick={e=>{ e.stopPropagation(); setPendingRemove(i); setTimeout(()=>setPendingRemove(p=>p===i?null:p),2500); }}
                    style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",padding:"0 2px",display:"flex",alignItems:"center",flexShrink:0,transition:"color 0.12s"}}
                    onMouseEnter={e=>e.currentTarget.style.color="var(--red)"}
                    onMouseLeave={e=>e.currentTarget.style.color="var(--text3)"}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>

              {/* Company name */}
              {displayName&&(
                <div style={{paddingLeft:13,marginTop:4,fontSize:11,color:C.cream3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:0.1}}>
                  {displayName}
                </div>
              )}

              {/* Weight progress bar */}
              <div style={{paddingLeft:13,marginTop:6}}>
                <div style={{height:4,borderRadius:3,background:"rgba(201,168,76,0.08)",overflow:"hidden",border:"0.5px solid rgba(201,168,76,0.06)"}}>
                  <div style={{height:"100%",width:`${Math.min(100,a.weight*100)}%`,background:`linear-gradient(90deg, var(--accent), rgba(201,168,76,0.85))`,borderRadius:3,transition:"width 0.2s ease",boxShadow:"0 0 6px rgba(201,168,76,0.35)"}}/>
                </div>
              </div>

              {/* Expandable detail section */}
              <AnimatePresence initial={false}>
                {isExpanded&&(
                  <motion.div
                    // initial={false} is required - do not remove
                    initial={false} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                    transition={{duration:0.15}}
                    style={{overflow:"hidden",paddingLeft:10,marginTop:8}}>
                    {isCash ? (
                      /* Cash: annual return only */
                      <div style={{display:"flex",flexDirection:"column",gap:2,maxWidth:120}}>
                        <label style={LABEL_STYLE}>Annual Return</label>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <input
                            id={`manual-return-${i}`}
                            name={`manualReturn-${i}`}
                            type="number" min="0" max="100" step="0.1"
                            placeholder="e.g. 4.5"
                            value={a.manualReturn ?? ""}
                            onChange={e=>updateManualReturn(i,e.target.value)}
                            style={{...INPUT_STYLE, fontFamily:"Space Mono,monospace"}}
                          />
                          <span style={{fontSize:13,color:"var(--text2)",flexShrink:0}}>%</span>
                        </div>
                      </div>
                    ) : (
                      /* Non-cash: avg cost + purchase date */
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                          <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:100,flex:"1 1 100px",maxWidth:160}}>
                            <label style={LABEL_STYLE}>Avg Cost $</label>
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <span style={{fontSize:13,color:"var(--text2)",lineHeight:1,flexShrink:0}}>$</span>
                              <input
                                id={`purchase-price-${i}`}
                                name={`purchasePrice-${i}`}
                                type="number" min="0" step="0.01"
                                placeholder="0.00"
                                value={a.purchasePrice ?? ""}
                                onChange={e=>updatePurchasePrice(i,e.target.value)}
                                style={{...INPUT_STYLE, fontFamily:"Space Mono,monospace"}}
                              />
                            </div>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:130,flex:"1 1 130px",maxWidth:180}}>
                            <label style={LABEL_STYLE}>Purchase Date</label>
                            <input
                              id={`purchase-date-${i}`}
                              name={`purchaseDate-${i}`}
                              type="date"
                              value={a.purchaseDate ?? ""}
                              onChange={e=>updatePurchaseDate(i,e.target.value)}
                              style={{...INPUT_STYLE, fontFamily:"inherit", colorScheme:dark?"dark":"light"}}
                            />
                          </div>
                        </div>
                        <p style={{fontSize:11,color:"var(--text-muted)",margin:0,lineHeight:1.4}}>Used for P&L, tax loss harvesting, and dividend calculations.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
      </div>

      {/* ── Add Asset + Equalize ───────────────────────────────────── */}
      <div style={{display:"flex",gap:6,marginTop:14,marginBottom:12}}>
        <button onClick={add} disabled={assets.length>=20}
          style={{flex:1,padding:"9px",background:"transparent",border:"1px dashed var(--border2)",borderRadius:9,color:C.cream3,fontSize:11,letterSpacing:1.2,cursor:assets.length>=20?"not-allowed":"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontWeight:600}}
          onMouseEnter={e=>{if(assets.length<20){e.currentTarget.style.borderColor="rgba(201,168,76,0.55)";e.currentTarget.style.color=C.amber;e.currentTarget.style.background="rgba(201,168,76,0.03)";}}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border2)";e.currentTarget.style.color=C.cream3;e.currentTarget.style.background="transparent";}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Asset
        </button>
        {!balanced&&assets.length>0&&(
          <button onClick={equalize}
            style={{padding:"9px 12px",background:"rgba(201,168,76,0.08)",border:"0.5px solid rgba(201,168,76,0.28)",borderRadius:9,color:C.amber,fontSize:11,letterSpacing:1.2,cursor:"pointer",fontWeight:600,transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(201,168,76,0.14)";e.currentTarget.style.borderColor="rgba(201,168,76,0.45)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(201,168,76,0.08)";e.currentTarget.style.borderColor="rgba(201,168,76,0.28)";}}>
            Equal
          </button>
        )}
      </div>

      {/* ── Portfolio Value input ──────────────────────────────────── */}
      <div style={{marginTop:6,marginBottom:16,padding:"14px 14px 12px",borderTop:"0.5px solid var(--border)",background:"linear-gradient(180deg, rgba(201,168,76,0.025) 0%, transparent 100%)",marginLeft:-14,marginRight:-14}}>
        <div style={{fontSize:10,letterSpacing:2.5,color:C.amber,textTransform:"uppercase",fontWeight:700,fontFamily:"Space Mono,monospace",marginBottom:7}}>Portfolio Value</div>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontFamily:"Space Mono,monospace",fontSize:14,color:C.amber,lineHeight:1,flexShrink:0,fontWeight:600}}>$</span>
          <input
            id="portfolio-value"
            name="portfolioValue"
            type="number"
            min="0"
            step="1000"
            value={portfolioInputDisplay}
            onChange={e=>handlePortfolioValueChange(e.target.value)}
            onFocus={(e) => { setPvFocused(true); e.currentTarget.select(); }}
            onBlur={() => setPvFocused(false)}
            placeholder="50000"
            className="accent-input"
            style={{...INPUT_STYLE, fontFamily:"Space Mono,monospace", fontWeight:700, fontSize:14, padding:"7px 9px"}}
          />
        </div>
        {/* Live delta line - only shown when we have today's pct and a real base */}
        {todayPct != null && portfolioBaseNum > 0 && (
          <div style={{
            fontSize: 10,
            marginTop: 6,
            lineHeight: 1.4,
            letterSpacing: 0.1,
            fontFamily: "Space Mono,monospace",
            color: portfolioDeltaDollar >= 0 ? "#4caf7d" : "var(--red)",
          }}>
            {portfolioDeltaDollar >= 0 ? "+" : "-"}${Math.abs(portfolioDeltaDollar).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            <span style={{ color: "var(--text3)", margin: "0 5px" }}>·</span>
            {todayPct >= 0 ? "+" : ""}{todayPct.toFixed(2)}% today
            <span style={{ color: "var(--text3)", margin: "0 5px" }}>·</span>
            <span style={{ color: "var(--text3)" }}>base ${portfolioBaseNum.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
          </div>
        )}
        <div style={{fontSize:10,color:"var(--text3)",marginTop:6,lineHeight:1.5,letterSpacing:0.1}}>
          Used for P&amp;L, tax loss harvesting, and dividend calculations
        </div>
        {/* Reinvest dividends toggle */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,paddingTop:10,borderTop:"0.5px solid var(--border)"}}>
          <div>
            <div style={{fontSize:11,color:"var(--text2)",fontWeight:600,letterSpacing:0.1}}>Reinvest dividends</div>
            <div style={{fontSize:10,color:"var(--text3)",marginTop:2,letterSpacing:0.1}}>Affects CAGR and returns</div>
          </div>
          <button
            onClick={handleReinvestToggle}
            style={{
              display:"flex",alignItems:"center",gap:6,padding:"5px 11px",borderRadius:20,
              border:`0.5px solid ${reinvestDividends ? "rgba(76,175,125,0.45)" : "var(--border)"}`,
              background:reinvestDividends ? "rgba(76,175,125,0.1)" : "var(--bg3)",
              color:reinvestDividends ? "#4caf7d" : "var(--text3)",
              fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.15s",
              letterSpacing:0.4,
            }}
            onMouseEnter={e=>{e.currentTarget.style.opacity="0.85";e.currentTarget.style.transform="translateY(-0.5px)";}}
            onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="translateY(0)";}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:reinvestDividends?"#4caf7d":"var(--text3)",transition:"background 0.15s",boxShadow:reinvestDividends?"0 0 5px rgba(76,175,125,0.6)":"none"}} />
            {reinvestDividends ? "Yes" : "No"}
          </button>
        </div>
      </div>

      {/* ── Presets Modal ─────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {showPresetsModal&&(
          <motion.div
            // initial={false} is required - do not remove
            initial={false} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
            onClick={()=>{setShowPresetsModal(false);setPresetConfirm(null);}}>
            <motion.div
              // initial={false} is required - do not remove
              initial={false} animate={{scale:1,y:0}} exit={{scale:0.94,y:10}} transition={{duration:0.18}}
              style={{background:"var(--card-bg)",border:"0.5px solid var(--border)",borderRadius:16,width:"100%",maxWidth:380,boxShadow:"var(--shadow-md)",overflow:"hidden"}}
              onClick={e=>e.stopPropagation()}>
              <div style={{padding:"22px 26px 20px",borderBottom:"0.5px solid var(--border)",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:9,letterSpacing:"0.22em",color:"var(--accent)",textTransform:"uppercase",marginBottom:7,fontFamily:"var(--font-mono)",fontWeight:700}}>Portfolio</div>
                  <div style={{fontFamily:"Space Mono, monospace",fontSize:18,fontWeight:700,color:"var(--text)",letterSpacing:-0.6,lineHeight:1.2}}>Load a Preset</div>
                </div>
                <button onClick={()=>{setShowPresetsModal(false);setPresetConfirm(null);}}
                  style={{background:"var(--bg3)",border:"0.5px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--text3)",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"color 0.15s, border-color 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.color="var(--accent)";e.currentTarget.style.borderColor="rgba(201,168,76,0.4)";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="var(--text3)";e.currentTarget.style.borderColor="var(--border)";}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
              {presetConfirm ? (
                <div style={{padding:"20px"}}>
                  <p style={{fontSize:13,color:"var(--text)",marginBottom:6}}>Replace current portfolio?</p>
                  <p style={{fontSize:12,color:"var(--text3)",marginBottom:20,lineHeight:1.6}}>
                    This will replace your current portfolio with <strong style={{color:C.amber}}>{presetConfirm.label}</strong>. Continue?
                  </p>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setPresetConfirm(null)}
                      style={{flex:1,padding:"9px",background:"var(--bg2)",border:"0.5px solid var(--border)",borderRadius:8,color:"var(--text3)",fontSize:12,cursor:"pointer"}}>
                      Cancel
                    </button>
                    <button onClick={()=>{update(presetConfirm.assets);setShowPresetsModal(false);setPresetConfirm(null);}}
                      style={{flex:2,padding:"9px",background:C.amber,border:"none",borderRadius:8,color:"#0d0d0c",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                      Load Preset
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{padding:"12px 20px 20px"}}>
                  {BUILDER_PRESETS.map(p=>(
                    <button key={p.label} onClick={()=>loadPreset(p)}
                      style={{width:"100%",padding:"12px 14px",marginBottom:6,background:"var(--bg2)",border:"0.5px solid var(--border)",borderRadius:10,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(201,168,76,0.06)";e.currentTarget.style.borderColor="rgba(201,168,76,0.25)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="var(--bg2)";e.currentTarget.style.borderColor="var(--border)";}}>
                      <div style={{fontSize:12,fontWeight:600,color:"var(--text)",marginBottom:4}}>{p.label}</div>
                      <div style={{fontSize:10,color:"var(--text3)"}}>
                        {p.assets.map(a=>`${a.ticker} ${Math.round(a.weight*100)}%`).join(" · ")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CSV Import Modal ──────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {showCsvModal&&(
          <motion.div
            // initial={false} is required - do not remove
            initial={false} animate={{opacity:1}} exit={{opacity:0}}
            className="c-modal-backdrop-mobile"
            style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
            onClick={()=>{setShowCsvModal(false);setCsvPreview(null);setCsvError("");}}>
            <motion.div
              // initial={false} is required - do not remove
              initial={false} animate={{scale:1,y:0}} exit={{scale:0.94,y:10}} transition={{duration:0.18}}
              className="c-modal-sheet"
              style={{background:"var(--card-bg)",border:"0.5px solid var(--border)",borderRadius:16,width:"100%",maxWidth:460,boxShadow:"var(--shadow-md)",overflow:"hidden"}}
              onClick={e=>e.stopPropagation()}>
              <div style={{padding:"22px 26px 20px",borderBottom:"0.5px solid var(--border)",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:9,letterSpacing:"0.22em",color:"var(--accent)",textTransform:"uppercase",marginBottom:7,fontFamily:"var(--font-mono)",fontWeight:700}}>Portfolio</div>
                  <div style={{fontFamily:"Space Mono, monospace",fontSize:18,fontWeight:700,color:"var(--text)",letterSpacing:-0.6,lineHeight:1.2}}>Import from CSV</div>
                </div>
                <button onClick={()=>{setShowCsvModal(false);setCsvPreview(null);setCsvError("");}}
                  style={{background:"var(--bg3)",border:"0.5px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--text3)",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"color 0.15s, border-color 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.color="var(--accent)";e.currentTarget.style.borderColor="rgba(201,168,76,0.4)";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="var(--text3)";e.currentTarget.style.borderColor="var(--border)";}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
              <div style={{padding:"16px 20px 20px"}}>
                {!csvPreview&&(
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,letterSpacing:2,color:"var(--text3)",textTransform:"uppercase",marginBottom:8}}>Supported Exports</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {["Fidelity","Schwab","Robinhood","Any CSV"].map(b=>(
                        <span key={b} style={{fontSize:11,padding:"3px 8px",background:"rgba(201,168,76,0.07)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:4,color:C.amber,letterSpacing:0.5}}>{b}</span>
                      ))}
                    </div>
                    <div style={{marginTop:8,fontSize:11,color:"var(--text3)",lineHeight:1.6}}>
                      Export holdings as CSV from your brokerage account, then upload the file below.
                      Any CSV with Symbol + Quantity or Value columns will work.
                    </div>
                  </div>
                )}
                {!csvPreview&&(
                  <div
                    onDragOver={e=>{e.preventDefault();setCsvDragOver(true);}}
                    onDragLeave={()=>setCsvDragOver(false)}
                    onDrop={e=>{e.preventDefault();setCsvDragOver(false);const f=e.dataTransfer.files[0];if(f)handleCsvFile(f);}}
                    onClick={()=>csvFileRef.current?.click()}
                    style={{border:`1.5px dashed ${csvDragOver?"rgba(201,168,76,0.6)":"rgba(201,168,76,0.2)"}`,borderRadius:10,padding:"28px 20px",textAlign:"center",cursor:"pointer",background:csvDragOver?"rgba(201,168,76,0.04)":"transparent",transition:"all 0.15s",marginBottom:4}}>
                    {csvLoading?(
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                        <div style={{width:18,height:18,border:"2px solid rgba(201,168,76,0.2)",borderTopColor:C.amber,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
                        <span style={{fontSize:10,color:"var(--text3)"}}>Parsing CSV…</span>
                      </div>
                    ):(
                      <>
                        <div style={{marginBottom:8,opacity:0.5,display:"flex",justifyContent:"center",color:"var(--text)"}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg></div>
                        <div style={{fontSize:11,color:"var(--text)",marginBottom:4}}>Drop your CSV here</div>
                        <div style={{fontSize:11,color:"var(--text3)"}}>or click to browse</div>
                      </>
                    )}
                  </div>
                )}
                <input ref={csvFileRef} type="file" accept=".csv,text/csv" style={{display:"none"}}
                  onChange={e=>{if(e.target.files?.[0])handleCsvFile(e.target.files[0]);e.target.value="";}}/>
                {csvError&&(
                  <div style={{marginTop:8,padding:"9px 12px",background:"rgba(224,92,92,0.08)",border:"1px solid rgba(224,92,92,0.2)",borderRadius:8,fontSize:10,color:"#e05c5c"}}>
                    {csvError}
                  </div>
                )}
                {csvPreview&&(
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <span style={{fontSize:10,letterSpacing:2,color:"var(--text3)",textTransform:"uppercase"}}>Detected</span>
                      <span style={{fontSize:11,padding:"3px 9px",background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.3)",borderRadius:4,color:C.amber,letterSpacing:0.5}}>{csvPreview.detected_format}</span>
                      <span style={{fontSize:11,color:"var(--text3)"}}>· {csvPreview.tickers.length} holdings</span>
                    </div>
                    <div style={{border:"0.5px solid var(--border)",borderRadius:8,overflow:"hidden",marginBottom:14}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr auto",padding:"6px 12px",background:"var(--bg2)",borderBottom:"0.5px solid var(--border)"}}>
                        <span style={{fontSize:10,letterSpacing:2,color:"var(--text3)",textTransform:"uppercase"}}>Ticker</span>
                        <span style={{fontSize:10,letterSpacing:2,color:"var(--text3)",textTransform:"uppercase"}}>Weight</span>
                      </div>
                      <div style={{maxHeight:200,overflowY:"auto",overscrollBehavior:"none"}}>
                        {csvPreview.tickers.map((t,i)=>(
                          <div key={t} style={{display:"grid",gridTemplateColumns:"1fr auto",padding:"7px 12px",borderBottom:i<csvPreview.tickers.length-1?"0.5px solid var(--border)":"none",alignItems:"center"}}>
                            <div style={{display:"flex",alignItems:"center",gap:7}}>
                              <div style={{width:4,height:4,borderRadius:"50%",background:DOTS[i%DOTS.length],flexShrink:0}}/>
                              <span style={{fontFamily:"Space Mono,monospace",fontSize:11,color:C.amber,fontWeight:700}}>{t}</span>
                            </div>
                            <span style={{fontFamily:"Space Mono,monospace",fontSize:10,color:"var(--text)"}}>{(csvPreview.weights[i]*100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{setCsvPreview(null);setCsvError("");}}
                        style={{flex:1,padding:"8px",background:"var(--bg2)",border:"0.5px solid var(--border)",borderRadius:8,color:"var(--text3)",fontSize:10,cursor:"pointer",letterSpacing:0.5}}>
                        Re-upload
                      </button>
                      <button onClick={confirmCsvImport}
                        style={{flex:2,padding:"8px",background:C.amber,border:"none",borderRadius:8,color:"#0d0d0c",fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:0.5}}>
                        Import {csvPreview.tickers.length} Holdings
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
