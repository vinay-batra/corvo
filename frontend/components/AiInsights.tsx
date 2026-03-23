"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const C = { amber: "#c9a84c", cream: "#e8e0cc", cream2: "rgba(232,224,204,0.6)", cream3: "rgba(232,224,204,0.25)", border: "rgba(255,255,255,0.06)" };

export default function AiInsights({ data, assets, onAskAi }: { data:any; assets:any[]; onAskAi:()=>void }) {
  const [hovered, setHovered] = useState<number|null>(null);
  const sharpe = data.portfolio_volatility>0?(data.portfolio_return-0.04)/data.portfolio_volatility:0;
  const top = assets.reduce((a,b)=>a.weight>b.weight?a:b,assets[0]||{weight:0});
  const insights: {icon:string;text:string}[] = [];

  if (data.portfolio_return>0.1)
    insights.push({icon:"↑",text:`Strong ${(data.portfolio_return*100).toFixed(1)}% return — outperforming savings by ${((data.portfolio_return-0.05)*100).toFixed(1)}pp`});
  else if (data.portfolio_return<0)
    insights.push({icon:"↓",text:`Down ${(Math.abs(data.portfolio_return)*100).toFixed(1)}% — consider reviewing your risk tolerance`});
  else
    insights.push({icon:"→",text:`${(data.portfolio_return*100).toFixed(1)}% return — room for optimization`});

  if (sharpe>=1.5)
    insights.push({icon:"★",text:`Excellent Sharpe of ${sharpe.toFixed(2)} — strong returns for the risk taken`});
  else if (sharpe<0.5)
    insights.push({icon:"!",text:`Low Sharpe of ${sharpe.toFixed(2)} — taking more risk than returns justify`});
  else
    insights.push({icon:"◈",text:`Sharpe of ${sharpe.toFixed(2)} — further diversification could improve this`});

  if (top&&top.weight>0.5)
    insights.push({icon:"!",text:`${top.ticker} is ${(top.weight*100).toFixed(0)}% of your portfolio — consider reducing concentration`});
  else if (assets.length<=2)
    insights.push({icon:"◎",text:`Only ${assets.length} holdings — consider adding ETFs for broader exposure`});
  else
    insights.push({icon:"✓",text:`${assets.length} holdings provides good diversification`});

  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {insights.map((ins,i)=>(
        <motion.div key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:i*0.08}}
          onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
          style={{display:"flex",gap:8,alignItems:"flex-start",padding:"7px 8px",background:hovered===i?"rgba(201,168,76,0.05)":"transparent",border:"1px solid",borderColor:hovered===i?"rgba(201,168,76,0.15)":"transparent",borderRadius:8,transition:"all 0.15s"}}>
          <div style={{width:18,height:18,borderRadius:"50%",border:`1px solid rgba(201,168,76,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,flexShrink:0,marginTop:1,background:"rgba(201,168,76,0.08)",color:C.amber}}>{ins.icon}</div>
          <p style={{fontSize:11,color:C.cream2,lineHeight:1.55}}>{ins.text}</p>
        </motion.div>
      ))}
      <button onClick={onAskAi}
        style={{marginTop:6,padding:"8px 12px",background:C.amber,border:"none",borderRadius:8,color:"#0a0e14",fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:0.3,transition:"opacity 0.2s"}}
        onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
        onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        Ask AI for deeper analysis →
      </button>
    </div>
  );
}
