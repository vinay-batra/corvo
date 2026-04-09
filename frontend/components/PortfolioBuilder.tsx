"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const C = { amber: "#c9a84c", cream: "#e8e0cc", cream3: "rgba(232,224,204,0.25)", border: "rgba(255,255,255,0.07)", navy4: "#161c26" };
const DOTS = ["#c9a84c","rgba(201,168,76,0.7)","rgba(201,168,76,0.5)","rgba(201,168,76,0.35)","rgba(201,168,76,0.25)","rgba(201,168,76,0.6)","rgba(201,168,76,0.45)","rgba(201,168,76,0.55)"];
const TYPE_LABELS: Record<string,string> = { EQUITY:"Stock", ETF:"ETF", CRYPTOCURRENCY:"Crypto", MUTUALFUND:"Fund", INDEX:"Index" };

// Top tickers for instant autocomplete (no API call needed)
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
  { ticker:"BND",     name:"Vanguard Total Bond Mkt",   type:"ETF",            exchange:"NASDAQ" },
  { ticker:"GLD",     name:"SPDR Gold Shares",          type:"ETF",            exchange:"NYSE" },
  { ticker:"SLV",     name:"iShares Silver Trust",      type:"ETF",            exchange:"NYSE" },
  { ticker:"VNQ",     name:"Vanguard Real Estate ETF",  type:"ETF",            exchange:"NYSE" },
  { ticker:"ARKK",    name:"ARK Innovation ETF",        type:"ETF",            exchange:"NYSE" },
  { ticker:"SCHD",    name:"Schwab US Dividend Equity", type:"ETF",            exchange:"NYSE" },
  { ticker:"VIG",     name:"Vanguard Dividend Appreciation",type:"ETF",        exchange:"NYSE" },
  { ticker:"TLT",     name:"iShares 20+ Year Treasury", type:"ETF",            exchange:"NASDAQ" },
  { ticker:"DIA",     name:"SPDR Dow Jones ETF",        type:"ETF",            exchange:"NYSE" },
  // Crypto (yfinance symbols)
  { ticker:"BTC-USD", name:"Bitcoin",                   type:"CRYPTOCURRENCY", exchange:"CCC" },
  { ticker:"ETH-USD", name:"Ethereum",                  type:"CRYPTOCURRENCY", exchange:"CCC" },
  { ticker:"SOL-USD", name:"Solana",                    type:"CRYPTOCURRENCY", exchange:"CCC" },
  { ticker:"BNB-USD", name:"BNB",                       type:"CRYPTOCURRENCY", exchange:"CCC" },
  { ticker:"XRP-USD", name:"XRP",                       type:"CRYPTOCURRENCY", exchange:"CCC" },
];

function localSearch(q: string): { ticker: string; name: string; type: string; exchange: string }[] {
  if (!q) return [];
  const upper = q.toUpperCase();
  return COMMON_TICKERS.filter(t =>
    t.ticker.startsWith(upper) || t.name.toUpperCase().includes(upper)
  ).slice(0, 8);
}

interface Asset { ticker: string; weight: number; }
interface Result { ticker: string; name: string; exchange: string; type: string; }
interface Props {
  assets: Asset[];
  onAssetsChange?: (a: Asset[]) => void;
  setAssets?: (a: Asset[]) => void;
  onAnalyze?: () => void;
  loading?: boolean;
}

export default function PortfolioBuilder({ assets, onAssetsChange, setAssets, onAnalyze, loading }: Props) {
  const update = onAssetsChange || setAssets || (() => {});
  const [active, setActive] = useState<number|null>(null);
  const [query, setQuery] = useState<Record<number,string>>({});
  const [results, setResults] = useState<Record<number,Result[]>>({});
  const [searching, setSearching] = useState<Record<number,boolean>>({});
  const [names, setNames] = useState<Record<string,string>>({});
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const blurT = useRef<Record<number,ReturnType<typeof setTimeout>>>({});
  const searchT = useRef<Record<number,ReturnType<typeof setTimeout>>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (i: number, q: string) => {
    if (!q) { setResults(p => ({...p,[i]:[]})); return; }
    // Show local results immediately for instant feedback
    const local = localSearch(q);
    if (local.length > 0) setResults(p => ({...p,[i]:local}));
    clearTimeout(searchT.current[i]);
    searchT.current[i] = setTimeout(async () => {
      setSearching(p => ({...p,[i]:true}));
      try {
        const res = await fetch(`${API_URL}/search-ticker?q=${encodeURIComponent(q)}`);
        const d = await res.json();
        const apiResults: Result[] = d.results || [];
        // Merge: API results first, then local results not already in API results
        const apiTickers = new Set(apiResults.map((r: Result) => r.ticker));
        const merged = [...apiResults, ...local.filter(l => !apiTickers.has(l.ticker))].slice(0, 8);
        setResults(p => ({...p,[i]: merged.length > 0 ? merged : local}));
        const n: Record<string,string> = {};
        merged.forEach((r: Result) => { n[r.ticker]=r.name; });
        setNames(p => ({...p,...n}));
      } catch {
        // API failed — keep local results
        if (local.length === 0) setResults(p => ({...p,[i]:[]}));
      }
      setSearching(p => ({...p,[i]:false}));
    }, 300);
  }, []);

  const updateWeight = (i: number, v: number) => { const n=[...assets]; n[i]={...n[i],weight:v}; update(n); };
  const updateTicker = (i: number, v: string) => {
    setQuery(p=>({...p,[i]:v}));
    const n=[...assets]; n[i]={...n[i],ticker:v.toUpperCase()}; update(n);
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

  const total = assets.reduce((s,a)=>s+a.weight,0);
  const balanced = Math.abs(total-1)<0.01;

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:8,letterSpacing:2.5,color:C.cream3,textTransform:"uppercase"}}>Assets</span>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          <button onClick={()=>fileRef.current?.click()} disabled={importLoading}
            style={{padding:"3px 8px",fontSize:9,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:5,cursor:"pointer",color:C.cream3,letterSpacing:0.5}}>
            {importLoading?"...":"↑ Import"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])handleImport(e.target.files[0]);e.target.value="";}} />
          <span onClick={!balanced?equalize:undefined}
            style={{fontSize:9,padding:"2px 7px",border:`1px solid ${!balanced?"rgba(201,168,76,0.3)":C.border}`,borderRadius:4,cursor:balanced?"default":"pointer",color:!balanced?C.amber:C.cream3,background:"rgba(255,255,255,0.03)",fontFamily:"Space Mono,monospace"}}>
            {(total*100).toFixed(0)}%
          </span>
        </div>
      </div>

      {importError&&<p style={{fontSize:10,color:"#e05c5c",marginBottom:8}}>{importError}</p>}

      <AnimatePresence>
        {assets.map((a,i)=>{
          const color=DOTS[i%DOTS.length];
          const res=results[i]||[];
          const name=names[a.ticker]||"";
          return (
            <motion.div key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} exit={{opacity:0,height:0}} transition={{duration:0.15}} style={{marginBottom:10,position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:4,height:4,borderRadius:"50%",background:color,flexShrink:0}}/>
                <div style={{position:"relative",flex:1,zIndex:active===i?50:1}}>
                  <input value={query[i]??a.ticker}
                    onFocus={()=>setActive(i)}
                    onBlur={()=>{blurT.current[i]=setTimeout(()=>{setActive(p=>p===i?null:p);setResults(p=>({...p,[i]:[]}));},200);}}
                    onChange={e=>updateTicker(i,e.target.value)}
                    placeholder="Search ticker..."
                    className="accent-input"
                    style={{width:"100%",padding:"5px 8px",background:"rgba(255,255,255,0.04)",border:`1px solid ${active===i?"rgba(201,168,76,0.5)":C.border}`,borderRadius:7,color:"var(--text)",fontFamily:"Space Mono,monospace",fontSize:11,fontWeight:700,letterSpacing:1,outline:"none",transition:"border-color 0.15s, box-shadow 0.15s"}}/>
                  {searching[i]&&<div style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",width:9,height:9,border:"1.5px solid rgba(201,168,76,0.2)",borderTopColor:C.amber,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>}
                  <AnimatePresence>
                    {active===i&&res.length>0&&(
                      <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                        style={{position:"absolute",top:"calc(100% + 3px)",left:0,right:0,background:"#0d1117",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,zIndex:100,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
                        {res.map((r,idx)=>(
                          <div key={idx} onMouseDown={e=>{e.preventDefault();clearTimeout(blurT.current[i]);select(i,r);}}
                            style={{padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",borderBottom:idx<res.length-1?"1px solid rgba(255,255,255,0.05)":"none",transition:"background 0.1s"}}
                            onMouseEnter={e=>e.currentTarget.style.background="rgba(201,168,76,0.06)"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <div>
                              <div style={{fontFamily:"Space Mono,monospace",fontSize:11,color:C.amber,fontWeight:700}}>{r.ticker}</div>
                              <div style={{fontSize:10,color:C.cream3,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                            </div>
                            <span style={{fontSize:8,background:"rgba(201,168,76,0.1)",color:C.amber,padding:"2px 6px",borderRadius:3,border:"1px solid rgba(201,168,76,0.2)"}}>{TYPE_LABELS[r.type]||r.type}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <input type="number" min="0" max="100" step="1" value={Math.round(a.weight*100)}
                  onChange={e=>updateWeight(i,Math.max(0,Math.min(100,Number(e.target.value)))/100)}
                  style={{width:36,padding:"5px 3px",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:5,color:"var(--text)",fontSize:11,fontFamily:"Space Mono,monospace",outline:"none",textAlign:"center"}}/>
                <span style={{fontSize:9,color:C.cream3,flexShrink:0}}>%</span>
                <button onClick={()=>remove(i)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.15)",fontSize:12,padding:"0 2px",lineHeight:1}}
                  onMouseEnter={e=>e.currentTarget.style.color="#e05c5c"}
                  onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.15)"}>✕</button>
              </div>
              {name&&<div style={{paddingLeft:9,marginTop:2,fontSize:9,color:C.cream3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>}
              <div style={{paddingLeft:9,marginTop:4}}>
                <input type="range" min="0" max="1" step="0.01" value={a.weight}
                  onChange={e=>updateWeight(i,parseFloat(e.target.value))}
                  onInput={e=>updateWeight(i,parseFloat((e.target as HTMLInputElement).value))}
                  style={{width:"100%",height:2,appearance:"none" as any,background:`linear-gradient(90deg,${C.amber} ${a.weight*100}%,rgba(255,255,255,0.08) ${a.weight*100}%)`,borderRadius:1,outline:"none",cursor:"pointer"}}/>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div style={{display:"flex",gap:5,marginTop:6,marginBottom:10}}>
        <button onClick={add} disabled={assets.length>=20}
          style={{flex:1,padding:"7px",background:"transparent",border:"1px dashed rgba(201,168,76,0.2)",borderRadius:8,color:C.cream3,fontSize:10,letterSpacing:1,cursor:assets.length>=20?"not-allowed":"pointer",transition:"all 0.15s"}}
          onMouseEnter={e=>{if(assets.length<20){e.currentTarget.style.borderColor="rgba(201,168,76,0.5)";e.currentTarget.style.color=C.amber;}}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(201,168,76,0.2)";e.currentTarget.style.color=C.cream3;}}>
          + Add Asset
        </button>
        {!balanced&&assets.length>0&&(
          <button onClick={equalize} style={{padding:"7px 10px",background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:8,color:C.amber,fontSize:9,letterSpacing:1,cursor:"pointer"}}>Equal</button>
        )}
      </div>


    </div>
  );
}
