// Supabase Edge Function: weekly-digest
// Schedule via Dashboard → Edge Functions → Cron: "0 9 * * 1" (Monday 9am UTC)
// Required env vars: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAILWAY_API_URL

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RAILWAY_URL = Deno.env.get("RAILWAY_API_URL") ?? "https://web-production-7a78d.up.railway.app";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchPortfolioMetrics(assets: { ticker: string; weight: number }[]) {
  const total = assets.reduce((s, a) => s + a.weight, 0);
  const norm = assets.map((a) => ({ ...a, weight: a.weight / total }));
  const tickers = norm.map((a) => a.ticker).join(",");
  const weights = norm.map((a) => a.weight.toFixed(4)).join(",");
  const url = `${RAILWAY_URL}/portfolio?tickers=${tickers}&weights=${weights}&period=1y&benchmark=%5EGSPC`;
  const res = await fetch(url);
  return await res.json();
}

function computeHealthScore(data: any): number {
  const ret = data.portfolio_return ?? 0;
  const vol = data.portfolio_volatility ?? 0.2;
  const sharpe = vol > 0 ? (ret - 0.04) / vol : 0;
  const rS = Math.min(Math.max(((ret + 0.3) / 0.6) * 100, 0), 100);
  const shS = Math.min(Math.max((sharpe / 3) * 100, 0), 100);
  const vS = Math.min(Math.max((1 - vol / 0.6) * 100, 0), 100);
  const dS = Math.min(Math.max((1 + (data.max_drawdown ?? 0) / 0.5) * 100, 0), 100);
  return Math.round(rS * 0.3 + shS * 0.3 + vS * 0.25 + dS * 0.15);
}

function buildEmailHtml(opts: {
  portfolioName: string;
  tickers: string[];
  weeklyReturn: string;
  annualReturn: string;
  healthScore: number;
  topAsset: { ticker: string; ret: string };
  worstAsset: { ticker: string; ret: string };
  insight: string;
}): string {
  const scoreColor = opts.healthScore >= 75 ? "#5cb88a" : opts.healthScore >= 50 ? "#c9a84c" : "#e05c5c";
  const retColor = opts.weeklyReturn.startsWith("+") ? "#5cb88a" : "#e05c5c";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0e14; color: #e8e0cc; font-family: 'Courier New', monospace; }
    .wrap { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
    .brand { font-size: 22px; font-weight: 900; letter-spacing: 8px; color: #c9a84c; margin-bottom: 2px; }
    .brand-sub { font-size: 8px; letter-spacing: 3px; color: rgba(232,224,204,0.25); text-transform: uppercase; margin-bottom: 28px; }
    .week-label { font-size: 8px; letter-spacing: 3px; color: rgba(201,168,76,0.5); text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 10px; margin-bottom: 20px; }
    h1 { font-size: 18px; font-weight: 500; color: #e8e0cc; margin-bottom: 20px; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .metric { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 16px; }
    .metric-val { font-size: 24px; font-weight: 700; letter-spacing: -1px; margin-bottom: 4px; }
    .metric-lbl { font-size: 8px; letter-spacing: 2px; color: rgba(232,224,204,0.3); text-transform: uppercase; }
    .perf-row { display: flex; gap: 10px; margin-bottom: 20px; }
    .perf-card { flex: 1; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 14px; }
    .perf-ticker { font-size: 13px; font-weight: 700; color: #c9a84c; margin-bottom: 2px; }
    .perf-ret { font-size: 18px; font-weight: 700; }
    .perf-lbl { font-size: 8px; color: rgba(232,224,204,0.25); letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .insight { background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.15); border-radius: 10px; padding: 16px 18px; margin-bottom: 24px; }
    .insight-head { font-size: 8px; letter-spacing: 2px; color: #c9a84c; text-transform: uppercase; margin-bottom: 8px; }
    .insight-text { font-size: 13px; color: rgba(232,224,204,0.8); line-height: 1.7; font-family: Georgia, serif; }
    .cta { display: block; text-align: center; padding: 14px; background: #c9a84c; color: #0a0e14; font-weight: 700; font-size: 11px; letter-spacing: 2px; text-decoration: none; border-radius: 9px; margin-bottom: 28px; }
    .footer { font-size: 10px; color: rgba(232,224,204,0.2); border-top: 1px solid rgba(255,255,255,0.06); padding-top: 18px; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">CORVO</div>
    <div class="brand-sub">Portfolio Intelligence</div>
    <div class="week-label">Weekly Digest — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>

    <h1>${opts.portfolioName}</h1>
    <p style="font-size:12px;color:rgba(232,224,204,0.4);margin-bottom:18px">${opts.tickers.join(" · ")}</p>

    <div class="metrics">
      <div class="metric">
        <div class="metric-val" style="color:${retColor}">${opts.annualReturn}</div>
        <div class="metric-lbl">Annual Return</div>
      </div>
      <div class="metric">
        <div class="metric-val" style="color:${scoreColor}">${opts.healthScore}</div>
        <div class="metric-lbl">Health Score</div>
      </div>
    </div>

    <div class="perf-row">
      <div class="perf-card">
        <div class="perf-ticker">${opts.topAsset.ticker}</div>
        <div class="perf-ret" style="color:#5cb88a">${opts.topAsset.ret}</div>
        <div class="perf-lbl">Top Performer</div>
      </div>
      <div class="perf-card">
        <div class="perf-ticker">${opts.worstAsset.ticker}</div>
        <div class="perf-ret" style="color:#e05c5c">${opts.worstAsset.ret}</div>
        <div class="perf-lbl">Lagging Performer</div>
      </div>
    </div>

    <div class="insight">
      <div class="insight-head">◈ AI Insight</div>
      <div class="insight-text">${opts.insight}</div>
    </div>

    <a class="cta" href="https://corvo.capital/app">VIEW FULL ANALYSIS →</a>

    <div class="footer">
      You're receiving this weekly digest from Corvo because you have a saved portfolio.<br>
      Data sourced from Yahoo Finance · Not financial advice · <a href="https://corvo.capital" style="color:rgba(201,168,76,0.5);text-decoration:none">corvo.capital</a>
    </div>
  </div>
</body>
</html>`;
}

function generateInsight(data: any, assets: { ticker: string; weight: number }[]): string {
  const ret = data.portfolio_return ?? 0;
  const vol = data.portfolio_volatility ?? 0;
  const sharpe = vol > 0 ? (ret - 0.04) / vol : 0;
  const indRet: Record<string, number> = data.individual_returns ?? {};

  if (sharpe > 1.5) return `Your portfolio is firing on all cylinders with a Sharpe ratio of ${sharpe.toFixed(2)} — you're earning strong returns for the risk you're taking. Keep your current allocation unless a major thesis changes.`;
  if (ret < 0) return `Your portfolio is down ${(Math.abs(ret) * 100).toFixed(1)}% annualized. Consider reviewing your highest-risk positions and whether your allocation still matches your timeline.`;
  if (vol > 0.35) return `Your portfolio's volatility of ${(vol * 100).toFixed(1)}% is quite high. Adding low-correlation assets like bonds or gold could smooth out the ride without sacrificing much return.`;
  if (assets.length <= 2) return `You're holding only ${assets.length} position${assets.length === 1 ? "" : "s"}. Even adding one uncorrelated ETF like GLD or BND could meaningfully reduce your risk without hurting expected returns.`;
  return `Your portfolio returned ${(ret * 100).toFixed(1)}% with ${(vol * 100).toFixed(1)}% volatility over the past year. Sharpe ratio of ${sharpe.toFixed(2)} suggests ${sharpe >= 0.5 ? "reasonable" : "below-average"} risk-adjusted performance.`;
}

Deno.serve(async (req) => {
  // Allow manual invocation via GET as well as cron POST
  try {
    // Fetch all users with saved portfolios from Supabase
    const { data: portfolios, error } = await supabase
      .from("portfolios")
      .select("id, name, assets, user_id")
      .limit(500);

    if (error) throw error;

    // Group by user
    const byUser: Record<string, { email: string; portfolios: any[] }> = {};
    for (const p of portfolios ?? []) {
      if (!byUser[p.user_id]) {
        // Fetch user email
        const { data: user } = await supabase.auth.admin.getUserById(p.user_id);
        if (!user?.user?.email) continue;
        byUser[p.user_id] = { email: user.user.email, portfolios: [] };
      }
      byUser[p.user_id].portfolios.push(p);
    }

    let sent = 0;
    const errors: string[] = [];

    for (const [, { email, portfolios: userPortfolios }] of Object.entries(byUser)) {
      // Use the first/primary portfolio
      const primary = userPortfolios[0];
      if (!primary?.assets?.length) continue;

      try {
        const metrics = await fetchPortfolioMetrics(primary.assets);
        const healthScore = computeHealthScore(metrics);
        const indRet: Record<string, number> = metrics.individual_returns ?? {};
        const retEntries = Object.entries(indRet).sort((a, b) => (b[1] as number) - (a[1] as number));
        const topAsset = retEntries[0] ?? [primary.assets[0]?.ticker ?? "—", 0];
        const worstAsset = retEntries[retEntries.length - 1] ?? topAsset;
        const annRet = (metrics.portfolio_return ?? 0) * 100;
        const insight = generateInsight(metrics, primary.assets);

        const html = buildEmailHtml({
          portfolioName: primary.name,
          tickers: primary.assets.map((a: any) => a.ticker),
          weeklyReturn: `${annRet >= 0 ? "+" : ""}${annRet.toFixed(1)}%`,
          annualReturn: `${annRet >= 0 ? "+" : ""}${annRet.toFixed(1)}%`,
          healthScore,
          topAsset: { ticker: topAsset[0] as string, ret: `+${((topAsset[1] as number) * 100).toFixed(1)}%` },
          worstAsset: { ticker: worstAsset[0] as string, ret: `${((worstAsset[1] as number) * 100).toFixed(1)}%` },
          insight,
        });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Corvo <digest@corvo.capital>",
            to: [email],
            subject: `Your weekly portfolio digest — ${primary.name}`,
            html,
          }),
        });

        if (res.ok) sent++;
        else errors.push(`${email}: ${await res.text()}`);
      } catch (e) {
        errors.push(`${email}: ${String(e)}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, errors }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
