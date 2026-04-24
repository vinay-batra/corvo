"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

function Ring({ score, size=96 }: { score:number; size?:number }) {
  const r=(size-12)/2, circ=2*Math.PI*r, offset=circ-(score/100)*circ;
  const label = score>=75?"Excellent":score>=50?"Good":score>=25?"Fair":"Weak";
  const ringColor = score>=75?"#4caf7d":score>=50?"#b8860b":"#e05c5c";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--track)" strokeWidth={6}/>
          <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={6}
            strokeLinecap="round" strokeDasharray={circ}
            initial={false} animate={{strokeDashoffset:offset}}
            transition={{duration:1,ease:"easeOut",delay:0}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <motion.p initial={false} animate={{opacity:1}} transition={{delay:0.8}}
            style={{fontFamily:"Space Mono,monospace",fontSize:24,fontWeight:700,color:ringColor,letterSpacing:-1,lineHeight:1}}>{score}</motion.p>
        </div>
      </div>
      <motion.p initial={false} animate={{opacity:1}} transition={{delay:1}}
        style={{fontSize:9,letterSpacing:2,color:ringColor,textTransform:"uppercase",marginTop:6,textAlign:"center"}}>{label}</motion.p>
    </div>
  );
}

function Bar({ label, subtitle, value, max, delay }: { label:string; subtitle:string; value:number; max:number; delay:number }) {
  const pct=Math.max(0,Math.min(value/max,1));
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:90,flexShrink:0,display:"flex",flexDirection:"column",gap:1}}>
        <span style={{fontSize:10,color:"var(--text3)"}}>{label}</span>
        <span style={{fontSize:9,color:"var(--text3)",opacity:0.65,lineHeight:1.2}}>{subtitle}</span>
      </div>
      <div style={{flex:1,height:2,background:"var(--track)",borderRadius:1,overflow:"hidden"}}>
        <motion.div initial={false} animate={{width:`${pct*100}%`}} transition={{duration:1,delay,ease:"easeOut"}}
          style={{height:"100%",background:"#b8860b",borderRadius:1}}/>
      </div>
      <motion.span initial={false} animate={{opacity:1}} transition={{delay:delay+0.4}}
        style={{fontSize:11,fontFamily:"Space Mono,monospace",color:"var(--text3)",width:22,textAlign:"right"}}>{Math.round(pct*100)}</motion.span>
    </div>
  );
}

export default function HealthScore({ data }: { data: any }) {
  const ref = useRef(null);
  const inView = useInView(ref,{once:true});
  const sharpe = data.sharpe_ratio ?? (data.portfolio_volatility>0?(data.annualized_return-0.04)/data.portfolio_volatility:0);
  const annRet = data.annualized_return ?? data.portfolio_return;
  const rS=Math.min(Math.max(((annRet+0.3)/0.6)*100,0),100);
  const shS=Math.min(Math.max((sharpe/3)*100,0),100);
  const vS=Math.min(Math.max((1-data.portfolio_volatility/0.6)*100,0),100);
  const dS=Math.min(Math.max((1+data.max_drawdown/0.5)*100,0),100);
  const score=Math.round(rS*0.3+shS*0.3+vS*0.25+dS*0.15);
  return (
    <div ref={ref} style={{display:"flex",gap:14,alignItems:"center"}}>
      {inView&&<Ring score={score}/>}
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
        <Bar label="Returns"    subtitle={rS  < 70 ? "below market avg"      : "above market avg"}      value={rS}  max={100} delay={0.5}/>
        <Bar label="Risk-Adj"   subtitle={shS < 60 ? "high risk/reward ratio" : "efficient risk use"}     value={shS} max={100} delay={0.6}/>
        <Bar label="Stability"  subtitle={vS  < 60 ? "high volatility"        : "low volatility"}         value={vS}  max={100} delay={0.7}/>
        <Bar label="Resilience" subtitle={dS  < 60 ? "large drawdowns"        : "recovers well"}          value={dS}  max={100} delay={0.8}/>
      </div>
    </div>
  );
}
