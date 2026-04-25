"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const C = { amber: "var(--accent)", red: "#e05c5c" };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function Num({ value, fmt }: { value: number; fmt: (v: number) => string }) {
  const [d, setD] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const go = (now: number) => {
      const p = Math.min((now-start)/1200,1);
      setD(value*(1-Math.pow(1-p,3)));
      if(p<1) requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
  }, [inView,value]);
  return <span ref={ref}>{fmt(d)}</span>;
}

const EXPLAINERS = [
  { title: "CAGR (Annualized Return)", simple: "Compound Annual Growth Rate — the smoothed yearly return over the selected period. Unlike a simple average, CAGR accounts for compounding.", example: "$10,000 grows to $12,100 over 2 years → CAGR = 10%/yr (not 10.5% arithmetic avg).", good: "Beating the S&P 500 (~10%/yr CAGR) is excellent. Longer periods give more reliable CAGR readings." },
  { title: "Volatility", simple: "How wildly your portfolio swings day to day.", example: "30% vol = could swing ±30% in a year.", good: "Under 15% is low. 15–25% moderate. 30%+ is high." },
  { title: "Sharpe Ratio", simple: "Return per unit of risk. Higher = more efficient.", example: "Sharpe 2.0 = great returns for the risk taken.", good: "Above 1.0 good. Above 2.0 excellent. Below 0 bad." },
  { title: "Max Drawdown", simple: "Biggest drop from peak to trough that happened.", example: "$50k drops to $35k = -30% max drawdown.", good: "Closer to 0% is better. Under 10% very stable." },
  { title: "Unrealized P&L", simple: "Total paper gain or loss on holdings where you've entered a purchase price.", example: "Bought AAPL at $150, now $180 with 25% weight on $10k = +$500.", good: "Green = currently profitable. Red = currently underwater. Based on purchase prices you entered." },
];

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (!values || values.length < 2) return null;
  const W = 64, H = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });
  const pathD = "M" + pts.join(" L");
  const fillD = pathD + ` L${W},${H} L0,${H} Z`;
  const color = positive ? "#4caf7d" : "#e05c5c";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <path d={fillD} fill={color} fillOpacity={0.1} />
      <path d={pathD} stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Metrics({ data, currency = "USD", rate = 1, sparklineValues, period = "1y", assets, portfolioValue }: { data: any; currency?: string; rate?: number; sparklineValues?: number[]; period?: string; assets?: { ticker: string; weight: number; purchasePrice?: number }[]; portfolioValue?: number }) {
  const [modal, setModal] = useState<number|null>(null);
  const modalIdRef = useRef(`metrics-modal-${Math.random().toString(36).slice(2)}`);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!assets || !assets.length) return;
    const tickers = assets.map(a => a.ticker).join(",");
    fetch(`${API_URL}/watchlist-data?tickers=${tickers}`)
      .then(r => r.json())
      .then((d: any) => {
        const map: Record<string, number> = {};
        (d.results || []).forEach((s: any) => { if (s?.ticker && s.price) map[s.ticker] = s.price; });
        setCurrentPrices(map);
      })
      .catch(() => {});
  }, [assets]);

  useEffect(() => {
    const handleOtherOpen = (e: Event) => {
      if ((e as CustomEvent).detail?.id !== modalIdRef.current) setModal(null);
    };
    window.addEventListener("corvo:modal-open", handleOtherOpen);
    return () => window.removeEventListener("corvo:modal-open", handleOtherOpen);
  }, []);

  useEffect(() => {
    if (modal === null) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modal]);

  const openMetricModal = (i: number) => {
    window.dispatchEvent(new CustomEvent("corvo:modal-open", { detail: { id: modalIdRef.current } }));
    setModal(i);
  };
  const PERIOD_LABELS: Record<string,string> = { "6mo":"6M","1y":"1Y","2y":"2Y","5y":"5Y" };
  const periodLabel = PERIOD_LABELS[period] || period.toUpperCase();
  const portReturn = data.portfolio_return ?? 0;
  const portVol    = data.portfolio_volatility ?? 0;
  const portDD     = data.max_drawdown ?? 0;
  const sharpe = portVol > 0 ? (portReturn - 0.04) / portVol : 0;

  // Unrealized P&L: sum over assets with purchasePrice where currentPrice is available
  const pnlAssets = (assets || []).filter(a => a.purchasePrice != null && a.purchasePrice > 0 && currentPrices[a.ticker] != null);
  const hasPnlData = pnlAssets.length > 0 && portfolioValue != null && portfolioValue > 0;
  const totalWeight = (assets || []).reduce((s, a) => s + a.weight, 0) || 1;
  const unrealizedPnlDollars = hasPnlData ? pnlAssets.reduce((sum, a) => {
    const w = a.weight / totalWeight;
    const cur = currentPrices[a.ticker];
    const pp = a.purchasePrice!;
    return sum + (cur - pp) / pp * w * portfolioValue!;
  }, 0) : 0;
  const unrealizedPnlPct = hasPnlData && portfolioValue! > 0 ? unrealizedPnlDollars / portfolioValue! : 0;

  const items = [
    { label: `CAGR (${periodLabel})`, value: portReturn, fmt: (v:number) => `${v>=0?"+":""}${(v*100).toFixed(2)}%`, neg: portReturn<0, neutral: false, bar: null },
    { label: "Volatility",              value: portVol,    fmt: (v:number) => `${(v*100).toFixed(2)}%`,               neg: false,        neutral: true,  bar: portVol/0.6 },
    { label: "Sharpe Ratio",            value: sharpe,     fmt: (v:number) => v.toFixed(2),                           neg: sharpe<0,     neutral: false, bar: Math.min(Math.max(sharpe/3,0),1) },
    { label: "Max Drawdown",            value: portDD,     fmt: (v:number) => `${(v*100).toFixed(2)}%`,               neg: true,         neutral: false, bar: null },
    ...(hasPnlData ? [{ label: "Unrealized P&L", value: unrealizedPnlPct, fmt: (v:number) => `${v>=0?"+":""}${(v*100).toFixed(2)}%`, neg: unrealizedPnlPct<0, neutral: false, bar: null, pnlDollars: unrealizedPnlDollars }] : []),
  ] as Array<{ label: string; value: number; fmt: (v: number) => string; neg: boolean; neutral: boolean; bar: number | null; pnlDollars?: number }>;
  void rate; void sparklineValues;
  return (
    <>
      <style>{`
        @media(max-width:768px){
          .mc-card{padding:12px!important}
          .mc-value{font-size:22px!important;letter-spacing:-0.8px!important;margin-bottom:6px!important}
          .mc-pnl-sub{font-size:11px!important;margin-bottom:4px!important}
          .mc-label{font-size:9px!important;letter-spacing:1px!important}
          .mc-modal-overlay{align-items:flex-end!important;padding:0!important}
          .mc-modal-card{max-width:100%!important;width:100%!important;border-radius:20px 20px 0 0!important;padding:20px 16px 28px!important;max-height:78vh!important}
          .mc-modal-section{padding:8px 10px!important}
          .mc-modal-section>p:last-child{font-size:12px!important}
          .mc-modal-title{font-size:15px!important;margin-bottom:14px!important}
        }
      `}</style>
      {items.map(({label,value,fmt,neg,neutral,bar,pnlDollars},i) => {
        const color = neutral ? C.amber : neg ? C.red : "#4caf7d";
        return (
        <motion.div key={label} initial={false} transition={{delay:i*0.07}}
          className="mc-card"
          style={{background:"var(--card-bg)",border:"0.5px solid var(--border)",borderRadius:12,padding:"18px 16px 14px",borderTop:`2px solid ${color}`,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,right:0,width:80,height:80,background:`radial-gradient(circle at top right, ${color}18, transparent 70%)`,pointerEvents:"none",borderRadius:"0 12px 0 0"}} />
          <p className="mc-value" style={{fontFamily:"Space Mono,monospace",fontSize:34,fontWeight:700,letterSpacing:-1.5,color,lineHeight:1,marginBottom:pnlDollars!=null?4:10}}>
            <Num value={value} fmt={fmt}/>
          </p>
          {pnlDollars!=null&&(
            <p className="mc-pnl-sub" style={{fontFamily:"Space Mono,monospace",fontSize:13,fontWeight:600,color,marginBottom:8,lineHeight:1}}>
              {pnlDollars>=0?"+":"-"}${Math.abs(pnlDollars).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
            </p>
          )}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p className="mc-label" style={{fontSize:10,letterSpacing:2,color:"var(--text3)",textTransform:"uppercase"}}>
              {label}{i===0&&currency!=="USD"?<span style={{marginLeft:4,color:C.amber,letterSpacing:1}}> · {currency}</span>:null}
            </p>
            <button onClick={()=>openMetricModal(i)} style={{width:16,height:16,borderRadius:"50%",background:"var(--bg3)",border:"0.5px solid var(--border)",color:"var(--text3)",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}
              onMouseEnter={e=>{e.currentTarget.style.background=C.amber;e.currentTarget.style.color="#0a0e14";}}
              onMouseLeave={e=>{e.currentTarget.style.background="var(--bg3)";e.currentTarget.style.color="var(--text3)";}}>?</button>
          </div>
          {bar!==null&&(
            <div style={{marginTop:10,height:2,background:"var(--track)",borderRadius:1,overflow:"hidden"}}>
              <motion.div initial={false} animate={{width:`${Math.min(bar,1)*100}%`}} transition={{duration:1,delay:i*0.07+0.3}}
                style={{height:"100%",background:color,borderRadius:1}}/>
            </div>
          )}
        </motion.div>
        );
      })}
      <AnimatePresence>
        {modal!==null&&(
          <motion.div initial={false} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setModal(null)}
            className="mc-modal-overlay"
            style={{position:"fixed",inset:0,background:"var(--overlay-bg, rgba(0,0,0,0.75))",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
            <motion.div initial={false} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0}}
              onClick={e=>e.stopPropagation()}
              className="mc-modal-card"
              style={{background:"var(--card-bg)",border:"0.5px solid var(--border2)",borderRadius:16,padding:28,maxWidth:400,width:"100%",maxHeight:"90vh",overflowY:"auto",position:"relative"}}>
              <button onClick={()=>setModal(null)} style={{position:"absolute",top:14,right:14,background:"var(--bg3)",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",color:"var(--text3)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              <p style={{fontSize:10,letterSpacing:2,color:C.amber,textTransform:"uppercase",marginBottom:6}}>About</p>
              <h3 className="mc-modal-title" style={{fontSize:18,fontWeight:500,color:"var(--text)",marginBottom:18}}>{EXPLAINERS[modal].title}</h3>
              {[{label:"Plain English",text:EXPLAINERS[modal].simple},{label:"Example",text:EXPLAINERS[modal].example},{label:"What's good?",text:EXPLAINERS[modal].good}].map(({label,text})=>(
                <div key={label} className="mc-modal-section" style={{background:"var(--bg2)",border:"0.5px solid var(--border)",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                  <p style={{fontSize:10,letterSpacing:2,color:C.amber,textTransform:"uppercase",marginBottom:4}}>{label}</p>
                  <p style={{fontSize:13,color:"var(--text2)",lineHeight:1.65}}>{text}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Metrics;
