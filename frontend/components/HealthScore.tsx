"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const C = { amber: "#c9a84c", cream3: "rgba(232,224,204,0.25)", cream: "#e8e0cc" };

function Ring({ score, size=96 }: { score:number; size?:number }) {
  const r=(size-12)/2, circ=2*Math.PI*r, offset=circ-(score/100)*circ;
  const label = score>=75?"Excellent":score>=50?"Good":score>=25?"Fair":"Weak";
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6}/>
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.amber} strokeWidth={6}
          strokeLinecap="round" strokeDasharray={circ}
          initial={{strokeDashoffset:circ}} animate={{strokeDashoffset:offset}}
          transition={{duration:1.5,ease:"easeOut",delay:0.2}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.8}}
          style={{fontFamily:"Space Mono,monospace",fontSize:20,fontWeight:700,color:"var(--text)",letterSpacing:-1,lineHeight:1}}>{score}</motion.p>
        <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1}}
          style={{fontSize:8,letterSpacing:1,color:C.cream3,textTransform:"uppercase",marginTop:2}}>{label}</motion.p>
      </div>
    </div>
  );
}

function Bar({ label, value, max, delay }: { label:string; value:number; max:number; delay:number }) {
  const pct=Math.max(0,Math.min(value/max,1));
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:10,color:C.cream3,width:66,flexShrink:0}}>{label}</span>
      <div style={{flex:1,height:2,background:"rgba(255,255,255,0.06)",borderRadius:1,overflow:"hidden"}}>
        <motion.div initial={{width:0}} animate={{width:`${pct*100}%`}} transition={{duration:1,delay,ease:"easeOut"}}
          style={{height:"100%",background:C.amber,borderRadius:1}}/>
      </div>
      <motion.span initial={{opacity:0}} animate={{opacity:1}} transition={{delay:delay+0.4}}
        style={{fontSize:10,fontFamily:"Space Mono,monospace",color:"rgba(232,224,204,0.4)",width:22,textAlign:"right"}}>{Math.round(pct*100)}</motion.span>
    </div>
  );
}

export default function HealthScore({ data }: { data: any }) {
  const ref = useRef(null);
  const inView = useInView(ref,{once:true});
  const sharpe = data.portfolio_volatility>0?(data.portfolio_return-0.04)/data.portfolio_volatility:0;
  const rS=Math.min(Math.max(((data.portfolio_return+0.3)/0.6)*100,0),100);
  const shS=Math.min(Math.max((sharpe/3)*100,0),100);
  const vS=Math.min(Math.max((1-data.portfolio_volatility/0.6)*100,0),100);
  const dS=Math.min(Math.max((1+data.max_drawdown/0.5)*100,0),100);
  const score=Math.round(rS*0.3+shS*0.3+vS*0.25+dS*0.15);
  return (
    <div ref={ref} style={{display:"flex",gap:14,alignItems:"center"}}>
      {inView&&<Ring score={score}/>}
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
        <Bar label="Returns"    value={rS}  max={100} delay={0.5}/>
        <Bar label="Risk-Adj"   value={shS} max={100} delay={0.6}/>
        <Bar label="Stability"  value={vS}  max={100} delay={0.7}/>
        <Bar label="Resilience" value={dS}  max={100} delay={0.8}/>
      </div>
    </div>
  );
}
