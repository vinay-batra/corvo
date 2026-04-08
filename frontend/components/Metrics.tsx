"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const C = { amber: "#c9a84c", red: "#e05c5c" };

function Num({ value, fmt }: { value: number; fmt: (v: number) => string }) {
  const [d, setD] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const go = (now: number) => {
      const p = Math.min((now-start)/900,1);
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

export function Metrics({ data, currency = "USD", rate = 1 }: { data: any; currency?: string; rate?: number }) {
  const [modal, setModal] = useState<number|null>(null);
  const sharpe = data.portfolio_volatility>0?(data.portfolio_return-0.04)/data.portfolio_volatility:0;
  const items = [
    { label: "Return",       value: data.portfolio_return,     fmt: (v:number) => `${v>=0?"+":""}${(v*100).toFixed(2)}%`, neg: data.portfolio_return<0, bar: null },
    { label: "Volatility",   value: data.portfolio_volatility, fmt: (v:number) => `${(v*100).toFixed(2)}%`,               neg: false, bar: data.portfolio_volatility/0.6 },
    { label: "Sharpe",       value: sharpe,                    fmt: (v:number) => v.toFixed(2),                           neg: sharpe<0, bar: Math.min(Math.max(sharpe/3,0),1) },
    { label: "Max Drawdown", value: data.max_drawdown,         fmt: (v:number) => `${(v*100).toFixed(2)}%`,               neg: true, bar: null },
  ];
  void rate;
  return (
    <>
      {items.map(({label,value,fmt,neg,bar},i) => (
        <motion.div key={label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}
          style={{background:"var(--card-bg)",border:"0.5px solid var(--border)",borderRadius:12,padding:"16px 16px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <p style={{fontSize:8,letterSpacing:2.5,color:"var(--text3)",textTransform:"uppercase"}}>
              {label}{i===0&&currency!=="USD"?<span style={{marginLeft:4,color:C.amber,letterSpacing:1}}> · {currency}</span>:null}
            </p>
            <button onClick={()=>setModal(i)} style={{width:16,height:16,borderRadius:"50%",background:"var(--bg3)",border:"0.5px solid var(--border)",color:"var(--text3)",fontSize:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
              onMouseEnter={e=>{e.currentTarget.style.background=C.amber;e.currentTarget.style.color="#0a0e14";}}
              onMouseLeave={e=>{e.currentTarget.style.background="var(--bg3)";e.currentTarget.style.color="var(--text3)";}}>?</button>
          </div>
          <p style={{fontFamily:"Space Mono,monospace",fontSize:24,fontWeight:700,letterSpacing:-1,color:neg?C.red:"var(--text)",lineHeight:1}}>
            <Num value={value} fmt={fmt}/>
          </p>
          {bar!==null&&(
            <div style={{marginTop:10,height:2,background:"var(--track)",borderRadius:1,overflow:"hidden"}}>
              <motion.div initial={{width:0}} animate={{width:`${Math.min(bar,1)*100}%`}} transition={{duration:1,delay:i*0.07+0.3}}
                style={{height:"100%",background:C.amber,borderRadius:1}}/>
            </div>
          )}
        </motion.div>
      ))}
      <AnimatePresence>
        {modal!==null&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setModal(null)}
            style={{position:"fixed",inset:0,background:"rgba(10,14,20,0.8)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
            <motion.div initial={{opacity:0,scale:0.95,y:12}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0}}
              onClick={e=>e.stopPropagation()}
              style={{background:"var(--card-bg)",border:"0.5px solid var(--border2)",borderRadius:16,padding:28,maxWidth:400,width:"100%",position:"relative"}}>
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
