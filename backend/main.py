from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import yfinance as yf
import pandas as pd
import math
import os
import json
import requests
from datetime import datetime, timezone

app = FastAPI(title="Corvo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PERIOD_MAP = {"6mo": "6mo", "1y": "1y", "2y": "2y", "5y": "5y"}

def safe_float(val):
    """Convert to float, returning 0 for NaN/Inf."""
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return 0.0
        return f
    except:
        return 0.0

def safe_list(lst):
    return [safe_float(x) for x in lst]

def get_prices(tickers, period="1y"):
    """Download prices for a list of tickers."""
    period = PERIOD_MAP.get(period, "1y")
    try:
        if len(tickers) == 1:
            data = yf.download(tickers[0], period=period, auto_adjust=True, progress=False)
            if data.empty:
                return None
            if "Close" in data.columns:
                return data[["Close"]].rename(columns={"Close": tickers[0]})
            return None
        else:
            data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
            if data.empty:
                return None
            if isinstance(data.columns, pd.MultiIndex):
                if "Close" in data.columns.get_level_values(0):
                    prices = data["Close"]
                elif "Adj Close" in data.columns.get_level_values(0):
                    prices = data["Adj Close"]
                else:
                    return None
            else:
                if "Close" in data.columns:
                    prices = data[["Close"]]
                elif "Adj Close" in data.columns:
                    prices = data[["Adj Close"]]
                else:
                    return None
            prices = prices.dropna(axis=1, how="all")
            return prices
    except Exception as e:
        print(f"Error downloading {tickers}: {e}")
        return None


@app.get("/")
def root():
    return {"status": "ok", "service": "Corvo API"}


@app.get("/docs-check")
def docs_check():
    return {"status": "running"}


@app.get("/portfolio")
def portfolio(
    tickers: str = "AAPL,MSFT",
    weights: str = "",
    period: str = "1y",
    benchmark: str = "^GSPC"
):
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tickers_list:
        raise HTTPException(status_code=400, detail="No tickers provided")

    # Parse weights
    if weights:
        try:
            w_list = [float(x) for x in weights.split(",")]
        except:
            w_list = [1.0 / len(tickers_list)] * len(tickers_list)
    else:
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)

    if len(w_list) != len(tickers_list):
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)

    total = sum(w_list)
    if total <= 0:
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)
    else:
        w_list = [w / total for w in w_list]

    weights_arr = np.array(w_list)

    # Download prices
    all_tickers = tickers_list + [benchmark]
    prices = get_prices(all_tickers, period)

    if prices is None or prices.empty:
        raise HTTPException(status_code=500, detail="Failed to fetch price data")

    # Separate benchmark
    bench_prices = None
    if benchmark in prices.columns:
        bench_prices = prices[benchmark].dropna()
        prices = prices.drop(columns=[benchmark])

    # Keep only requested tickers that loaded
    available = [t for t in tickers_list if t in prices.columns]
    if not available:
        raise HTTPException(status_code=500, detail="No valid ticker data returned")

    prices = prices[available].dropna()
    if prices.empty or len(prices) < 2:
        raise HTTPException(status_code=500, detail="Insufficient price data")

    # Align weights to available tickers
    avail_weights = []
    for t in available:
        idx = tickers_list.index(t) if t in tickers_list else None
        avail_weights.append(w_list[idx] if idx is not None else 1.0 / len(available))
    total_avail = sum(avail_weights)
    avail_weights = [w / total_avail for w in avail_weights]
    weights_arr = np.array(avail_weights)

    # Daily returns
    returns = prices.pct_change().dropna()
    if returns.empty:
        raise HTTPException(status_code=500, detail="Could not calculate returns")

    # Portfolio returns
    port_returns = returns[available].values @ weights_arr

    # Annualized stats (252 trading days)
    ann_return = safe_float(np.mean(port_returns) * 252)
    ann_vol = safe_float(np.std(port_returns) * np.sqrt(252))
    sharpe = safe_float((ann_return - 0.04) / ann_vol) if ann_vol > 0 else 0.0

    # Max drawdown
    cum = np.cumprod(1 + port_returns)
    running_max = np.maximum.accumulate(cum)
    drawdowns = (cum - running_max) / running_max
    max_dd = safe_float(np.min(drawdowns))

    # Cumulative returns for chart
    port_cum = [safe_float(x) for x in (cum - 1).tolist()]
    dates = [str(d)[:10] for d in returns.index.tolist()]

    # Benchmark cumulative returns
    bench_cum = []
    if bench_prices is not None:
        bench_prices = bench_prices.reindex(prices.index).ffill().bfill()
        bench_ret = bench_prices.pct_change().dropna()
        b_cum = np.cumprod(1 + bench_ret.values) - 1
        bench_cum = [safe_float(x) for x in b_cum.tolist()]
        # Align lengths
        min_len = min(len(port_cum), len(bench_cum))
        port_cum = port_cum[:min_len]
        bench_cum = bench_cum[:min_len]
        dates = dates[:min_len]

    # Individual stock returns for breakdown
    individual_returns = {}
    for t in available:
        t_ret = safe_float(np.mean(returns[t].values) * 252)
        individual_returns[t] = t_ret

    return {
        "tickers": available,
        "weights": [safe_float(w) for w in avail_weights],
        "portfolio_return": ann_return,
        "portfolio_volatility": ann_vol,
        "sharpe_ratio": sharpe,
        "max_drawdown": max_dd,
        "dates": dates,
        "portfolio_cumulative": port_cum,
        "benchmark_cumulative": bench_cum,
        "individual_returns": individual_returns,
        "period": period,
    }


@app.get("/drawdown")
def drawdown(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y"):
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tickers_list:
        raise HTTPException(status_code=400, detail="No tickers")

    if weights:
        try:
            w_list = [float(x) for x in weights.split(",")]
        except:
            w_list = [1.0 / len(tickers_list)] * len(tickers_list)
    else:
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)

    total = sum(w_list) or 1
    w_list = [w / total for w in w_list]

    prices = get_prices(tickers_list, period)
    if prices is None or prices.empty:
        raise HTTPException(status_code=500, detail="Failed to fetch data")

    available = [t for t in tickers_list if t in prices.columns]
    prices = prices[available].dropna()
    avail_w = [w_list[tickers_list.index(t)] for t in available]
    total_w = sum(avail_w) or 1
    avail_w = [w / total_w for w in avail_w]

    returns = prices.pct_change().dropna()
    port_returns = returns.values @ np.array(avail_w)
    cum = np.cumprod(1 + port_returns)
    running_max = np.maximum.accumulate(cum)
    dd = (cum - running_max) / running_max

    return {
        "dates": [str(d)[:10] for d in returns.index.tolist()],
        "drawdown": safe_list(dd.tolist()),
    }


@app.get("/correlation")
def correlation(tickers: str = "AAPL,MSFT", period: str = "1y"):
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if len(tickers_list) < 2:
        return {"matrix": [], "tickers": tickers_list}

    prices = get_prices(tickers_list, period)
    if prices is None or prices.empty:
        raise HTTPException(status_code=500, detail="Failed to fetch data")

    available = [t for t in tickers_list if t in prices.columns]
    prices = prices[available].dropna()
    corr = prices.pct_change().dropna().corr()

    matrix = []
    for t1 in available:
        row = []
        for t2 in available:
            row.append(safe_float(corr.loc[t1, t2]) if t1 in corr.index and t2 in corr.columns else 0.0)
        matrix.append(row)

    return {"matrix": matrix, "tickers": available}


@app.get("/montecarlo")
def montecarlo(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y", simulations: int = 300):
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tickers_list:
        raise HTTPException(status_code=400, detail="No tickers")

    if weights:
        try:
            w_list = [float(x) for x in weights.split(",")]
        except:
            w_list = [1.0 / len(tickers_list)] * len(tickers_list)
    else:
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)

    total = sum(w_list) or 1
    w_list = [w / total for w in w_list]

    prices = get_prices(tickers_list, period)
    if prices is None or prices.empty:
        raise HTTPException(status_code=500, detail="Failed to fetch data")

    available = [t for t in tickers_list if t in prices.columns]
    prices = prices[available].dropna()
    avail_w = [w_list[tickers_list.index(t)] for t in available]
    total_w = sum(avail_w) or 1
    avail_w = [w / total_w for w in avail_w]

    returns = prices.pct_change().dropna()
    port_returns = returns.values @ np.array(avail_w)

    mu = float(np.mean(port_returns))
    sigma = float(np.std(port_returns))
    horizon = 252

    np.random.seed(42)
    sims = np.random.normal(mu, sigma, (simulations, horizon))
    paths = np.cumprod(1 + sims, axis=1) - 1  # shape (sims, horizon)

    final_vals = paths[:, -1]
    p5 = float(np.percentile(final_vals, 5))
    p25 = float(np.percentile(final_vals, 25))
    p50 = float(np.percentile(final_vals, 50))
    p75 = float(np.percentile(final_vals, 75))
    p95 = float(np.percentile(final_vals, 95))

    # Percentile bands across time
    pct_bands = {
        "p5": safe_list(np.percentile(paths, 5, axis=0).tolist()),
        "p25": safe_list(np.percentile(paths, 25, axis=0).tolist()),
        "p50": safe_list(np.percentile(paths, 50, axis=0).tolist()),
        "p75": safe_list(np.percentile(paths, 75, axis=0).tolist()),
        "p95": safe_list(np.percentile(paths, 95, axis=0).tolist()),
    }

    # Sample paths (20)
    sample_paths = [safe_list(paths[i].tolist()) for i in range(min(20, simulations))]

    return {
        "horizon": horizon,
        "simulations": simulations,
        "final_p5": p5,
        "final_p25": p25,
        "final_p50": p50,
        "final_p75": p75,
        "final_p95": p95,
        "bands": pct_bands,
        "sample_paths": sample_paths,
    }


@app.get("/news")
def news(tickers: str = "AAPL"):
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    market_tickers = ["SPY", "QQQ", "^GSPC"]
    result = {"market": [], "sections": {}}

    def _parse_article(a: dict, ticker: str) -> dict | None:
        content = a.get("content") or {}
        url = (
            a.get("link") or a.get("url") or
            content.get("canonicalUrl", {}).get("url", "") or
            content.get("clickThroughUrl", {}).get("url", "") or ""
        )
        title = a.get("title") or content.get("title") or ""
        if not title or not url:
            return None
        pub_date = ""
        try:
            ts = a.get("providerPublishTime") or content.get("pubDate", "")
            if isinstance(ts, (int, float)):
                pub_date = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            elif ts:
                pub_date = str(ts)
        except:
            pass
        return {
            "ticker": ticker,
            "title": title,
            "summary": content.get("summary") or a.get("summary") or "",
            "publisher": a.get("publisher") or content.get("provider", {}).get("displayName") or "",
            "url": url,
            "published": pub_date,
        }

    # Market news
    seen_urls = set()
    for mt in market_tickers:
        try:
            t = yf.Ticker(mt)
            for a in (t.news or [])[:8]:
                item = _parse_article(a, "MARKET")
                if item and item["url"] not in seen_urls:
                    seen_urls.add(item["url"])
                    result["market"].append(item)
                    if len(result["market"]) >= 15:
                        break
        except Exception as e:
            print(f"Market news error for {mt}: {e}")

    # Per-ticker news
    def normalize_article(a: dict, ticker: str) -> dict:
        """Normalize a yfinance article dict into a clean format."""
        content = a.get("content") or {}
        url = (
            a.get("link") or a.get("url") or
            content.get("canonicalUrl", {}).get("url", "") or
            content.get("clickThroughUrl", {}).get("url", "") or ""
        )
        pub_date = ""
        try:
            ts = a.get("providerPublishTime") or content.get("pubDate", "")
            if isinstance(ts, (int, float)):
                pub_date = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            elif ts:
                pub_date = str(ts)
        except:
            pass
        return {
            "ticker": ticker,
            "title": a.get("title") or content.get("title") or "",
            "summary": content.get("summary") or a.get("summary") or "",
            "publisher": a.get("publisher") or content.get("provider", {}).get("displayName") or "",
            "url": url,
            "published": pub_date,
        }

    def gnews_fallback(ticker: str, max_results: int = 8) -> list:
        """Fallback: search GNews free API (no key needed for basic use)."""
        try:
            import urllib.request, urllib.parse
            query = urllib.parse.quote(f"{ticker} stock")
            url = f"https://gnews.io/api/v4/search?q={query}&lang=en&max={max_results}&apikey=free"
            # GNews free doesn't need a key for very limited use; if blocked use RSS
            # Use Yahoo Finance RSS as a more reliable free fallback
            rss_url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"
            req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                import xml.etree.ElementTree as ET
                tree = ET.parse(resp)
                root = tree.getroot()
                items = root.findall(".//item")
                articles = []
                for item in items[:max_results]:
                    title = item.findtext("title") or ""
                    link = item.findtext("link") or ""
                    pub = item.findtext("pubDate") or ""
                    desc = item.findtext("description") or ""
                    if title:
                        articles.append({
                            "ticker": ticker,
                            "title": title,
                            "summary": desc,
                            "publisher": "Yahoo Finance",
                            "url": link,
                            "published": pub,
                        })
                return articles
        except Exception as e:
            print(f"RSS fallback error for {ticker}: {e}")
            return []

    for ticker in tickers_list:
        result["sections"][ticker] = []
        try:
            t = yf.Ticker(ticker)
            raw_articles = t.news or []
            parsed = [normalize_article(a, ticker) for a in raw_articles[:15]]
            # Filter out articles with no title or url
            parsed = [a for a in parsed if a["title"] and a["url"]]
            if parsed:
                result["sections"][ticker] = parsed
            else:
                # yfinance returned nothing — try Finnhub first, then RSS
                print(f"yfinance news empty for {ticker}, trying Finnhub fallback")
                finnhub_articles = _finnhub_fallback(ticker)
                if finnhub_articles:
                    result["sections"][ticker] = finnhub_articles
                else:
                    result["sections"][ticker] = gnews_fallback(ticker)
        except Exception as e:
            print(f"News error for {ticker}: {e}")
            finnhub_articles = _finnhub_fallback(ticker)
            result["sections"][ticker] = finnhub_articles or gnews_fallback(ticker)

    # Build flat articles list for backward compat (NewsFeed uses this)
    all_articles = []
    for ticker, arts in result["sections"].items():
        all_articles.extend(arts)
    result["articles"] = all_articles

    return result



@app.get("/prices")
def get_prices_live(tickers: str = "AAPL"):
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    result = {}
    for ticker in tickers_list[:20]:
        try:
            t = yf.Ticker(ticker)
            info = t.fast_info
            price = safe_float(getattr(info, "last_price", 0) or 0)
            prev_close = safe_float(getattr(info, "previous_close", 0) or 0)
            if price > 0 and prev_close > 0:
                change = price - prev_close
                pct = (change / prev_close) * 100
            else:
                change = 0.0
                pct = 0.0
            if price > 0:
                result[ticker] = {
                    "price": safe_float(price),
                    "change": safe_float(change),
                    "pct": safe_float(pct),
                }
        except Exception as e:
            print(f"Price error for {ticker}: {e}")
    return result

@app.get("/search-ticker")
def search_ticker(q: str = ""):
    if not q or len(q) < 1:
        return {"results": []}
    try:
        results = yf.Search(q, max_results=8)
        quotes = results.quotes if hasattr(results, "quotes") else []
        out = []
        for r in quotes[:8]:
            symbol = r.get("symbol", "")
            name = r.get("longname") or r.get("shortname") or symbol
            exchange = r.get("exchange", "")
            qtype = r.get("quoteType", "EQUITY")
            if symbol:
                out.append({"ticker": symbol, "name": name, "exchange": exchange, "type": qtype})
        return {"results": out}
    except Exception as e:
        print(f"Search error: {e}")
        return {"results": []}


class ReportRequest(BaseModel):
    portfolio_context: dict = {}
    user_goals: dict = {}


@app.post("/generate-report")
def generate_report(req: ReportRequest):
    try:
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

        client = anthropic.Anthropic(api_key=api_key)
        ctx = req.portfolio_context
        goals = req.user_goals

        tickers = ctx.get("tickers", [])
        weights = ctx.get("weights", [])
        ret = ctx.get("portfolio_return", 0)
        vol = ctx.get("portfolio_volatility", 0)
        sharpe = ctx.get("sharpe_ratio", (ret - 0.04) / max(vol, 0.001))
        dd = ctx.get("max_drawdown", 0)
        period = ctx.get("period", "1y")
        ind_returns = ctx.get("individual_returns", {})

        goals_text = ""
        if goals:
            age = goals.get("age", "")
            goal = goals.get("goal", "")
            risk = goals.get("riskTolerance", "")
            timeline = goals.get("timeline", "")
            if age:
                goals_text = f"\n\nInvestor Profile: Age {age}, Goal: {goal}, Risk tolerance: {risk}, Timeline: {timeline} years."

        # Individual stock performance
        stock_perf = ""
        if ind_returns:
            stock_perf = "\n\nIndividual stock returns (annualized):\n" + "\n".join(
                f"- {t}: {r*100:+.1f}%" for t, r in ind_returns.items()
            )

        prompt = f"""You are a senior portfolio analyst at a top-tier investment firm. Write a comprehensive, professional portfolio analysis report for the following portfolio.

Portfolio: {", ".join(f"{t} ({w:.1%})" for t, w in zip(tickers, weights))}
Period: {period}
Annualized Return: {ret:.2%}
Annualized Volatility: {vol:.2%}
Sharpe Ratio: {sharpe:.2f}
Max Drawdown: {dd:.2%}{stock_perf}{goals_text}

Write a full analysis report with these sections:

## Executive Summary
A 2-3 sentence overview of portfolio performance and key takeaway.

## Performance Analysis
Detailed analysis of returns vs risk. Comment on whether the return justifies the volatility. Reference specific numbers.

## Risk Assessment
Analyze the volatility and max drawdown. What does this mean for the investor? Is this portfolio suitable for their risk tolerance?

## Portfolio Composition Analysis
Analyze the allocation. Is it well-diversified? Are there concentration risks? Comment on individual holdings if performance data is available.

## Strengths
3-4 bullet points of what this portfolio does well.

## Areas for Improvement
3-4 bullet points of specific actionable improvements.

## Conclusion
A clear, direct recommendation. Should the investor hold, rebalance, or make changes?

Write in a professional but accessible tone. Be specific — reference actual numbers throughout. Use bullet points (- item) for lists. Keep it thorough but concise — aim for 500-700 words total. Do not include any disclaimers or caveats within the analysis itself."""

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        return {"analysis": response.content[0].text}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ChatRequest(BaseModel):
    message: str
    history: list = []
    portfolio_context: dict = {}
    user_goals: dict = {}


@app.post("/chat")
def chat(req: ChatRequest):
    try:
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

        client = anthropic.Anthropic(api_key=api_key)

        ctx = req.portfolio_context
        # Support goals from both portfolio_context (frontend passes it nested) and top-level
        goals = req.user_goals or ctx.get("goals") or {}
        tickers = ctx.get("tickers", [])
        weights = ctx.get("weights", [])
        ret = ctx.get("portfolio_return", 0)
        vol = ctx.get("portfolio_volatility", 0)
        sharpe = ctx.get("sharpe_ratio") or (ret - 0.04) / max(vol, 0.001)
        dd = ctx.get("max_drawdown", 0)
        period = ctx.get("period", "1y")
        benchmark_return = ctx.get("benchmark_return")
        health_score = ctx.get("health_score")

        # Build rich investor profile from onboarding data
        profile_lines = []
        if goals:
            age = goals.get("age", "")
            retirement_age = goals.get("retirementAge", "")
            salary = goals.get("salary", "")
            invested = goals.get("invested", "")
            monthly = goals.get("monthlyContribution", "")
            risk = goals.get("riskTolerance", "moderate")
            goal = goals.get("goal", "")
            if age:
                years_to_retire = int(retirement_age or 65) - int(age) if age else None
                profile_lines.append(f"Age: {age}" + (f", retiring at {retirement_age} ({years_to_retire} years away)" if retirement_age else ""))
            if salary:
                profile_lines.append(f"Salary: ${int(salary):,}/yr")
            if invested:
                profile_lines.append(f"Total invested: ${int(invested):,}")
            if monthly:
                profile_lines.append(f"Monthly contribution: ${int(monthly):,}")
            if risk:
                risk_label = {"conservative": "Conservative (capital preservation priority)", "moderate": "Moderate (balanced growth)", "aggressive": "Aggressive (maximum growth, high risk tolerance)"}.get(risk, risk)
                profile_lines.append(f"Risk tolerance: {risk_label}")
            if goal:
                goal_label = {"retirement": "Retirement", "wealth": "Wealth building", "income": "Passive income", "short": "Short-term gains"}.get(goal, goal)
                profile_lines.append(f"Investment goal: {goal_label}")

        investor_profile = ""
        if profile_lines:
            investor_profile = "\n\nINVESTOR PROFILE (from onboarding — always consider this in your answers):\n" + "\n".join(f"• {l}" for l in profile_lines)

        benchmark_text = f"\n- Benchmark Return: {benchmark_return:.2%}" if benchmark_return is not None else ""
        health_text = f"\n- Portfolio Health Score: {health_score}/100" if health_score is not None else ""

        system = f"""You are Corvo AI, a personal portfolio analyst who knows this investor deeply. You have their full financial profile from onboarding and always tailor advice specifically to their situation — their age, goals, risk tolerance, and timeline.

CURRENT PORTFOLIO:
- Holdings: {', '.join(f"{t} ({w:.1%})" for t, w in zip(tickers, weights)) if tickers else "Not yet analyzed"}
- Annualized Return: {ret:.2%}
- Annualized Volatility: {vol:.2%}
- Sharpe Ratio: {sharpe:.2f}
- Max Drawdown: {dd:.2%}
- Period: {period}{benchmark_text}{health_text}{investor_profile}

RESPONSE RULES:
• Be concise and direct — max 180 words
• Use bullet points (•) for lists
• Always reference specific numbers from the portfolio
• When the investor has a profile, reference their goals/age/timeline in your answer
• If they ask about risk, factor in their stated risk tolerance
• Plain text only — no markdown headers or bold"""

        messages = [{"role": h["role"], "content": h["content"]} for h in req.history]
        messages.append({"role": "user", "content": req.message})

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=600,
            system=system,
            messages=messages,
        )
        return {"reply": response.content[0].text}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/parse-portfolio-image")
def parse_portfolio_image(body: dict):
    try:
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

        client = anthropic.Anthropic(api_key=api_key)
        image_b64 = body.get("image_base64", "")
        media_type = body.get("media_type", "image/jpeg")

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": image_b64}
                    },
                    {
                        "type": "text",
                        "text": "Extract all stock/ETF/crypto holdings from this brokerage screenshot. Return ONLY a JSON array like: [{\"ticker\": \"AAPL\", \"weight\": 0.25}]. Use percentage allocations as weights (0-1). If no percentages shown, distribute equally. Return only the JSON array, nothing else."
                    }
                ]
            }]
        )
        import re
        text = response.content[0].text.strip()
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            assets = json.loads(match.group())
            return {"assets": assets}
        return {"assets": []}
    except Exception as e:
        print(f"Image parse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class WelcomeEmailRequest(BaseModel):
    email: str

@app.post("/send-welcome-email")
def send_welcome_email(req: WelcomeEmailRequest):
    """Send a welcome email to a new Corvo user via Resend."""
    resend_key = os.environ.get("RESEND_API_KEY", "")
    if not resend_key:
        # Silently succeed — email is best-effort
        return {"ok": True, "skipped": True}

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body {{ margin: 0; background: #0a0e14; color: #e8e0cc; font-family: 'Courier New', monospace; padding: 48px 24px; }}
  .brand {{ font-size: 26px; font-weight: 900; letter-spacing: 8px; color: #c9a84c; margin-bottom: 4px; }}
  .sub {{ font-size: 9px; letter-spacing: 3px; color: rgba(232,224,204,0.3); text-transform: uppercase; margin-bottom: 32px; }}
  h1 {{ font-size: 20px; font-weight: 600; color: #e8e0cc; margin-bottom: 10px; }}
  p {{ font-size: 14px; color: rgba(232,224,204,0.7); line-height: 1.75; margin-bottom: 16px; }}
  .tip {{ background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.2); border-radius: 10px; padding: 14px 18px; margin-bottom: 10px; }}
  .tip-title {{ font-size: 11px; letter-spacing: 2px; color: #c9a84c; text-transform: uppercase; margin-bottom: 4px; }}
  .tip-text {{ font-size: 13px; color: rgba(232,224,204,0.7); }}
  .cta {{ display: inline-block; margin-top: 24px; padding: 14px 32px; background: #c9a84c; color: #0a0e14; font-weight: 700; font-size: 13px; letter-spacing: 2px; text-decoration: none; border-radius: 9px; }}
  .footer {{ margin-top: 48px; font-size: 10px; color: rgba(232,224,204,0.2); border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; }}
</style></head>
<body>
  <div class="brand">CORVO</div>
  <div class="sub">Portfolio Intelligence</div>
  <h1>Welcome to Corvo</h1>
  <p>You've joined a smarter way to analyze your portfolio. Here's how to get the most out of Corvo:</p>
  <div class="tip">
    <div class="tip-title">Tip 1 — Start with a preset</div>
    <div class="tip-text">Use the preset portfolios (Tech Heavy, Diversified, Crypto Mix, Dividend) to explore what Corvo can show you before entering your own tickers.</div>
  </div>
  <div class="tip">
    <div class="tip-title">Tip 2 — Use the Learn tab</div>
    <div class="tip-text">Unsure what Sharpe ratio means? Visit the Learn section to play our interactive games and read plain-English explanations of every metric.</div>
  </div>
  <div class="tip">
    <div class="tip-title">Tip 3 — Save and compare</div>
    <div class="tip-text">After analyzing a portfolio, save it. Then build a different one and compare them side-by-side in the Compare tab to see which has better risk-adjusted returns.</div>
  </div>
  <a class="cta" href="https://corvo.capital/app">OPEN CORVO →</a>
  <div class="footer">You received this because you signed up for Corvo. Data is sourced from Yahoo Finance. Not financial advice.</div>
</body>
</html>"""

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json={
                "from": "Corvo <hello@corvo.capital>",
                "to": [req.email],
                "subject": "Welcome to Corvo — your portfolio intelligence platform",
                "html": html,
            },
            timeout=10,
        )
        response.raise_for_status()
        return {"ok": True}
    except Exception as e:
        print(f"Welcome email error: {e}")
        return {"ok": False, "error": str(e)}
