"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const C = { amber: "#c9a84c" };

export default function AiInsights({ data, assets, onAskAi }: { data:any; assets:any[]; onAskAi:()=>void }) {
  const [hovered, setHovered] = useState<number|null>(null);
  const sharpe = data.portfolio_volatility>0?(data.portfolio_return-0.04)/data.portfolio_volatility:0;
  const top = assets.reduce((a,b)=>a.weight>b.weight?a:b,assets[0]||{weight:0});
  const insights: {icon:string;text:string}[] = [];

  if (data.portfolio_return>0.1)
    insights.push({icon:"↑",text:`Strong ${(data.portfolio_return*100).toFixed(1)}% return, outperforming savings by ${((data.portfolio_return-0.05)*100).toFixed(1)}pp`});
  else if (data.portfolio_return<0)
    insights.push({icon:"↓",text:`Down ${(Math.abs(data.portfolio_return)*100).toFixed(1)}%. Consider reviewing your risk tolerance`});
  else
    insights.push({icon:"→",text:`${(data.portfolio_return*100).toFixed(1)}% return, with room for optimization`});

  if (sharpe>=1.5)
    insights.push({icon:"★",text:`Excellent Sharpe of ${sharpe.toFixed(2)}: strong returns for the risk taken`});
  else if (sharpe<0.5)
    insights.push({icon:"!",text:`Low Sharpe of ${sharpe.toFixed(2)}: taking more risk than returns justify`});
  else
    insights.push({icon:"◈",text:`Sharpe of ${sharpe.toFixed(2)}: further diversification could improve this`});

  if (top&&top.weight>0.5)
    insights.push({icon:"!",text:`${top.ticker} is ${(top.weight*100).toFixed(0)}% of your portfolio. Consider reducing concentration`});
  else if (assets.length<=2)
    insights.push({icon:"◎",text:`Only ${assets.length} holdings. Consider adding ETFs for broader exposure`});
  else
    insights.push({icon:"✓",text:`${assets.length} holdings provides good diversification`});

  // Rebalancing suggestions: flag any asset deviating >5% from equal weight
  const equalW = 1 / assets.length;
  const totalW = assets.reduce((s, a) => s + a.weight, 0);
  const rebalanceSuggestions = assets
    .map(a => ({ ...a, normW: a.weight / totalW }))
    .filter(a => Math.abs(a.normW - equalW) > 0.05)
    .map(a => {
      const diff = a.normW - equalW;
      const action = diff > 0 ? "trim" : "add to";
      return `Consider ${action}ing ${a.ticker} from ${(a.normW*100).toFixed(0)}% toward ${(equalW*100).toFixed(0)}%`;
    });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {insights.map((ins,i)=>(
        <motion.div key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:i*0.08}}
          onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
          style={{display:"flex",gap:8,alignItems:"flex-start",padding:"7px 8px",background:hovered===i?"rgba(201,168,76,0.05)":"transparent",border:"1px solid",borderColor:hovered===i?"rgba(201,168,76,0.15)":"transparent",borderRadius:8,transition:"all 0.15s"}}>
          <div style={{width:18,height:18,borderRadius:"50%",border:`1px solid rgba(201,168,76,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,flexShrink:0,marginTop:1,background:"rgba(201,168,76,0.08)",color:C.amber}}>{ins.icon}</div>
          <p style={{fontSize:11,color:"var(--text2)",lineHeight:1.55}}>{ins.text}</p>
        </motion.div>
      ))}

      {rebalanceSuggestions.length > 0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}
          style={{marginTop:6,padding:"10px 12px",background:"rgba(201,168,76,0.04)",border:"1px solid rgba(201,168,76,0.12)",borderRadius:8}}>
          <p style={{fontSize:8,letterSpacing:2,color:C.amber,textTransform:"uppercase",marginBottom:6}}>Rebalancing</p>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {rebalanceSuggestions.map((s,i)=>(
              <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start"}}>
                <span style={{color:C.amber,fontSize:9,marginTop:2,flexShrink:0}}>▸</span>
                <p style={{fontSize:11,color:"var(--text2)",lineHeight:1.5}}>{s}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <button onClick={onAskAi}
        style={{marginTop:6,padding:"8px 12px",background:C.amber,border:"none",borderRadius:8,color:"#0a0e14",fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:0.3,transition:"opacity 0.2s"}}
        onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
        onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        Ask AI for deeper analysis →
      </button>
    </div>
  );
}
