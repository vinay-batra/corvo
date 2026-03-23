"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import PortfolioBuilder from "../../components/PortfolioBuilder";
import { Metrics } from "../../components/Metrics";
import PerformanceChart from "../../components/PerformanceChart";
import HealthScore from "../../components/HealthScore";
import AiInsights from "../../components/AiInsights";
import BenchmarkComparison from "../../components/BenchmarkComparison";
import Breakdown from "../../components/Breakdown";
import AiChat from "../../components/AiChat";
import SavedPortfolios from "../../components/SavedPortfolios";
import UserMenu from "../../components/UserMenu";
import MonteCarloChart from "../../components/MonteCarloChart";
import NewsFeed from "../../components/NewsFeed";
import ExportPDF from "../../components/ExportPDF";
import GoalsModal from "../../components/GoalsModal";
import ProfileEditor from "../../components/ProfileEditor";
import OnboardingTour from "../../components/OnboardingTour";
import SharePortfolio from "../../components/SharePortfolio";
import { fetchPortfolio } from "../../lib/api";

const C = {
  navy: "#0a0e14", navy2: "#0d1117", navy3: "#111620",
  border: "rgba(255,255,255,0.06)", border2: "rgba(255,255,255,0.1)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.65)", cream3: "rgba(232,224,204,0.35)",
  amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TABS = ["Overview","Simulate","News","AI Chat"];
const PERIODS = ["6mo","1y","2y","5y"];
const PERIOD_LABELS: Record<string,string> = {"6mo":"6M","1y":"1Y","2y":"2Y","5y":"5Y"};
const BENCHMARKS = [
  {ticker:"^GSPC",label:"S&P 500"},{ticker:"^IXIC",label:"Nasdaq"},
  {ticker:"^DJI",label:"Dow Jones"},{ticker:"^RUT",label:"Russell 2K"},
  {ticker:"QQQ",label:"QQQ ETF"},{ticker:"GLD",label:"Gold"},
];

// Example portfolios for empty state
const EXAMPLE_PORTFOLIOS = [
  { name: "Big Tech", assets: [{ticker:"AAPL",weight:0.25},{ticker:"MSFT",weight:0.25},{ticker:"GOOGL",weight:0.25},{ticker:"NVDA",weight:0.25}] },
  { name: "Index Core", assets: [{ticker:"VOO",weight:0.6},{ticker:"QQQ",weight:0.3},{ticker:"GLD",weight:0.1}] },
  { name: "Crypto Mix", assets: [{ticker:"BTC-USD",weight:0.5},{ticker:"ETH-USD",weight:0.3},{ticker:"AAPL",weight:0.2}] },
];

function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("en-US",{hour12:false}));
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id);
  },[]);
  return <span style={{fontFamily:"Space Mono,monospace",fontSize:10,color:C.cream3,letterSpacing:1}}>{t}</span>;
}

function Card({ children, style={} }: any) {
  return (
    <div style={{background:C.navy3,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px 20px",marginBottom:10,...style}}>
      {children}
    </div>
  );
}

function CardHdr({ title }: { title:string }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
      <div style={{width:2,height:11,background:C.amber,borderRadius:1}}/>
      <span style={{fontSize:8,letterSpacing:2.5,color:C.cream3,textTransform:"uppercase"}}>{title}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:280,gap:14}}>
      <div style={{width:24,height:24,border:"1.5px solid rgba(201,168,76,0.2)",borderTopColor:C.amber,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <p style={{fontSize:10,letterSpacing:2.5,color:C.cream3,textTransform:"uppercase"}}>Analyzing...</p>
    </div>
  );
}

function EmptyState({ onLoad }: { onLoad: (assets: any[]) => void }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}
      style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:320,gap:24,textAlign:"center",padding:"40px 20px"}}>
      <div style={{width:56,height:56,border:`1px solid rgba(201,168,76,0.2)`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(201,168,76,0.05)"}}>
        <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
          <path d="M14 28 A8 8 0 1 1 26 28" stroke={C.amber} strokeWidth="2" strokeLinecap="round" fill="none"/>
          <circle cx="20" cy="20" r="2.5" fill={C.amber}/>
        </svg>
      </div>
      <div>
        <p style={{fontSize:18,fontWeight:600,color:C.cream,marginBottom:8}}>Build your portfolio</p>
        <p style={{fontSize:13,color:C.cream3,lineHeight:1.8,maxWidth:380}}>
          Search for any stock, ETF, or crypto in the sidebar. Set your allocations and click Analyze to get your full breakdown.
        </p>
      </div>

      {/* Example portfolios */}
      <div style={{width:"100%",maxWidth:520}}>
        <p style={{fontSize:9,letterSpacing:3,color:C.cream3,textTransform:"uppercase",marginBottom:14}}>Or try an example</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {EXAMPLE_PORTFOLIOS.map(p => (
            <button key={p.name} onClick={() => onLoad(p.assets)}
              style={{padding:"14px 10px",background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(201,168,76,0.3)";e.currentTarget.style.background="rgba(201,168,76,0.05)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background="rgba(255,255,255,0.03)"}}>
              <p style={{fontSize:11,fontWeight:600,color:C.cream,marginBottom:6}}>{p.name}</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:3,justifyContent:"center"}}>
                {p.assets.map(a=>(
                  <span key={a.ticker} style={{fontSize:9,fontFamily:"Space Mono,monospace",color:C.amber,background:C.amber2,padding:"1px 5px",borderRadius:3}}>{a.ticker}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <p style={{fontSize:11,color:C.cream3}}>
        Supports stocks, ETFs, crypto — any ticker on Yahoo Finance
      </p>
    </motion.div>
  );
}

// Live prices in sidebar
function LivePrices({ assets }: { assets: {ticker:string;weight:number}[] }) {
  const [prices, setPrices] = useState<Record<string,{price:number;change:number;pct:number}>>({});
  const intervalRef = useRef<any>(null);

  const fetchPrices = async () => {
    const tickers = assets.map(a => a.ticker).filter(Boolean);
    if (!tickers.length) return;
    try {
      const res = await fetch(`${API_URL}/prices?tickers=${tickers.join(",")}`);
      if (res.ok) setPrices(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchPrices();
    intervalRef.current = setInterval(fetchPrices, 30000);
    return () => clearInterval(intervalRef.current);
  }, [assets.map(a=>a.ticker).join(",")]);

  const tickers = assets.map(a => a.ticker).filter(Boolean);
  if (!tickers.length) return null;

  return (
    <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:8,letterSpacing:2.5,color:C.cream3,textTransform:"uppercase",marginBottom:8}}>Live Prices</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {tickers.map(ticker => {
          const p = prices[ticker];
          const isPos = p ? p.pct >= 0 : null;
          return (
            <div key={ticker} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"Space Mono,monospace",fontSize:10,color:C.amber,letterSpacing:1}}>{ticker}</span>
              <div style={{textAlign:"right"}}>
                {p ? (
                  <>
                    <span style={{fontSize:11,color:C.cream,fontFamily:"Space Mono,monospace"}}>
                      ${p.price < 10 ? p.price.toFixed(4) : p.price.toFixed(2)}
                    </span>
                    <span style={{fontSize:9,marginLeft:5,color:isPos?"#5cb88a":"#e05c5c",fontFamily:"Space Mono,monospace"}}>
                      {isPos?"+":""}{p.pct.toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <span style={{fontSize:9,color:C.cream3}}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppInner() {
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState([{ticker:"AAPL",weight:0.5},{ticker:"MSFT",weight:0.5}]);
  const [period, setPeriod] = useState("1y");
  const [benchmark, setBenchmark] = useState("^GSPC");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [goals, setGoals] = useState<any>(null);
  const [showGoals, setShowGoals] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [benchOpen, setBenchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    const g = localStorage.getItem("corvo_goals");
    if (g) setGoals(JSON.parse(g));
    else setShowGoals(true);

    // Load from URL params (shared portfolio)
    const t = searchParams.get("t");
    const w = searchParams.get("w");
    const p = searchParams.get("p");
    const b = searchParams.get("b");
    if (t && w) {
      const tickers = t.split(",");
      const weights = w.split(",").map(Number);
      if (tickers.length === weights.length) {
        setAssets(tickers.map((ticker, i) => ({ ticker, weight: weights[i] })));
        if (p) setPeriod(p);
        if (b) setBenchmark(b);
        // Auto-analyze shared portfolio
        setTimeout(() => {
          const valid = tickers.map((ticker, i) => ({ ticker, weight: weights[i] })).filter(a => a.ticker && a.weight > 0);
          if (valid.length) handleAnalyzeWith(valid, p || "1y", b || "^GSPC");
        }, 500);
      }
    }
  }, []);

  const handleAnalyzeWith = async (a: any[], p: string, b: string) => {
    setLoading(true); setData(null); setError(null);
    try {
      const result = await fetchPortfolio(a, p, b);
      if (result.error || result.detail) {
        setError(result.detail || result.error || "Failed to analyze portfolio");
      } else {
        setData(result);
      }
    } catch(e: any) {
      setError("Could not connect to backend. Please try again.");
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    const valid = assets.filter(a=>a.ticker&&a.weight>0);
    if (!valid.length) return;
    if (sidebarOpen) setSidebarOpen(false);
    await handleAnalyzeWith(valid, period, benchmark);
  };

  const benchLabel = BENCHMARKS.find(b=>b.ticker===benchmark)?.label??benchmark;

  const sidebarContent = (
    <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`}}>
        <button onClick={()=>setShowProfile(true)}
          style={{width:"100%",padding:"9px 12px",background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:9,display:"flex",alignItems:"center",gap:9,cursor:"pointer",transition:"border-color 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(201,168,76,0.3)"}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{width:26,height:26,borderRadius:"50%",background:C.amber2,border:`1px solid rgba(201,168,76,0.3)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:11,color:C.amber}}>✦</span>
          </div>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:12,fontWeight:500,color:C.cream}}>Edit Profile</div>
            <div style={{fontSize:9,color:C.cream3}}>Goals & preferences</div>
          </div>
        </button>
      </div>

      <div style={{padding:"16px 16px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:8,letterSpacing:2.5,color:C.cream3,textTransform:"uppercase",marginBottom:12}}>Assets</div>
        <PortfolioBuilder assets={assets} onAssetsChange={setAssets} loading={loading}/>
      </div>

      <div style={{padding:"16px 16px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:8,letterSpacing:2.5,color:C.cream3,textTransform:"uppercase",marginBottom:10}}>Period</div>
        <div style={{display:"flex",gap:4}}>
          {PERIODS.map(p=>(
            <button key={p} onClick={()=>setPeriod(p)}
              style={{flex:1,padding:"8px 0",fontSize:10,fontFamily:"Space Mono,monospace",background:period===p?C.amber:"rgba(255,255,255,0.03)",border:`1px solid ${period===p?C.amber:C.border}`,borderRadius:7,color:period===p?C.navy:C.cream3,cursor:"pointer",fontWeight:period===p?700:400,transition:"all 0.15s"}}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"16px 16px",borderBottom:`1px solid ${C.border}`,position:"relative"}}>
        <div style={{fontSize:8,letterSpacing:2.5,color:C.cream3,textTransform:"uppercase",marginBottom:10}}>Benchmark</div>
        <button onClick={()=>setBenchOpen(o=>!o)}
          style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:9,cursor:"pointer",fontSize:12,color:C.cream,transition:"border-color 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(201,168,76,0.3)"}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <span>{benchLabel}</span><span style={{color:C.cream3,fontSize:9}}>▾</span>
        </button>
        <AnimatePresence>
          {benchOpen&&(
            <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{position:"absolute",top:"calc(100% + 4px)",left:16,right:16,background:"#0d1117",border:`1px solid rgba(255,255,255,0.1)`,borderRadius:10,overflow:"hidden",zIndex:50,boxShadow:"0 8px 32px rgba(0,0,0,0.6)"}}>
              {BENCHMARKS.map(b=>(
                <button key={b.ticker} onClick={()=>{setBenchmark(b.ticker);setBenchOpen(false);}}
                  style={{width:"100%",textAlign:"left",padding:"9px 14px",background:b.ticker===benchmark?"rgba(201,168,76,0.08)":"transparent",border:"none",color:b.ticker===benchmark?C.amber:C.cream2,fontSize:12,cursor:"pointer",transition:"background 0.1s"}}
                  onMouseEnter={e=>{if(b.ticker!==benchmark)e.currentTarget.style.background="rgba(255,255,255,0.04)"}}
                  onMouseLeave={e=>{if(b.ticker!==benchmark)e.currentTarget.style.background="transparent"}}>
                  {b.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{padding:"16px 16px",borderBottom:`1px solid ${C.border}`}}>
        <button onClick={handleAnalyze} disabled={loading}
          style={{width:"100%",padding:"11px",background:loading?"rgba(201,168,76,0.3)":C.amber,border:"none",borderRadius:9,color:loading?"rgba(10,14,20,0.5)":"#0a0e14",fontSize:12,fontWeight:700,letterSpacing:2,cursor:loading?"default":"pointer",textTransform:"uppercase",transition:"all 0.2s"}}
          onMouseEnter={e=>{if(!loading)e.currentTarget.style.opacity="0.88"}}
          onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          {loading?"Analyzing...":"Analyze →"}
        </button>
      </div>

      <LivePrices assets={assets}/>

      <div style={{padding:"16px 16px",borderBottom:`1px solid ${C.border}`}}>
        <SavedPortfolios assets={assets} data={data} onLoad={(a:any)=>setAssets(a)}/>
      </div>

      <div style={{flex:1}}/>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:C.navy2,fontFamily:"Inter,sans-serif",color:C.cream,overflow:"hidden"}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        * { box-sizing: border-box; }
        .sidebar-desktop { display: flex !important; flex-direction: column; }
        .mobile-only { display: none !important; }
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .mobile-only { display: flex !important; }
          .desktop-only { display: none !important; }
        }
      `}</style>

      {/* DESKTOP SIDEBAR */}
      <aside className="sidebar-desktop" style={{width:268,flexShrink:0,borderRight:`1px solid ${C.border}`,background:C.navy,overflow:"hidden"}}>
        <a href="/" style={{padding:"20px 18px 16px",borderBottom:`1px solid ${C.border}`,display:"block",textDecoration:"none",transition:"background 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(201,168,76,0.04)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
            <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
              <rect x="1" y="1" width="38" height="38" rx="8" stroke="#c9a84c" strokeWidth="1.5"/>
              <path d="M14 28 A8 8 0 1 1 26 28" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="20" cy="20" r="2.5" fill="#c9a84c"/>
            </svg>
            <div style={{fontFamily:"Space Mono,monospace",fontSize:13,fontWeight:700,letterSpacing:4,color:C.cream}}>CORVO</div>
          </div>
          <div style={{fontSize:8,letterSpacing:2,color:C.cream3,textTransform:"uppercase",paddingLeft:24}}>Portfolio Intelligence</div>
        </a>
        {sidebarContent}
        <div style={{padding:"11px 16px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:C.amber,animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:8,letterSpacing:2,color:C.cream3,textTransform:"uppercase"}}>Live</span>
          </div>
          <Clock/>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div className="mobile-only" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setSidebarOpen(false)}
              style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:40}}/>
            <motion.aside className="mobile-only"
              initial={{x:-280}} animate={{x:0}} exit={{x:-280}}
              transition={{type:"tween",duration:0.25}}
              style={{position:"fixed",left:0,top:0,bottom:0,width:280,background:C.navy,borderRight:`1px solid ${C.border}`,zIndex:50,flexDirection:"column",overflow:"hidden"}}>
              <div style={{padding:"16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontFamily:"Space Mono,monospace",fontSize:13,fontWeight:700,letterSpacing:4,color:C.cream}}>CORVO</div>
                <button onClick={()=>setSidebarOpen(false)} style={{background:"none",border:"none",color:C.cream3,fontSize:18,cursor:"pointer"}}>✕</button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

        {/* Mobile header */}
        <header className="mobile-only" style={{height:48,flexShrink:0,borderBottom:`1px solid ${C.border}`,alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:C.navy2}}>
          <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:C.cream,cursor:"pointer",padding:4,display:"flex",flexDirection:"column",gap:4}}>
            <div style={{width:18,height:1.5,background:C.cream,borderRadius:1}}/>
            <div style={{width:18,height:1.5,background:C.cream,borderRadius:1}}/>
            <div style={{width:12,height:1.5,background:C.cream,borderRadius:1}}/>
          </button>
          <div style={{fontFamily:"Space Mono,monospace",fontSize:12,fontWeight:700,letterSpacing:4,color:C.cream}}>CORVO</div>
          <UserMenu/>
        </header>

        {/* Desktop topbar */}
        <header className="desktop-only" style={{height:44,flexShrink:0,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",background:C.navy2}}>
          <div style={{display:"flex",gap:2}}>
            {TABS.map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{padding:"5px 12px",fontSize:12,borderRadius:7,border:tab===t?`1px solid rgba(201,168,76,0.25)`:"1px solid transparent",background:tab===t?"rgba(201,168,76,0.08)":"transparent",color:tab===t?C.amber:C.cream3,cursor:"pointer",fontWeight:tab===t?500:400,transition:"all 0.15s",display:"flex",alignItems:"center",gap:4}}>
                {t}
                {t==="AI Chat"&&<span style={{padding:"1px 5px",background:"rgba(201,168,76,0.15)",color:C.amber,borderRadius:3,fontSize:8,border:"1px solid rgba(201,168,76,0.2)"}}>AI</span>}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <SharePortfolio data={data} assets={assets} period={period} benchmark={benchmark}/>
            <ExportPDF data={data} assets={assets}/>
            <UserMenu/>
          </div>
        </header>

        {/* Mobile tabs */}
        <div style={{borderBottom:`1px solid ${C.border}`,background:C.navy2,flexShrink:0,display:"none"}} className="mobile-tabs">
          <style>{`.mobile-tabs { display: block !important; } @media (min-width: 768px) { .mobile-tabs { display: none !important; } }`}</style>
          <div style={{display:"flex",overflowX:"auto",padding:"0 8px",scrollbarWidth:"none"}}>
            {TABS.map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{padding:"10px 14px",fontSize:12,whiteSpace:"nowrap",background:"transparent",border:"none",borderBottom:tab===t?`2px solid ${C.amber}`:"2px solid transparent",color:tab===t?C.amber:C.cream3,cursor:"pointer",transition:"all 0.15s",flexShrink:0}}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{padding:"10px 20px",background:"rgba(224,92,92,0.12)",borderBottom:"1px solid rgba(224,92,92,0.2)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <span style={{fontSize:12,color:"#e05c5c"}}>⚠ {error}</span>
              <button onClick={()=>setError(null)} style={{background:"none",border:"none",color:"rgba(224,92,92,0.6)",cursor:"pointer",fontSize:16}}>✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <main style={{flex:1,overflowY:"auto",padding:"16px",background:C.navy2}}>
          <style>{`@media (min-width: 768px) { .main-pad { padding: 20px 24px !important; } }`}</style>
          <div className="main-pad">
          <AnimatePresence mode="wait">
            {!data&&!loading?(
              <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <EmptyState onLoad={(a) => { setAssets(a); }}/>
              </motion.div>
            ):loading?(
              <motion.div key="loading" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><Spinner/></motion.div>
            ):tab==="Overview"?(
              <motion.div key="overview" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:10}}>
                  <style>{`@media (min-width: 768px) { .metrics-grid { grid-template-columns: repeat(4,1fr) !important; } }`}</style>
                  <div className="metrics-grid" style={{display:"contents"}}><Metrics data={data}/></div>
                </div>
                <Card><CardHdr title="Performance"/><PerformanceChart data={data}/></Card>
                <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10}}>
                  <style>{`@media (min-width: 900px) { .three-col { grid-template-columns: 1fr 1fr 1fr !important; } }`}</style>
                  <div className="three-col" style={{display:"grid",gridTemplateColumns:"1fr",gap:10}}>
                    <Card style={{marginBottom:0}}><CardHdr title="Health Score"/><HealthScore data={data}/></Card>
                    <Card style={{marginBottom:0}}><CardHdr title="AI Insights"/><AiInsights data={data} assets={assets} onAskAi={()=>setTab("AI Chat")}/></Card>
                    <Card style={{marginBottom:0}}><CardHdr title={`vs ${benchLabel}`}/><BenchmarkComparison data={data}/></Card>
                  </div>
                </div>
                <Card style={{marginTop:10}}><CardHdr title="Allocation"/><Breakdown assets={assets}/></Card>
              </motion.div>
            ):tab==="Simulate"?(
              <motion.div key="simulate" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <Card><CardHdr title="Monte Carlo Simulation"/><MonteCarloChart assets={assets} period={period}/></Card>
              </motion.div>
            ):tab==="News"?(
              <motion.div key="news" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <Card><CardHdr title="Market News"/><NewsFeed assets={assets}/></Card>
              </motion.div>
            ):tab==="AI Chat"?(
              <motion.div key="ai" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{height:"calc(100vh - 92px)"}}>
                <AiChat portfolioContext={{tickers:assets.map(a=>a.ticker),weights:assets.map(a=>a.weight),data}} userGoals={goals}/>
              </motion.div>
            ):null}
          </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showGoals&&<GoalsModal onComplete={(g:any)=>{setGoals(g);localStorage.setItem("corvo_goals",JSON.stringify(g));setShowGoals(false);setShowTour(true);}} onSkip={()=>{setShowGoals(false);setShowTour(true);}}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showTour&&<OnboardingTour onComplete={()=>setShowTour(false)}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showProfile&&<ProfileEditor goals={goals} onSave={(g:any)=>{setGoals(g);localStorage.setItem("corvo_goals",JSON.stringify(g));setShowProfile(false);}} onClose={()=>setShowProfile(false)}/>}
      </AnimatePresence>
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#0d1117"}}/>}>
      <AppInner/>
    </Suspense>
  );
}
