"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const C = { amber: "var(--accent)", red: "#e05c5c" };

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
  { title: "Annual Return", simple: "How much your portfolio grew over the period.", example: "$10,000 → $11,500 = +15% return.", good: "Beating the S&P 500 (~10%/yr) is excellent." },
  { title: "Volatility", simple: "How wildly your portfolio swings day to day.", example: "30% vol = could swing ±30% in a year.", good: "Under 15% is low. 15–25% moderate. 30%+ is high." },
  { title: "Sharpe Ratio", simple: "Return per unit of risk. Higher = more efficient.", example: "Sharpe 2.0 = great returns for the risk taken.", good: "Above 1.0 good. Above 2.0 excellent. Below 0 bad." },
  { title: "Max Drawdown", simple: "Biggest drop from peak to trough that happened.", example: "$50k drops to $35k = -30% max drawdown.", good: "Closer to 0% is better. Under 10% very stable." },
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

export function Metrics({ data, currency = "USD", rate = 1, sparklineValues, period = "1y" }: { data: any; currency?: string; rate?: number; sparklineValues?: number[]; period?: string }) {
  const [modal, setModal] = useState<number|null>(null);
  const modalIdRef = useRef(`metrics-modal-${Math.random().toString(36).slice(2)}`);

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
  const items = [
    { label: `Return (${periodLabel})`, value: portReturn, fmt: (v:number) => `${v>=0?"+":""}${(v*100).toFixed(2)}%`, neg: portReturn<0, neutral: false, bar: null },
    { label: "Volatility",              value: portVol,    fmt: (v:number) => `${(v*100).toFixed(2)}%`,               neg: false,        neutral: true,  bar: portVol/0.6 },
    { label: "Sharpe Ratio",            value: sharpe,     fmt: (v:number) => v.toFixed(2),                           neg: sharpe<0,     neutral: false, bar: Math.min(Math.max(sharpe/3,0),1) },
    { label: "Max Drawdown",            value: portDD,     fmt: (v:number) => `${(v*100).toFixed(2)}%`,               neg: true,         neutral: false, bar: null },
  ];
  void rate; void sparklineValues;
  return (
    <>
      {items.map(({label,value,fmt,neg,neutral,bar},i) => {
        const color = neutral ? C.amber : neg ? C.red : "#4caf7d";
        return (
        <motion.div key={label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}
          style={{background:"var(--card-bg)",border:"0.5px solid var(--border)",borderRadius:12,padding:"18px 16px 14px"}}>
          <p style={{fontFamily:"Space Mono,monospace",fontSize:30,fontWeight:700,letterSpacing:-1.5,color,lineHeight:1,marginBottom:10}}>
            <Num value={value} fmt={fmt}/>
          </p>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{fontSize:8,letterSpacing:2.5,color:"var(--text3)",textTransform:"uppercase"}}>
              {label}{i===0&&currency!=="USD"?<span style={{marginLeft:4,color:C.amber,letterSpacing:1}}> · {currency}</span>:null}
            </p>
            <button onClick={()=>openMetricModal(i)} style={{width:16,height:16,borderRadius:"50%",background:"var(--bg3)",border:"0.5px solid var(--border)",color:"var(--text3)",fontSize:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}
              onMouseEnter={e=>{e.currentTarget.style.background=C.amber;e.currentTarget.style.color="#0a0e14";}}
              onMouseLeave={e=>{e.currentTarget.style.background="var(--bg3)";e.currentTarget.style.color="var(--text3)";}}>?</button>
          </div>
          {bar!==null&&(
            <div style={{marginTop:10,height:2,background:"var(--track)",borderRadius:1,overflow:"hidden"}}>
              <motion.div initial={{width:0}} animate={{width:`${Math.min(bar,1)*100}%`}} transition={{duration:1,delay:i*0.07+0.3}}
                style={{height:"100%",background:color,borderRadius:1}}/>
            </div>
          )}
        </motion.div>
        );
      })}
      <AnimatePresence>
        {modal!==null&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setModal(null)}
            style={{position:"fixed",inset:0,background:"rgba(10,14,20,0.8)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
            <motion.div initial={{opacity:0,scale:0.95,y:12}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0}}
              onClick={e=>e.stopPropagation()}
              style={{background:"var(--card-bg)",border:"0.5px solid var(--border2)",borderRadius:16,padding:28,maxWidth:400,width:"100%",maxHeight:"90vh",overflowY:"auto",position:"relative"}}>
              <button onClick={()=>setModal(null)} style={{position:"absolute",top:14,right:14,background:"var(--bg3)",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",fontSize:11,color:"var(--text3)"}}>✕</button>
              <p style={{fontSize:8,letterSpacing:2,color:C.amber,textTransform:"uppercase",marginBottom:6}}>About</p>
              <h3 style={{fontSize:18,fontWeight:500,color:"var(--text)",marginBottom:18}}>{EXPLAINERS[modal].title}</h3>
              {[{label:"Plain English",text:EXPLAINERS[modal].simple},{label:"Example",text:EXPLAINERS[modal].example},{label:"What's good?",text:EXPLAINERS[modal].good}].map(({label,text})=>(
                <div key={label} style={{background:"var(--bg2)",border:"0.5px solid var(--border)",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                  <p style={{fontSize:8,letterSpacing:2,color:C.amber,textTransform:"uppercase",marginBottom:4}}>{label}</p>
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
