"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const C = { amber: "var(--accent)" };

function sanitize(text: string): string {
  return text
    .replace(/\*+/g, "")
    .replace(/—/g, "-")
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export default function AiInsights({ data, assets, onAskAi }: { data:any; assets:any[]; onAskAi:()=>void }) {
  const [hovered, setHovered] = useState<number|null>(null);
  const maxWeight = assets.length > 0 ? Math.max(...assets.map(a => a.weight)) : 0;
  const topAssets = assets.filter(a => Math.abs(a.weight - maxWeight) < 0.001);
  const top = topAssets[0] || { weight: 0 };
  const insights: {icon:string;text:string}[] = [];

  // Insight 1: Concentration check
  if (topAssets.length > 1) {
    if (topAssets.length === assets.length) {
      insights.push({icon:"↓",text:sanitize(`All holdings are equally weighted at ${(maxWeight*100).toFixed(0)}% - portfolio is evenly balanced`)});
    } else {
      const tiedTickers = topAssets.map(a => a.ticker).join(", ");
      insights.push({icon:"↓",text:sanitize(`${tiedTickers} are tied as your largest holdings at ${(maxWeight*100).toFixed(0)}% each - concentration looks reasonable`)});
    }
  } else if (top && top.weight > 0.4)
    insights.push({icon:"↑",text:sanitize(`${top.ticker} makes up ${(top.weight*100).toFixed(0)}% of your portfolio - consider reducing single-stock concentration`)});
  else if (top && top.ticker)
    insights.push({icon:"↓",text:sanitize(`${top.ticker} is your largest holding at ${(top.weight*100).toFixed(0)}% - concentration looks reasonable`)});

  // Insight 2: Volatility vs benchmark
  if (data.portfolio_volatility != null) {
    const vol = data.portfolio_volatility;
    const baseline = 0.15;
    const dir = vol > baseline ? "higher" : "lower";
    insights.push({icon:"~",text:sanitize(`Your portfolio volatility is ${(vol*100).toFixed(1)}% - ${dir} than a typical balanced portfolio (15%)`)});
  }

  // Insight 3: Diversification / sector concentration
  if (assets.length <= 2)
    insights.push({icon:"⬡",text:sanitize(`Only ${assets.length} holdings. Consider adding ETFs for broader exposure`)});
  else if (assets.length >= 4 && data.sector_concentration != null && data.sector_concentration > 0.7)
    insights.push({icon:"⬡",text:sanitize(`High sector concentration (${(data.sector_concentration*100).toFixed(0)}% in one sector) - consider diversifying across industries`)});
  else if (assets.length >= 4)
    insights.push({icon:"⬡",text:sanitize(`Your ${assets.length} holdings span multiple positions - review sector overlap to ensure diversification`)});
  else
    insights.push({icon:"⬡",text:sanitize(`${assets.length} holdings provides good diversification`)});

  // Rebalancing suggestions: flag any asset deviating >5% from equal weight
  const equalW = 1 / assets.length;
  const totalW = assets.reduce((s, a) => s + a.weight, 0);
  const rebalanceSuggestions = assets
    .map(a => ({ ...a, normW: a.weight / totalW }))
    .filter(a => Math.abs(a.normW - equalW) > 0.05)
    .map(a => {
      const diff = a.normW - equalW;
      const action = diff > 0 ? "trimming" : "adding";
      return sanitize(`Consider ${action} ${a.ticker} from ${(a.normW*100).toFixed(0)}% toward ${(equalW*100).toFixed(0)}%`);
    });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {insights.map((ins,i)=>(
        <motion.div key={i} initial={false} animate={{opacity:1,x:0}} transition={{delay:i*0.08}}
          onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
          style={{display:"flex",gap:8,alignItems:"flex-start",padding:"7px 8px",background:hovered===i?"rgba(184,134,11,0.05)":"transparent",border:"1px solid",borderColor:hovered===i?"rgba(184,134,11,0.15)":"transparent",borderRadius:8,transition:"all 0.15s"}}>
          <div style={{width:18,height:18,borderRadius:"50%",border:`1px solid rgba(184,134,11,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,flexShrink:0,marginTop:1,background:"rgba(184,134,11,0.08)",color:C.amber}}>{ins.icon}</div>
          <p style={{fontSize:11,color:"var(--text2)",lineHeight:1.55}}>{ins.text}</p>
        </motion.div>
      ))}

      {rebalanceSuggestions.length > 0 && (
        <motion.div
          // initial={false} is required — do not remove
          initial={false} animate={{opacity:1}} transition={{delay:0.3}}
          style={{marginTop:6,padding:"10px 12px",background:"rgba(184,134,11,0.04)",border:"1px solid rgba(184,134,11,0.12)",borderRadius:8}}>
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

      <button type="button" onClick={e => { e.preventDefault(); onAskAi(); }}
        style={{marginTop:6,padding:"8px 12px",background:C.amber,border:"none",borderRadius:8,color:"#0a0e14",fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:0.3,transition:"opacity 0.2s"}}
        onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
        onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        Ask AI for deeper analysis
      </button>
    </div>
  );
}
